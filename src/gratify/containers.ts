// ============================================================================
// Built-in layout containers: Stack, Row, Free, Layers. Containers are just
// parts with measure/place facets — a custom layout is a part, no class
// ceremony. Layout results feed position springs, so reflow animates.
// ============================================================================

import { Rect, v, Vec } from "./core";
import { part } from "./part";

export interface StackProps {
  gap?: number;
  pad?: number;
  align?: "start" | "center" | "end";      // cross-axis
  states?: Record<string, boolean>;
}

const alignOff = (align: StackProps["align"], avail: number, size: number) =>
  align === "center" ? (avail - size) / 2 : align === "end" ? avail - size : 0;

/** Vertical flow. */
export const Stack = part<StackProps>("stack", {
  measure(props, kids) {
    const gap = props.gap ?? 8, pad = props.pad ?? 0;
    const w = kids.reduce((m, s) => Math.max(m, s.x), 0);
    const h = kids.reduce((a, s) => a + s.y, 0) + gap * Math.max(0, kids.length - 1);
    return v(w + 2 * pad, h + 2 * pad);
  },
  place(props, r, kids): Rect[] {
    const gap = props.gap ?? 8, pad = props.pad ?? 0;
    const inner = r.w - 2 * pad;
    let y = r.y + pad;
    return kids.map(({ size: s }) => {
      const out = new Rect(r.x + pad + alignOff(props.align, inner, s.x), y, s.x, s.y);
      y += s.y + gap;
      return out;
    });
  },
});

/** Horizontal flow (children vertically centered by default). */
export const Row = part<StackProps>("row", {
  measure(props, kids) {
    const gap = props.gap ?? 8, pad = props.pad ?? 0;
    const w = kids.reduce((a, s) => a + s.x, 0) + gap * Math.max(0, kids.length - 1);
    const h = kids.reduce((m, s) => Math.max(m, s.y), 0);
    return v(w + 2 * pad, h + 2 * pad);
  },
  place(props, r, kids): Rect[] {
    const gap = props.gap ?? 8, pad = props.pad ?? 0;
    const inner = r.h - 2 * pad;
    let x = r.x + pad;
    return kids.map(({ size: s }) => {
      const align = props.align ?? "center";
      const out = new Rect(x, r.y + pad + alignOff(align, inner, s.y), s.x, s.y);
      x += s.x + gap;
      return out;
    });
  },
});

/** Children at explicit positions (child props carry `pos: Vec`) — canvases,
 *  node editors, desktops. Positions feed springs, so moving is animating. */
export const Free = part<{ states?: Record<string, boolean> }>("free", {
  measure: () => v(0, 0),
  place(_props, r, kids): Rect[] {
    return kids.map(({ size, props, pos: elPos }) => {
      // prefer the element-level pos (set via `at(...)`), fall back to props.pos
      const pos = elPos ?? (props as { pos?: Vec })?.pos ?? v(0, 0);
      return new Rect(r.x + pos.x, r.y + pos.y, size.x, size.y);
    });
  },
});

/** Every child gets the full rect (layer stacking: content, overlays, HUD). */
export const Layers = part<{ states?: Record<string, boolean> }>("layers", {
  measure: (_p, kids) => kids.reduce((m, s) => v(Math.max(m.x, s.x), Math.max(m.y, s.y)), v(0, 0)),
  place: (_p, r, kids) => kids.map(() => new Rect(r.x, r.y, r.w, r.h)),
});
