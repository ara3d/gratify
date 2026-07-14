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
9. Text input, adornments, modal popups, instance-local state — **not built yet**. Don't invent APIs for them; skip or stub outside framework.

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
| `size` / `measure`+`place` | leaf size / container layout |
| `channels` | extra chase specs (`target`+`rate`\|`spring`, or `decay` impulse) |
| `style(t, ch, props)` | → flat style record `S` |
| `render(node, paint, S)` | draw |
| `on` | interactor list |
| `anchors` | named world points for wires |
| `hit` | custom hit (wires = curve distance) |

Auto channels: `hover`, `press`, `drag`, `focus`, `enter`, `exit`, layout pos/size. Impulse: declare `decay`, call `node.kick("name")`.

## Time-based motion (pulses / shakes / bounces)

`node.time` = seconds since start, ever-rising. Use for motion that is a *function of time*, not a transition (`sin(node.time*…)`). The channel rest-detector can't see time motion, so keep the loop awake with `AppSpec.ambient(doc, time) => boolean` — true while animating, false to sleep. `rt.animating` reads the current rest state. Examples: `combo-button`, `earthquake`, `magnify`.

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

// append list facet
addChannels({ "fx/x": { target: (n) => n.ch.hover, rate: 6 } })
addOn(Press(...))

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

`Stack`, `Row`, `Free`, `Layers`, `Label`. Layout sizes feed **position/size channels** — reflow animates alone.

Layers: `"world" | "overlay" | "screen"` — pan/zoom aware.

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
| `magnify` | fisheye lens, `node.time` bounce, `ambient` |
| `earthquake` | fully time-based tremor (magnitude*exp decay + sin) + `ambient` |
| `widget-board` | 15 Kea-style controls (slider/range/angle/arc/xy/box2d/box3d/color/gradient/…) on a `Pan()` surface |

Copy pattern from nearest example. Prefer `examples/shared/widgets` for stock Button/Toggle when extending demos.

## Agent do / don't

**Do:** pure Doc/Intent; keyed Elements; channel blends; wrap with `map*`/`add*`; public barrel imports; `step()` tests for kernel; follow existing example shape.

**Don't:** CSS/DOM widgets; `animate()` timelines; fork third-party parts (wrap instead); put draft/popup in Doc (local state not ready — keep ephemeral out of undoable Doc); import examples from package; grow god Runtime special-cases (surface = part facets).

## Source map

`src/gratify/`: `core/` anim math · `scene` reconcile · `part` · `interact` · `extend` · `theme` · `runtime`/`mount` · `painter` · `middleware` · `containers`/`label`. Spec = `README.md`. Roadmap = `docs/plan.md`.
