// ============================================================================
// Composition + body expansion. `composeDef` resolves an element's effective
// definition through all three layering scopes (definition → theme extensions,
// ancestry-aware → use-site extensions) — the same order EffCache uses, now
// shared so the `body` facet layers identically. `expandBodies` is a pure
// pre-pass over the element tree that runs each composite's `body`, turning a
// part-made-of-parts into an ordinary keyed element tree the kernel already
// knows how to reconcile/layout/animate/draw. It runs only on state changes
// (or a theme bump), O(tree) — the same class as `view` itself.
// ============================================================================

import { PartDef } from "./part";
import { Element } from "./scene";
import { activeThemeExts } from "./theme";

export type AnyDef = PartDef<unknown, unknown>;

/** The effective definition of an element after definition → theme → use-site
 *  extensions. Pure; used by both EffCache (per instance) and body expansion. */
export function composeDef(el: Element): AnyDef {
  let def = el.part as AnyDef;
  for (const e of activeThemeExts(def.name, def.ancestors)) def = e(def) as AnyDef;
  for (const e of el.exts ?? []) def = (e as (d: AnyDef) => AnyDef)(def);
  return def;
}

/** Expand composites: replace each element's children with its `body` output
 *  (use-site children become the body's input slot), recursively. A depth
 *  guard turns accidental self-recursion into a console error, not a hang. */
export function expandBodies(el: Element, depth = 0): Element {
  if (depth > 64) {
    console.error(`gratify: body expansion too deep at "${el.key}" — a part likely emits itself`);
    return el;
  }
  const def = composeDef(el);
  const kids = def.body ? def.body(el.props, el.children ?? []) : el.children;
  return kids?.length
    ? { ...el, children: kids.map((k) => expandBodies(k, depth + 1)) }
    : el;
}
