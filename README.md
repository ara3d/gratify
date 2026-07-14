# Gratify

*Because your UI should be satisfying.*

**A TypeScript UI framework where everything that changes, animates — and everything you build, composes.**

Gratify renders to canvas, keeps a living animated scene in sync with your state, and asks you to learn exactly two mechanisms: **pure functions over state** for describing, and **channels** for changing. Buttons, forms, dashboards, node editors, timelines, games' UI — the same primitives cover all of it.

> You describe what the UI should be for the current state. Gratify keeps a retained, animated scene in sync with that description. Everything that changes, tweens.

```ts
import { mount, part, Press, Stack, Label, v } from "gratify";

type Doc = { count: number };
type Intent = { kind: "increment" };

const update = (doc: Doc, _: Intent): Doc => ({ count: doc.count + 1 });

const Button = part<{ label: string; press: Intent }>("button", {
  size: (props, measure) => v(measure.text(props.label).x + 28, 34),
  style: (tokens, ch) => ({
    fill: tokens.mix(tokens.surface, tokens.accent, 0.2 + 0.3 * ch.hover + 0.4 * ch.press),
    lift: 2 * ch.hover - 2 * ch.press,
    text: tokens.text,
  }),
  render: (node, paint, s) => {
    paint.box(node.rect.raise(s.lift), 8, s.fill);
    paint.label(node.props.label, node.rect.center, s.text);
  },
  on: [Press((node) => node.props.press)],
});

mount(canvas, {
  init: { count: 0 },
  update,
  view: (doc) =>
    Stack("root", { gap: 12, pad: 24 }, [
      Label("msg", { text: `Clicked ${doc.count} times` }),
      Button("btn", { label: "Click me", press: { kind: "increment" } }),
    ]),
});
```

That's a complete app. Notice what you did **not** write: no event listener plumbing, no "add the label to the panel," no hover handler, no animation code. Yet at runtime the button breathes — it brightens and lifts on hover, sinks on press, and every state change glides instead of snapping.

---

## Why Gratify?

### 1. Juice is the substrate, not a feature

Every scene node carries **channels** — named numbers that continuously chase state-derived targets, with springs (momentum, overshoot) or eases (smooth decay). Because nodes are retained across state changes and matched by key, a node always knows where it *was* — so when its target moves, it glides there.

What this buys you, with zero animation code:

- Toggle a `selected` tag → every style that reads `channels.selected` cross-fades.
- Delete a row → it plays an exit animation while siblings glide to fill the gap.
- Swap the theme → the entire UI choreographs a cross-fade.
- Release a dragged node → it springs to its drop point *with momentum*, because velocity lives in the channel.

There are no timelines, no `animate()` calls, no easing zoo. The animation API is: *values chase targets*. That's it.

### 2. One state, one direction

Your app state is a plain immutable **Doc**. The UI is a pure function `view(doc) → Element tree`. Changes are typed **Intents** handled by one pure `update(doc, intent) → doc`.

Because intents are data and update is pure, you get for free: trivially testable logic (no runtime needed), **undo/redo as a three-line middleware**, replay and logging, and a wire format for collaboration. There is no `useState`, no two-way binding, no ViewModel, no hidden framework state to drift out of sync.

### 3. Wrap, don't edit

Gratify's composition rule fits in one sentence:

> **Nothing is ever edited. Everything is wrapped or appended.**

A widget ("part") is a bundle of small **facets**. Function facets (`measure`, `style`, `render`) extend by *wrapping* — you receive the original result and state only your delta. List facets (`channels`, `behaviors`, `adornments`) extend by *appending* — your entry is added, nothing replaced.

```ts
// A red debug outline on ANY widget. The widget never planned for this.
const outlined = <P>(w: Part<P>) =>
  w.mapRender((node, paint, base) => {
    base(paint);
    paint.box(node.rect, 0, none, red, 1);
  });

// Sparkle-on-hover, attachable to anything:
const sparkle = <P>(w: Part<P>) =>
  w.channel("fx/sparkle", (n) => n.ch.hover, ease(4))
   .mapRender((n, paint, base) => { base(paint); paint.shimmer(n.rect, n.ch["fx/sparkle"]); });
```

