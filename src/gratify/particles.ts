// ============================================================================
// Particles — a small generic particle engine implementing Fx. Framework
// machinery only: it knows drag, gravity, and fading dots — not what a
// "burst" or a "poof" is. Stock effects live in effects.ts; custom effects
// can reuse this engine with their own spawn functions.
// ============================================================================

import { add, calpha, Color, mul, Vec } from "./core";
import type { Painter } from "./painter";
import type { Fx } from "./fx";

export interface Particle {
  p: Vec;
  vel: Vec;
  life: number;
  max: number;
  size: number;
}

export interface ParticleOpts {
  drag?: number;      // velocity decay per second (default 3.5)
  gravity?: number;   // px/s² downward (default 120)
}

export class Particles implements Fx {
  ps: Particle[] = [];
  done = false;
  private drag: number;
  private gravity: number;

  constructor(public color: Color, spawn: () => Particle, count: number, opts: ParticleOpts = {}) {
    this.drag = opts.drag ?? 3.5;
    this.gravity = opts.gravity ?? 120;
    for (let i = 0; i < count; i++) this.ps.push(spawn());
  }

  update(dt: number) {
    for (const q of this.ps) {
      q.p = add(q.p, mul(q.vel, dt));
      q.vel = mul(q.vel, Math.exp(-this.drag * dt));
      q.vel.y += this.gravity * dt;
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

/** Uniform random in [a, b) — for spawn functions. */
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
