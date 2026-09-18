// ============================================================================
// Windows — floating, draggable, resizable glass panels on a Desktop.
//
//   Desktop  — a container that fills its room and places each child Window
//              by its own frame/mode: at its frame, over the whole desktop
//              when maximized, or as a pill in a dock along the bottom when
//              minimized. Child order IS z-order (last child is on top).
//   Window   — a composite: frame + shadow + one gesture that both moves
//              (from the title bar) and resizes (from any edge or corner);
//              its body is a clipping chrome of title bar + content slot.
//   WindowTitleBar / WindowControl — the chrome pieces, exported so a theme
//              can restyle them by name.
//
// Every state change is an ordinary keyed re-render, so all the motion is the
// framework's: opening pops in (enter), closing shrinks away (exit), minimize
// glides into the dock and restore glides back (position springs + size
// ease), maximize squares the corners (a channel), focus deepens the shadow
// (a channel), and a drag lifts the whole window (the drag channel).
//
// The app owns the state as a `WindowSet` (window-math.ts) and routes every
// chrome event through `reduceWindows`. The parts never touch it directly.
// ============================================================================

import { calpha, clamp, rect, Rect, rgb, v, Vec } from "./core";
import { Focusable, Intentish } from "./interact";
import { part } from "./part";
import { grow, Element } from "./scene";
import { Row, Stack } from "./containers";
import {
  clampFrame, edgeAt, frameRect, placeWindow, ResizeEdge, resizeFrame, snapToBounds, WindowEvent,
  WindowFrame, WindowMode,
} from "./window-math";

/** Height of the title bar, and of a dock pill. */
export const WINDOW_TITLE_H = 36;
/** Size of a minimized window's dock pill. */
export const WINDOW_PILL: Vec = v(176, WINDOW_TITLE_H);

const CORNER = 14;
const EDGE = 7;             // resize grab band, px each side of the boundary
const SNAP = 10;            // magnetic edge distance while dragging
const KEEP = 56;            // px of a window that must stay on the desktop
const CONTROL = 22;         // hit size of a control dot
const finiteOr = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

// ── Control dots ──────────────────────────────────────────────────────────────
// Quiet glass dots that bloom into their color and reveal a glyph on hover,
// and squash on press. close → danger · minimize → accent2 · maximize/restore
// → accent, all from tokens so a theme recolors them.

export type WindowControlKind = "close" | "minimize" | "maximize" | "restore";

export interface WindowControlProps { kind: WindowControlKind; to: Intentish }

export const WindowControl = part("window-control")
  .props<WindowControlProps>()
  .intrinsic(CONTROL, CONTROL)
  .style((t, ch, p) => {
    const tint = p.kind === "close" ? t.danger : p.kind === "minimize" ? t.accent2 : t.accent;
    return {
      fill: t.mix(calpha(t.textBright, 0.16), tint, ch.hover),
      glyph: calpha(t.textBright, 0.45 + 0.55 * ch.hover),
      halo: tint,
      blur: 12 * ch.hover,
      r: 6.5 + 1.5 * ch.hover - 1.5 * ch.press,
    };
  })
  .render((n, p, s) => {
    const c = n.rect.center, k = s.r * 0.42;
    p.glow(s.halo, s.blur, () => p.dot(c, s.r, s.fill));
    switch (n.props.kind) {
      case "close":
        p.line(v(c.x - k, c.y - k), v(c.x + k, c.y + k), s.glyph, 1.6);
        p.line(v(c.x - k, c.y + k), v(c.x + k, c.y - k), s.glyph, 1.6);
        break;
      case "minimize":
        p.line(v(c.x - k, c.y), v(c.x + k, c.y), s.glyph, 1.6);
        break;
      case "maximize":
        p.box(rect(c.x - k, c.y - k, 2 * k, 2 * k), 1.5, calpha(s.glyph, 0), s.glyph, 1.4);
        break;
      case "restore":
        p.box(rect(c.x - k, c.y - k * 0.3, 1.3 * k, 1.3 * k), 1, calpha(s.glyph, 0), s.glyph, 1.3);
        p.box(rect(c.x - k * 0.3, c.y - k, 1.3 * k, 1.3 * k), 1, calpha(s.glyph, 0), s.glyph, 1.3);
        break;
    }
  })
  .press((n) => n.props.to)
  .semantics((n) => ({ role: "button", label: n.props.kind }));

// ── Title bar ─────────────────────────────────────────────────────────────────
// Paints the title itself (so its color can cross-fade with `active`) and
// places its one child — the controls row — flush right. It carries no
// interactors: a press on it walks up to the Window, whose gesture reads the
// title-bar band by geometry. That is what makes the whole window lift.

export interface WindowTitleBarProps { title: string; active: boolean; states?: Record<string, boolean> }

