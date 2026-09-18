// ============================================================================
// Gratify scene — Element (immutable blueprint) + Instance (retained node) +
// keyed reconcile. Reuse-by-key is why juice is free: a matched node keeps its
// springs and channels, so it always knows where it *was*.
// ============================================================================

import { Rect, Spring, Vec } from "./core";
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
  /** Top-left of this element's rect, in its layer's coordinates. Used by
   *  `Free` and by adornments; set it with `at(element, pos)`. */
  pos?: Vec;
  /** Modal marker (adornments): while the topmost modal element is present it
   *  gets input first — a press outside its bounds (or Escape) dispatches
   *  `dismiss` and is CONSUMED, so click-away closes without also selecting
   *  what's underneath. Set it with `modal(element, dismiss)`. */
  modal?: { dismiss?: unknown };
  /** Z-tier (adornments): the runtime stable-sorts collected adornments by
   *  tier before drawing, so overlays (tooltips, drag previews) can reliably
   *  sit above sibling hosts' adornments. Default 0; equal tiers keep
   *  document order — untiered apps paint exactly as before. Set it with
   *  `tier(element, n)`. Higher tiers draw later (above) and hit-test first. */
  tier?: number;
  /** Driven placement: this element and its subtree take their layout rects
   *  immediately instead of springing toward them, and the element appears
   *  and vanishes without the enter/exit animation. For content a parent
   *  DRIVES — scrolled rows, a thumb under the pointer — where a spring would
   *  only add lag and a ghost would only linger. Set it with `pin(element)`. */
  pin?: boolean;
  /** Share of the container's main-axis slack this element absorbs (Stack /
   *  Row). Unset = none. Set it with `grow(element, weight)`. */
  grow?: number;
}

/** Position an element (adornments, `Free` children): sets the top-left of its
 *  rect to `pos` in its layer's coordinates. */
export const at = (element: Element, pos: Vec): Element => ({ ...element, pos });

/** Pin an element: its subtree snaps to layout rects instead of gliding, and
 *  it enters/exits instantly — the right call when a parent scrolls or drags
 *  it directly. Its hover/press/state channels animate as usual. */
export const pin = (element: Element): Element => ({ ...element, pin: true });

/** Let an element absorb its container's slack along the main axis (Stack:
 *  height, Row: width), in proportion to `weight` among growing siblings —
 *  flex-grow. A grid under a toolbar takes the rest of the viewport. With no
 *  slack (an unbounded container) it keeps its desired size. */
export const grow = (element: Element, weight = 1): Element => ({ ...element, grow: weight });

/** Mark an adornment element modal: it gets input first, and a press outside
 *  it (or Escape) dispatches `dismiss` — typically `Local({ kind: "close" })`
 *  — and is consumed. One rule; the whole click-away story. */
export const modal = (element: Element, dismiss?: unknown): Element =>
  ({ ...element, modal: { dismiss } });

/** Assign an adornment element a z-tier: adornments draw in ascending tier
 *  order (stable within a tier), so `tier(tooltip, 2)` reliably paints above
 *  every untiered (tier 0) adornment of every sibling. */
export const tier = (element: Element, n: number): Element => ({ ...element, tier: n });

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
  local?: unknown;                  // instance-local UI state; written only by reduce (unset = part's localInit)

  constructor(e: Element, parent?: Instance) {
    this.key = e.key; this.part = e.part; this.el = e; this.parent = parent;
    this.ch.enter = e.pin ? 1 : 0;    // a driven (pinned) element appears at once
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
  // Duplicate sibling keys silently collide in the keyed diff (springs/channels
  // bleed between the twins) — loud beats mysterious.
  if (newKeys.size !== kids.length) {
    const seen = new Set<string>();
    for (const c of kids) {
      if (seen.has(c.key)) console.error(`gratify: duplicate child key "${c.key}" under "${e.key}" — reconcile will collide them`);
      seen.add(c.key);
    }
  }
  for (const c of inst.children) {
    // a vanished child ghosts out — unless it was pinned (driven): scrolled-
    // out rows just go, so a fast scroll never leaves a wake of fading ghosts.
    if (!newKeys.has(c.key) && !c.exiting && !c.el.pin) {
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
