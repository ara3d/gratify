// Painter helpers the motion examples share — small shapes built from the
// Painter primitives (box/dot/poly/clip). Geometry only; colors come in.

import { calpha, Color, Painter, Rect, v, Vec } from "gratify";
import { TAU } from "./motion";

/** A translucent diagonal band clipped to `r`, its position `x` in 0..1
 *  running from just off the left edge to just off the right. */
export function sheenBand(p: Painter, r: Rect, x: number, color: Color, width = 0.28) {
  const w = r.w * width, skew = r.h * 0.6;
  const left = r.x - w - skew + (r.w + 2 * w + skew) * x;
  p.push(); p.clip(r);
  p.poly([v(left + skew, r.y), v(left + skew + w, r.y), v(left + w, r.bottom), v(left, r.bottom)], color);
  p.pop();
}

/** Regular polygon vertices (a hexagon by default), `turn` rotates in radians. */
export const polygon = (c: Vec, r: number, sides = 6, turn = 0): Vec[] =>
  Array.from({ length: sides }, (_, i) => {
    const a = turn + (i / sides) * TAU - TAU / 4;
    return v(c.x + r * Math.cos(a), c.y + r * Math.sin(a));
  });

/** A filled pie sector from angle `from` sweeping `span` radians (clockwise),
 *  as polygon vertices — the cooldown wipe. */
export function sectorPoints(c: Vec, r: number, from: number, span: number, steps = 24): Vec[] {
  const pts: Vec[] = [c];
  for (let i = 0; i <= steps; i++) {
    const a = from + span * (i / steps);
    pts.push(v(c.x + r * Math.cos(a), c.y + r * Math.sin(a)));
  }
  return pts;
}

/** A soft radial glow faked from stacked translucent discs (the painter has
 *  no gradients). `alpha` is the total opacity at the center. */
export function bloom(p: Painter, c: Vec, radius: number, color: Color, alpha = 1, layers = 16) {
  for (let i = 1; i <= layers; i++) p.dot(c, radius * (i / layers), calpha(color, alpha / layers));
}
