// ============================================================================
// Gratify runtime — the two-clock loop.
//   clock 1 (state changed): rebuild Element tree via view(doc), keyed reconcile.
//   clock 2 (every frame):   layout targets, step springs/channels, paint.
// Render-on-demand: the loop sleeps when the scene is at rest, wakes on input
// or dispatch. Deterministic step(n, dt) for headless tests; the whole input
// pipeline (pointerDown/Move/Up, wheel, key) is public so tests drive it
// without a DOM.
//
// M3 editor tier: viewport (pan/zoom) with three layers (world/overlay/screen),
// an anchor registry published by layout, gesture interactors with private
// state + read-only Query + overlay preview views, keyboard focus, and
// impulse channels (kick + decay).
//
// HOST BOUNDARY (plan §0.1): this file imports no app/example module. The app
// arrives as AppSpec { init, update, view } — nothing else crosses.
// ============================================================================

import { approach, clamp, easeOutBack, Rect, Spring, v, Vec } from "./core";
import { CanvasPainter, NullPainter, Painter } from "./painter";
import { Element, Instance, reconcile } from "./scene";
import { GNode, PartDef } from "./part";
import { Anchor, axisFraction, GestureSpec, Interactor, Intentish, Query } from "./interact";
import { activeThemeExts, themeVersion, tickTheme, tokens } from "./theme";
import { Fx } from "./fx";

export interface AppSpec<TDoc, TIntent> {
  init: TDoc;
  update(doc: TDoc, intent: TIntent): TDoc;
  view(doc: TDoc): Element;
}

export interface RuntimeOpts {
  headless?: boolean;          // no DOM wiring, NullPainter, manual step()
  width?: number;
  height?: number;
}

type AnyDef = PartDef<unknown, unknown>;
type Layer = "world" | "overlay" | "screen";
type Mods = { shift: boolean; alt: boolean; ctrl: boolean };

interface PressState {
  inst: Instance;
  p0: Vec;                     // screen coords
  moved: boolean;
  drag?: Extract<Interactor<unknown>, { kind: "drag1d" }>;
}

interface ActiveGesture {
  inst: Instance;
  spec: GestureSpec<unknown, unknown>;
  state: unknown;
}

const POS_SPRING = { k: 240, d: 26 };
const SIZE_RATE = 18;

/** Internal container for gesture preview elements. */
const GESTURE_ROOT: AnyDef = { name: "__gesture-root" };

export class Runtime<TDoc, TIntent> {
  painter: Painter;
  doc: TDoc;
  root: Instance;
  fx: Fx[] = [];
  time = 0;
  viewport = { pan: v(0, 0), zoom: 1 };

  private dirty = false;
  private dpr = 1;
  private viewW: number; private viewH: number;
  private pointer: Vec | null = null;          // screen coords
  private mods = { shift: false, alt: false, ctrl: false };
  private press: PressState | null = null;
  private gesture: ActiveGesture | null = null;
  private gestureRoot: Instance | null = null;
  private panDrag: { pan0: Vec; p0: Vec } | null = null;
  private focus: Instance | null = null;
  private anchorMap = new Map<string, Anchor>();
  private awake = true; private idleT = 0; private moving = true; private lastSig = 0;
  private last = 0;
  private stopped = false;

  constructor(canvas: HTMLCanvasElement | null, public app: AppSpec<TDoc, TIntent>, opts: RuntimeOpts = {}) {
    this.viewW = opts.width ?? 800; this.viewH = opts.height ?? 600;
    this.painter = canvas && !opts.headless ? new CanvasPainter(canvas) : new NullPainter();
    this.doc = app.init;
    this.root = reconcile(null, app.view(this.doc));
    if (canvas && !opts.headless) this.attach(canvas);
  }

  // ---- effective part definitions (layering: definition → theme → use site) --
  private effCache = new WeakMap<Instance, { ver: number; el: Element; def: AnyDef }>();
  private eff(inst: Instance): AnyDef {
    const hit = this.effCache.get(inst);
    if (hit && hit.ver === themeVersion && hit.el === inst.el) return hit.def;
    let def = inst.part as AnyDef;
    for (const e of activeThemeExts(def.name, def.ancestors)) def = e(def) as AnyDef;
    for (const e of inst.el.exts ?? []) def = (e as (d: AnyDef) => AnyDef)(def);
    this.effCache.set(inst, { ver: themeVersion, el: inst.el, def });
    return def;
  }

