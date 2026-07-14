// ============================================================================
// Gratify core — platform-neutral value types + the animation primitives.
// Ported from the Kea PoC kernel (labs/kea). No DOM here.
// ============================================================================

// ---- scalars ---------------------------------------------------------------
export const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => (b === a ? 0 : (x - a) / (b - a));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Frame-rate independent exponential approach — used for non-bouncy channels
 *  (color, glow, opacity). `rate` ~ how fast (per second). */
export const approach = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

// ---- Vec2 ------------------------------------------------------------------
export type Vec = { x: number; y: number };
export const v = (x = 0, y = 0): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const vlerp = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const vlen = (a: Vec) => Math.hypot(a.x, a.y);
export const vdist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

// ---- Rect ------------------------------------------------------------------
// A class (not a bag) so authoring code reads well: `node.rect.center`,
// `node.rect.raise(style.lift)`.
export class Rect {
  constructor(public x = 0, public y = 0, public w = 0, public h = 0) {}
  get center(): Vec { return v(this.x + this.w / 2, this.y + this.h / 2); }
  get right(): number { return this.x + this.w; }
  get bottom(): number { return this.y + this.h; }
  /** Same rect shifted up by `lift` px (hover-lift idiom). */
  raise(lift: number): Rect { return new Rect(this.x, this.y - lift, this.w, this.h); }
  inset(d: number): Rect { return new Rect(this.x + d, this.y + d, this.w - 2 * d, this.h - 2 * d); }
  contains(p: Vec): boolean { return p.x >= this.x && p.y >= this.y && p.x <= this.right && p.y <= this.bottom; }
  overlaps(o: Rect): boolean { return this.x < o.right && this.right > o.x && this.y < o.bottom && this.bottom > o.y; }
}
export const rect = (x = 0, y = 0, w = 0, h = 0): Rect => new Rect(x, y, w, h);

// ---- Color (RGBA, r/g/b 0..255, a 0..1) ------------------------------------
export type Color = { r: number; g: number; b: number; a: number };
export const rgb = (r: number, g: number, b: number, a = 1): Color => ({ r, g, b, a });
export const cmix = (a: Color, b: Color, t: number): Color => ({
  r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t), a: lerp(a.a, b.a, t),
});
export const calpha = (c: Color, a: number): Color => ({ r: c.r, g: c.g, b: c.b, a: c.a * a });
export const css = (c: Color) => `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${c.a})`;
/** hsl → rgba. h 0..360, s/l 0..1 */
export function hsl(h: number, s: number, l: number, a = 1): Color {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a };
}
/** desaturate toward grey by amount 0..1 (disabled look). */
export function desat(c: Color, amt: number): Color {
  const y = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  return { r: lerp(c.r, y, amt), g: lerp(c.g, y, amt), b: lerp(c.b, y, amt), a: c.a };
}

// ---- Spring1D — the entire "game feel" is step() ---------------------------
// Semi-implicit Euler toward a target. Retained per Instance so a reconciled
// node springs from where it was.
export class Spring {
  v: number;
  vel = 0;
  constructor(v = 0) { this.v = v; }
  step(target: number, stiffness: number, damping: number, dt: number) {
    const steps = dt > 0.032 ? 2 : 1;   // sub-step for stability at large dt
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const f = stiffness * (target - this.v) - damping * this.vel;
      this.vel += f * h;
      this.v += this.vel * h;
    }
    return this.v;
  }
  set(x: number) { this.v = x; this.vel = 0; }
}
