// marquee.ts — rubber-band selection as ONE reusable gesture, zero framework
// edits (the same shape as node-editor/slice.ts). Drag on the surface: a
// translucent rectangle previews the selection as an ordinary overlay
// element; on release the world-space rect and the modifier keys leave as the
// intent the host asked for. The host decides what "inside the rect" means.
//
// It declines while Alt is held, so a Pan() listed after it still pans.

import { calpha, Gesture, GNode, Interactor, Intentish, Mods, part, Rect, rect, Vec } from "gratify";

const MarqueeBox = part("marquee-box")
  .props<{ a: Vec; b: Vec }>()
  .style((t) => ({ fill: calpha(t.accent, 0.12), edge: calpha(t.accent, 0.8) }))
  .render((n, p, s) => p.box(rectOf(n.props.a, n.props.b), 2, s.fill, s.edge, 1));

/** The normalized rect between two corners. */
export const rectOf = (a: Vec, b: Vec): Rect =>
  rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));

export interface MarqueeOpts<P> {
  /** What a completed drag emits. `r` is relative to the host's rect origin —
   *  the host's content coordinates, whether it is the whole canvas or a pane;
   *  `host` is the surface node, so the intent can come from its props. */
  select(r: Rect, mods: Mods, host: GNode<P>): Intentish;
  /** Drags shorter than this (px) are clicks, not marquees. Default 4. */
  threshold?: number;
}

export function marquee<P = unknown>(opts: MarqueeOpts<P>): Interactor<P> {
  const threshold = opts.threshold ?? 4;
  const long = (s: { a: Vec; b: Vec }) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) >= threshold;
  return Gesture<P, { a: Vec; b: Vec; mods: Mods }>({
    begin: (_n, p, q) => (q.mods.alt ? null : { a: p, b: p, mods: { ...q.mods } }),
    move: (s, _n, p, q) => ({ ...s, b: p, mods: { ...q.mods } }),
    view: (s) => (long(s) ? [MarqueeBox("marquee", { a: s.a, b: s.b })] : []),
    up: (s, n) => {
      if (!long(s)) return;
      const r = rectOf(s.a, s.b);
      return opts.select(rect(r.x - n.rect.x, r.y - n.rect.y, r.w, r.h), s.mods, n);
    },
  });
}
