// ============================================================================
// Layout pass — measure bottom-up, place top-down, then step position springs
// and size approaches so every layout change glides (README: "layout results
// feed channels"). Pure over its inputs: no runtime state beyond the tree.
// ============================================================================

import { approach, Rect, v, Vec } from "./core";
import { Measure } from "./painter";
import { Instance } from "./scene";
import { AnyDef } from "./effective";

const POS_SPRING = { k: 240, d: 26 };
const SIZE_RATE = 18;

export type Eff = (inst: Instance) => AnyDef;

function measureInst(inst: Instance, eff: Eff, m: Measure, sizes: Map<Instance, Vec>): Vec {
  const part = eff(inst);
  const kidSizes = inst.children.map((c) => measureInst(c, eff, m, sizes));
  let s: Vec;
  if (part.size) s = part.size(inst.props, m);
  else if (part.measure) s = part.measure(inst.props, kidSizes, m);
  else s = kidSizes.reduce((acc, k) => v(Math.max(acc.x, k.x), Math.max(acc.y, k.y)), v(0, 0));
  sizes.set(inst, s);
  return s;
}

function placeInst(inst: Instance, target: Rect, eff: Eff, sizes: Map<Instance, Vec>) {
  inst.target = target;
  const part = eff(inst);
  if (part.place && inst.children.length) {
    const kids = inst.children.map((c) => ({ key: c.key, size: sizes.get(c)!, props: c.props, pos: c.el.pos }));
    const rects = part.place(inst.props, target, kids);
    inst.children.forEach((c, i) => placeInst(c, rects[i], eff, sizes));
  } else {
    for (const c of inst.children) {
      placeInst(c, new Rect(target.x, target.y, sizes.get(c)?.x ?? 0, sizes.get(c)?.y ?? 0), eff, sizes);
    }
  }
}

function stepRects(inst: Instance, dt: number) {
  const t = inst.target;
  if (!inst.placed) {
    inst.sx.set(t.x); inst.sy.set(t.y); inst.cw = t.w; inst.chh = t.h;
    inst.placed = true;
  } else if (!inst.exiting) {
    inst.sx.step(t.x, POS_SPRING.k, POS_SPRING.d, dt);
    inst.sy.step(t.y, POS_SPRING.k, POS_SPRING.d, dt);
    inst.cw = approach(inst.cw, t.w, SIZE_RATE, dt);
    inst.chh = approach(inst.chh, t.h, SIZE_RATE, dt);
  }
  inst.rect = new Rect(inst.sx.v, inst.sy.v, inst.cw, inst.chh);
  for (const c of inst.children) stepRects(c, dt);
  for (const g of inst.ghosts) stepRects(g, dt);
}

/** One full layout pass over a tree. */
export function layoutScene(root: Instance, dt: number, eff: Eff, m: Measure, viewW: number, viewH: number) {
  const sizes = new Map<Instance, Vec>();
  const s = measureInst(root, eff, m, sizes);
  placeInst(root, new Rect(0, 0, Math.max(s.x, viewW), Math.max(s.y, viewH)), eff, sizes);
  stepRects(root, dt);
}
