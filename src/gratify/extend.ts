// ============================================================================
// Gratify extension algebra — "wrap, don't edit" (README §3, layering guide).
// An extension is an ordinary function PartDef → PartDef. Function facets
// (size/style/render) extend by WRAPPING (you receive the base result and
// state only your delta); list facets (channels/on) extend by APPENDING.
//
// The same extension value applies at three scopes:
//   1. definition —  derivePart("fancy", Button, sparkle)   (a new named part)
//   2. theme      —  extendTheme("dark", "button", sparkle) (app-wide, incl.
//                    parts inside code you don't own; hits derived parts too)
//   3. use site   —  withExt(Button("k", …), sparkle)       (this element only)
// Order: definition first, theme second, use site last — closest wins.
// ============================================================================

import { v, Vec } from "./core";
import { Measure, Painter } from "./painter";
import { Channels, ChannelSpec, GNode, PartCtor, PartDef, PartSpec, part } from "./part";
import { Interactor } from "./interact";
import { Tokens } from "./theme";
import type { Element } from "./scene";

/** An extension: part definition in, wrapped part definition out. */
export type PartExt = (def: PartDef<any, any>) => PartDef<any, any>;

/** Compose extensions left-to-right (later wraps closer to the surface). */
export const composeExt = (...exts: PartExt[]): PartExt =>
  (def) => exts.reduce((d, e) => e(d), def);

// ---- wrapping function facets ----------------------------------------------

/** Wrap the style: receive the base result, state only your delta. */
export const mapStyle = <S = Record<string, unknown>>(
  f: (t: Tokens, ch: Channels, props: unknown, base: S) => S,
): PartExt =>
  (def) => ({
    ...def,
    style: (t: Tokens, ch: Channels, props: unknown) =>
      f(t, ch, props, (def.style ? def.style(t, ch, props) : {}) as S),
  });

/** Wrap the render: call base() to paint the original — before (under),
 *  after (over), or not at all. */
export const mapRender = (
  f: (node: GNode<unknown>, p: Painter, style: unknown, base: () => void) => void,
): PartExt =>
  (def) => ({
    ...def,
    render: (node: GNode<unknown>, p: Painter, style: unknown) =>
      f(node, p, style, () => def.render?.(node, p, style)),
  });

/** Wrap the intrinsic size. */
export const mapSize = (
  f: (props: unknown, m: Measure, base: Vec) => Vec,
): PartExt =>
  (def) => ({
    ...def,
    size: (props: unknown, m: Measure) =>
      f(props, m, def.size ? def.size(props, m) : v(0, 0)),
  });

/** Wrap the structure: receive the base body's output (for a body-less part,
 *  its use-site children) and return the transformed list. Completes the
 *  extension algebra's coverage — `mapBody` is to `body` what `mapStyle` is to
 *  `style`. On a body-less part the base IS the use-site children, so
 *  "append a badge child to any container" is a one-liner. */
export const mapBody = (
  f: (props: unknown, children: Element[], base: Element[]) => Element[],
): PartExt =>
  (def) => ({
    ...def,
    body: (props: unknown, children: Element[]) =>
      f(props, children, def.body ? def.body(props, children) : children),
  });

// ---- appending list facets ----------------------------------------------------

/** Append animated channels (namespace yours: "fx/sheen", not "sheen"). */
export const addChannels = (chs: Record<string, ChannelSpec<any>>): PartExt =>
  (def) => ({ ...def, channels: { ...def.channels, ...chs } });

/** Append interactors. All appended behaviors run; none replace. */
export const addOn = (...is: Interactor<any>[]): PartExt =>
  (def) => ({ ...def, on: [...(def.on ?? []), ...is] });

/** Append adornments to ANY part — layer a tooltip, badge, or resize grip onto
 *  a widget that never planned for it. The host's own adornments (if any) run
 *  first, then yours; the results concatenate. This is decoration by
 *  composition — the core reason the facet exists. */
export const addAdorn = (fn: (node: GNode<any>) => Element[]): PartExt =>
  (def) => ({ ...def, adorn: (node: GNode<any>) => [...(def.adorn?.(node) ?? []), ...fn(node)] });

// ---- scope 1: definition — a new named part ------------------------------------

/** Bake extensions into a new named part. Remembers its ancestry, so theme
 *  extensions targeting the base also reach the derivative. */
export function derivePart<P>(name: string, base: PartCtor<P>, ...exts: PartExt[]): PartCtor<P> {
  const wrapped = composeExt(...exts)(base.def as PartDef<any, any>);
  const spec: PartSpec<P, unknown> = { ...(wrapped as PartSpec<P, unknown>) };
  const ctor = part<P, unknown>(name, spec);
  ctor.def.ancestors = [...(base.def.ancestors ?? []), base.def.name];
  return ctor;
}

// ---- scope 3: use site — this element only ---------------------------------------

/** Apply extensions to one element. */
export const withExt = (el: Element, ...exts: PartExt[]): Element =>
  ({ ...el, exts: [...(el.exts ?? []), ...exts] as unknown[] });
