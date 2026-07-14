// ============================================================================
// Gratify interactors — input as values (README §5). A recognizer is a pure
// description parameterized by *what intent to emit*; all gesture state is
// runtime-owned. Interactors emit intents and set tags — never touch the doc.
// ============================================================================

import { clamp } from "./core";
import { GNode } from "./part";

/** Intents are the app's typed vocabulary; the framework treats them opaquely. */
export type Intentish = unknown;

export type Interactor<P> =
  | { kind: "press"; to(node: GNode<P>): Intentish }
  | { kind: "hover" }
  | {
      kind: "drag1d";
      axis: "x" | "y";
      /** px of track inset on both ends (knob margins). Default 8. */
      pad?: number;
      to(node: GNode<P>, fraction: number): Intentish;
    };

/** Emit an intent on click/tap (release inside, below drag threshold). */
export const Press = <P>(to: (node: GNode<P>) => Intentish): Interactor<P> =>
  ({ kind: "press", to });

/** Maintain the hover tag; nothing else. (Hover is automatic on any rendered
 *  part; this exists to make intent explicit in `on:` lists.) */
export const Hover = <P>(): Interactor<P> => ({ kind: "hover" });

/** Drag along one axis, reporting position as a 0..1 fraction of the track. */
export const Drag1D = <P>(o: {
  axis: "x" | "y";
  pad?: number;
  to(node: GNode<P>, fraction: number): Intentish;
}): Interactor<P> => ({ kind: "drag1d", ...o });

/** Fraction of the way through a rect along an axis, honoring pad. */
export function axisFraction(
  rect: { x: number; y: number; w: number; h: number },
  axis: "x" | "y", pad: number, px: number, py: number,
): number {
  return axis === "x"
    ? clamp((px - rect.x - pad) / Math.max(1, rect.w - 2 * pad), 0, 1)
    : clamp((py - rect.y - pad) / Math.max(1, rect.h - 2 * pad), 0, 1);
}
