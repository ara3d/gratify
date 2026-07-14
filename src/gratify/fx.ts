// ============================================================================
// Gratify fx contract — a transient effect is fire-and-forget: no identity,
// no hit-testing, self-animating, self-removing (README §"one-shot juice").
// The engine (particles.ts) and the stock library (effects.ts) build on this.
// ============================================================================

import type { Painter } from "./painter";

export interface Fx {
  done: boolean;
  update(dt: number): void;
  draw(p: Painter): void;
}
