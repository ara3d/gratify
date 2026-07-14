# Gratify — a real two-phase layout: `measure(available)` + `arrange` (AI-generated proposal)

*Written 2026-07-14 by Claude, from the `split-pane` example's finding that a
wrapping `Flow` cannot report its height. Status: **proposal awaiting
Christopher's review** — nothing here is implemented. Companion to
[`plan.md`](plan.md); if the two disagree, `plan.md` and the code win.*

---

## 1. The problem, in one example

The current layout protocol is **single-pass**: the framework measures every
node bottom-up, handing each container the sizes its children already chose —

```ts
// part.ts today
size?(props: P, m: Measure): Vec;                       // leaf: intrinsic size
measure?(props: P, childSizes: Vec[], m: Measure): Vec; // container: size from kids' sizes
place?(props: P, rect: Rect, kids: ChildInfo[]): Rect[];// container: place kids in own rect
```

`measure` never learns **how much room it has**. That is fine for a `Stack`
(its height is the sum of its children's heights, width-independent) but it makes
one whole class of layout inexpressible: **anything whose size depends on the
space it is given.** The canonical case is a wrapping row:

- A `Flow`'s *height* is a function of the *width* it is handed — narrow → more
  rows → taller. But `measure(props, childSizes)` has no width to pack into, so
  `Flow` cannot return an honest height.

In `split-pane` I dodged this by having `SplitPane` hand `Flow` a **fixed** rect
top-down, so `Flow.measure` could return `(0,0)` and let `place` do the work.
That works only because `Flow` fills a driven region. **Drop the same `Flow`
inside a `Stack`** and it breaks: `Flow.measure → (0,0)`, the `Stack` allots it
zero height, and its siblings draw on top of it. The `split-pane` assessment
called this out as the framework's one load-bearing layout gap.

Every mature layout engine solves it the same way — a **two-phase** pass:

| Phase | WPF | Flutter | This proposal |
|---|---|---|---|
| "How big do you want to be, given at most this much room?" | `Measure(availableSize)` → `DesiredSize` | `layout(constraints)` → `Size` | `measure(props, avail, m) → Vec` |
| "Here is your actual box — place your children." | `Arrange(finalRect)` | `paint`/offsets | `arrange(props, rect, kids) → Rect[]` |

This doc proposes that split for Gratify, **without making the common case any
harder than it is today.**

---

## 2. The mental model (the part that must stay easy)

Two sentences, and most authors never need more:

> **`measure(avail)`** — *given at most this much room, how big do you want to be?*
> Return your desired size.
> **`arrange(rect)`** — *here is your actual box; place your children inside it.*
> Return each child's rectangle. (This is today's `place`, renamed.)

And three guarantees that keep it a gentle default:

1. **Leaves don't change at all.** A fixed-size widget keeps writing `size` —
   it's sugar for "measure that ignores the available room." Buttons, labels,
   icons — the 80% — are untouched.

   ```ts
   size: (props) => v(props.w, 34)      // exactly as today
   ```

2. **`place` → `arrange` is a rename.** Its shape is identical — `(props, rect,
   kids) => Rect[]`, where each `kid.size` is the desired size the child just
   reported. Existing containers port almost mechanically.

3. **Filling is "return what you were offered."** A pane that fills its region
   writes `measure: (_p, avail) => avail`. That *replaces* today's
   `size: () => v(0,0)` + the `layoutScene` `max(size, viewport)` hack. Simpler,
   and it reads as what it means.

You reach for the full `measure(avail)` form only when your size genuinely
depends on your width or height — wrap, fill, aspect-ratio, text reflow. That is
exactly the set of things you *cannot* write today.

---

## 3. The protocol

### 3.1 Types

```ts
// core: a size and an availability are both just Vecs (x = width, y = height).
// An axis may be Infinity, meaning "unbounded — size to your content."
export type Avail = Vec;                 // v(maxW, maxH); Infinity = unbounded
export const UNBOUNDED: Avail = v(Infinity, Infinity);
export const tight = (w: number, h: number): Avail => v(w, h);
```

### 3.2 The measuring context

Today the framework pre-measures all children and hands a container the array.
Two-phase inverts that: **the parent decides each child's constraint and asks for
its size.** The context makes that a one-liner for the common case:

```ts
export interface MeasureCtx {
  /** Size of a text run (unchanged — the old Measure). */
  text(s: string, size?: number): Vec;
  /** How many children this node has. */
  readonly count: number;
  /** Measure one child under a constraint. Memoized per layout pass. */
  child(index: number, avail: Avail): Vec;
  /** Measure ALL children under the SAME constraint — the common case;
   *  reproduces today's `childSizes` array. */
  children(avail: Avail): Vec[];
}
```

`child`/`children` recurse into the child's own `measure` and cache the result
(§5.2), so a container may call them freely.

### 3.3 The facets

```ts
// part.ts — PartSpec (layout facets only)
/** Intrinsic size of a leaf, independent of available room. Sugar for a
 *  `measure` that ignores `avail`. Keep using this for fixed-size widgets. */
size?(props: P, m: MeasureCtx): Vec;

/** Desired size given at most `avail` room. Measure your children through
 *  `m` under whatever constraints your layout implies, then return the size
 *  you want. Only needed when your size depends on the space you're given. */
measure?(props: P, avail: Avail, m: MeasureCtx): Vec;

/** Place children inside your final rect (which may be larger than you asked
 *  for). Return one absolute Rect per child. This is today's `place`. */
arrange?(props: P, rect: Rect, kids: ChildInfo[]): Rect[];
```

`ChildInfo` is unchanged (`{ key, size, props, pos? }`); `size` is now the
child's *desired* size from the measure phase.

**Defaults (a part that declares neither):**
- default `measure` = `m.children(avail)` then the union (max on each axis) — the
  current implicit container size, and what the `Card` composite relies on.
- default `arrange` = each child at the node's origin at its desired size — the
  current implicit `place`.

A part supplies **either** `size` (leaf) **or** `measure` (+ optional `arrange`).
Declaring `size` wins and means "ignore `avail`."

---

## 4. The built-ins, before → after

### 4.1 `Stack` — the fix falls out for free

```ts
// AFTER
export const Stack = part<StackProps>()("stack", {
  measure: (props, avail, m) => {
    const gap = props.gap ?? 8, pad = props.pad ?? 0;
    // hand each child our width but UNBOUNDED height — this is the whole fix:
    // a Flow child now receives a real width and can wrap → real height.
    const sizes = m.children(v(avail.x - 2 * pad, Infinity));
    const w = sizes.reduce((mx, s) => Math.max(mx, s.x), 0);
    const h = sizes.reduce((a, s) => a + s.y, 0) + gap * Math.max(0, sizes.length - 1);
    return v(w + 2 * pad, h + 2 * pad);
  },
  arrange: (props, r, kids) => { /* byte-for-byte today's Stack.place */ },
});
```

Nothing about `Stack` got harder, and a `Flow` (or a text paragraph, or any
width-dependent child) now composes inside it correctly — the exact case that is
broken today.

### 4.2 `Row`

```ts
// children get our height but unbounded width
measure: (props, avail, m) => {
  const sizes = m.children(v(Infinity, avail.y - 2 * pad));
  return v(sum(sizes.x) + gap*(n-1) + 2*pad, max(sizes.y) + 2*pad);
},
arrange: /* today's Row.place, including justify:"between" + align:"stretch" */
```

### 4.3 `Flow` — now a first-class stock container (the payoff)

The wrap algorithm is a pure helper shared by both phases:

```ts
/** Pack fixed-size boxes into `innerW`, wrapping rows. Returns each box's
 *  offset from the content origin, plus the total wrapped height. */
function packRows(sizes: Vec[], innerW: number, gap: number): { offsets: Vec[]; height: number } { … }

export const Flow = part<{ gap?: number; pad?: number }>()("flow", {
  measure: (props, avail, m) => {
    const pad = props.pad ?? 12, gap = props.gap ?? 8;
    const sizes = m.children(UNBOUNDED);                    // children are intrinsic
    const { height } = packRows(sizes, avail.x - 2 * pad, gap);
    return v(avail.x, height + 2 * pad);                    // HONEST height, from width
  },
  arrange: (props, r, kids) => {
    const pad = props.pad ?? 12, gap = props.gap ?? 8;
    const { offsets } = packRows(kids.map(k => k.size), r.w - 2 * pad, gap);
    return offsets.map((o, i) => rect(r.x + pad + o.x, r.y + pad + o.y, kids[i].size.x, kids[i].size.y));
  },
});
```

