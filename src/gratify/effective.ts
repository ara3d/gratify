// ============================================================================
// Effective part definitions — the layering composition (extend.ts, scopes):
//   definition → theme extensions (ancestry-aware) → use-site extensions.
// Composed once per instance and cached; the cache invalidates when the
// element blueprint changes or themeVersion bumps (setTheme / extendTheme).
// ============================================================================

import { Element, Instance } from "./scene";
import { themeVersion } from "./theme";
import { AnyDef, composeDef } from "./compose";
export type { AnyDef } from "./compose";

export class EffCache {
  private cache = new WeakMap<Instance, { ver: number; el: Element; def: AnyDef }>();

  get(inst: Instance): AnyDef {
    const hit = this.cache.get(inst);
    if (hit && hit.ver === themeVersion && hit.el === inst.el) return hit.def;
    const def = composeDef(inst.el);
    this.cache.set(inst, { ver: themeVersion, el: inst.el, def });
    return def;
  }
}