export const WindowTitleBar = part("window-title")
  .props<WindowTitleBarProps>()
  .measure((_p, avail) => v(finiteOr(avail.x, 240), WINDOW_TITLE_H))
  .arrange((_p, r, kids) =>
    kids.map((k) => new Rect(r.right - 10 - k.size.x, r.y + (r.h - k.size.y) / 2, k.size.x, k.size.y)))
  .channels({ active: { target: (n) => (n.props.active ? 1 : 0), rate: 12 } })
  .style((t, ch) => ({
    band: calpha(t.textBright, 0.035),
    rule: calpha(t.textBright, 0.07),
    text: t.mix(t.textDim, t.textBright, ch.active),
  }))
  .render((n, p, s) => {
    const r = n.rect;
    p.box(r, 0, s.band);
    p.line(v(r.x, r.bottom - 0.5), v(r.right, r.bottom - 0.5), s.rule, 1);
    p.label(n.props.title, v(r.x + 14, r.center.y), s.text, { align: "left", weight: 600, size: 13 });
  });

// ── Chrome + content ──────────────────────────────────────────────────────────
// The chrome is a Stack that sizes itself from the window's mode — its frame,
// the room it is offered (maximized), or a dock pill (minimized) — and clips
// everything inside to that box. Stack's own arrange stacks title over
// content; `grow(content)` hands the content the remaining height.

interface ChromeProps { mode: WindowMode; size: Vec; pad?: number; gap?: number; align?: "stretch" }

const WindowChrome = part("window-chrome")
  .props<ChromeProps>()
  .defaults({ pad: 0, gap: 0, align: "stretch" as const })
  .measure((p, avail, m) => {
    const size = p.mode === "maximized" ? v(finiteOr(avail.x, p.size.x), finiteOr(avail.y, p.size.y))
      : p.mode === "minimized" ? WINDOW_PILL : p.size;
    m.children(v(size.x, Infinity));
    return size;
  })
  .arrange(Stack.def.arrange!)
  .clip();

/** The content slot: a padded, stretched Stack. Restyle by name to change
 *  every window's inner padding at once. */
export const WindowContent = part("window-content")
  .props<{ pad?: number; gap?: number; align?: "start" | "center" | "end" | "stretch" }>()
  .defaults({ pad: 14, gap: 10, align: "stretch" as const })
  .measure(Stack.def.measure!)
  .arrange(Stack.def.arrange!);

// ── Window ────────────────────────────────────────────────────────────────────

export interface WindowProps {
  id: string;
  title: string;
  frame: WindowFrame;
  mode?: WindowMode;
  /** Drawn as the front window: deeper shadow, accent hairline, bright title. */
  active?: boolean;
  /** Smallest size a resize may reach. Default 180 × 120. */
  minSize?: Vec;
  /** Every chrome event — move, resize, close, minimize, maximize, focus —
   *  leaves through here; hand it to `reduceWindows` in `update`. */
  to(ev: WindowEvent): Intentish;
  states?: Record<string, boolean>;
}

type Drag =
  | { kind: "move"; grab: Vec; size: Vec }
  | { kind: "resize"; edge: ResizeEdge; start: WindowFrame; p0: Vec };

/** Desktop bounds a drag snaps and clamps to: the viewport, which is the
 *  desktop whenever the Desktop is the root (the usual arrangement). */
const boundsOf = (view?: { w: number; h: number }): Rect | undefined =>
  view ? rect(0, 0, view.w, view.h) : undefined;

