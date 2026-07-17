# Gratify — Local State & Dropdowns: a starting brief (AI-generated)

*Written 2026-07-14 by Claude as a handoff for a stronger agent. This is a
**brief, not a finished design**: it fixes the problem, the acceptance test,
the constraints, and the seams — and deliberately leaves the mechanism's shape
open where prior art and the current code genuinely underdetermine it. Read
`docs/plan.md` (the spec), `docs/kea-layering-guide.md` §4d + §5e (the prior
design this revives), and the code cited below before committing to an approach.
If this brief disagrees with the code, the code wins.*

---

## 1. What we're building and why it's the next rock

Everything a Gratify app knows lives in one immutable `Doc`, changed only
through typed intents and a pure `update`. That is the framework's spine and it
must not bend. But some UI state has no business in the app's `Doc`:

- a dropdown that is **open**,
- a number field mid-**scrub** or showing a half-typed **draft**,
- a search-select's **filter text** before a choice is made.

The litmus test (from the layering guide §4d, keep it verbatim in the docs):
**would the user be annoyed if undo skipped it, or if saving lost it?** If yes,
it's model state — it goes in the `Doc`. If it evaporates harmlessly when the
widget disappears, it's **local**. "The dropdown is open" is local; *which item
is selected* is model. Today Gratify has no home for the first kind, so a
dropdown cannot be written as a self-contained widget — the app is forced to
put `dropdownOpen` in its `Doc` and thread an intent for it, which is exactly
the leak `update`-purity was meant to prevent, and it means **undo re-opens
dropdowns**.

This is the last real gap in the M3 "editor-grade" tier (`plan.md` §M3, item 5:
"Local state + modal adornments"). The `body` composite facet and the `adorn`
facet — the two things a dropdown is *made of* — already shipped. Local state
is the missing third piece that lets them combine into a dropdown with **zero
framework edits at the widget's use site**. That "zero edits" property is the
acceptance test; see §5.

## 2. The current terrain (what already exists to build on)

Read these before designing — the mechanism must slot into them, not beside
them:

- **`scene.ts:56`** — `Instance` already carries `local?: unknown;` with the
  comment `// instance-local UI state (M3 wires up routing)`. The slot was
  reserved on purpose. It is currently never read or written.
- **`part.ts:125`** — the `body` facet: `body?(props, children): Element[]`.
  Pure `props → elements`, the composite mechanism. **This is where local state
  must arrive**: a dropdown's body needs to see the open flag to decide whether
  to emit the list. The natural shape is a third argument
  (`body(props, children, local)`), which is additive.
- **`compose.ts`** — `expandBodies(el)` is the pure element pre-pass that runs
  every `body`. It runs on the **state clock** (state change or theme bump),
  not per frame. Local-state expansion has to happen *here*, and this is the
  crux problem: `expandBodies` currently takes only an `Element` tree and has
  **no access to `Instance` local state** (which lives on the retained tree
  built by `reconcile`, a *later* pass). Resolving that ordering is the heart
  of the task — see §4.
- **`runtime.ts`** — `dispatch = (i) => { this.doc = this.app.update(this.doc, i); … }`
  is the single intent sink. Local intents must be *intercepted before here*
  and routed to a node's reducer instead. The input pipeline
  (`pointerDown/Up`, `key`) is where intents originate; note `pointerUp`
  already has the hit `Instance` in hand.
- **`interact.ts`** — `Intentish = unknown`; the framework treats intents
  opaquely. There is no marker mechanism yet for "this intent is local."
- **`adorn` facet + `examples/adornments/main.ts`** — a working, interactive,
  overlay-layer, self-anchoring decoration system. A dropdown's list *is* an
  adornment gated on the open flag. But note the two gaps §5e of the guide
  calls out and that the current adorn implementation does **not** yet solve:
  **layer promotion** (already partly there — adornments draw on the overlay
  layer, `draw.ts`) and **modal input capture** (NOT there — a click outside
  an open dropdown neither closes it nor is consumed; today it would fall
  through and hit whatever is underneath). Modal capture is a required
  sub-deliverable, not optional polish.
