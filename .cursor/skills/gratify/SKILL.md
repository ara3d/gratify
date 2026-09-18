---
name: gratify
description: >
  Author and extend Gratify canvas UI apps — Doc/Intent/update/view, part() facets,
  channels, wrap/append extensions, interactors, themes. Use when writing Gratify
  code, examples under examples/, edits in src/gratify/, or user mentions gratify,
  parts, channels, mount(), withExt, derivePart.
---

# Gratify

Canvas UI kit. Two clocks: state rebuilds Element tree; every frame channels chase targets + paint. Idle = sleep.

## Mental model

```
Doc  --update(intent)-->  Doc
view(Doc) --> Element tree  --keyed reconcile-->  retained Instance scene
style(tokens, ch, props) --> S  --render-->  pixels
```

- **Doc** immutable app data. Pure. No pixels/hover/dom.
- **Intent** typed message. Only way Doc change.
- **update(doc, intent) → doc** pure reducer.
- **view(doc) → Element** pure. Keys survive rebuild = animation survive.
- **Channel** number chase target (spring or rate ease). Read in `style` / `render`. No `animate()`.
- **Part** widget = facet bundle. Construct: `Part("key", props, children?)`.

## Hard rules

1. Apps/examples import `"gratify"` public barrel only. Never `src/gratify/...` deep paths from examples.
2. `src/gratify/` never import `examples/`. Boundary: `npm run check`.
3. Never edit part guts in place. **Wrap** function facets; **append** list facets.
4. Interactors emit Intent / set tags only. No Doc mutate. No scene mutate.
5. Visual state from channels + tokens — not className, not CSS, not timelines.
6. Namespace custom channels: `"fx/sheen"` not `"sheen"` (share node with hover/press/enter/exit).
7. Render reads `node.rect` + resolved style only. Logic stay out of paint.
8. Prefer pure `update`. Mutate Doc break `withUndo`.
9. Text input (use a DOM `island`) and per-pane cameras (nested viewports — the runtime has ONE pan/zoom) — **not built yet**. Don't invent APIs for them. Built: adornments, local state + modal popups, scrolling/virtualized data views (see Built-ins).
10. **House form: the builder** — `part("name").props<Props>().defaults({ gap: 8 }).measure(…).arrange(…).style(…).render(…)`. Never name a style interface — `S` infers from `.style()`'s return and flows into `.render()`. Rules the types enforce: `.props()`/`.defaults()` first; `.size()`/`.intrinsic(w,h)` (leaf) vs `.measure()`/`.arrange()`/`.fill()`/`.pack()` (container) vs `.body()` (composite) mutually exclusive; `.style()` before `.render()`. `.defaults()` makes those keys non-optional in facets (write `p.gap`, never `p.gap ?? 8`). `.pack(f)` = one packing function drives measure AND arrange (cannot desync). Every prefix is already a callable part; no `.build()`. Derive with `extendPart("new-name", Base).style(…)`. Spec-object forms `part<P>()("name", spec)` / `part<P,S>("name", spec)` still compile.
    - **Interactor sugar**: prefer `.press(n => intent)`, `.drag1d({ axis, to })`, `.gesture({ begin, during, up })`, `.keys({ Delete: n => intent })` over `.on(Gesture<P,S>(…))` — the chain fixes the prop type and `.gesture`'s private state infers from `begin`'s return; never restate `<Props, State>`. `.on(…)` remains for Pan()/Focusable()/prebuilt values.
    - **Channel names**: `.channels({ "fx/sheen": … })` feeds `node.ch.` autocomplete (declared + auto `hover/press/drag/focus/enter/exit`). Extensions are typed: `PartExt<P>`, `PropsOf<typeof Part>`; `derivePart` types inline `mapStyle`/`addOn` callbacks against the base's props.
11. If `render` wants a token, the value belongs in `style`. Parts never import `tokens` (checked by `npm run check`); the style function receives it. Spread a recipe from `style.ts` (`surface`, `textTone`) then add your own fields. Cross-widget restyle assumes `SurfaceStyle` = `{ fill, edge, text }`.

## App skeleton

```ts
import { mount, Stack, Label, part, Press, v } from "gratify";

type Doc = { n: number };
type Intent = { kind: "inc" };
const update = (d: Doc, i: Intent): Doc =>
  i.kind === "inc" ? { n: d.n + 1 } : d;

mount(canvas, {
  init: { n: 0 },
  update,
  view: (d) => Stack("root", { gap: 12, pad: 24 }, [
    Label("msg", { text: String(d.n) }),
    /* Button("b", { label: "+", press: { kind: "inc" } }) */
  ]),
});
```

Undo: wrap whole app — `mount(canvas, withUndo({ init, update, view }))`. Emit `{ kind: "undo" | "redo" }`.

## `part()` facets