An extension is **just a function from part to part** — no plugin API, no registration, no base class. Chain them (`Button.pipe(sparkle, outlined)`), name them, ship them in libraries. And the same extension applies at three scopes: baked into a new named part, app-wide via a theme (*including widgets inside third-party code you can't edit*), or on one element at its use site.

Tooltips, selection, accessibility labels, undo, debug overlays, whole visual skins — every one is layerable onto a library that never anticipated it.

### 4. Styling is arithmetic, not a cascade

```
tokens → style function(tokens, channels, props) → resolved values → render
```

No CSS, no selectors, no specificity, no trigger precedence. State-dependent looks are channel blends inside a plain function — `tokens.mix(surface, accent, ch.hover)` — debuggable with `console.log`. A theme is a token set plus per-part style wrappers; `setTheme(dark)` cross-fades the whole app, because token changes ease like everything else.

### 5. Input as values

Behavior attaches as a list of **interactors** — reusable gesture recognizers parameterized by *what intent to emit*:

```ts
on: [
  Press((n) => ({ kind: "open", id: n.key })),
  Drag({ to: (n, d) => ({ kind: "move", id: n.key, delta: d }) }),
  Keys({ Enter: (n) => ({ kind: "open", id: n.key }) }),
]
```

Interactors emit intents and set tags — they never touch your state or the scene. Hit-testing, capture, click-vs-drag disambiguation, and gesture arbitration live in the framework once, not in every widget's event spaghetti. Editor-grade gestures (marquee, wire-drag with magnetic snap, drag-with-guides) get bounded extra powers — private gesture state, read-only scene queries, and a live overlay view — so even the rubber-band preview is ordinary, themeable elements.

### 6. Built for editor-grade UIs, not just forms

Gratify grew up building a node editor, so the hard problems most frameworks punt on are first-class:

- **Anchors & connectors** — widgets publish named world-space points; wires and guides are ordinary keyed elements whose geometry references them. Delete an edge and the wire *fades out*. Click a wire to select it. Theme all wires in one line.
- **The surface is a widget too** — the canvas grid, pan/zoom, marquee, HUD, and post-effects are just facets on the root, reachable by every extension mechanism.
- **Pan/zoom-aware everything** — gestures, adornments, and popups all operate correctly under a viewport transform, with world-space and screen-space metrics where each belongs.
- **Local state** — a widget's half-typed draft or open dropdown lives in runtime-owned local state, not your Doc. Undo never reopens a popup.

### 7. Small, fast, honest

- **Canvas-rendered.** No DOM diffing, no layout thrash, no CSS engine between you and the pixels.
- **Two clocks.** State changes rebuild a cheap description (a few times a second at most); every frame just steps numbers toward targets and paints. The loop **sleeps entirely** when the scene is at rest — an idle UI costs zero CPU.
- **A kernel you can read.** The core — reconcile, springs, channels, the loop — is a few hundred lines. There is no magic to be surprised by at 2 a.m.
- **Deterministic stepping** built in (`step(n, dt)`) for headless testing and golden images.

---

## The cheat sheet

| Concept | React | WPF | Gratify |
|---|---|---|---|
| App state | hooks / Redux | ViewModel + binding | one Doc + `update(doc, intent)` |
| State-dependent look | className switches | Triggers / VSM | channel blends in style functions |
| Animation | CSS / Framer / react-spring | Storyboards | channels chasing targets (automatic) |
| Enter/exit | AnimatePresence | Loaded/Unloaded storyboards | automatic `enter`/`exit` channels |
| Custom widget | component + CSS + handlers | Control + Template + Style | one `part()` definition |
| Customizing others' widgets | fork it | retemplate it | wrap a facet, at any scope |
| Gestures | handler soup | routed events + capture | interactor values |
| Theming | context + CSS vars | ResourceDictionary swap | `setTheme` — cross-fades free |

The through-line: where React and WPF grew a *separate subsystem* per row, Gratify answers nearly every row with the same two mechanisms. That's what "composable" means here — not a feature for everything, but a few primitives that combine to cover the table.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:5199 — the examples gallery
npm run test     # headless kernel tests (deterministic step())
npm run check    # boundary check + typecheck
```

- **Plan** — how we get from here to everything above: [`docs/plan.md`](docs/plan.md)
- **Examples** — each one proves a README claim: [`examples/`](examples/)
  - `counter` — the hello-world above, running verbatim
  - `todo` — keyed enter/exit/reflow, zero animation code
  - `toggles` — custom parts (spring toggle, drag slider) + live theme cross-fade
  - `undo` — `withUndo(app)` middleware; undo replays enter animations

**Status:** early. The kernel (two-clock loop, keyed reconcile, springs, channels,
render-on-demand sleep), the `part()` facet model, `Stack`/`Row` layout with
animated reflow, `Press`/`Drag1D` interactors, themes with cross-fade, and undo
middleware are working — see the examples. The wrap/append extension algebra,
gesture views, anchors/connectors, adornments, and local state are designed
(see the plan) and land next. Text input is deliberately out of scope for now.
