// ============================================================================
// Effective part definitions — the layering composition (extend.ts, scopes):
//   definition → theme extensions (ancestry-aware) → use-site extensions.
// Composed once per instance and cached; the cache invalidates when the
// element blueprint changes or themeVersion bumps (setTheme / extendTheme).
// ============================================================================

import { PartDef } from "./part";
import { Element, Instance } from "./scene";
import { activeThemeExts, themeVersion } from "./theme";

export type AnyDef = PartDef<unknown, unknown>;

export class EffCache {
  private cache = new WeakMap<Instance, { ver: number; el: Element; def: AnyDef }>();

  get(inst: Instance): AnyDef {
    const hit = this.cache.get(inst);
    if (hit && hit.ver === themeVersion && hit.el === inst.el) return hit.def;
    let def = inst.part as AnyDef;
    for (const e of activeThemeExts(def.name, def.ancestors)) def = e(def) as AnyDef;
    for (const e of inst.el.exts ?? []) def = (e as (d: AnyDef) => AnyDef)(def);
    this.cache.set(inst, { ver: themeVersion, el: inst.el, def });
    return def;
  }
}