| Facet | Role |
|-------|------|
| `size` / `measure(avail)`+`arrange` | leaf size / two-phase container layout (measure: desired size given at most `avail`; arrange: place children in the final rect). Fill = `measure: (_p, avail) => avail` |
| `channels` | extra chase specs (`target`+`rate`\|`spring`, or `decay` impulse) |
| `style(t, ch, props)` | → flat style record `S` |
| `render(node, paint, S)` | draw (chrome under content for composites) |
| `body(props, children)` | composite: derive child elements (parts made of parts); state-clock, pure `props→elements`, `children` = content slot |
| `on` | interactor list |
| `anchors` | named world points for wires |
| `hit` | custom hit (wires = curve distance) |
| `clip` | `.clip()`: mask paint AND hit-testing of the subtree to the part's rect (scroll viewports) |
| `adorn` | overlay elements anchored to host (tooltips/badges/grips); runs each frame, may read channels |
| `body(props, children, local, size)` | `size` = the composite's last arranged size; the runtime re-expands when it changes (size-dependent structure, e.g. windowed rows) |

Auto channels: `hover`, `press`, `drag`, `focus`, `enter`, `exit`, layout pos/size. Impulse: declare `decay`, call `node.kick("name")`.

## Time-based motion (pulses / shakes / bounces)

`node.time` = seconds since start, ever-rising. Use for motion that is a *function of time*, not a transition (`sin(node.time*…)`). The channel rest-detector can't see time motion, so keep the loop awake with `AppSpec.ambient(doc, time) => boolean` — true while animating, false to sleep. `rt.animating` reads the current rest state. Examples: `combo-button`, `global-effects`, `juice-gallery`.

## Style arithmetic

```ts
style: (t, ch) => ({
  fill: t.mix(t.surface, t.accent, 0.2 + 0.3 * ch.hover + 0.4 * ch.press),
  lift: 2 * ch.hover - 2 * ch.press,
})
```

`setTheme("dark"|"light")` cross-fade free. Theme = tokens + optional per-part `extendTheme`.

## Extensions (wrap / append)

Same `PartExt` three scopes — order: definition → theme → use site (closest wins).

```ts
// wrap function facet
mapStyle((t, ch, props, base) => ({ ...base, fill: ... }))
mapRender((node, p, style, base) => { base(); /* overlay */ })
mapSize((props, m, base) => ({ x: base.x, y: Math.max(base.y, 44) }))
mapBody((props, children, base) => [...base, Badge("b", {})])  // wrap structure; body-less part → base = use-site children

// append list facet
addChannels({ "fx/x": { target: (n) => n.ch.hover, rate: 6 } })
addOn(Press(...))
addAdorn((n) => n.ch.hover > 0.5 ? [at(Tooltip("tip", { ... }), pos)] : [])  // decorate ANY widget

derivePart("fancy", Button, sheen)          // scope 1
extendTheme("dark", "button", neon)         // scope 2 (hits derivatives via ancestors)
withExt(Button("k", props), outlined)       // scope 3
```

## Interactors

```ts
on: [
  Press((n) => intent),
  Hover(),                    // feeds ch.hover
  Drag1D({ ... }),
  Keys({ Enter: (n) => intent }),
  Focusable(),
  Pan(),                      // viewport pan + wheel zoom
  Gesture({ begin, move, up, during?, view? }),  // private state + Query + overlay Elements
]
```

`Gesture` facets: `begin(node,p,q)→S|null` (null declines), `move(s,node,p,q)→S`, `during(s,…)→Intent?` (dispatch live mid-drag), `up(s,…)→Intent|Intent[]?`, `view(s,q)→Element[]` (overlay preview). `Query` = read-only scene (`anchor`, `nearestAnchor`, `mods`).

## Built-ins

`Stack`, `Row`, `Free`, `Layers`, `Flow` (wrapping row), `Label`. Layout sizes feed **position/size channels** — reflow animates alone.

Layers: `"world" | "overlay" | "screen"` — pan/zoom aware.

Element helpers: `at(el, pos)` position · `pin(el)` driven placement (no springs, no enter/exit ghosts — scrolled rows, thumbs) · `grow(el, weight?)` absorb Stack/Row main-axis slack (flex-grow) · `modal(el, dismiss)` · `tier(el, n)`.

Data views: `Virtual({ count, rowHeight, row(i), reveal?, overscan? })` — builds only visible rows, scroll is instance-local, scrollbar built in, `reveal` keeps a row in view until the user scrolls. `Wheel((n, delta) => intent)` / `.wheel()` — routed to the nearest wheel-taking ancestor of the hit, else Pan() zooms. `fitText(measure, text, maxW, size)` — ellipsis fitting. Scroll math in `scroll.ts` (pure). `.fill()` hands avail to its children (nested fills see the viewport).

