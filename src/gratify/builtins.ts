// ============================================================================
// Gratify built-in parts: Stack, Row, Label. Containers are just parts with
// measure/place facets — a custom layout is a part, no class ceremony.
// ============================================================================

import { Rect, v } from "./core";
import { part } from "./part";
import { tokens } from "./theme";
import { calpha } from "./core";

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
    return kids.map((s) => {
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
    return kids.map((s) => {
      const align = props.align ?? "center";
      const out = new Rect(x, r.y + pad + alignOff(align, inner, s.y), s.x, s.y);
      x += s.x + gap;
      return out;
    });
  },
});

export interface LabelProps {
  text: string;
  size?: number;
  weight?: number;
  dim?: boolean;
  bright?: boolean;
  states?: Record<string, boolean>;
}

export const Label = part<LabelProps>("label", {
  size: (props, m) => {
    const s = m.text(props.text, props.size ?? 13);
    return v(s.x + 2, Math.max(s.y, 18));
  },
  render(node, p) {
    const props = node.props;
    const base = props.bright ? tokens.textBright : props.dim ? tokens.textDim : tokens.text;
    // any `done`-style strike/dim is the app's business via states; default dims on "done"
    const dim = node.ch.done || 0;
    p.label(props.text, { x: node.rect.x + 1, y: node.rect.center.y },
      calpha(tokens.mix(base, tokens.textDim, dim), 1 - 0.3 * dim),
      { size: props.size ?? 13, weight: props.weight, align: "left" });
  },
});
