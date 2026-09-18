// Pure motion math for time-driven cues — the attention signals, HUD gauges
// and title-screen effects read `node.time` and pass it through these. Nothing
// here touches the runtime, so every curve is unit-tested in tests/motion.test.ts.
// Times are seconds, phases are fractions of a period, outputs are 0..1 unless
// documented otherwise.

import { clamp, Rect, v, Vec } from "gratify";

export const TAU = Math.PI * 2;

/** Positive modulo (JS `%` keeps the sign of the dividend). */
export const mod = (x: number, m: number) => ((x % m) + m) % m;

/** Hermite step: 0 below `e0`, 1 above `e1`, smooth in between. */
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Overshooting, oscillating settle — a "boing" for pop-ins. */
export const easeOutElastic = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;

/** Sine breathing: 0 at the start of each period, 1 halfway through. */
export const breathe = (time: number, period: number, phase = 0) =>
  0.5 - 0.5 * Math.cos(TAU * (time / period + phase));

/** Two quick thumps at the start of each period, then rest — the CTA pulse. */
export function heartbeat(time: number, period: number): number {
  const u = mod(time, period) / period;
  const thump = (c: number, w: number) => Math.exp(-((u - c) * (u - c)) / (2 * w * w));
  return Math.min(1, thump(0.08, 0.035) + 0.7 * thump(0.24, 0.04));
}

/** A band that crosses once per period: its 0..1 position while it is moving
 *  (the first `travel` seconds), null while it rests. */
export const sweep = (time: number, period: number, travel: number): number | null => {
  const u = mod(time, period);
  return u < travel ? u / travel : null;
};

/** Sonar rings: `count` rings launched evenly through each period; each value
 *  is that ring's 0..1 progress through its expansion. */
export const pings = (time: number, period: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => mod(time / period - i / count, 1));

/** Idle nudge: once `idle` seconds have passed since `lastInput`, a raised-
 *  cosine bump of `dur` seconds plays every `every` seconds. */
export function nudge(time: number, lastInput: number, idle: number, every: number, dur: number): number {
  const since = time - lastInput - idle;
  if (since < 0) return 0;
  const u = mod(since, every);
  return u < dur ? 0.5 - 0.5 * Math.cos(TAU * u / dur) : 0;
}

/** Soft-edged blink: on for `duty` of each period, fading over `soft`. */
export function blink(time: number, period: number, duty = 0.6, soft = 0.12): number {
  const u = mod(time, period) / period;
  return smoothstep(0, soft, u) * (1 - smoothstep(duty - soft, duty, u));
}

/** Cascade reveal: item `i`'s own 0..1 progress when the cascade started at
 *  `startedAt`, items begin `gap` seconds apart and each takes `dur`. */
export const cascade = (time: number, startedAt: number, i: number, gap: number, dur: number) =>
  clamp((time - startedAt - i * gap) / dur, 0, 1);

/** Odometer columns, least significant first: the digit showing and its 0..1
 *  roll toward the next one. A column rolls only while every lower column is
 *  completing a 9→0 turn, so 129→130 rolls the 2 and the 9 together. */
export function digitRolls(x: number, columns: number): { digit: number; roll: number }[] {
  const n = Math.max(0, x);
  return Array.from({ length: columns }, (_, i) => {
    const p = 10 ** i;
    return { digit: Math.floor(n / p) % 10, roll: clamp(mod(n, p) - (p - 1), 0, 1) };
  });
}

/** Seconds elapsed since an impulse channel was kicked to 1, recovered from its
 *  current value (it decays as e^(-decay·t)). Lets a render read "how long has
 *  the pointer been down" without any timer state. */
export const impulseAge = (value: number, decay: number) =>
  value <= 0 ? Infinity : Math.max(0, -Math.log(Math.min(1, value)) / decay);

/** Cooldown remaining as 0..1 (1 right after use, 0 once `dur` has passed). */
export const cooldown = (time: number, usedAt: number, dur: number) =>
  clamp(1 - (time - usedAt) / dur, 0, 1);

/** A flash that starts at `at` and fades over `dur`; 0 before `at`. */
export const flash = (time: number, at: number, dur: number) =>
  time < at ? 0 : clamp(1 - (time - at) / dur, 0, 1);

/** Perimeter length of a rounded rect. */
export const perimeter = (r: Rect, corner: number) => {
  const c = Math.min(corner, r.w / 2, r.h / 2);
  return 2 * (r.w - 2 * c) + 2 * (r.h - 2 * c) + TAU * c;
};

const cornerPoint = (cx: number, cy: number, c: number, from: number, k: number): Vec =>
  v(cx + c * Math.cos(from + k * TAU / 4), cy + c * Math.sin(from + k * TAU / 4));

/** The point a fraction `s` of the way around a rounded rect, clockwise from
 *  the top edge's left end (just after the top-left corner). */
export function perimeterPoint(r: Rect, corner: number, s: number): Vec {
  const c = Math.min(corner, r.w / 2, r.h / 2);
  const ew = r.w - 2 * c, eh = r.h - 2 * c, arc = (TAU / 4) * c, safe = Math.max(arc, 1e-9);
  let d = mod(s, 1) * perimeter(r, corner);
  const edges: [number, (t: number) => Vec][] = [
    [ew, (t) => v(r.x + c + t, r.y)],
    [arc, (t) => cornerPoint(r.right - c, r.y + c, c, -TAU / 4, t / safe)],
    [eh, (t) => v(r.right, r.y + c + t)],
    [arc, (t) => cornerPoint(r.right - c, r.bottom - c, c, 0, t / safe)],
    [ew, (t) => v(r.right - c - t, r.bottom)],
    [arc, (t) => cornerPoint(r.x + c, r.bottom - c, c, TAU / 4, t / safe)],
    [eh, (t) => v(r.x, r.bottom - c - t)],
    [arc, (t) => cornerPoint(r.x + c, r.y + c, c, TAU / 2, t / safe)],
  ];
  for (const [len, f] of edges) {
    if (d <= len) return f(d);
    d -= len;
  }
  return v(r.x + c, r.y);
}

/** Marching dashes around a rounded rect: `count` dashes each covering `fill`
 *  of their slot, shifted by `offset` (fractions of the perimeter). Each dash
 *  is two short segments so it bends around corners. */
export function dashes(r: Rect, corner: number, count: number, fill: number, offset: number): [Vec, Vec][] {
  const out: [Vec, Vec][] = [];
  for (let k = 0; k < count; k++) {
    const s0 = k / count + offset, s1 = s0 + fill / count, sm = (s0 + s1) / 2;
    out.push([perimeterPoint(r, corner, s0), perimeterPoint(r, corner, sm)]);
    out.push([perimeterPoint(r, corner, sm), perimeterPoint(r, corner, s1)]);
  }
  return out;
}

/** Deterministic hash → 0..1, for "random" placement that must be stable
 *  across frames (drifting motes, star fields) without stored state. */
export const hash01 = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
