// ============================================================================
// Gratify runtime — the two-clock loop.
//   clock 1 (state changed): rebuild Element tree via view(doc), keyed reconcile.
//   clock 2 (every frame):   layout targets, step springs/channels, paint.
// Render-on-demand: the loop sleeps when the scene is at rest, wakes on input
// or dispatch. Deterministic step(n, dt) for headless tests.
//
// HOST BOUNDARY (plan §0.1): this file imports no app/example module. The app
// arrives as AppSpec { init, update, view } — nothing else crosses.
// ============================================================================

import { approach, clamp, easeOutBack, Rect, Spring, v, Vec } from "./core";
import { CanvasPainter, NullPainter, Painter } from "./painter";
import { Element, Instance, reconcile } from "./scene";
import { GNode, PartDef } from "./part";
import { axisFraction, Interactor } from "./interact";
import { activeThemeExts, themeVersion, tickTheme, tokens } from "./theme";
import { Fx } from "./fx";

type AnyDef = PartDef<unknown, unknown>;

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

interface PressState {
  inst: Instance;
  x0: number; y0: number;
  moved: boolean;
  drag?: Extract<Interactor<unknown>, { kind: "drag1d" }>;
}

const POS_SPRING = { k: 240, d: 26 };
const SIZE_RATE = 18;

export class Runtime<TDoc, TIntent> {
  painter: Painter;
  doc: TDoc;
  root: Instance;
  fx: Fx[] = [];
  time = 0;

  private dirty = false;
  private dpr = 1;
  private viewW: number; private viewH: number;
  private pointer: Vec | null = null;
  private press: PressState | null = null;
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

    const pos = (ev: PointerEvent): Vec => {
      const b = canvas.getBoundingClientRect();
      return v(ev.clientX - b.left, ev.clientY - b.top);
    };
    canvas.addEventListener("pointerdown", (ev) => {
      const p = pos(ev);
      this.pointer = p;
      const hit = this.interactiveHit(this.root, p);
      if (hit) {
        const drag = this.eff(hit).on!.find((i): i is Extract<Interactor<unknown>, { kind: "drag1d" }> => i.kind === "drag1d");
        this.press = { inst: hit, x0: p.x, y0: p.y, moved: false, drag };
        if (drag) this.dispatchDrag(hit, drag, p);
        canvas.setPointerCapture(ev.pointerId);
      }
      this.wake();
    });
    canvas.addEventListener("pointermove", (ev) => {
      const p = pos(ev);
      this.pointer = p;
      if (this.press) {
        if (Math.hypot(p.x - this.press.x0, p.y - this.press.y0) > 4) this.press.moved = true;
        if (this.press.drag) this.dispatchDrag(this.press.inst, this.press.drag, p);
      }
      this.wake();
    });
    canvas.addEventListener("pointerup", (ev) => {
      const p = pos(ev);
      const ps = this.press;
      this.press = null;
      if (ps && !ps.drag && !ps.moved && ps.inst.rect.contains(p)) {
        // ALL appended press behaviors run (layering rule); null intents are
        // effects-only handlers.
        for (const it of this.eff(ps.inst).on ?? []) {
          if (it.kind === "press") {
            const intent = it.to(this.nodeOf(ps.inst));
            if (intent != null) this.dispatch(intent as TIntent);
          }
        }
      }
      this.wake();
    });
    canvas.addEventListener("pointerleave", () => { this.pointer = null; this.wake(); });