- **The `part(...)` builder (`part.ts` §builder)** — the primary authoring
  form now (`part("x").props<P>().body(...).style(...)`). Any new facet
  (`reduce`) or new `body` arity must be threaded through the builder's
  typestate too, and it must **infer the local-state type** the way `style`
  infers its record — otherwise the ergonomics regress and authors will avoid
  it (the exact failure the style-and-body plan was written to prevent).

## 3. The prior design to revive (Kea layering guide §4d, §5e)

This was fully designed for Kea/PeacockV2 and never built in Gratify. Port the
*shape*, adapt to Gratify's TS idioms:

**Local state = a per-node reducer, scoped exactly like the app's `update`:**

- A composite may declare **`reduce(node, local, intent) → [newLocal, forward?]`**.
- Intents tagged **local** route to the **nearest enclosing node with a
  `reduce`** and never reach the app's `update`.
- `reduce` returns the new local state **plus an optional intent to forward
  onward** — that is how "commit" turns a private draft into a real app intent
  (`EndEdit(true) → Set(value)`).
- Local state is born with the node, keyed to it like a channel, and gone when
  it exits. A **local intent re-expands only its own node's body** — typing in
  a draft never rebuilds the app's whole view. That scoping is both the
  encapsulation win and a real perf win.

The guide's worked example is `NumberField` (slider that becomes an edit-box on
double-click; `BeginEdit`/`Typed`/`EndEdit` local intents). Read
`kea-layering-guide.md:491-568`. Two rules from §5e complete the dropdown:

- **Layer promotion** — the popup renders above all content, escaping the
  host's bounds/clip. (Mostly present via the overlay layer; verify.)
- **Modal input capture** — while a modal adornment is present it gets input
  first, and a press **outside** its bounds dispatches its dismiss intent *and
  is consumed*. That single rule is the whole "click-away closes it and does
  **not** also select the node underneath" story. This is new work.

**Structure/motion split still holds (§4e):** `reduce` and `body` are
state-clock — they read props, local, tags, never channels. If the dropdown
should *animate* open, `body` emits the list keyed and gated on the open flag;
its enter/exit channels do the motion. Don't try to blend in `body`.

## 4. The hard part (where creativity is actually needed)

The ordering problem, stated plainly: **`body` needs local state, local state
lives on the retained `Instance` tree, but `expandBodies` produces the element
tree that `reconcile` consumes to *build* that retained tree.** Chicken/egg.
Several resolutions exist; each has costs. Evaluate them — don't assume the
first:

- **Carry local across the pre-pass by key.** Keep a runtime-owned
  `Map<key, local>` (survives across frames, pruned on exit like ghosts), and
  pass a `(key) → local` lookup into `expandBodies` so a `body` can read its
  own node's local by key *before* reconcile. Simple; the wrinkle is stable
  keying for nodes whose parent path changes, and defining "nearest enclosing
  reduce" during a pure pre-pass.
- **Two-phase expand/reconcile/expand.** Reconcile a shallow tree, read local
  off instances, expand, reconcile again. More faithful to instance identity;
  costs a second pass and complicates the "runs once on state change" story.
- **Fold local into reconcile itself.** Expansion happens *inside* reconcile
  where the instance is in hand. Rejected in the style-and-body plan for
  tangling concerns — but with local state in the picture the tradeoff may have
  shifted. Re-litigate honestly.

Pick the one that keeps `scene.ts` (the kernel) smallest and keeps the
state-clock guarantee (no per-frame expansion). Whatever you choose, the
**routing of local intents** ("nearest ancestor with a `reduce`") needs the
parent chain, which the `Instance` tree has and the `Element` tree does not —
so routing almost certainly lives in the runtime input pipeline
(`pointerUp`/`key`), walking `inst.parent` upward until a `reduce` is found,
mirroring how `key()` already walks the focus/hover chain (`runtime.ts:232`).

