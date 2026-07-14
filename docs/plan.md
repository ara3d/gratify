# Gratify — High-Level Implementation Plan

*Written 2026-07-13. Status 2026-07-15: **M0, M1, M2 complete; M3 mostly
complete** — surface-as-part (grid/Pan/Keys), anchors + wire connectors,
gestures with state/query/overlay-view, impulse channels, viewport layers,
`GNode.time` + `ambient` for time-based motion, and the **`adorn` facet**
(overlay elements anchored to a host, applied to any widget via `addAdorn`;
decorative ones pass through, interactive ones capture clicks). Examples:
counter, todo, toggles, undo, extensions, keyboard-and-drag, node-editor,
widget-board, borders, combo-button, magnify, earthquake, adornments.
Remaining from M3: instance-local state routing + modal popups (dropdowns).
M4 not started.*

*This plan describes how to get from an empty repository to
the framework the [README](../README.md) promises. The README is the spec: every
claim in it must eventually be backed by running code, and the plan is organized
so that the proof arrives as early as possible — as a growing gallery of small,
working examples.*

---

## 0. Starting position — we are not starting from zero

Gratify is the synthesis of two prior efforts in the `studio` repository:

- **Kea** (`labs/kea`) — a working TypeScript proof of concept. Its kernel
  (~650 lines: keyed reconcile with exit "ghosts", springs, animated channels,
  the two-clock loop with render-on-demand sleep, a Canvas2D painter, transient
  fx) is proven, app-neutral, and already imported by a second app (PlatoFlow).
  This kernel is the seed of Gratify's core.
- **PeacockV2 / the layering design** (`docs/kea-layering-guide.md`,
  `docs/peacockv2-guide.md`) — the composition model: parts as bundles of
  facets, **wrap function facets / append list facets**, extensions as ordinary
  part→part functions, three application scopes (definition, theme, use site).
  This is designed but unbuilt; Gratify is where it gets built.

Equally important are the lessons Kea paid for, which are constraints here from
day one:

1. **The framework imports no app/example module — ever.** Kea's runtime
   originally imported its demo's `Doc`/`view`/`update` by name; the bill
   arrived when a second app had to fork the whole framework. Enforce
   mechanically: a build-time grep that `src/gratify/` (the package) contains no
   import from `examples/`.
2. **The surface is a widget.** Grids, pan/zoom, marquee, HUDs, and post-effects
   must hang off the root as ordinary facets, not framework special cases.
3. **Connectors need anchors.** Geometry *between* widgets (wires, guides,
   attached tooltips) needs a first-class anchor registry, not side tables.
4. **Local state exists.** Drafts, open popups, and scrub-in-progress belong to
   the widget instance, not the app Doc — otherwise undo reopens dropdowns.
5. **Gesture previews are elements.** The rubber-band wire and the marquee
   rectangle must come from the gesture as overlay elements, so "the element
   tree describes the screen" stays true during a drag.

The rule of engagement with Kea's code: **port deliberately, don't wrap it**.
The kernel files (`core`, `scene`, `runtime`, `painter`, `fx`) move over nearly
as-is; everything Kea did *around* the kernel (role-dispatched input, inline
wire drawing, hardcoded channel wiring) is what Gratify replaces with the facet
model, so none of that comes along.

## 1. Strategy: examples are the roadmap

The single highest-priority deliverable is a **gallery of small working
examples**, each one existing to prove a specific README claim. Examples come
*before* API polish, before docs, before completeness — because Kea's history
shows the design only gets honest when a real app leans on it (the node editor
exposed every hole the facet model had).

Each example is:

- **One folder under `examples/`**, one HTML entry, sharing a single Vite dev
  server with a gallery index page.
- **An acceptance test in prose** at the top of its `main.ts`: "this example
  proves README §N — you should see X when you do Y."
- **A consumer, not a friend, of the framework** — it imports the public
  package entry (`gratify`) only. If an example needs a private hook, the API
  has a hole; fix the API.