  // ---- public --------------------------------------------------------------
  dispatch = (i: TIntent) => { this.doc = this.app.update(this.doc, i); this.dirty = true; this.wake(); };
  spawnFx(f: Fx) { this.fx.push(f); this.wake(); }
  /** Advance n deterministic frames (headless testing / golden frames). */
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) this.tick(dt); }
  stop() { this.stopped = true; }

  /** Screen → world (inverse viewport transform). */
  toWorld(p: Vec): Vec {
    return v((p.x - this.viewport.pan.x) / this.viewport.zoom, (p.y - this.viewport.pan.y) / this.viewport.zoom);
  }

  // ---- the query capability (read-only scene access for gestures/effects) ----
  readonly query: Query = {
    anchor: (id) => this.anchorMap.get(id),
    anchors: (pred) => {
      const out: Anchor[] = [];
      for (const a of this.anchorMap.values()) if (!pred || pred(a)) out.push(a);
      return out;
    },
    nearestAnchor: (p, radius, pred) => {
      let best: Anchor | undefined, bestD = radius;
      for (const a of this.anchorMap.values()) {
        if (pred && !pred(a)) continue;
        const d = Math.hypot(a.pos.x - p.x, a.pos.y - p.y);
        if (d <= bestD) { bestD = d; best = a; }
      }
      return best;
    },
    mods: this.mods,   // same object; pointer handlers mutate it in place
  };

  // ---- input pipeline (public: DOM wiring and tests both call these) ---------
  pointerDown(p: Vec, mods?: Partial<Mods>) {
    Object.assign(this.mods, mods);
    this.pointer = p;
    const hit = this.interactiveHit(this.root, p);
    if (hit) {
      const eff = this.eff(hit);
      const node = this.nodeOf(hit);
      const lp = this.layerPoint(this.layerOfInst(hit), p);
      // gestures get first crack; begin() may decline with null
      for (const it of eff.on ?? []) {
        if (it.kind === "gesture") {
          const s = it.spec.begin(node, lp, this.query);
          if (s !== null) { this.gesture = { inst: hit, spec: it.spec, state: s }; break; }
        }
      }
      const drag = this.gesture ? undefined
        : eff.on!.find((i): i is Extract<Interactor<unknown>, { kind: "drag1d" }> => i.kind === "drag1d");
      if (!this.gesture && !drag && eff.on!.some((i) => i.kind === "pan")) {
        this.panDrag = { pan0: { ...this.viewport.pan }, p0: p };
      }
      this.press = { inst: hit, p0: p, moved: false, drag };
      if (drag) this.dispatchDrag(hit, drag, p);
      if (eff.on!.some((i) => i.kind === "focusable")) this.focus = hit;
      else if (!this.gesture && !drag) this.focus = null;
    } else {
      this.focus = null;
    }
    this.wake();
  }

  pointerMove(p: Vec, mods?: Partial<Mods>) {
    Object.assign(this.mods, mods);
    this.pointer = p;
    if (this.press && Math.hypot(p.x - this.press.p0.x, p.y - this.press.p0.y) > 4) this.press.moved = true;
    if (this.gesture) {
      const g = this.gesture;
      const lp = this.layerPoint(this.layerOfInst(g.inst), p);
      const node = this.nodeOf(g.inst);
      if (g.spec.move) g.state = g.spec.move(g.state, node, lp, this.query);
      const live = g.spec.during?.(g.state, node, lp, this.query);
      if (live != null) this.dispatch(live as TIntent);
    } else if (this.panDrag) {
      this.viewport.pan = v(this.panDrag.pan0.x + (p.x - this.panDrag.p0.x), this.panDrag.pan0.y + (p.y - this.panDrag.p0.y));
    } else if (this.press?.drag) {
      this.dispatchDrag(this.press.inst, this.press.drag, p);
    }
    this.wake();
  }

  pointerUp(p: Vec) {
    this.pointer = p;
    const ps = this.press; this.press = null;
    const g = this.gesture; this.gesture = null;
    this.panDrag = null;
    if (g) {
      const lp = this.layerPoint(this.layerOfInst(g.inst), p);
      const out = g.spec.up?.(g.state, this.nodeOf(g.inst), lp, this.query);
      if (out !== undefined && out !== null) {
        for (const i of Array.isArray(out) ? out : [out]) if (i != null) this.dispatch(i as TIntent);
      }
    }
    // a clean click (no movement) still runs press behaviors, gesture or not
    if (ps && !ps.drag && !ps.moved && this.hitTest(ps.inst, p)) {
      for (const it of this.eff(ps.inst).on ?? []) {
        if (it.kind === "press") {
          const intent = it.to(this.nodeOf(ps.inst));
          if (intent != null) this.dispatch(intent as TIntent);
        }
      }
    }
    this.wake();
  }

  wheel(delta: number, at: Vec) {
    // zoom only when some part opted in via Pan()
    if (!this.anyPan(this.root)) return;
    const z0 = this.viewport.zoom;
    const z1 = clamp(z0 * Math.exp(-delta * 0.0011), 0.25, 3);
    this.viewport.pan = v(at.x - (at.x - this.viewport.pan.x) * (z1 / z0), at.y - (at.y - this.viewport.pan.y) * (z1 / z0));
    this.viewport.zoom = z1;
    this.wake();
  }

  key(k: string) {
    // focus first, then the hover chain, then the root
    const chain: Instance[] = [];
    if (this.focus) chain.push(this.focus);
    let h = this.pointer ? this.renderHit(this.root, this.pointer) : null;
    while (h) { chain.push(h); h = h.parent ?? null; }
    if (!chain.includes(this.root)) chain.push(this.root);
    for (const inst of chain) {
      for (const it of this.eff(inst).on ?? []) {
        if (it.kind === "keys" && it.map[k]) {
          const intent = it.map[k](this.nodeOf(inst));
          if (intent != null) this.dispatch(intent as TIntent);
          this.wake();
          return;
        }
      }
    }
  }

  // ---- DOM wiring ----------------------------------------------------------
  private attach(canvas: HTMLCanvasElement) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.floor(w * this.dpr); canvas.height = Math.floor(h * this.dpr);
      this.viewW = w; this.viewH = h;
      this.wake();
    };
    resize();
    new ResizeObserver(resize).observe(canvas);
    window.addEventListener("resize", resize);

    const pos = (ev: PointerEvent | WheelEvent): Vec => {
      const b = canvas.getBoundingClientRect();
      return v(ev.clientX - b.left, ev.clientY - b.top);
    };
    const m = (ev: PointerEvent) => ({ shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey || ev.metaKey });
    canvas.addEventListener("pointerdown", (ev) => { this.pointerDown(pos(ev), m(ev)); canvas.setPointerCapture(ev.pointerId); });
    canvas.addEventListener("pointermove", (ev) => this.pointerMove(pos(ev), m(ev)));
    canvas.addEventListener("pointerup", (ev) => this.pointerUp(pos(ev)));
    canvas.addEventListener("pointerleave", () => { this.pointer = null; this.wake(); });
    canvas.addEventListener("wheel", (ev) => { ev.preventDefault(); this.wheel(ev.deltaY, pos(ev)); }, { passive: false });
    window.addEventListener("keydown", (ev) => this.key(ev.key));

    // debug hooks (deterministic stepping from the console)
    const w = window as unknown as Record<string, unknown>;
    w.gratify = this;
    w.gratifyStep = (n = 1, dt = 1 / 60) => { this.stopped = true; this.step(n as number, dt as number); };
    w.gratifyResume = () => { this.stopped = false; this.wake(); };

    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  private dispatchDrag(inst: Instance, drag: Extract<Interactor<unknown>, { kind: "drag1d" }>, p: Vec) {
    const lp = this.layerPoint(this.layerOfInst(inst), p);
    const f = axisFraction(inst.rect, drag.axis, drag.pad ?? 8, lp.x, lp.y);
    const intent = drag.to(this.nodeOf(inst), f);
    if (intent != null) this.dispatch(intent as TIntent);
  }

  private wake() {
    this.idleT = 0;
    if (!this.awake && !this.stopped) {
      this.awake = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.frame(t));
    }
  }

  private frame(now: number) {
    if (this.stopped) return;
    const dt = Math.min((now - this.last) / 1000 || 0, 0.05);
    this.last = now;
    this.tick(dt);
    if (this.moving) this.idleT = 0; else this.idleT += dt;
    if (this.idleT > 0.4) { this.awake = false; return; }   // sleep until woken
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---- one frame -----------------------------------------------------------
  tick(dt: number) {
    this.time += dt;
    const themeFading = tickTheme(dt);
    if (this.dirty) { this.root = reconcile(this.root, this.app.view(this.doc)); this.dirty = false; }
    this.layout(this.root, dt);
    this.publishAnchors();
    this.syncGestureView(dt);
    this.animate(this.root, dt);
    if (this.gestureRoot) this.animate(this.gestureRoot, dt, null);
    for (const f of this.fx) f.update(dt);
    this.fx = this.fx.filter((f) => !f.done);
    this.prune(this.root);
    if (this.gestureRoot) this.prune(this.gestureRoot);
    this.render();

    const sig = this.signature(this.root) + (this.gestureRoot ? this.signature(this.gestureRoot) : 0);
    this.moving = themeFading || this.fx.length > 0 || this.dirty || !!this.press || !!this.gesture ||
      Math.abs(sig - this.lastSig) > 0.002;
    this.lastSig = sig;
  }

  // ---- layout: measure bottom-up, place top-down, springs glide -------------
  private sizes = new Map<Instance, Vec>();

  private measureInst(inst: Instance): Vec {
    const part = this.eff(inst);
    const kidSizes = inst.children.map((c) => this.measureInst(c));
    let s: Vec;
    if (part.size) s = part.size(inst.props, this.painter.measure);
    else if (part.measure) s = part.measure(inst.props, kidSizes, this.painter.measure);
    else s = kidSizes.reduce((m, k) => v(Math.max(m.x, k.x), Math.max(m.y, k.y)), v(0, 0));
    this.sizes.set(inst, s);
    return s;
  }

  private placeInst(inst: Instance, target: Rect) {
    inst.target = target;
    const part = this.eff(inst);
    if (part.place && inst.children.length) {
      const kids = inst.children.map((c) => ({ key: c.key, size: this.sizes.get(c)!, props: c.props }));
      const rects = part.place(inst.props, target, kids);
      inst.children.forEach((c, i) => this.placeInst(c, rects[i]));
    } else {
      for (const c of inst.children) this.placeInst(c, new Rect(target.x, target.y, this.sizes.get(c)?.x ?? 0, this.sizes.get(c)?.y ?? 0));
    }
  }

  private stepRects(inst: Instance, dt: number) {
    const t = inst.target;
    if (!inst.placed) {
      inst.sx.set(t.x); inst.sy.set(t.y); inst.cw = t.w; inst.chh = t.h;
      inst.placed = true;
    } else if (!inst.exiting) {
      inst.sx.step(t.x, POS_SPRING.k, POS_SPRING.d, dt);
      inst.sy.step(t.y, POS_SPRING.k, POS_SPRING.d, dt);
      inst.cw = approach(inst.cw, t.w, SIZE_RATE, dt);
      inst.chh = approach(inst.chh, t.h, SIZE_RATE, dt);
    }
    inst.rect = new Rect(inst.sx.v, inst.sy.v, inst.cw, inst.chh);
    for (const c of inst.children) this.stepRects(c, dt);
    for (const g of inst.ghosts) this.stepRects(g, dt);
  }

  private layout(root: Instance, dt: number) {
    this.sizes.clear();
    const s = this.measureInst(root);
    this.placeInst(root, new Rect(0, 0, Math.max(s.x, this.viewW), Math.max(s.y, this.viewH)));
    this.stepRects(root, dt);
  }

  // ---- anchors: published by layout, read through Query (guide §5b) ----------
  private publishAnchors() {
    this.anchorMap.clear();
    const rec = (inst: Instance) => {
      const part = this.eff(inst);
      if (part.anchors) {
        for (const a of part.anchors(this.nodeOf(inst))) {
          this.anchorMap.set(a.id, { ...a, key: inst.key });
        }
      }
      for (const c of inst.children) rec(c);
    };
    rec(this.root);
  }

  // ---- gesture preview view (overlay elements while a gesture runs) ----------
  private syncGestureView(dt: number) {
    const els = this.gesture?.spec.view?.(this.gesture.state, this.query) ?? [];
    if (els.length || this.gestureRoot?.children.length || this.gestureRoot?.ghosts.length) {
      const rootEl: Element = { key: "__gestures", part: GESTURE_ROOT, props: {}, children: els, layer: "overlay" };
      this.gestureRoot = reconcile(this.gestureRoot, rootEl);
      this.layout(this.gestureRoot, dt);
    } else {
      this.gestureRoot = null;
    }
  }

  // ---- channels: targets re-derived every frame, values chase ---------------
  private nodeOf(inst: Instance): GNode<unknown> {
    const lp = this.pointer ? this.layerPoint(this.layerOfInst(inst), this.pointer) : undefined;
    return {
      key: inst.key, props: inst.props, rect: inst.rect, ch: inst.ch, states: inst.states,
      pointer: lp,
      spawn: (f) => this.spawnFx(f as Fx),
      anchor: (id) => this.anchorMap.get(id)?.pos,
      kick: (k, val = 1) => { inst.ch[k] = val; this.wake(); },
      view: { pan: this.viewport.pan, zoom: this.viewport.zoom, w: this.viewW, h: this.viewH },
    };
  }

  private layerOfInst(inst: Instance): Layer {
    let cur: Instance | undefined = inst;
    while (cur) { if (cur.el.layer) return cur.el.layer; cur = cur.parent; }
    return "world";
  }

  private layerPoint(layer: Layer, p: Vec): Vec {
    return layer === "screen" ? p : this.toWorld(p);
  }

  private hoverInst(): Instance | null {
    return this.pointer ? this.renderHit(this.root, this.pointer) : null;
  }

  private hitTest(inst: Instance, p: Vec): boolean {
    const lp = this.layerPoint(this.layerOfInst(inst), p);
    const part = this.eff(inst);
    return part.hit ? part.hit(this.nodeOf(inst), lp) : inst.rect.contains(lp);
  }

  private renderHit(inst: Instance, p: Vec): Instance | null {
    for (let i = inst.children.length - 1; i >= 0; i--) {
      const hit = this.renderHit(inst.children[i], p);
      if (hit) return hit;
    }
    const part = this.eff(inst);
    if ((part.render || part.on?.length) && this.hitTest(inst, p)) return inst;
    return null;
  }

  /** Nearest self-or-ancestor of the hit with interactors attached. */
  private interactiveHit(root: Instance, p: Vec): Instance | null {
    let cur: Instance | null | undefined = this.renderHit(root, p);
    while (cur && !this.eff(cur).on?.length) cur = cur.parent;
    return cur ?? null;
  }

  private anyPan(inst: Instance): boolean {
    if (this.eff(inst).on?.some((i) => i.kind === "pan")) return true;
    return inst.children.some((c) => this.anyPan(c));
  }

  private animate(inst: Instance, dt: number, hovered?: Instance | null) {
    if (hovered === undefined) hovered = this.hoverInst();

    // automatic channels
    if (!inst.exiting) inst.ch.enter = approach(inst.ch.enter, 1, 6, dt);
    else inst.ch.exit = approach(inst.ch.exit || 0, 1, 7, dt);
    inst.ch.hover = approach(inst.ch.hover || 0, inst === hovered ? 1 : 0, 16, dt);
    inst.ch.press = approach(inst.ch.press || 0, this.press?.inst === inst ? 1 : 0, 22, dt);
    inst.ch.drag = approach(inst.ch.drag || 0, this.gesture?.inst === inst ? 1 : 0, 14, dt);
    inst.ch.focus = approach(inst.ch.focus || 0, this.focus === inst ? 1 : 0, 14, dt);

    // state-tag channels (every tag ever seen keeps fading in/out)
    for (const k of inst.stateKeys)
      inst.ch[k] = approach(inst.ch[k] || 0, inst.states.has(k) ? 1 : 0, 10, dt);

    // part-declared channels (incl. extension-appended ones)
    const decls = this.eff(inst).channels;
    if (decls) {
      const node = this.nodeOf(inst);
      for (const k in decls) {
        const spec = decls[k];
        if (spec.decay !== undefined) {
          // impulse: kick() sets it, it fades to rest
          inst.ch[k] = approach(inst.ch[k] || 0, 0, spec.decay, dt);
          continue;
        }
        const target = spec.target ? spec.target(node) : 0;
        if (!(k in inst.ch)) {
          inst.ch[k] = target;                        // first frame: snap
          if (spec.spring) inst.chSprings[k] = new Spring(target);
        } else if (spec.spring) {
          const sp = (inst.chSprings[k] ||= new Spring(inst.ch[k]));
          inst.ch[k] = sp.step(target, spec.spring.stiffness, spec.spring.damping, dt);
        } else {
          inst.ch[k] = approach(inst.ch[k], target, spec.rate ?? 10, dt);
        }
      }
    }

    for (const c of inst.children) this.animate(c, dt, hovered);
    for (const g of inst.ghosts) this.animate(g, dt, hovered);
  }

  private prune(inst: Instance) {
    inst.ghosts = inst.ghosts.filter((g) => (g.ch.exit || 0) < 0.99);
    for (const c of inst.children) this.prune(c);
  }

  private signature(inst: Instance): number {
    let s = 0;
    const rec = (i: Instance) => {
      for (const k in i.ch) s += i.ch[k];
      s += (i.sx.v + i.sy.v + i.cw + i.chh) * 0.01;
      for (const c of i.children) rec(c);
      for (const g of i.ghosts) rec(g);
    };
    rec(inst);
    return s;
  }

  // ---- paint: world (transformed) → overlay (transformed, on top) → screen ----
  private render() {
    const p = this.painter;
    p.clear(tokens.bg, this.viewW, this.viewH);
    p.view(this.viewport.pan, this.viewport.zoom, this.dpr);
    this.draw(this.root, p, "world", "world");
    this.draw(this.root, p, "overlay", "world");
    if (this.gestureRoot) this.draw(this.gestureRoot, p, "overlay", "overlay");
    for (const f of this.fx) f.draw(p);
    p.screen(this.dpr);
    this.draw(this.root, p, "screen", "world");
  }

  private draw(inst: Instance, p: Painter, pass: Layer, inherited: Layer) {
    const layer = inst.el.layer ?? inherited;
    p.push();
    const en = clamp(inst.ch.enter, 0, 1);
    const ex = clamp(inst.ch.exit || 0, 0, 1);
    if (en < 1) { p.alpha(en); p.scaleAt(inst.rect.center.x, inst.rect.center.y, 0.8 + 0.2 * easeOutBack(en)); }
    if (ex > 0) { p.alpha(1 - ex); p.scaleAt(inst.rect.center.x, inst.rect.center.y, 1 - 0.25 * ex); }

    if (layer === pass) {
      const part = this.eff(inst);
      if (part.render) {
        const style = part.style ? part.style(tokens, inst.ch, inst.props) : {};
        part.render(this.nodeOf(inst), p, style);
      }
    }
    for (const g of inst.ghosts) this.draw(g, p, pass, layer);
    for (const c of inst.children) this.draw(c, p, pass, layer);
    p.pop();
  }
}

/** Mount a Gratify app on a canvas. The entire framework entry point. */
export function mount<TDoc, TIntent>(
  canvas: HTMLCanvasElement,
  app: AppSpec<TDoc, TIntent>,
): Runtime<TDoc, TIntent> {
  return new Runtime(canvas, app);
}

export type { Intentish };