Open sub-questions to resolve (flag your decisions in the doc you leave behind):

1. How is an intent marked "local"? A branded type? A `local: true` field? A
   wrapper (`Local(intent)`)? It must be ergonomic in the builder and type-safe
   (a `reduce` should see only its own local-intent union).
2. What happens to a local intent with **no** enclosing `reduce` — silently
   dropped, dev-warned, or forwarded to `update`? (Recommend dev-warn.)
3. Does `reduce`'s forwarded intent re-enter routing (could it be caught by a
   *higher* reduce), or go straight to `update`? Pick one; the guide implies
   straight to `update`.
4. Modal capture: one global "topmost modal eats input" rule in the runtime,
   or a per-adornment flag checked in hit-testing? Keep it to **one** rule if
   you can — the guide warns it's "exactly one more rule than hit-test
   top-down, and worth watching."

## 5. Definition of done (the acceptance test, non-negotiable)

The M3 acceptance test, phrased for this rock: **a dropdown (enum select) is
defined entirely at its own site — one part definition — and used with no
app-side ceremony beyond passing the value and a setter.** Concretely:

- A `Select`/`EnumField` widget whose **open state is local**: clicking the
  field opens a list adornment; clicking an item emits **one** app intent
  (`Set(choice)`) and closes; clicking **away** closes it and selects nothing
  underneath (modal capture); pressing Escape closes it.
- The app's `Doc` contains the **selected value only** — never an "open" flag.
  **Undo/redo never opens or closes the dropdown** (the headline regression
  the guide calls out). Add a kernel test asserting this.
- Open/close **animates** via the list's enter/exit channels, with zero
  `animate()` calls.
- A new **`examples/dropdown/`** (or `local-state/`) folder proving it, with
  the prose acceptance test at the top of `main.ts` (house convention), added
  to the gallery. Ideally a second widget — a scrub/draft `NumberField` per the
  guide — to show the reducer generalizes beyond a boolean.
- `npm run test` and `npm run check` green; the boundary check still passes
  (the framework imports no example module); the builder change keeps every
  existing example compiling (spec-object and builder forms both).
- Local state type is **inferred** through the builder, not hand-annotated —
  parity with how `style` infers its record.

## 6. Scope discipline

- **In:** `reduce` facet + local-intent routing, `body` gains local access,
  modal input capture, one dropdown example (+ optionally a draft number
  field), builder threading with inference, kernel tests, docs.
- **Out (defer, note as follow-ups):** real **text input / `EditBox`** — text
  is the iceberg (caret, IME, clipboard); substitute a scrub-only or
  fixed-choice field so the mechanism isn't blocked on it. **HTML islands**
  (the DOM-node-glued-to-a-world-rect story from §5e) — same mechanism family,
  separate rock. Grow/flex layout. Don't let the dropdown drag these in.
- **Never:** app state leaking back into the framework package; per-frame body
  expansion; a second global input rule beyond modal capture unless truly
  forced.

## 7. Pointers

- `docs/plan.md` §M3 (item 5), §"waves 3" (`dropdown-and-fields` was always the
  intended example).
- `docs/kea-layering-guide.md` — §4d (local state, `Reduce`, the litmus test,
  `NumberField`), §4e (structure/motion split), §4f (the composite gallery —
  `ColorField`, `SearchSelect`, `RangeField`… all unlock from this), §5e
  (popups = adornments + layer promotion + modal capture), §5f (the host
  boundary — the discipline this must not break).
- `docs/style-and-body-plan.md` + `docs/measure-arrange-plan.md` — the two most
  recent facet additions; match their commit-per-phase, test-green cadence and
  their inference-first ergonomics bar.
- Code seams: `scene.ts:56` (`local`), `part.ts:125` (`body`) + §builder,
  `compose.ts` (`expandBodies`), `runtime.ts` (`dispatch`, `pointerUp`,
  `key`, the adorn sync + hit-testing), `draw.ts` (overlay layer),
  `examples/adornments/main.ts` (the closest working precedent).
