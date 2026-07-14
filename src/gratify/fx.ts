// ============================================================================
// Gratify transient effects — fire-and-forget one-shot juice (README §10).
// Spawned by interactor callbacks or app code; self-animating, self-removing.
// The only deliberately imperative corner of the framework.
// ============================================================================

import { add, calpha, Color, mul, Rect, v, Vec } from "./core";
import type { Painter } from "./painter";

export interface Fx {
  done: boolean;
  update(dt: number): void;
  draw(p: Painter): void;
}

interface P { p: Vec; vel: Vec; life: number; max: number; size: number; }

class Particles implements Fx {
  ps: P[] = [];
  done = false;
  constructor(public color: Color, spawn: () => P, count: number) {
    for (let i = 0; i < count; i++) this.ps.push(spawn());
  }
  update(dt: number) {
    for (const q of this.ps) {
      q.p = add(q.p, mul(q.vel, dt));
      q.vel = mul(q.vel, Math.exp(-3.5 * dt));
      q.vel.y += 120 * dt;
      q.life -= dt;
    }
    this.ps = this.ps.filter((q) => q.life > 0);
    if (this.ps.length === 0) this.done = true;
  }
  draw(p: Painter) {
    for (const q of this.ps) {
      const t = Math.max(0, q.life / q.max);
      p.dot(q.p, q.size * (0.4 + 0.6 * t), calpha(this.color, t));
    }
  }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

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