The gallery doubles as the marketing asset: the README's claims link to live
examples, and eventually the gallery deploys as a static demo site.

## 2. Milestones

### M0 — Skeleton + kernel port (the enabler)

Repository plumbing and the proven core, moved in cleanly:

- `package.json`, TypeScript strict config, Vite, Vitest; `src/gratify/` is the
  package, `examples/` are consumers, `docs/` for design notes.
- Port from Kea: value types + springs + `approach` easings (`core`),
  `Element`/`Instance`/keyed `reconcile` with ghosts (`scene`), the generic
  two-clock loop with wake/sleep and deterministic `step(n, dt)` (`runtime`),
  the Canvas2D `Painter`, transient `fx`.
- Typed from the start: no `any` seams (Kea's `rt: any` escape hatch is the
  anti-pattern this milestone retires). `mount(canvas, { init, update, view })`
  is the only entry point.
- The boundary grep wired into `npm run build`.

*Done when:* the README's counter example compiles and runs against the real
package, and `step()` drives it headlessly in a unit test.

### M1 — The part model + first examples wave

The core authoring API from the README: `part()` with the six facets
(`size`, `channels`, `style`, `render`, `on`, `adorn`), tokens, and the
built-in containers (`Stack`, `Row`, `Label`). Layout is the real
measure/place negotiation — sizes feed **position/size channels**, so any
layout change animates (this replaces Kea's fixed per-role geometry, its
biggest demo shortcut).

**Examples wave 1** (each ~100 lines, proving README §1–§2):

| Example | Proves |
|---|---|
| `counter` | the README hello-world, verbatim — it must actually run |
| `todo` | keyed enter/exit/reflow: add, complete, delete rows all animate with zero animation code |
| `toggles` | custom parts: toggle switch (spring overshoot), slider, checkbox — each one `part()` definition |
| `undo` | update middleware: `undoable(update)` wraps the reducer; every undo animates |

*Done when:* all four run from the gallery; deleting a todo plays exit while
siblings glide; nobody wrote an `animate()` call.

### M2 — Interactors + composition algebra

The two remaining pillars of the README:

- **Interactors as values**: `Press`, `Hover`, `Drag`, `Drag1D`, `Focusable`,
  `Keys`, with framework-owned hit-testing, capture, click-vs-drag
  disambiguation, and gesture state. Port Kea's tuned thresholds (they're
  already right); redesign the shape (values attached via `on:`, not a
  role-dispatch switch).
- **The wrap/append algebra** (the layering guide, finally built):
  `mapStyle`/`mapRender`/`mapSize` wrappers, appendable
  channels/behaviors/adornments, extensions as part→part functions, and the
  three scopes — definition, **theme** (`theme.extend(Button, …)`), use site
  (`.with(…)`). Wrapper stacks compose once at reconcile, not per frame.
- **Themes**: token sets + per-part style wrappers; `setTheme` cross-fades.

**Examples wave 2:**

| Example | Proves |
|---|---|
| `keyboard-and-drag` | interactors: reorderable list via `Drag`, keyboard navigation via `Focusable`/`Keys` |
| `extensions` | wrap/append: `outlined`, `sparkle`, `tooltip` applied to stock widgets at all three scopes — the README's own snippets, running |
| `themes` | two themes + live switcher; the cross-fade costs zero example code; one theme restyles a widget it doesn't own |

*Done when:* the README's `outlined`/`sparkle` code blocks are copy-pasted from
the working example (not the other way around), and adding a tooltip to a
"third-party" widget takes one line.

### M3 — Editor-grade tier

The features that make Gratify more than a forms toolkit, in the order Kea's
retrospective recommends:

1. **Surface as a widget** — root is a part; grid/pan/zoom/marquee/HUD are its
   facets; three fixed layers (world / overlay / screen).
