// ============================================================================
// Gratify scene — Element (immutable blueprint) + Instance (retained node) +
// keyed reconcile. Reuse-by-key is why juice is free: a matched node keeps its
// springs and channels, so it always knows where it *was*.
// ============================================================================

import { Rect, Spring } from "./core";
import { PartDef } from "./part";

/** Coordinate layers (M3): world is viewport-transformed; overlay is world
 *  coords drawn above all content; screen is the untransformed HUD. */
export type Layer = "world" | "overlay" | "screen";

export interface Element {
  key: string;
  part: PartDef<unknown, unknown>;
  props: unknown;
  children?: Element[];
  /** Open-ended semantic tags projected from the model by the view.
   *  Each becomes an animated channel automatically. */
  states?: Record<string, boolean>;
  /** Use-site extensions (scope 3) — applied last, wins over theme/definition. */
  exts?: unknown[];
  /** Coordinate layer: world (viewport-transformed, default), overlay (world
   *  coords, drawn above all content), screen (untransformed HUD). Inherited. */
  layer?: Layer;
}

export class Instance {
  key: string;
  part: PartDef<unknown, unknown>;
  el: Element;
  parent?: Instance;
  children: Instance[] = [];
  ghosts: Instance[] = [];          // exiting children, animating out

  rect = new Rect();                // current animated rect (what renders/hit-tests)
  target = new Rect();              // layout's target rect this frame
  sx = new Spring(0); sy = new Spring(0);   // position springs
  cw = 0; chh = 0;                  // animated size (exponential)
  placed = false;                   // first layout snaps instead of gliding

  ch: Record<string, number> = Object.create(null);   // animated channels
  chSprings: Record<string, Spring> = Object.create(null);
  stateKeys = new Set<string>();    // every state tag ever seen (to fade out removed ones)
  states = new Set<string>();
  exiting = false;
  freshGhost = false;
  local?: unknown;                  // instance-local UI state (M3 wires up routing)

  constructor(e: Element, parent?: Instance) {
    this.key = e.key; this.part = e.part; this.el = e; this.parent = parent;
    this.ch.enter = 0;
  }
  get props(): unknown { return this.el.props; }
  cval(k: string): number { return this.ch[k] || 0; }
}

/** Keyed diff: match by key + part name → reuse (springs/channels survive);
 *  mismatch → fresh instance (plays enter). Vanished children become ghosts. */
export function reconcile(prev: Instance | null, e: Element, parent?: Instance): Instance {
  let inst: Instance;
  if (prev && prev.key === e.key && prev.part.name === e.part.name) {
    inst = prev; inst.el = e;
  } else {
    inst = new Instance(e, parent);
  }
  inst.states = new Set(Object.keys(e.states || {}).filter((k) => e.states![k]));
  for (const k of inst.states) inst.stateKeys.add(k);

  const oldByKey = new Map(inst.children.map((c) => [c.key, c]));
  const kids = e.children || [];
  const newKeys = new Set(kids.map((c) => c.key));
  for (const c of inst.children) {
    if (!newKeys.has(c.key) && !c.exiting) {
      c.exiting = true; c.freshGhost = true;
      inst.ghosts.push(c);
    }
  }
  inst.children = kids.map((ce) => reconcile(oldByKey.get(ce.key) || null, ce, inst));
  return inst;
}

/** Depth-first visit of every live instance. */
export function walk(inst: Instance, fn: (i: Instance) => void) {
  fn(inst);
  for (const c of inst.children) walk(c, fn);
}
