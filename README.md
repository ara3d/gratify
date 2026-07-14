# Gratify

*Because your UI should be satisfying.*

**A TypeScript UI framework where everything that changes, animates — and everything you build, composes.**

### ▶ [Try the live demo](https://ara3d.github.io/gratify/) · [Source on GitHub](https://github.com/ara3d/gratify)

Gratify renders to canvas, keeps a living animated scene in sync with your state, and asks you to learn exactly two mechanisms: **pure functions over state** for describing, and **channels** for changing. Buttons, forms, dashboards, node editors, timelines, games' UI — the same primitives cover all of it.

> You describe what the UI should be for the current state. Gratify keeps a retained, animated scene in sync with that description. Everything that changes, tweens.

```ts
import { mount, part, Press, Stack, Label, v } from "gratify";
import type { Channels, Color, Tokens } from "gratify";

// 1. State — plain immutable data that you own. It knows nothing about pixels.
type Doc = { count: number };
type Intent = { kind: "increment" };

function update(doc: Doc, intent: Intent): Doc {
  return intent.kind === "increment" ? { count: doc.count + 1 } : doc;
}

// 2. A widget ("part") — size, style, render, and behavior in one definition.
//    The style/render split is deliberate: `style` decides what things look
//    like, `render` just paints the result.
type ButtonProps = { label: string; press: Intent };
type ButtonStyle = { fill: Color; lift: number; text: Color };

const Button = part<ButtonProps, ButtonStyle>("button", {
  size: (props, measure) => v(measure.text(props.label).x + 28, 34),

  // `channels.hover` and `channels.press` ease between 0 and 1 as the pointer
  // interacts, so anything you compute from them animates for free.
  style: (tokens: Tokens, channels: Channels): ButtonStyle => ({
    fill: tokens.mix(tokens.surface, tokens.accent, 0.2 + 0.3 * channels.hover + 0.4 * channels.press),
    lift: 2 * channels.hover - 2 * channels.press,
    text: tokens.text,
  }),

  render: (node, paint, style) => {
    paint.box(node.rect.raise(style.lift), 8, style.fill);
    paint.label(node.props.label, node.rect.center, style.text);
  },

  on: [Press((node) => node.props.press)],
});

// 3. The view — a pure function from state to an element tree.
function view(doc: Doc) {
  return Stack("root", { gap: 12, pad: 24 }, [
    Label("message", { text: `Clicked ${doc.count} times` }),
    Button("button", { label: "Click me", press: { kind: "increment" } }),
  ]);
}

// 4. Mount onto a canvas.
const canvas = document.getElementById("app") as HTMLCanvasElement;
mount(canvas, { init: { count: 0 }, update, view });
```

That's a complete app. Notice what you did **not** write: no event-listener plumbing, no "add the label to the panel", no hover handler, no animation code. Yet at runtime the button breathes — it brightens and lifts on hover, sinks on press, and every state change glides instead of snapping.

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

A widget ("part") is a bundle of small **facets**. Function facets (`size`, `style`, `render`) extend by *wrapping* — you receive the original result and state only your delta. List facets (`channels`, interactors) extend by *appending* — your entry is added, nothing replaced.

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

Tooltips, selection, accessibility labels, undo, debug overlays, whole visual skins — every one is layerable onto a library that never anticipated it.

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
- **The surface is a widget too** — the canvas grid, pan/zoom, marquee, HUD, and post-effects are just facets on the root, reachable by every extension mechanism.
- **Pan/zoom-aware everything** — gestures operate correctly under a viewport transform, and elements live on a `world` / `overlay` / `screen` layer so a HUD stays put while the content pans.
- **Time as a first-class input** — the `GNode.time` clock drives continuous motion (pulses, tremors, orbiting cameras), and an `ambient` hook keeps the loop awake only while such motion is running, then lets it sleep again.

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

Open the [**live gallery**](https://ara3d.github.io/gratify/), or run `npm run dev`. Every example page shows its own source next to the running app, so you can read exactly the code that produced what you're looking at.

**Start with these** — one idea each:

| Example | What it teaches |
|---|---|
| [`counter`](examples/counter/) | the hello-world above, running verbatim |
| [`todo`](examples/todo/) | keyed enter / exit / reflow, with zero animation code |
| [`toggles`](examples/toggles/) | custom parts (spring toggle, drag slider) + a live theme cross-fade |
| [`undo`](examples/undo/) | `withUndo(app)` middleware — undo replays enter animations |
| [`extensions`](examples/extensions/) | wrap / append at all three scopes (definition, theme, use site) |
| [`keyboard-and-drag`](examples/keyboard-and-drag/) | `Focusable` + `Keys` + a reorder gesture, composed on one part |

**Then the bigger ones** — editor-grade UI, juice, and a widget library:

| Example | What it shows |
|---|---|
| [`node-editor`](examples/node-editor/) | pan/zoom surface, anchored wires you can click and cut, magnetic wire-drag, and a Shift-drag "slice" gesture in one app-side file |
| [`widget-board`](examples/widget-board/) | 15 creative-tool controls — sliders, ranges, angles, arcs, XY / box 2D / box 3D, color wheel, gradient — on a pannable canvas |
| [`borders`](examples/borders/) | none / single / double / sunken / raised bevels that flip when pressed |
| [`combo-button`](examples/combo-button/) | click fast: heat, shake, glow, and particles all build with your click rate |
| [`magnify`](examples/magnify/) | a bouncing lens fisheye-magnifies the tiles beneath it |
| [`earthquake`](examples/earthquake/) | click to shake a brick skyline — a fully time-based animation |

- **Plan** — how we get from here to everything above: [`docs/plan.md`](docs/plan.md)

### Writing Gratify code (humans and AI agents)

If you're driving an agent (Cursor, Claude Code, …) to write Gratify code, point it at the condensed **skill file** first: [`.cursor/skills/gratify/SKILL.md`](.cursor/skills/gratify/SKILL.md) — the house rules, the facet cheatsheet, and a do/don't list. The short version, for anyone:

- **Import from the `"gratify"` barrel only** — never reach into `src/gratify/*` from an app.
- **Keep `update` pure and put state in the Doc.** The UI is `view(doc)`; intents are the only way to change anything.
- **Customize by wrapping or appending, never by editing a part in place** — `mapStyle` / `mapRender` for looks, `addChannels` / `addOn` for behavior.
- **Copy the nearest [`examples/`](examples/) file** rather than inventing APIs. Adornments, modal popups, instance-local state, and text input are *not built yet* — don't fake them.

**Status:** the kernel (two-clock loop, keyed reconcile, springs, channels,
render-on-demand sleep), the `part()` facet model, layout with animated reflow,
interactors (`Press` / `Drag1D` / `Keys` / `Focusable` / `Gesture` with private
state + scene query + overlay previews), the wrap/append extension algebra at
three scopes, themes with cross-fade, anchors + connectors, viewport layers
(world/overlay/screen), impulse channels, an ever-rising `GNode.time` clock with
an `ambient` keep-awake hook for time-based motion, and undo middleware are all
working — every claim above has a running example. Not yet: adornments,
instance-local state, modal popups. Text input is deliberately out of scope for
now.