`Flow` graduates from an example part to a built-in, so `split-pane` (and anyone
who wants a toolbar/tag-cloud/button-grid) drops its hand-rolled copy.

### 4.4 `Free`, `Layers` — trivial ports

`measure` = union of children under `UNBOUNDED`; `arrange` = today's `place`.

### 4.5 `SplitPane` (the example) — the fill hack disappears

```ts
// BEFORE: size: () => v(0, 0)         + rely on layoutScene's max(size, viewport)
// AFTER:
measure: (_props, avail) => avail,     // "I fill whatever I'm given"
arrange: (props, r) => [ /* left | divider | right, unchanged */ ],
```

---

## 5. Framework internals

### 5.1 `layout.ts` — the two passes

```ts
export function layoutScene(root, dt, eff, textM, viewW, viewH) {
  const memo = new MeasureMemo(eff, textM);              // per-pass cache (§5.2)
  const desired = memo.measure(root, v(viewW, viewH));   // PASS 1: measure from the viewport down
  const rootRect = new Rect(0, 0, Math.max(desired.x, viewW), Math.max(desired.y, viewH));
  arrangeInst(root, rootRect, memo, eff);                // PASS 2: arrange top-down
  stepRects(root, dt);                                   // UNCHANGED: springs consume arrange targets
}
```

