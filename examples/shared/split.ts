// Split — two panes side by side (or stacked) with a draggable divider, and
// Pane, a well that stretches its one child to fill it. Both are ordinary
// parts with measure/arrange; the divider's drag emits `set(fraction)` and the
// app owns the fraction, so a layout is undoable state like any other.
//
//   Split ─ SplitFrame ─┬─ first
//                       ├─ Divider (gesture → set)
//                       └─ second

import { calpha, clamp, Intentish, part, rect, v } from "gratify";

export interface SplitProps {
  /** "x": first | second left to right (default). "y": first over second. */
  axis?: "x" | "y";
  /** The first pane's share, 0..1. */
  at: number;
  /** Smallest share either pane may shrink to. Default 0.1. */
  min?: number;
  set(fraction: number): Intentish;
  /** Fallback size when the container leaves an axis unbounded. */
  width?: number;
  height?: number;
  states?: Record<string, boolean>;
}

export const DIVIDER = 10;
const finiteOr = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

interface FrameProps { axis: "x" | "y"; at: number; min: number; width: number; height: number }

const SplitFrame = part("split-frame")
  .props<FrameProps>()
  .measure((p, avail) => v(finiteOr(avail.x, p.width), finiteOr(avail.y, p.height)))
  .arrange((p, r) => {
    const f = clamp(p.at, p.min, 1 - p.min);
    if (p.axis === "x") {
      const a = f * r.w - DIVIDER / 2;
      return [rect(r.x, r.y, a, r.h), rect(r.x + a, r.y, DIVIDER, r.h), rect(r.x + a + DIVIDER, r.y, r.w - a - DIVIDER, r.h)];
    }
    const a = f * r.h - DIVIDER / 2;
    return [rect(r.x, r.y, r.w, a), rect(r.x, r.y + a, r.w, DIVIDER), rect(r.x, r.y + a + DIVIDER, r.w, r.h - a - DIVIDER)];
  });

interface DividerProps { axis: "x" | "y"; at: number; min: number; extent: number; set(fraction: number): Intentish }

const Divider = part("split-divider")
  .props<DividerProps>()
  .size(() => v(DIVIDER, DIVIDER))
  .style((t, ch) => ({
    bar: t.mix(t.muted, t.accent, 0.25 + 0.6 * ch.hover + 0.3 * ch.press + 0.4 * ch.drag),
    grip: t.mix(t.textDim, t.textBright, ch.hover + ch.drag),
    wide: 1 + 0.6 * ch.hover + 0.6 * ch.drag,
  }))
  .render((n, p, s) => {
    const r = n.rect, c = r.center, x = n.props.axis === "x";
    const w = 2 * s.wide;
    p.box(x ? rect(c.x - w / 2, r.y + 6, w, r.h - 12) : rect(r.x + 6, c.y - w / 2, r.w - 12, w), w / 2, s.bar);
    for (const d of [-7, 0, 7]) p.dot(x ? v(c.x, c.y + d) : v(c.x + d, c.y), 1.5, calpha(s.grip, 0.9));
  })
  .gesture<{ at0: number; p0: number }>({
    begin: (n, pt) => ({ at0: n.props.at, p0: n.props.axis === "x" ? pt.x : pt.y }),
    during: (st, n, pt) => {
      const delta = ((n.props.axis === "x" ? pt.x : pt.y) - st.p0) / Math.max(1, n.props.extent);
      return n.props.set(clamp(st.at0 + delta, n.props.min, 1 - n.props.min));
    },
  })
  .semantics((n) => ({ role: "separator", value: n.props.at }));

/** Two children: the first and second pane. Extra children are ignored. */
export const Split = part("split")
  .props<SplitProps>()
  .defaults({ axis: "x" as const, min: 0.1, width: 480, height: 320 })
  .body((p, kids, _l, size) => [
    SplitFrame("frame", { axis: p.axis, at: p.at, min: p.min, width: size.x || p.width, height: size.y || p.height }, [
      kids[0] ?? Pane("first", {}),
      Divider("divider", { axis: p.axis, at: p.at, min: p.min, extent: p.axis === "x" ? size.x : size.y, set: p.set }),
      kids[1] ?? Pane("second", {}),
    ]),
  ]);

/** A well that fills its room and stretches its single child to fill it. */
export const Pane = part("pane")
  .props<{ states?: Record<string, boolean> }>()
  .fill()
  .arrange((_p, r, kids) => kids.map(() => r))
  .style((t) => ({ well: calpha(t.bg, 0.4), edge: t.muted }))
  .render((n, p, s) => p.box(n.rect, 10, s.well, s.edge, 1));
