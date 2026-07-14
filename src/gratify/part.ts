// ============================================================================
// Gratify parts — the unit of widget definition (README §"one part() call").
// A part declares up to seven facets; all optional except (usually) render.
// Function facets will gain map* wrappers in M2 (the layering algebra); for
// M1 they are plain functions.
// ============================================================================

import { Rect, Vec } from "./core";
import { Measure, Painter } from "./painter";
import { Tokens } from "./theme";
import type { Element } from "./scene";
import type { Interactor } from "./interact";

/** Animated channel values on a node. Missing keys read as 0 via cval(). */
export type Channels = Record<string, number>;

/** The author-facing view of a retained scene node. */
export interface GNode<P> {
  key: string;
  props: P;
  rect: Rect;
  ch: Channels;
  states: Set<string>;
  /** Last pointer position (canvas coords), if any. */
  pointer?: Vec;
  /** Spawn a transient effect (README §"one-shot juice"). */
  spawn?(fx: unknown): void;
}

export interface ChannelSpec<P> {
  /** Target the value chases, re-derived every frame from the node. */
  target(node: GNode<P>): number;
  /** Spring (momentum, overshoot) — positions, travel, knobs. */
  spring?: { stiffness: number; damping: number };
  /** Exponential approach rate (no overshoot) — colors, glow. Default 10. */
  rate?: number;
}

export interface PartSpec<P, S = Record<string, unknown>> {
  /** Intrinsic size of a leaf part. */
  size?(props: P, m: Measure): Vec;
  /** Container: own size from children's sizes. */
  measure?(props: P, childSizes: Vec[], m: Measure): Vec;
  /** Container: place children (absolute rects) inside own rect. */
  place?(props: P, rect: Rect, childSizes: Vec[]): Rect[];
  /** Extra animated channels beyond the automatic ones. */
  channels?: Record<string, ChannelSpec<P>>;
  /** tokens + channels (+ props) → a flat record of resolved visual values. */
  style?(t: Tokens, ch: Channels, props: P): S;
  /** Draw, reading only rect + the resolved style. */
  render?(node: GNode<P>, p: Painter, style: S): void;
  /** Behavior: interactors, as values. They only emit intents. */
  on?: Interactor<P>[];
}

export interface PartDef<P, S = Record<string, unknown>> extends PartSpec<P, S> {
  name: string;
  /** Base parts this was derived from (derivePart) — lets theme extensions
   *  targeting a base reach its derivatives. */
  ancestors?: string[];
}

export interface PartCtor<P> {
  (key: string, props: P, children?: Element[]): Element;
  def: PartDef<P, unknown>;
}

/** Define a part. Returns its element constructor: (key, props, children?) → Element. */
export function part<P, S = Record<string, unknown>>(name: string, spec: PartSpec<P, S>): PartCtor<P> {
  const def: PartDef<P, S> = { ...spec, name };   // name last: spec may be a spread def
  const ctor = ((key: string, props: P, children?: Element[]): Element => ({
    key,
    part: def as unknown as PartDef<unknown, unknown>,
    props,
    children,
    states: (props as { states?: Record<string, boolean> } | undefined)?.states,
  })) as PartCtor<P>;
  ctor.def = def as unknown as PartDef<P, unknown>;
  return ctor;
}
