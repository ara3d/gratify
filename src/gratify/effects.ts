// ============================================================================
// Stock effects library — concrete one-shot juice built on the Particles
// engine and the Fx contract. Apps spawn these (or ship their own) via
// node.spawn / runtime.spawnFx; the framework never references them.
// ============================================================================

import { calpha, Color, Rect, v, Vec } from "./core";
import type { Painter } from "./painter";
import type { Fx } from "./fx";
import { Particles, rand } from "./particles";

/** Radial burst (confirmations, connections). */
export function burst(at: Vec, color: Color): Fx {
  return new Particles(color, () => {
    const ang = rand(0, Math.PI * 2), spd = rand(60, 220);
    return { p: { ...at }, vel: v(Math.cos(ang) * spd, Math.sin(ang) * spd - 40), life: rand(0.35, 0.7), max: 0.7, size: rand(1.5, 3.2) };
  }, 22);
}

/** Poof scattered across a deleted element's rect. */
export function poof(r: Rect, color: Color): Fx {
  return new Particles(color, () => {
    const p = v(r.x + rand(0, r.w), r.y + rand(0, r.h));
    return { p, vel: v(rand(-60, 60), rand(-90, -10)), life: rand(0.3, 0.6), max: 0.6, size: rand(1.5, 3) };
  }, 26);
}

/** Expanding ring (click ripple / confirm). */
export class Ring implements Fx {
  t = 0; done = false;
  constructor(public at: Vec, public color: Color, public max = 34, public dur = 0.45) {}
  update(dt: number) { this.t += dt; if (this.t >= this.dur) this.done = true; }
  draw(p: Painter) {
    const k = this.t / this.dur;
    const r = this.max * (1 - Math.pow(1 - k, 3));
    p.ring(this.at, r, calpha(this.color, (1 - k) * 0.8), 2);
  }
}
