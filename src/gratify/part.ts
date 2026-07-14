// ============================================================================
// Gratify parts — the unit of widget definition (README §"one part() call").
// A part declares up to seven facets; all optional except (usually) render.
// Function facets will gain map* wrappers in M2 (the layering algebra); for
// M1 they are plain functions.
// ============================================================================

import { Rect, v, Vec } from "./core";
import { Measure, Painter } from "./painter";
import { Tokens } from "./theme";
import type { Element } from "./scene";
import type { GestureSpec, Intentish, Interactor } from "./interact";

/** Animated channel values on a node. Missing keys read as 0 via cval(). */
export type Channels = Record<string, number>;

/** Channels every part gets for free (plus one per state tag, per layout). */
export type AutoChannel = "hover" | "press" | "drag" | "focus" | "enter" | "exit";

/** The author-facing view of a retained scene node. `K` is the set of channel
 *  names the part declared — the builder threads it through, so `node.ch.`
 *  autocompletes the automatic channels plus your own. (State-tag channels are
 *  use-site dynamic, so the open index signature stays.) */
export interface GNode<P, K extends string = string> {
  key: string;
  props: P;
  rect: Rect;
  ch: Record<K | AutoChannel, number> & Channels;
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

/** What a container's arrange() sees of each child. `size` is the child's
 *  desired size from the measure phase. */
export interface ChildInfo {
  key: string;
  size: Vec;
  props: unknown;
  /** The child element's `pos` hint (set via `at(...)`), if any. */
  pos?: Vec;
}

// ── Two-phase layout: availability + the measuring context ────────────────────
// Layout runs in two passes (measure-arrange-plan.md): a top-down `measure`
// asks each node "given at most this much room, how big do you want to be?",
// then a top-down `arrange` hands each node its final box to place children in.

/** How much room a node is offered. A Vec (x = width, y = height); an axis may
 *  be Infinity, meaning "unbounded — size to your content." */
export type Avail = Vec;

/** Unbounded on both axes — "size to your content." */
export const UNBOUNDED: Avail = v(Infinity, Infinity);

/** A tight availability of exactly (w, h). */
export const tight = (w: number, h: number): Avail => v(w, h);

/** The measuring context a container measures its children through. Extends the
 *  text `Measure` (leaves keep using `size(props, m)` with just `m.text`) with
 *  child access: the parent chooses each child's constraint and asks for its
 *  desired size. Results are memoized per layout pass, so calling freely is
 *  cheap. */
export interface MeasureCtx extends Measure {
  /** How many children this node has. */
  readonly count: number;
  /** Measure one child under a constraint. Memoized per layout pass. */
  child(index: number, avail: Avail): Vec;
  /** Measure ALL children under the SAME constraint — the common case;
   *  reproduces the old `childSizes` array. */
  children(avail: Avail): Vec[];
}

export interface PartSpec<P, S = Record<string, unknown>> {
  /** Intrinsic size of a leaf part, independent of available room. Sugar for a
   *  `measure` that ignores `avail`. Keep using this for fixed-size widgets. */
  size?(props: P, m: Measure): Vec;
  /** Desired size given at most `avail` room. Measure your children through `m`
   *  under whatever constraints your layout implies, then return the size you
   *  want. Only needed when your size depends on the space you're given (wrap,
   *  fill, aspect-ratio, text reflow). */
  measure?(props: P, avail: Avail, m: MeasureCtx): Vec;
  /** Place children inside your final rect (which may be larger than you asked
   *  for). Return one absolute Rect per child. */
  arrange?(props: P, rect: Rect, kids: ChildInfo[]): Rect[];
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
  /** Default prop values, merged under use-site props at element creation —
   *  facets then read `props.gap` (a number), never `props.gap ?? 8`. Set via
   *  the builder's `.defaults()`, which also fixes P for inference. */
  defaults?: Partial<P>;
}

export interface PartCtor<P, S = unknown> {
  (key: string, props: P, children?: Element[]): Element;
  def: PartDef<P, S>;
}

/** Recover a part's style-record type from its constructor, without a nominal
 *  interface: mapStyle<StyleOf<typeof Button>>((t, ch, p, base) => …). */
export type StyleOf<C> = C extends PartCtor<any, infer S> ? S : never;

/** Recover a part's prop type from its constructor — pairs with `PartExt<P>`:
 *  mapStyle<StyleOf<typeof Button>, PropsOf<typeof Button>>(…). */
export type PropsOf<C> = C extends PartCtor<infer P, any> ? P : never;

// ============================================================================
// The part BUILDER — the house form. `part(name)` starts a chain; every step
// is a callable part ctor (no `.build()`), and every step is a fresh type-
// inference boundary, so P is fixed once at `.props<P>()` and S is inferred at
// `.style(...)` with no curried `()` workaround.
//
// Typestate: the builder's type carries the set of still-legal methods, so the
// facet rules are structural, not prose —
//   • `.props()` / `.defaults()` must come first (facets remove them);
//   • `.size()`/`.intrinsic()` (leaf), `.measure()`+`.arrange()`/`.fill()`
//     (container), `.pack()` (both phases from one function), and `.body()`
//     (composite) are mutually exclusive roles;
//   • `.style()` precedes `.render()` (S flows into render's style param);
//   • `.channels()`, `.on()`, `.adorn()` append and repeat, like the
//     extension algebra's add* forms.
// ============================================================================

/** Capability set: which builder methods are still legal. */
type Cap =
  | "props" | "defaults"
  | "size" | "intrinsic" | "measure" | "arrange" | "fill" | "pack" | "body"
  | "style" | "render"
  | "channels" | "on" | "press" | "drag1d" | "gesture" | "keys"
  | "adorn" | "anchors" | "hit";

type LayoutCap = "size" | "intrinsic" | "measure" | "arrange" | "fill" | "pack" | "body";

/** Caps after a method fires: its exclusions, plus the props-first rule. */
type Done<C extends Cap, X extends Cap> = Exclude<C, X | "props" | "defaults">;

/** Facet-view props after `.defaults(d)`: defaulted keys lose their `?` (and
 *  the `undefined` an optional key's indexed access carries). */
type Defaulted<P, D> = Omit<P, keyof D> & { [K in keyof D & keyof P]-?: Exclude<P[K], undefined> };

/** One packing function drives BOTH layout phases (the §7 invariant by
 *  construction): given child desired sizes and the room offered, return each
 *  child's offset from this node's origin plus this node's own size. */
export type PackFn<P> = (sizes: Vec[], avail: Avail, props: P) =>
  { offsets: Vec[]; size: Vec };

/** The builder's method surface. `P` is the use-site prop type, `F` the
 *  facet-view prop type (defaults applied), `S` the style record so far,
 *  `C` the remaining capability set, `K` the declared channel names (threaded
 *  into `GNode` so `node.ch.` autocompletes). */
interface BuilderMethods<P, F, S, C extends Cap, K extends string> {
  /** Fix the prop type. First step, if present. */
  props<P2>(): PartBuilder<P2, P2, S, Exclude<C, "props"> | "defaults", K>;
  /** Default prop values, merged under use-site props at element creation.
   *  Defaulted keys become non-optional inside every facet — no more `?? 8`. */
  defaults<D extends Partial<F>>(d: D): PartBuilder<P, Defaulted<F, D>, S, Done<C, never>, K>;