2. **Anchors + connectors** — parts publish named world-space points into a
   registry; a connector is an element whose geometry is anchor references.
   Wires are keyed elements: they exit-animate, hit-test, and theme.
3. **Gestures with state, query, and view** — the bounded upgrade for
   marquee/wire-drag/snap: private reducer state, a read-only scene `Query`
   (predicates supplied by the app as data), and overlay preview elements.
4. **Impulse channels** — declared decay + `kick()`, for event-afterglow
   effects (connect flash, invalid shake) without fake state.
5. **Local state + modal adornments** — instance-local reducers (`ILocal`
   routing) and the two popup rules (layer promotion, modal input capture), so
   a dropdown is definable entirely at its own site.

**Examples wave 3:**

| Example | Proves |
|---|---|
| `mini-node-editor` | the flagship: nodes, typed sockets, magnetic wire-drag, marquee, pan/zoom — a few hundred lines, all app-side |
| `dashboard` | surface + adornments in a non-editor app: animated gauges, sparklines, drag-to-rearrange cards |
| `dropdown-and-fields` | local state + modal adornments: enum dropdown, number scrubber with draft state; undo never reopens a popup |

*Done when:* the acceptance test Kea never passed — **add a new gesture
(slice-wires) as one example-side file with zero framework edits** — passes
here.

### M4 — Hardening + the story

- **Testing**: golden-frame tests via deterministic `step()` + a recording
  painter; unit tests for reconcile edge cases and interactor arbitration.
- **Docs**: a guide grown from the examples (each chapter = one example,
  explained); an honest limitations page (text input is deliberately out of
  scope until an HTML-island story lands — text is the iceberg).
- **Gallery deploy** as a static site; README claims link to live examples.
- **The second-app proof**: port PlatoFlow (or a new small app) to import
  published Gratify — the ultimate composability regression test.

## 3. Sequencing and dependencies

```
M0 kernel ─► M1 parts + wave-1 examples ─► M2 interactors + algebra + wave 2
                                        └► M3 editor tier + wave 3 ─► M4 hardening
```

- M1 before M2: the algebra wraps facets, so facets must exist first.
- Within M3, the internal order matters: surface → anchors → gestures
  (gesture views and snap read anchors; everything lives on the surface).
- Waves of examples land *inside* their milestone, not after it — an example
  that can't be written yet is the signal the milestone isn't done.

## 4. What we are deliberately not doing (yet)

- **Text editing / IME / accessibility tree.** The hardest problem in
  canvas UI; deferred until the HTML-island mechanism (a DOM node glued to a
  world rect) is designed. The README must not claim it until then.
- **A second render backend / DrawList.** `Painter` behind an interface is
  sufficient insurance; a command list is only worth it when a concrete second
  backend (SVG, WebGL, headless golden-images) is scheduled.
- **A constraint solver.** Anchors are one-way published points; real geometric
  coupling is computed inside layout. Keep it that way until an example breaks.
- **Widget count.** Kea proved 33 widgets teach less than one good seam. Ship
  the ~10 widgets the examples need; breadth comes from the community the
  composition model is designed to enable.

## 5. Risks

- **The algebra is unproven.** Wrap/append is designed on paper (layering
  guide) but was never built in Kea. M2's `extensions` example is the earliest
  possible reality check — if wrapper stacks feel heavy in TypeScript
  (inference, debugging through wrapped functions), simplify the algebra before
  M3 builds on it.
- **Layout is the biggest departure from proven code.** Kea never had general
  measure/place; animated layout channels at M1 scale is new. Keep the solver
  minimal (Stack/Row/Free/Grid, no flexbox emulation) and let examples pull
  complexity in.
- **Porting temptation.** Kea's node editor is a working feature farm; the
  temptation is to port features (subgraphs, lambdas, 3D viewports) instead of
  seams. The M3 flagship is deliberately a *mini* node editor — features stop
  at "proves the tier."
