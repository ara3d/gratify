// ============================================================================
// Gratify interactors — input as values (README §5). A recognizer is a pure
// description parameterized by *what intent to emit*; all gesture state is
// runtime-owned. Interactors emit intents and set tags — never touch the doc.
//
// Editor-grade gestures (M3, layering guide §5c) get three bounded powers:
//   state — a private record, born on press, dead on release
//   query — read-only scene access (anchors, modifiers)
//   view  — overlay elements shown while the gesture runs (rubber wires,
//           marquees, slice lines) — the element tree stays the whole truth
// ============================================================================

import { clamp, Vec } from "./core";
import type { GNode } from "./part";
import type { Element } from "./scene";

/** Intents are the app's typed vocabulary; the framework treats them opaquely. */
export type Intentish = unknown;

// ---- local intents (guide §4d) ----------------------------------------------
// A `Local(...)`-wrapped intent routes to the nearest enclosing part with a
// `reduce` facet — it never reaches the app's `update`. That is the whole
// contract: private widget state (dropdown-open, a scrub draft) changes through
// the same intent→reducer discipline as the app model, just scoped down.

/** The brand a `Local(...)` wrapper carries. Structural (a string key) so the
 *  check survives duplicate module instances. */
export interface LocalIntent<T = unknown> { __gratifyLocal: T }

/** Wrap an intent as LOCAL: routed to the nearest enclosing `reduce`, never to
 *  the app's `update`. Emit these from a composite's own interactors
 *  (`.press(() => Local({ kind: "toggle" }))`). */
export const Local = <T>(intent: T): LocalIntent<T> => ({ __gratifyLocal: intent });

export const isLocal = (i: unknown): i is LocalIntent =>
  typeof i === "object" && i !== null && "__gratifyLocal" in i;

export const unwrapLocal = <T>(i: LocalIntent<T>): T => i.__gratifyLocal;

// ---- read-only scene query (gestures + effects) ------------------------------
export interface Anchor {
  id: string;
  pos: Vec;                    // world coords, published by layout each frame
  meta?: unknown;
  key: string;                 // owning instance key
}

export interface Query {
  anchor(id: string): Anchor | undefined;
  anchors(pred?: (a: Anchor) => boolean): Anchor[];
  nearestAnchor(p: Vec, radius: number, pred?: (a: Anchor) => boolean): Anchor | undefined;
  /** Modifier keys as of the current pointer event. */
  mods: { shift: boolean; alt: boolean; ctrl: boolean };
}

// ---- gesture contract ---------------------------------------------------------
export interface GestureSpec<P, S> {
  /** Return null to decline (the next interactor gets a chance). */
  begin(node: GNode<P>, p: Vec, q: Query): S | null;
  move?(s: S, node: GNode<P>, p: Vec, q: Query): S;
  /** Called after move; a returned intent dispatches immediately (live drags:
   *  node move, reorder). */
  during?(s: S, node: GNode<P>, p: Vec, q: Query): Intentish | void;
  /** Return intent(s) to dispatch on release. */
  up?(s: S, node: GNode<P>, p: Vec, q: Query): Intentish | Intentish[] | void;
  /** Overlay-layer preview elements while active (world coords). */
  view?(s: S, q: Query): Element[];
}

export type Interactor<P> =
  | { kind: "press"; to(node: GNode<P>): Intentish }
  | { kind: "hover" }
  | {
      kind: "drag1d";
      axis: "x" | "y";
      pad?: number;
      to(node: GNode<P>, fraction: number): Intentish;
    }
  | { kind: "gesture"; spec: GestureSpec<P, unknown> }
  | { kind: "pan" }                                    // surface: drag empty space pans, wheel zooms
  | { kind: "keys"; map: Record<string, (node: GNode<P>) => Intentish> }
  | { kind: "focusable" };

/** Emit an intent on click/tap (release inside, below drag threshold). */
export const Press = <P>(to: (node: GNode<P>) => Intentish): Interactor<P> =>
  ({ kind: "press", to });

/** Maintain the hover tag; nothing else. */
export const Hover = <P>(): Interactor<P> => ({ kind: "hover" });

/** Drag along one axis, reporting position as a 0..1 fraction of the track. */
export const Drag1D = <P>(o: {
  axis: "x" | "y";
  pad?: number;
  to(node: GNode<P>, fraction: number): Intentish;
}): Interactor<P> => ({ kind: "drag1d", ...o });

/** A full gesture: private state + query + overlay view (see GestureSpec). */
export const Gesture = <P, S>(spec: GestureSpec<P, S>): Interactor<P> =>
  ({ kind: "gesture", spec: spec as GestureSpec<P, unknown> });

/** Viewport pan/zoom for the hosting part (typically the surface root). */
export const Pan = <P>(): Interactor<P> => ({ kind: "pan" });

/** Keyboard mapping. Routed focus-first, then hover chain, then root. */
export const Keys = <P>(map: Record<string, (node: GNode<P>) => Intentish>): Interactor<P> =>
  ({ kind: "keys", map });

/** Clicking this part gives it keyboard focus (ch.focus eases 0→1). */
export const Focusable = <P>(): Interactor<P> => ({ kind: "focusable" });

/** Fraction of the way through a rect along an axis, honoring pad. */
export function axisFraction(
  rect: { x: number; y: number; w: number; h: number },
  axis: "x" | "y", pad: number, px: number, py: number,
): number {
  return axis === "x"
    ? clamp((px - rect.x - pad) / Math.max(1, rect.w - 2 * pad), 0, 1)
    : clamp((py - rect.y - pad) / Math.max(1, rect.h - 2 * pad), 0, 1);
}