  /** Leaf: intrinsic size, independent of available room. */
  size(f: (props: F, m: Measure) => Vec): PartBuilder<P, F, S, Done<C, LayoutCap>, K>;
  /** Leaf: constant size. Sugar for `size(() => v(w, h))`. */
  intrinsic(w: number, h: number): PartBuilder<P, F, S, Done<C, LayoutCap>, K>;
  /** Container: desired size given at most `avail` room. */
  measure(f: (props: F, avail: Avail, m: MeasureCtx) => Vec):
    PartBuilder<P, F, S, Done<C, "size" | "intrinsic" | "body" | "pack" | "fill" | "measure">, K>;
  /** Container: place children in the final rect. */
  arrange(f: (props: F, rect: Rect, kids: ChildInfo[]) => Rect[]):
    PartBuilder<P, F, S, Done<C, "size" | "intrinsic" | "body" | "pack" | "arrange">, K>;
  /** Container: "I fill whatever I'm given" — measure = avail. */
  fill(): PartBuilder<P, F, S, Done<C, "size" | "intrinsic" | "body" | "pack" | "fill" | "measure">, K>;
  /** Container: derive measure AND arrange from one packing function — the two
   *  phases cannot desync. Children are measured intrinsic (UNBOUNDED). */
  pack(f: PackFn<F>): PartBuilder<P, F, S, Done<C, LayoutCap>, K>;
  /** Composite: derive child elements from props; the expanded children own
   *  layout, so the layout facets are unavailable. */
  body(f: (props: F, children: Element[]) => Element[]): PartBuilder<P, F, S, Done<C, LayoutCap>, K>;