export const Window = part("window")
  .props<WindowProps>()
  .defaults({ mode: "normal" as WindowMode, active: false, minSize: v(180, 120) })
  .body((p, children): Element[] => {
    const mini = p.mode === "minimized";
    const ctl = (kind: WindowControlKind, ev: WindowEvent) => WindowControl(kind, { kind, to: p.to(ev) });
    const controls = mini
      ? [ctl("close", { kind: "close", id: p.id })]
      : [
          ctl("minimize", { kind: "minimize", id: p.id }),
          ctl(p.mode === "maximized" ? "restore" : "maximize", { kind: "toggle-max", id: p.id }),
          ctl("close", { kind: "close", id: p.id }),
        ];
    return [
      WindowChrome("chrome", { mode: p.mode, size: p.frame.size }, [
        WindowTitleBar("title", { title: p.title, active: p.active }, [Row("controls", { gap: 4 }, controls)]),
        ...(mini ? [] : [grow(WindowContent("content", {}, children))]),
      ]),
    ];
  })
  .channels({
    active: { target: (n) => (n.props.active ? 1 : 0), rate: 12 },
    max: { target: (n) => (n.props.mode === "maximized" ? 1 : 0), rate: 14 },
    mini: { target: (n) => (n.props.mode === "minimized" ? 1 : 0), rate: 14 },
    // 1 while the pointer rests in the resize band — the edge lights up
    edge: { target: (n) => (n.ch.hover > 0.5 && n.pointer && edgeAt(n.rect, n.pointer, EDGE) ? 1 : 0), rate: 16 },
  })
  .style((t, ch) => {
    const active = clamp(ch.active, 0, 1), drag = clamp(ch.drag, 0, 1);
    const emphasis = Math.max(active, 0.6 * ch.focus);
    return {
      fill: calpha(t.mix(t.bg, t.surface, 0.78), 0.94),
      edge: t.mix(calpha(t.textBright, 0.14), calpha(t.accent, 0.8), Math.max(emphasis, ch.edge)),
      edgeW: 1 + 0.6 * ch.edge,
      sheen: calpha(t.textBright, 0.10 + 0.08 * emphasis),
      shadow: calpha(rgb(0, 0, 0), 0.32 + 0.28 * emphasis + 0.2 * drag),
      blur: 12 + 20 * emphasis + 16 * drag,
      corner: (CORNER + 6 * ch.mini) * (1 - ch.max),
      lift: 5 * drag,
      scale: 1 + 0.012 * drag,
      grip: calpha(t.mix(t.textDim, t.accent, ch.edge), (0.35 + 0.65 * ch.edge) * (1 - ch.max) * (1 - ch.mini)),
    };
  })
  .render((n, p, s) => {
    const r = n.rect;
    // Not wrapped in push/pop on purpose: the lift and scale apply to the
    // whole subtree (drawPass scopes render + children in one push/pop), so
    // a dragged window rises as one object.
    p.translate(0, -s.lift);
    p.scaleAt(r.center.x, r.center.y, s.scale);
    p.glow(s.shadow, s.blur, () => p.box(r, s.corner, s.fill));
    p.box(r, s.corner, calpha(s.fill, 0), s.edge, s.edgeW);
    // top sheen: a hairline of light just inside the top edge
    p.line(v(r.x + s.corner, r.y + 1.5), v(r.right - s.corner, r.y + 1.5), s.sheen, 1);
    // resize grip: three diagonal ticks in the bottom-right corner
    for (const k of [4, 8, 12]) p.line(v(r.right - 4, r.bottom - k), v(r.right - k, r.bottom - 4), s.grip, 1.2);
  })
  .hit((n, q) => n.rect.inset(-EDGE).contains(q))
  .on(Focusable())
  .press((n) => n.props.to(n.props.mode === "minimized" ? { kind: "restore", id: n.props.id } : { kind: "focus", id: n.props.id }))
  .gesture<Drag>({
    begin: (n, q) => {
      if (n.props.mode !== "normal") return null;
      const edge = edgeAt(n.rect, q, EDGE);
      if (edge) return { kind: "resize", edge, start: n.props.frame, p0: q };
      if (q.y < n.rect.y + WINDOW_TITLE_H) return { kind: "move", grab: v(q.x - n.rect.x, q.y - n.rect.y), size: n.props.frame.size };
      return null;
    },
    during: (d, n, q) => {
      const bounds = boundsOf(n.view);
      if (d.kind === "resize") return n.props.to({ kind: "frame", id: n.props.id, frame: resizeFrame(d.start, d.edge, v(q.x - d.p0.x, q.y - d.p0.y), n.props.minSize) });
      let frame: WindowFrame = { pos: v(q.x - d.grab.x, q.y - d.grab.y), size: d.size };
      if (bounds) frame = clampFrame(snapToBounds(frame, bounds, SNAP), bounds, KEEP);
      return n.props.to({ kind: "frame", id: n.props.id, frame });
    },
  })
  .semantics((n) => ({ role: "window", label: n.props.title, value: n.props.mode }));

// ── Desktop ───────────────────────────────────────────────────────────────────

export interface DesktopProps {
  /** Margin between the desktop's edge and maximized windows / the dock. */
  inset?: number;
  states?: Record<string, boolean>;
}

/** Fills the room it is given and places each child Window by its props.
 *  Children are Windows in z-order, bottom to top (`windowsOf(set)`). Frame
 *  positions are in the desktop's layer coordinates — the same ones a drag
 *  reports — so a frame at (0, 0) sits at the layer origin, not at the
 *  inset corner; `inset` only pads maximized windows and the dock. */
export const Desktop = part("desktop")
  .props<DesktopProps>()
  .defaults({ inset: 0 })
  .measure((p, avail, m) => {
    m.children(v(avail.x - 2 * p.inset, avail.y - 2 * p.inset));
    return avail;
  })
  .arrange((p, r, kids) => {
    const bounds = r.inset(p.inset);
    let slot = 0;
    return kids.map((k) => {
      const w = k.props as WindowProps;
      const mode = w.mode ?? "normal";
      return mode === "normal"
        ? frameRect(w.frame)
        : placeWindow({ id: w.id, frame: w.frame, mode }, bounds, mode === "minimized" ? slot++ : 0, WINDOW_PILL);
    });
  });
