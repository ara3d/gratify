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
  /** Last pointer position (world coords for world-layer parts), if any. */
  pointer?: Vec;
  /** Spawn a transient effect (README §"one-shot juice"). */
  spawn?(fx: unknown): void;
  /** Resolve a published anchor to its world position (connectors, §5b). */
  anchor?(id: string): Vec | undefined;
  /** Kick an impulse channel (§5d) — the one sanctioned imperative touch. */
  kick?(channel: string, value?: number): void;
  /** Viewport of the mounted scene: pan/zoom + css pixel size. */
  view?: { pan: Vec; zoom: number; w: number; h: number };
  /** Seconds since the app started — an ever-rising clock for continuous
   *  motion (pulses, shakes, bounces) that are functions of time rather than
   *  transitions. Pair with AppSpec.ambient to keep the loop awake. */
  time?: number;
}

export interface ChannelSpec<P> {
  /** Target the value chases, re-derived every frame from the node.
   *  Omit for impulse channels (decay). */
  target?(node: GNode<P>): number;
  /** Spring (momentum, overshoot) — positions, travel, knobs. */
  spring?: { stiffness: number; damping: number };
  /** Exponential approach rate (no overshoot) — colors, glow. Default 10. */
  rate?: number;
  /** Impulse channel: no target — kick() sets it, it decays to 0 at this rate. */
  decay?: number;
}

/** What a container's place() sees of each child. */
export interface ChildInfo {
  key: string;
  size: Vec;
  props: unknown;
  /** The child element's `pos` hint (set via `at(...)`), if any. */
  pos?: Vec;
}

export interface PartSpec<P, S = Record<string, unknown>> {
  /** Intrinsic size of a leaf part. */
  size?(props: P, m: Measure): Vec;
  /** Container: own size from children's sizes. */
  measure?(props: P, childSizes: Vec[], m: Measure): Vec;
  /** Container: place children (absolute rects) inside own rect. */
  place?(props: P, rect: Rect, kids: ChildInfo[]): Rect[];
  /** Published world-space anchor points (connectors resolve through these). */
  anchors?(node: GNode<P>): { id: string; pos: Vec; meta?: unknown }[];
  /** Custom hit test (e.g. distance-to-curve for wires). Default: rect. */
  hit?(node: GNode<P>, p: Vec): boolean;
  /** Extra animated channels beyond the automatic ones. */
  channels?: Record<string, ChannelSpec<P>>;
  /** tokens + channels (+ props) → a flat record of resolved visual values. */
  style?(t: Tokens, ch: Channels, props: P): S;
  /** Draw, reading only rect + the resolved style. */
  render?(node: GNode<P>, p: Painter, style: S): void;
  /** Composite: derive child elements from props (parts made of parts). Runs
   *  at reconcile time (the state clock), never per frame — structure is a
   *  function of state; motion stays in channels. `children` are the use-site
   *  children: place them where the composite wants its content slot. A part
   *  without `body` behaves exactly as before. Wrap with `mapBody`. */
  body?(props: P, children: Element[]): Element[];
  /** Behavior: interactors, as values. They only emit intents. */
  on?: Interactor<P>[];
  /** Adornments: overlay elements anchored to this host (tooltips, badges,
   *  resize grips, close buttons). Runs every frame, so it may read channels
   *  (`node.ch.hover`) to appear/disappear — the elements are keyed, so they
   *  play enter/exit. Position each with `at(element, worldPos)`. They render
   *  on the overlay layer, above all content, and may carry their own
   *  interactors. Append to this list on any part with `addAdorn(...)`. */
  adorn?(node: GNode<P>): Element[];
}

export interface PartDef<P, S = Record<string, unknown>> extends PartSpec<P, S> {
  name: string;
  /** Base parts this was derived from (derivePart) — lets theme extensions
   *  targeting a base reach its derivatives. */
  ancestors?: string[];
}

export interface PartCtor<P, S = unknown> {
  (key: string, props: P, children?: Element[]): Element;
  def: PartDef<P, S>;
}

/** Recover a part's style-record type from its constructor, without a nominal
 *  interface: mapStyle<StyleOf<typeof Button>>((t, ch, p, base) => …). */
export type StyleOf<C> = C extends PartCtor<any, infer S> ? S : never;

// Curried form (the house form): state the props type once, and the style
// record S is INFERRED from the style function's return value — including
// inside interactor callbacks, which a single-call generic can't type. The
// legacy explicit two-parameter form stays for callers that want it.
export function part<P>(): <S>(name: string, spec: PartSpec<P, S>) => PartCtor<P, S>;
export function part<P, S = Record<string, unknown>>(name: string, spec: PartSpec<P, S>): PartCtor<P, S>;
export function part<P, S = Record<string, unknown>>(
  name?: string, spec?: PartSpec<P, S>,
): PartCtor<P, S> | (<S2>(name: string, spec: PartSpec<P, S2>) => PartCtor<P, S2>) {
  return name === undefined
    ? <S2>(n: string, s: PartSpec<P, S2>) => makePart<P, S2>(n, s)
    : makePart<P, S>(name, spec!);
}

/** Build the element constructor for a part definition. */
function makePart<P, S>(name: string, spec: PartSpec<P, S>): PartCtor<P, S> {
  const def: PartDef<P, S> = { ...spec, name };   // name last: spec may be a spread def
  const ctor = ((key: string, props: P, children?: Element[]): Element => ({
    key,
    part: def as unknown as PartDef<unknown, unknown>,
    props,
    children,
    states: (props as { states?: Record<string, boolean> } | undefined)?.states,
  })) as PartCtor<P, S>;
  ctor.def = def;
  return ctor;
}
