# Gratify

*Because your UI should be satisfying.*

**Gratify is a TypeScript, canvas-rendered UI library for building interfaces rich with micro-interactions — where every state change animates itself and every widget composes.**

[![npm](https://img.shields.io/npm/v/gratify.svg)](https://www.npmjs.com/package/gratify)
[![license](https://img.shields.io/npm/l/gratify.svg)](https://github.com/ara3d/gratify/blob/main/LICENSE)

### ▶ [Try the live demo](https://ara3d.github.io/gratify/) · [Source on GitHub](https://github.com/ara3d/gratify) · [npm](https://www.npmjs.com/package/gratify)

https://github.com/user-attachments/assets/f77ac0bb-bc53-486d-b51c-a19362b6ed0c

```bash
npm install gratify
```

## About Gratify

Gratify is an MVU (Model-View-Update) UI library for canvas-first UIs (e.g., dashboards, editors, HUDs, node graphs), not text-heavy forms. 

It is currently designed for desktop-browser-first: keyboard focus and key routing work, but screen readers see only a `<canvas>`, and mobile/touch is untested. 

It renders your whole UI to a single `<canvas>` (no DOM, no CSS), keeps a living, animated scene in sync with your state, and asks you to learn exactly two mechanisms: 

1. **pure functions over state** - for *describing* the UI
2. **channels** — named numbers that continuously chase their targets — for *changing* it

Hover glows, press dips, spring-loaded toggles, drag-with-momentum, enter/exit, theme cross-fades: the micro-interactions that normally take a pile of hand-written animation code are the default here, for free. Buttons, toggles, sliders, dashboards, node editors, timelines, game HUDs — the same primitives cover all of it.

> You describe what the UI should be for the current state. Gratify keeps a retained, animated scene in sync with that description. Everything that changes, tweens.

**Three words to keep straight:** a **part** is a reusable definition (`part("button")…`); an **element** is one placement of a part in the tree your `view` returns — a part plus props and a key; a **node** is the live, animated thing Gratify keeps on screen for each element — it holds the animation state and survives rebuilds. If you know React: **part** ≈ component, **element** ≈ `<Button/>`, **node** ≈ the mounted instance.

```ts
import { mount, part, Stack, Label, v } from "gratify";

// 1. Model — plain immutable data that you own. It knows nothing about pixels.
type Doc = { count: number };
type Intent = { kind: "increment" };

// 2. Update - how and when to transition from one model state to another 
function update(doc: Doc, intent: Intent): Doc {
  return intent.kind === "increment" 
    ? { count: doc.count + 1 } 
    : doc;
}

// 3. A part — the reusable definition of a widget's size, style, render, and
//    behavior, in one chained definition. The style/render split is deliberate:
//    `style` decides what things look like, `render` just paints the result.
const Button = part("button")
  .props<{ label: string; press: Intent }>()
  .size((props, measure) => v(measure.text(props.label).x + 28, 34))

  // `channels.hover` and `channels.press` ease between 0 and 1 as the pointer
  // interacts, so anything you compute from them animates for free.
  .style((tokens, channels) => ({
    fill: tokens.mix(tokens.surface, tokens.accent, 0.2 + 0.3 * channels.hover + 0.4 * channels.press),
    lift: 2 * channels.hover - 2 * channels.press,
    text: tokens.text,
  }))

  .render((node, paint, style) => {
    paint.box(node.rect.raise(style.lift), 8, style.fill);
    paint.label(node.props.label, node.rect.center, style.text);
  })

  .press((node) => node.props.press);

// 4. The view — a pure function from state to an element tree.
function view(doc: Doc) {
  return Stack("root", { gap: 12, pad: 24 }, [
    Label("message", { text: `Clicked ${doc.count} times` }),
    Button("button", { label: "Click me", press: { kind: "increment" } }),
  ]);
}

// 5. Mount onto a canvas: <canvas id="app"></canvas> is the only HTML you need.
const canvas = document.getElementById("app") as HTMLCanvasElement;
mount(canvas, { init: { count: 0 }, update, view });
```

That — plus one `<canvas>` tag — is a complete app.

Notice what you did **not** write: no event-listener plumbing, no "add the label to the panel", no hover handler, no animation code. Yet at runtime the button breathes — it brightens and lifts on hover, sinks on press, and every state change glides instead of snapping.

---

## Getting started

Gratify is published on npm as [gratify](https://www.npmjs.com/package/gratify).

If you want to use this repository locally, after cloning run the following:

```bash
git clone https://github.com/ara3d/gratify.git
cd gratify
npm install
npm run dev      # http://localhost:5199 — the examples gallery
npm run test     # headless kernel tests (deterministic step())
npm run check    # boundary check + typecheck
```

Every idea in this README has a running example. Rather than list them here, browse the **[live gallery ▶](https://ara3d.github.io/gratify/)** (or run `npm run dev`) — from the hello-world counter through a full pan/zoom node editor and a 15-control widget board. Each page shows its own source next to the running app, so you can read exactly the code that produced what you're looking at. Copy the example nearest your use case as a starting point.

---

## How it Works

There are four key areas of the architecture:

1. **State Management** - your model (`Doc`), your `update` function, your `view` function
2. **Parts** — widget definitions, built up facet by facet.
3. **Channels** — the numbers that animate.
4. **Extensions** — how anything gets customized.

### State Management 

Your app state is a plain immutable type of your choosing (we use `Doc` by convention). 
The only way it changes is a typed `Intent` object (again of your choosing) passing through one pure function:

> ```update(doc: Doc, intent: Intent): Doc```

Your job is to model, in your Doc, the state the UI represents, and to write the `update` function that moves from one state to the next.

The UI is created on each frame by another pure function: 

> ```view(doc: Doc): Element```

`view` returns a tree of **elements** — each element is a part plus its props and a key. It is called on every state change, and the framework matches elements by key against the **nodes** already on screen, so a node that survives a rebuild keeps its animation state and knows where it was.

### Parts

A part is a widget definition: a named bundle of small declarations called **facets**. Each facet answers one question, and all of them are optional — you write only what a given widget needs. A label needs two facets; a node-editor wire might need five.

You define a part by chaining facets onto `part(name)`:

```ts
const Chip = part("chip")
  .props<ChipProps>()          // what the use site must pass
  .defaults({ w: 60 })         // fill in optional props, so facets never see undefined
  .size((p, m) => ...)         // how big am I?
  .style((t, ch) => ({ ... })) // what do I look like right now?
  .render((n, paint, s) => ...)// paint it
  .press((n) => ...)           // what does a click mean?
```

The chain is more than sugar: each step is a typed inference boundary, every prefix is already a usable part, and the type system enforces the rules below (a part can't be both a leaf and a container; `style` must come before `render`). A plain object form of `part()` exists too, and `extendPart(name, base)` re-opens any part with the same vocabulary.

The facets fall into four groups.

**Geometry — how big am I, where do my children go?** A part plays exactly one of three geometric roles:

- A **leaf** declares `size(props, m) → Vec` — its intrinsic size, e.g. "wide enough for my label" (`m.text` measures text). This is the 80% case: buttons, labels, knobs.
- A **container** declares `measure` (how big do I want to be, given at most this much room?) and `arrange` (given my final rect, where does each child go?). `fill()` is the shortcut for "take all the room I'm offered", and `pack(fn)` derives both phases from a single packing function so they can't disagree.
- A **composite** declares `body(props, children) → Element[]` — a part made of other parts. It expands into child elements and leaves geometry to them.

Every geometry facet has a sensible default (no size means "union of my children"; no arrange means "children at my origin"), so the simplest parts skip this group entirely.

**Appearance — what do I look like, and how does it get painted?** Two facets, split so that *deciding* values and *painting* them never mix:

- `style(tokens, channels, props)` returns a flat record of resolved visual values — colors, offsets, radii — computed from theme tokens blended by channel values: `tokens.mix(t.surface, t.accent, ch.hover)`. This is the **only** place a part may touch the theme (`npm run check` enforces it), which is exactly what makes every part restylable from outside.
- `render(node, painter, style)` paints, reading only the node's rect and the style record. No decisions here — if render wants a token, that value belongs in `style`.

**Behavior — what does input mean here?** Input attaches as a list of **interactors** — values like `Press`, `Drag1D`, `Keys`, `Gesture` — each parameterized by *what intent to emit*. Interactors never touch your state or the scene; they translate gestures into intents, and the framework owns hit-testing, capture, and click-vs-drag disambiguation. The builder's `.press()` / `.drag1d()` / `.keys()` / `.gesture()` are shorthands for the common ones. A `hit` facet overrides hit-testing when the rectangle is wrong (wires, enlarged grab zones).

**Garnish — what rides along?**

- `channels` declares extra animated values beyond the built-in ones (see below).
- `anchors` publishes named points in world space — sockets, ports — that wires and snapping resolve through a registry instead of reaching into other parts.
- `adorn` attaches overlay elements to a host: tooltips, badges, resize grips. They render above everything, can carry their own interactors, and can be layered onto a part that never planned for them.

### Channels

Channels are the animation substrate: named numbers on each node that continuously chase targets. `hover`, `press`, `focus`, `drag`, `enter`, and `exit` come free on every part; a `channels` facet adds custom ones, chased by a spring (momentum, overshoot), an ease rate, or a decaying impulse.

The key move is that *there is no animation API*. You never start, stop, or sequence a tween. A style function computes values from channels; when state changes move a channel's target, everything computed from it glides to the new value. Motion is a side effect of describing where things should be.

### Extensions

An extension is a function from part to part. Function facets extend by *wrapping* — `mapStyle` and `mapRender` hand you the original result and you state your delta. List facets extend by *appending* — `addOn` and `addChannels` add entries, replacing nothing. The same extension value applies at three scopes: baked into a new part (`derivePart`), across a whole theme (`extendTheme`), or on a single element (`withExt`). Nothing is ever edited in place. (This is the subject of [Why Gratify? §3](#3-wrap-dont-edit).)

### How it runs

The runtime separates *what the UI is* from *where it's heading*:

1. When an intent arrives, `update` produces a new `Doc` and `view` re-derives the element tree. The tree is reconciled by key against the retained scene. This happens at human interaction rates — a click, a keypress — never per frame.
2. Every animation frame, the runtime lays out (positions reflow through springs), steps each channel toward its target, resolves `style`, and paints the canvas.
3. When every channel has settled, the runtime stops scheduling animation frames until the next input or intent wakes it.

So the expensive, structural work happens rarely, and the per-frame work is just numbers chasing targets plus a paint pass. Deterministic stepping (`step(n, dt)`) drives the same loop headlessly for tests and golden images.

---

## Why Gratify?

### 1. Juice is the substrate, not a feature

Every scene node carries **channels** — named numbers that continuously chase state-derived targets, with springs (momentum, overshoot) or eases (smooth decay). Because nodes are retained across state changes and matched by key, a node always knows where it *was* — so when its target moves, it glides there.

What this buys you, with zero animation code:

- Toggle a `selected` tag → every style that reads `channels.selected` cross-fades.
- Delete a row → it plays an exit animation while siblings glide to fill the gap.
- Swap the theme → the entire UI choreographs a cross-fade.
- Release a dragged node → it springs to its drop point *with momentum*, because velocity lives in the channel.

And for motion that never stops — a pulse, a shake, an orbiting camera — read the built-in `GNode.time` clock (`sin(node.time * 4)`), no per-frame bookkeeping required. There are no timelines, no `animate()` calls, no easing zoo. The animation API is: *values chase targets* (plus one ever-rising clock). That's it.

### 2. One state, one direction

Your app state is a plain immutable **Doc**. The UI is a pure function `view(doc) → Element tree`. Changes are typed **Intents** handled by one pure `update(doc, intent) → doc`.

Because intents are data and update is pure, you get for free: trivially testable logic (no runtime needed), **undo/redo as a three-line middleware**, replay and logging, and a wire format for collaboration. There is no `useState`, no two-way binding, no ViewModel, no hidden framework state to drift out of sync.

### 3. Wrap, don't edit

Gratify's composition rule fits in one sentence:

> **Nothing is ever edited. Everything is wrapped or appended.**

A **part** is a bundle of small **facets**. Function facets (`size`, `style`, `render`) extend by *wrapping* — you receive the original result and state only your delta. List facets (`channels`, interactors) extend by *appending* — your entry is added, nothing replaced.

```ts
import { mapRender, derivePart, extendTheme, withExt, rgb } from "gratify";
import type { PartExt } from "gratify";

// An extension is an ordinary function: a part definition in, a wrapped one out.
// `mapRender` gives you the original's paint call as `drawBase` so you can paint
// under it, over it, or around it. This draws a red debug outline over ANY
// widget — the widget never planned for it, and nothing about it needs to.
const outlined: PartExt = mapRender((node, paint, style, drawBase) => {
  drawBase();                                                    // the original…
  paint.box(node.rect, 8, rgb(0, 0, 0, 0), rgb(255, 80, 90), 1.5); // …then on top
});

// The SAME extension value applies at three scopes — nothing else changes:
const DebugButton = derivePart("debug-button", Button, outlined); // 1. bake into a new part
extendTheme("dark", "button", outlined);                          // 2. every button, app-wide
withExt(Button("save", saveProps), outlined);                     // 3. this one element only
```

An extension is **just a function from part to part** — no plugin API, no registration, no base class. Name them, compose them, ship them in libraries. Scope 2 is the powerful one: a theme can reach widgets *inside third-party code you can't edit*, and it even reaches parts derived from the one you targeted. (See the [`extensions`](examples/extensions/) example for `mapStyle`, appended channels, and all three scopes running live.)

Tooltips, badges, selection handles, undo, debug overlays, whole visual skins — every one is layerable onto a library that never anticipated it. Decorations that need to *escape* the widget's bounds or be clickable (a tooltip above it, a close button overhanging its corner) are **adornments** — overlay elements the `addAdorn` extension appends to any host. (See the [`adornments`](examples/adornments/) example.)

### 4. Styling is arithmetic, not a cascade

```
tokens → style function(tokens, channels, props) → resolved values → render
```

No CSS, no selectors, no specificity, no trigger precedence. State-dependent looks are channel blends inside a plain function — `tokens.mix(surface, accent, ch.hover)` — debuggable with `console.log`. A theme is a token set plus per-part style wrappers; `setTheme(dark)` cross-fades the whole app, because token changes ease like everything else.

### 5. Input as values

Behavior attaches as a list of **interactors** — reusable gesture recognizers parameterized by *what intent to emit*:

```ts
import { Press, Drag1D, Keys, Focusable } from "gratify";

on: [
  Press((node) => ({ kind: "open", id: node.key })),
  Drag1D({ axis: "x", to: (node, fraction) => ({ kind: "seek", to: fraction }) }),
  Keys({ Enter: (node) => ({ kind: "open", id: node.key }) }),
  Focusable(),   // clicking gives this part keyboard focus
]
```

Interactors emit intents and set tags — they never touch your state or the scene. Hit-testing, capture, click-vs-drag disambiguation, and keyboard routing live in the framework once, not in every widget's event spaghetti. Editor-grade gestures (marquee, wire-drag with magnetic snap, drag-with-guides) are built with `Gesture(...)`, which grants three bounded extra powers — private gesture state, a read-only scene query, and a live overlay view — so even the rubber-band preview is made of ordinary, themeable elements. (See the [`node-editor`](examples/node-editor/) example.)

### 6. Built for editor-grade UIs, not just forms

Gratify grew up building a node editor, so the hard problems most frameworks punt on are first-class:

- **Anchors & connectors** — widgets publish named world-space points; wires and guides are ordinary keyed elements whose geometry references them. Delete an edge and the wire *fades out*. Click a wire to select it. Theme all wires in one line.
- **The surface is a part too** — the canvas grid, pan/zoom, marquee, HUD, and post-effects are just facets on the root, reachable by every extension mechanism.
- **Pan/zoom-aware everything** — gestures operate correctly under a viewport transform, and elements live on a `world` / `overlay` / `screen` layer so a HUD stays put while the content pans.
- **Time as a first-class input** — the `GNode.time` clock drives continuous motion (pulses, tremors, orbiting cameras), and an `ambient` hook keeps the loop awake only while such motion is running, then lets it sleep again.

### 7. Small, fast, honest

- **Canvas-rendered.** No DOM diffing, no layout thrash, no CSS engine between you and the pixels.
- **Cheap by construction.** State changes rebuild a cheap description at human interaction rates; every frame just steps numbers toward targets and paints. When the scene settles, the loop **stops scheduling animation frames** until input arrives.
- **A kernel you can read.** The core — reconcile, springs, channels, the loop — is a few hundred lines. There is no magic to be surprised by at 2 a.m.
- **Deterministic stepping** built in (`step(n, dt)`) for headless testing and golden images.

---

## Where Gratify sits (related work)

Gratify combines three ideas that usually travel separately: the **MVU architecture** (one immutable state, a pure `update`, a pure `view`), a **retained canvas scene** (no DOM, no CSS — the framework paints every pixel), and **animation as the substrate** (springs and channels are the default, not a bolt-on). Plenty of excellent projects own one or two of these axes; almost none combine all three, which is the niche Gratify occupies.

### The architecture — MVU / unidirectional data flow

- [**Elm**](https://elm-lang.org) — the origin of MVU (`init` / `update` / `view`, immutable model, typed messages). Gratify is Elm's shape in TypeScript, minus the virtual DOM and plus built-in tweening.
- [**Redux**](https://redux.js.org) — the same reducer + action (≈ intent) loop, rendering to the DOM (usually via React).
- [**Cycle.js**](https://cycle.js.org) — pure dataflow with streams in place of a reducer.
- [**Hyperapp**](https://github.com/jorgebucaran/hyperapp) — a tiny Elm-like with a virtual DOM.
- [**Bubble Tea**](https://github.com/charmbracelet/bubbletea) (Go) and [**Iced**](https://github.com/iced-rs/iced) (Rust) — The-Elm-Architecture ports outside the browser.

### The medium — self-painted / canvas UI (no DOM)

- [**Flutter**](https://flutter.dev) — the closest large project: a retained widget tree painted by its own engine (Skia), "everything is a widget." Differs in that widgets are *stateful*, not MVU, and there is no automatic animation channel.
- [**Dear ImGui**](https://github.com/ocornut/imgui) and [**egui**](https://github.com/emilk/egui) (Rust) — GPU/canvas GUIs, but *immediate mode* (rebuilt every frame, no retained scene) — the opposite pole from Gratify's keyed, retained nodes.
- [**Makepad**](https://github.com/makepad/makepad) (Rust) — GPU-rendered, shader-styled, live-designed UI; spiritually near Gratify's canvas-plus-juice ethos.
- [**PixiJS**](https://pixijs.com) and [**Konva**](https://konvajs.org) — retained canvas scene-graphs, but with no application architecture; you would build the MVU layer on top.

### The juice — animation as a first-class concern

- [**Rive**](https://rive.app) — state-machine-driven animated vector UI, retained and GPU-rendered; the closest match on "motion is the medium," though it is design-tool-first rather than code-authored.
- [**react-spring**](https://www.react-spring.dev) and [**Motion**](https://motion.dev) (formerly Framer Motion) — spring-based animation, but bolted onto React rather than being the core model.
- [**GSAP**](https://gsap.com) — the powerful imperative timeline library that Gratify deliberately does *not* resemble: no timelines, no `animate()` calls, values just chase targets.
- [**Lottie**](https://airbnb.io/lottie/) — playback of pre-authored animations.

**The nearest single neighbors:** Flutter (retained, self-painted widget tree), Rive (animation-first retained canvas), Elm (the architectural twin), and Makepad (canvas + GPU + juice). Each shares one or two axes; none ships the exact combination of *MVU + retained canvas + springs-by-default*. The shortest honest description is "Flutter, if it were Elm with automatic springs."

### Concept map from React and WPF to Gratify

For people with a familiarity with React and WPF, here are some of the concepts 
and how they map. 

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



## Status: Beta

The kernel, layout, interactors, extensions, themes, anchors, and adornments all work — every claim in this README has a [running example](https://ara3d.github.io/gratify/).

Not built yet: instance-local (per-node) UI state, and modal popups such as dropdowns.

**Text input is deliberately out of scope for now**, so Gratify suits canvas-first UIs — dashboards, editors, HUDs, node graphs — rather than text-heavy forms.