Input routing: `Press((n, mods) => …)` / `Keys({ k: (n, mods) => … })` get modifier keys (shift/ctrl selection). Focus goes to the nearest `Focusable()` self-or-ancestor of a click (rows focus their grid); keys route focused-first, then UP its ancestors, then hover chain, then root. Keyboard cursor intents should be RELATIVE (`moveCursor(by)`) — props refresh once per frame, so absolute `cursor + 1` collapses under key repeat.

## Commands

```bash
npm run dev      # gallery :5199
npm run test     # vitest + step(n,dt)
npm run check    # boundary + tsc
```

## Examples → claims

| Folder | Proves |
|--------|--------|
| `counter` | hello + channel style, no anim code |
| `todo` | keyed enter/exit/reflow |
| `toggles` | custom parts + `setTheme` |
| `undo` | `withUndo` |
| `extensions` | 3 scopes |
| `keyboard-and-drag` | Focusable + Keys + reorder |
| `node-editor` | surface, anchors/wires, Gesture overlay, slice |
| `borders` | none/single/double/sunken/raised bevels; press-flip |
| `combo-button` | rapid-click juice: heat/punch/shake, `node.time`, impulse |
| `global-effects` | stock controls wrapped globally with shake (`node.time`+`translate`) + pointer magnify (`scaleAt`); `mapRender`, `ambient` |
| `juice-gallery` | 3×3 grid: nine buttons/sliders, one juicy effect each (squash/pop/wobble/magnet/confetti/spring/comet/elastic/rainbow) via channels + particles |
| `widget-board` | 15 Kea-style controls (slider/range/angle/arc/xy/box2d/box3d/color/gradient/…) on a `Pan()` surface |
| `adornments` | tooltip/badge/close layered onto plain cards via `addAdorn`; overlay layer, enter/exit, interactive |
| `dropdown` | local state + modal popup; draft field committing one intent |
| `split-pane` | shared `Split`/`Pane` layout parts, Flow re-wrap |
| `data-grid` | `Virtual` + `clip` + `Wheel` + `pin`: 10k rows, sort, column grips, shift/ctrl select, relative cursor keys (`shared/grid.ts`, `grid-math.ts`) |
| `tree-view` | virtualized tree, springing chevrons, →/← idiom, `reveal` jump (`shared/tree.ts`, `tree-math.ts`) |
| `schema-graph` | multi-port nodes, FK wires, marquee gesture, layered auto-layout, minimap + Dock (`shared/marquee.ts`, `graph-layout.ts`, `minimap.ts`) |
| `workbench` | tree + grid + graph pane in Splits; one selection fact; per-pane camera = extension point |
| `attention` | eight idle cues that ask for interaction and stop once answered (heartbeat halo, sheen sweep, sonar badge, idle nudge, marching drop zone, blinking key prompt, shimmer, spotlight); a `live` channel fades each out; `ambient` only while a cue is live |
| `hud` | game HUD: health with a lagging damage ghost, XP + level badge flash, odometer, hold-to-confirm timed from an impulse channel (`impulseAge`), radial cooldown wipes, toasts/banner expired via `onCommit` timers |
| `title-screen` | game main menu: sheened breathing title, drifting motes with pointer parallax, cascade-in menu with a springing selector, sliding panels, a stretching segmented pill; relative key intents (`confirm`, `move by`) |

Adornments: `adorn(node) → Element[]` on the overlay layer, positioned with `at(el, worldPos)`; interactive ones (with `on`) capture clicks, decorative ones (tooltip/badge) pass through. Append to any widget with `addAdorn(fn)`.

Copy pattern from nearest example. Prefer `examples/shared/widgets` for stock Button/Toggle/TimedButton when extending demos. Time-driven cues (pulses, sweeps, cooldowns, odometers) go through the pure curves in `examples/shared/motion.ts`; small shapes (sheen band, polygon, pie sector, bloom) through `examples/shared/paint.ts`. Painter primitives: box/dot/ring/arc/poly/line/wire/label/glow/clip.

## Agent do / don't

**Do:** pure Doc/Intent; keyed Elements; channel blends; wrap with `map*`/`add*`; public barrel imports; `step()` tests for kernel; follow existing example shape.

**Don't:** CSS/DOM widgets; `animate()` timelines; fork third-party parts (wrap instead); put draft/popup/scroll in Doc (use `.local()` — keep ephemeral out of undoable Doc); import examples from package; grow god Runtime special-cases (surface = part facets); let a data part sort/filter/flatten (the app owns derived state, the part renders `rowAt`/`keyAt` or flat rows).

## Source map

`src/gratify/`: `core/` anim math · `scene` reconcile · `part` · `interact` · `extend` · `theme` · `runtime`/`mount` · `painter` · `middleware` · `containers`/`label` · `scroll`/`virtual` data views. Spec = `README.md`. Roadmap = `docs/plan.md`. Reusable example parts: `examples/shared/README.md`.