- **Pass 1 (measure)** is now *parent-driven*: `memo.measure(inst, avail)` runs
  `inst`'s `measure` facet, which calls `m.child(i, …)` → `memo.measure(child,
  …)`. Leaves with `size` ignore `avail`. A node without a `measure` facet runs
  the default (union of `m.children(avail)`).
- **Pass 2 (arrange)** is today's `placeInst`, renamed: call `arrange(props,
  rect, kids)` (kids carry their memoized desired sizes), recurse into each child
  with its rect.
- **`stepRects` is untouched.** `arrange` sets `inst.target` exactly as `place`
  does now, so position springs and size eases work identically. The whole
  animation story is unaffected.

### 5.2 Memoization & cost

A parent may measure a child more than once (e.g. a future `grow` container does
two passes). Without care that is exponential. The fix is standard: **cache each
node's desired size per `(instance, avail)` for the duration of one layout
pass**, cleared every tick.

```ts
class MeasureMemo {
  private cache = new WeakMap<Instance, Map<string, Vec>>();   // key = quantized avail
  measure(inst, avail): Vec { /* memoized dispatch to size/measure/default */ }
}
```

With memoization, a single-constraint tree is **O(n)** — the same class as
today. Multi-pass containers cost O(passes·subtree), which is why `grow`
(§6) is opt-in. Cross-tick caching (skip re-measure when neither props nor
constraint changed) is a later optimization, not required for correctness.

### 5.3 The extension algebra gains `mapMeasure` / `mapArrange`

Today only `mapSize` exists. To keep the algebra complete (every facet has a
wrapper), add:

```ts
export const mapMeasure = (f: (props, avail, m, base: Vec) => Vec): PartExt => …
export const mapArrange = (f: (props, rect, kids, base: Rect[]) => Rect[]): PartExt => …
```

`mapSize` stays as leaf sugar (wraps `size`). This slots straight into the
facet/extension table in the layering guide.

---

## 6. Fill, stretch, and grow — how far the default reaches

Two-phase gives us the first two immediately and defers the third on purpose:

- **Fill** — `measure: (_p, avail) => avail`. A node that wants all of its
  offered room. (Replaces the `(0,0)` hack.)
- **Stretch (cross-axis)** — already works via *arrange*: `Stack
  align:"stretch"` simply arranges a child into the full width. No constraint
  machinery needed, because a part renders into `node.rect` regardless of its
  desired size. Keep the `align:"stretch"` that shipped with the body facet.
- **Grow (main-axis flex, "take the leftover space")** — the one case needing a
  *second* measure pass: measure inflexible children, distribute the remainder
  across `grow`-weighted children, measure those under tight constraints. This is
  a container-level concern (a `grow?: number` child prop read by `Stack`/`Row`),
  **not** a core-protocol addition, and it is deferred to its own increment. The
  memo (§5.2) is what makes it affordable when it lands.

Keeping `Avail` a plain `Vec` (max-only, `Infinity` for unbounded) rather than a
full `{min,max}×{w,h}` `BoxConstraints` is a deliberate simplicity choice: it
covers wrap, fill, and stretch, and it reads as "how much room" instead of a
four-number box. Min-constraints can be added later if a real case needs them
(§10).

---

## 7. The one correctness rule authors must know

> **Measure a child with the width (or height) you intend to give it in
> `arrange`.**

A container that measures children at width `W` but then arranges them at width
`2W` can desync (a text child measured-wrapped at `W` won't re-wrap). The stock
containers obey this by construction (they measure and arrange with the same main
extent). Document it as the single rule; it is the two-phase invariant every
engine shares, stated plainly.

Note this is orthogonal to the *animation* transient the `split-pane`
assessment raised (layout snaps to target geometry while sizes ease, so a mid-
resize frame can briefly overlap). That is inherent to "layout computes targets,
channels interpolate" and is out of scope here.

---

## 8. Migration & sequencing

Gratify is pre-1.0 with a small, in-repo surface, so this is a **clean replace**
of `measure(childSizes)/place` with `measure(avail)/arrange`, keeping `size`.
No compatibility shim — the call sites are all ours and few.

| Phase | Contents | Files |
|---|---|---|
| 1 | `MeasureCtx`, `Avail`/`UNBOUNDED`/`tight`, `size`/`measure`/`arrange` on `PartSpec`; `layout.ts` two-pass + `MeasureMemo`; keep defaults | `part.ts`, `layout.ts`, `core` |
| 2 | Port built-ins: `Stack`, `Row`, `Free`, `Layers`; promote `Flow` to a built-in; `ADORN_ROOT`/`GESTURE_ROOT` in `runtime.ts` | `containers.ts`, `runtime.ts` |
| 3 | `mapMeasure`/`mapArrange`; retire `mapSize`-only note in guide | `extend.ts`, docs |
| 4 | Port examples that define layout parts: `split-pane` (drop local `Flow`, fill via `measure→avail`), `widget-board` `Board` (`measure→avail`), `node-editor` surface | examples |
| 5 | Kernel tests: `Flow`-in-`Stack` reports real height; fill; a width-dependent leaf; memo call-count guard | `tests/` |
| 6 | Docs: README architecture + layering guide + `SKILL.md` facet table (`measure(avail)`/`arrange`, the §7 rule, `size` still the leaf default) | docs |

Each phase: `npm run test` + `npm run check` green, gallery spot-checked. The
kernel already has no per-frame layout state beyond the tree, so the blast radius
is `layout.ts` + `containers.ts`; `reconcile`, `animate`, `draw`, and the runtime
loop are untouched.

## 9. Done-when

- A `Flow` nested inside a `Stack` reports an honest height and its siblings sit
  below it (the currently-broken case), under unit test.
- `split-pane` and `widget-board` express "fill the viewport" as `measure: (_p,
  avail) => avail` — the `(0,0)` + `max(size, viewport)` hack is gone from both
  the examples and `layoutScene`.
- Leaf parts still use `size` unchanged; no example gained ceremony for a fixed-
  size widget.
- A single-constraint layout measures each node once (memo call-count test).

## 10. Alternatives considered

- **Full `BoxConstraints` (`min`/`max` on both axes), Flutter-style.** More
  powerful (tight constraints express fill/grow uniformly), but a four-number box
  is a worse *default* to teach than "here's how much room." We get fill and
  stretch without it (§6); add `min` later if a concrete case demands it.
  Rejected as the default surface, available as a future extension.
- **Keep single-pass, let `place` return sizes back up.** A `place`-that-also-
  resizes tangles the one clean top-down pass and still can't inform a parent's
  *measure*. Doesn't actually solve `Flow`-in-`Stack`. Rejected.
- **Framework auto-measures children (today's model) plus an `avail` argument.**
  Passing `avail` into `measure` while the framework still pre-measures children
  bottom-up is contradictory — the child's size can't depend on a constraint the
  parent hasn't computed yet. Parent-driven measurement (§5.1) is the thing that
  makes it work. Rejected.
- **A separate `Constraints` object instead of reusing `Vec`.** Cleaner types,
  but one more concept and a conversion at every call. `Vec` with `Infinity`
  reads fine and keeps sizes and availabilities in one currency. Rejected for
  now.
```