    // debug hooks (deterministic stepping from the console)
    const w = window as unknown as Record<string, unknown>;
    w.gratify = this;
    w.gratifyStep = (n = 1, dt = 1 / 60) => { this.stopped = true; this.step(n as number, dt as number); };
    w.gratifyResume = () => { this.stopped = false; this.wake(); };

    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  private dispatchDrag(inst: Instance, drag: Extract<Interactor<unknown>, { kind: "drag1d" }>, p: Vec) {
    const f = axisFraction(inst.rect, drag.axis, drag.pad ?? 8, p.x, p.y);
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
    this.layout(dt);
    this.animate(this.root, dt);
    for (const f of this.fx) f.update(dt);
    this.fx = this.fx.filter((f) => !f.done);
    this.prune(this.root);
    this.render();

    const sig = this.signature(this.root);
    this.moving = themeFading || this.fx.length > 0 || this.dirty || !!this.press ||
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
      const kidSizes = inst.children.map((c) => this.sizes.get(c)!);
      const rects = part.place(inst.props, target, kidSizes);
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

  private layout(dt: number) {
    this.sizes.clear();
    const s = this.measureInst(this.root);
    this.placeInst(this.root, new Rect(0, 0, Math.max(s.x, this.viewW), Math.max(s.y, this.viewH)));
    this.stepRects(this.root, dt);
  }

  // ---- channels: targets re-derived every frame, values chase ---------------
  private nodeOf(inst: Instance): GNode<unknown> {
    return {
      key: inst.key, props: inst.props, rect: inst.rect, ch: inst.ch, states: inst.states,
      pointer: this.pointer ?? undefined,
      spawn: (f) => this.spawnFx(f as Fx),
    };
  }

  private hoverInst(): Instance | null {
    return this.pointer ? this.renderHit(this.root, this.pointer) : null;
  }

  private renderHit(inst: Instance, p: Vec): Instance | null {
    for (let i = inst.children.length - 1; i >= 0; i--) {
      const hit = this.renderHit(inst.children[i], p);
      if (hit) return hit;
    }
    const part = this.eff(inst);
    if ((part.render || part.on?.length) && inst.rect.contains(p)) return inst;
    return null;
  }

  /** Nearest self-or-ancestor of the hit with interactors attached. */
  private interactiveHit(root: Instance, p: Vec): Instance | null {
    let cur: Instance | null | undefined = this.renderHit(root, p);
    while (cur && !this.eff(cur).on?.length) cur = cur.parent;
    return cur ?? null;
  }

  private animate(inst: Instance, dt: number, hovered?: Instance | null) {
    if (hovered === undefined) hovered = this.hoverInst();

    // automatic channels
    if (!inst.exiting) inst.ch.enter = approach(inst.ch.enter, 1, 6, dt);
    else inst.ch.exit = approach(inst.ch.exit || 0, 1, 7, dt);
    inst.ch.hover = approach(inst.ch.hover || 0, inst === hovered ? 1 : 0, 16, dt);
    inst.ch.press = approach(inst.ch.press || 0, this.press?.inst === inst ? 1 : 0, 22, dt);

    // state-tag channels (every tag ever seen keeps fading in/out)
    for (const k of inst.stateKeys)
      inst.ch[k] = approach(inst.ch[k] || 0, inst.states.has(k) ? 1 : 0, 10, dt);

    // part-declared channels (incl. extension-appended ones)
    const decls = this.eff(inst).channels;
    if (decls) {
      const node = this.nodeOf(inst);
      for (const k in decls) {
        const spec = decls[k];
        const target = spec.target(node);
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

  // ---- paint -----------------------------------------------------------------
  private render() {
    const p = this.painter;
    p.clear(tokens.bg, this.viewW, this.viewH);
    p.screen(this.dpr);
    this.draw(this.root, p);
    for (const f of this.fx) f.draw(p);
  }

  private draw(inst: Instance, p: Painter) {
    p.push();
    const en = clamp(inst.ch.enter, 0, 1);
    const ex = clamp(inst.ch.exit || 0, 0, 1);
    if (en < 1) { p.alpha(en); p.scaleAt(inst.rect.center.x, inst.rect.center.y, 0.8 + 0.2 * easeOutBack(en)); }
    if (ex > 0) { p.alpha(1 - ex); p.scaleAt(inst.rect.center.x, inst.rect.center.y, 1 - 0.25 * ex); }

    const part = this.eff(inst);
    if (part.render) {
      const style = part.style ? part.style(tokens, inst.ch, inst.props) : {};
      part.render(this.nodeOf(inst), p, style);
    }
    for (const g of inst.ghosts) this.draw(g, p);
    for (const c of inst.children) this.draw(c, p);
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