  /** Resolve visual values from tokens + channels. S is inferred here and
   *  flows into `.render()` — declare style before render. */
  style<S2>(f: (t: Tokens, ch: Record<K | AutoChannel, number> & Channels, props: F) => S2):
    PartBuilder<P, F, S2, Done<C, "style">, K>;
  /** Draw, reading only rect + the resolved style. */
  render(f: (node: GNode<F, K>, p: Painter, style: S) => void): PartBuilder<P, F, S, Done<C, "render" | "style">, K>;

  /** Append animated channels; their names join `K` (typed `node.ch`). Repeatable. */
  channels<C2 extends Record<string, ChannelSpec<F>>>(c: C2):
    PartBuilder<P, F, S, Done<C, never>, K | (keyof C2 & string)>;
  /** Append interactors (values: Pan(), Focusable(), or hand-built). Repeatable.
   *  For the common four, the sugar below fixes the prop type from the chain. */
  on(...is: Interactor<F>[]): PartBuilder<P, F, S, Done<C, never>, K>;
  /** Emit an intent on click/tap. Sugar for `.on(Press(…))` with props typed. */
  press(to: (node: GNode<F, K>) => Intentish): PartBuilder<P, F, S, Done<C, never>, K>;
  /** Drag along one axis, reporting a 0..1 track fraction. */
  drag1d(o: { axis: "x" | "y"; pad?: number; to(node: GNode<F, K>, fraction: number): Intentish }):
    PartBuilder<P, F, S, Done<C, never>, K>;
  /** Full gesture; the private state type is INFERRED from `begin`'s return —
   *  no more `Gesture<Props, State>` restating the prop type. */
  gesture<S2>(spec: GestureSpec<F, S2>): PartBuilder<P, F, S, Done<C, never>, K>;
  /** Keyboard mapping. Routed focus-first, then hover chain, then root. */
  keys(map: Record<string, (node: GNode<F, K>) => Intentish>): PartBuilder<P, F, S, Done<C, never>, K>;
  /** Append adornments. Repeatable; earlier adorns run first. */
  adorn(f: (node: GNode<F, K>) => Element[]): PartBuilder<P, F, S, Done<C, never>, K>;
  /** Published world-space anchor points. */
  anchors(f: (node: GNode<F, K>) => { id: string; pos: Vec; meta?: unknown }[]):
    PartBuilder<P, F, S, Done<C, "anchors">, K>;
  /** Custom hit test. */
  hit(f: (node: GNode<F, K>, p: Vec) => boolean): PartBuilder<P, F, S, Done<C, "hit">, K>;
}

/** A part under construction — already a usable part ctor at every step. */
export type PartBuilder<P, F, S, C extends Cap, K extends string = never> =
  PartCtor<P, S> & Pick<BuilderMethods<P, F, S, C, K>, C>;

type NoProps = Record<string, never>;

/** A fresh builder: no `defaults` until `.props()` names P. */
export type PartBuilderStart =
  PartBuilder<NoProps, NoProps, Record<string, never>, Exclude<Cap, "defaults">, never>;

/** Runtime: a callable ctor with chain methods; each step re-wraps a new def.
 *  Types above are the guardrails; the data below is a plain PartDef. */
function builderOf(def: PartDef<any, any>): any {
  const b = makePart(def.name, def) as any;
  const chain = (patch: Partial<PartDef<any, any>>) => builderOf({ ...def, ...patch });
  b.props = () => chain({});
  b.defaults = (d: object) => chain({ defaults: { ...def.defaults, ...d } });
  b.size = (f: any) => chain({ size: f });
  b.intrinsic = (w: number, h: number) => chain({ size: () => v(w, h) });
  b.measure = (f: any) => chain({ measure: f });
  b.arrange = (f: any) => chain({ arrange: f });
  b.fill = () => chain({ measure: (_p: unknown, avail: Avail) => avail });
  b.pack = (f: PackFn<any>) => chain({
    measure: (props: any, avail: Avail, m: MeasureCtx) => f(m.children(UNBOUNDED), avail, props).size,
    arrange: (props: any, r: Rect, kids: ChildInfo[]) => {
      const { offsets } = f(kids.map((k) => k.size), v(r.w, r.h), props);
      return offsets.map((o, i) => new Rect(r.x + o.x, r.y + o.y, kids[i].size.x, kids[i].size.y));
    },
  });
  b.body = (f: any) => chain({ body: f });
  b.style = (f: any) => chain({ style: f });
  b.render = (f: any) => chain({ render: f });
  b.channels = (c: object) => chain({ channels: { ...def.channels, ...c } });
  b.on = (...is: unknown[]) => chain({ on: [...(def.on ?? []), ...is] as never });
  const addI = (i: Interactor<any>) => chain({ on: [...(def.on ?? []), i] });
  b.press = (to: any) => addI({ kind: "press", to });
  b.drag1d = (o: any) => addI({ kind: "drag1d", ...o });
  b.gesture = (spec: any) => addI({ kind: "gesture", spec });
  b.keys = (map: any) => addI({ kind: "keys", map });
  b.adorn = (f: any) => chain({ adorn: def.adorn ? (n: any) => [...def.adorn!(n), ...f(n)] : f });
  b.anchors = (f: any) => chain({ anchors: f });
  b.hit = (f: any) => chain({ hit: f });
  return b;
}

/** Re-open a part as a builder under a new name — derivation with the same
 *  vocabulary as definition. Ancestry is recorded, so theme extensions
 *  targeting the base also reach the derivative. */
export function extendPart<P, S>(name: string, base: PartCtor<P, S>):
  PartBuilder<P, P, S, Exclude<Cap, "props" | "defaults">, string> {
  return builderOf({
    ...(base.def as PartDef<any, any>),
    name,
    ancestors: [...(base.def.ancestors ?? []), base.def.name],
  });
}

// `part(name)` (builder, the house form) · `part<P>()(name, spec)` (curried
// spec) · `part<P, S>(name, spec)` (explicit spec) — all produce the same
// plain PartDef underneath.
export function part(name: string): PartBuilderStart;
export function part<P>(): <S>(name: string, spec: PartSpec<P, S>) => PartCtor<P, S>;
export function part<P, S = Record<string, unknown>>(name: string, spec: PartSpec<P, S>): PartCtor<P, S>;
export function part<P, S = Record<string, unknown>>(
  name?: string, spec?: PartSpec<P, S>,
): PartCtor<P, S> | PartBuilderStart | (<S2>(name: string, spec: PartSpec<P, S2>) => PartCtor<P, S2>) {
  if (name === undefined) return <S2>(n: string, s: PartSpec<P, S2>) => makePart<P, S2>(n, s);
  if (spec === undefined) return builderOf({ name }) as PartBuilderStart;
  return makePart<P, S>(name, spec);
}

/** Build the element constructor for a part definition. */
export function makePart<P, S>(name: string, spec: PartSpec<P, S>): PartCtor<P, S> {
  const def: PartDef<P, S> = { ...spec, name };   // name last: spec may be a spread def
  const ctor = ((key: string, props: P, children?: Element[]): Element => {
    // defaults merge under use-site props ONCE, at element creation — facets
    // downstream read complete props, never `?? fallback`.
    const merged = def.defaults ? { ...def.defaults, ...props } : props;
    return {
      key,
      part: def as unknown as PartDef<unknown, unknown>,
      props: merged,
      children,
      states: (merged as { states?: Record<string, boolean> } | undefined)?.states,
    };
  }) as PartCtor<P, S>;
  ctor.def = def;
  return ctor;
}
