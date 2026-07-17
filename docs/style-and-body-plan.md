# Gratify — Style Ergonomics + the Body Facet (AI-generated proposal)

*Written 2026-07-14 by Claude, from a code review of the repo at `28a3960` plus
the then-uncommitted `adorn` work. Status: **EXECUTED** — all of Proposal S and
Proposal B shipped on `main` after `adorn` landed (9865fea):
`76dbf36` S1 (curried `part<P>()` inference) · `ae925a6` S2 (style recipes +
`SurfaceStyle`, built-ins/widgets migrated) · `3f4183b` B (the `body` facet +
`mapBody`) · `f38589c` examples (Card, `composites`, widget-board rewrite) ·
`f7a46f2` S3 (no-`tokens`-in-part-file check) · `dab4e96` gallery rebuild.
The §5 `borders → border(kind): PartExt` rewrite also shipped later (`21e7b91`).
Note later work superseded the
authoring surface: two-phase measure/arrange (`docs/measure-arrange-plan.md`)
and the typestate part **builder** are now the primary form; the curried
overload and spec-object form documented here still compile. Companion to
[`plan.md`](plan.md); if they disagree, `plan.md` and the code win.*

---

## 1. The goals, in one place

The 2026-07-14 composability assessment found that the framework's *algebra*
is sound (wrap function facets, append list facets, three scopes — proven by
`extensions` and `combo-button`) but its *practice* leaks in three places:

1. **The style facet is optional-feeling, and authors skip it.** Skipping it
   silently kills the headline feature: a widget with no style record gives
   `mapStyle` nothing to grab, so it cannot be restyled or themed without a
   rewrite. Evidence that the path of least resistance points the wrong way:
   - `examples/widget-board/main.ts`: **39** direct `tokens.` reads inside
     render helpers, **0** style facets across 15 widgets.
   - `src/gratify/label.ts`: the **built-in** `Label` reads the `tokens`
     singleton inside `render` — the framework breaks its own rule.
   - The README's §4 pipeline (`tokens → style → resolved values → render`)
     is a claim about culture, and the culture defects under mild pressure.
2. **No composite mechanism — widgets can't be built from widgets.** A part is
   a leaf (`size`+`render`) or a layout container (`measure`+`place` over
   *externally supplied* children). Nothing lets a part *supply its own
   children*, so every widget-board card hand-draws the same title/value
   chrome ~15 times, and rung 2 of the layering model ("parts made of parts")
   has no expression.
3. **Adornments** (anchored, interactive, out-of-bounds decoration) — being
   built right now in a parallel effort; out of scope here except for
   sequencing (§6).

**Goal for this plan:** make the *right* way — a style facet on every visual
part, composition via a body facet — also the *cheapest* way to write a
widget, then re-align the built-ins and examples so "copy the nearest example"
propagates the right pattern. Pit of success, not house rules.

---

## 2. Why authors skip the style facet (diagnosis)

Writing the facet "properly" today costs three things the inline-tokens
shortcut doesn't:

| Cost | Today | Why it hurts |
|---|---|---|
| A named interface per widget | `interface ButtonStyle { fill; edge; corner; lift; text }` | ~5 lines of pure plumbing; exists only to connect `style` to `render` |
| A second type parameter | `part<ButtonProps, ButtonStyle>(…)` | TypeScript has no partial inference: writing `part<ButtonProps>` **compiles** but silently defaults `S` to `Record<string, unknown>` — you lose typing and never find out. The trap punishes the diligent |
| Re-deriving common recipes | every widget re-invents hover/press blends for fill/edge/text | the 3-line surface recipe is copy-pasted or — easier — inlined against `tokens` |

Meanwhile the wrong path is frictionless: `tokens` is an importable mutable
singleton, the painter takes any `Color`, and nothing warns. `widget-board`'s
`card()` helper is the end state: a *proto-composite* that reads tokens
directly because passing style records through draw helpers is awkward — which
is really goal 2 (no body facet) manifesting as goal 1 (style skipped).

So the fix is not exhortation; it's removing all three costs, then removing
the in-repo examples of the wrong pattern.

## 3. Proposal S — make the style facet the cheapest path

### S1. Type inference: no style interface, no second type parameter

**Verified by experiment** (tsc 5.x, `--strict`, mimicking the real
signatures): with a curried definer, TypeScript infers the style record `S`
from the style function's return value and flows it into `render`'s third
parameter — including catching typos (`s.edge` when style produced no `edge`
is an error), and interactor callbacks keep their `GNode<P>` typing.

Add an overload to `part` (the existing signature stays; every current call
keeps compiling):

```ts
// part.ts
export function part<P>(): <S>(name: string, spec: PartSpec<P, S>) => PartCtor<P>;
export function part<P, S = Record<string, unknown>>(name: string, spec: PartSpec<P, S>): PartCtor<P>;
// impl: arguments.length === 0 ? (name, spec) => makePart(name, spec) : makePart(...)
```

Authoring before / after:

```ts
// BEFORE — 5-line interface + 2 explicit type params
interface ButtonStyle { fill: Color; edge: Color; corner: number; lift: number; text: Color; }
export const Button = part<ButtonProps, ButtonStyle>("button", {
  style(t, ch, props): ButtonStyle { … },
  render(node, p, s) { … },
});

// AFTER — the props type is stated once; the style record is inferred
export const Button = part<ButtonProps>()("button", {
  size: (props, m) => v(m.text(props.label).x + 28, 32),
  style: (t, ch, props) => ({
    ...surface(t, ch, { tint: props.danger ? t.danger : props.accent ? t.accent : undefined }),
    corner: 8,
    lift: 2 * ch.hover - 2 * ch.press,
  }),
  render: (node, p, s) => {
    const r = node.rect.raise(s.lift);
    p.box(r, s.corner, s.fill, s.edge, 1);
    p.label(node.props.label, r.center, s.text, { weight: 500 });
  },
  on: [Press((node) => node.props.press)],
});
```

The style facet is now *shorter* than the inline-tokens version of the same
widget — you write the same expressions, but gain a typed record, `mapStyle`
reach, and themability. That is the pit of success.

Experiment notes (scratch file, kept out of the repo):

- Plain single-call inference (`part("button", { size: (props: ButtonProps, …) })`)
  also works for `style`/`render`/`size`, but **fails inside interactor
  callbacks** — `Press((node) => node.props.…)` infers `P = unknown` because a
  nested generic call can't receive the outer in-flight inference. Since
  nearly every widget has `on:`, the curried form is the house form.
- The two overloads coexist cleanly (arity disambiguates); legacy explicit
  `part<P, S>` calls and bare containers (`part<StackProps>()(…)` with only
  `measure`/`place`) all check.

Also carry `S` on the constructor so extension authors can name a widget's
record without a nominal interface:

```ts
export interface PartCtor<P, S = unknown> { (key, props, children?): Element; def: PartDef<P, S>; }
export type StyleOf<C> = C extends PartCtor<any, infer S> ? S : never;
// usage: mapStyle<StyleOf<typeof Button>>((t, ch, p, base) => ({ ...base, fill: … }))
```

### S2. Style recipes + a shared vocabulary

Cross-widget restyling only works if widgets agree on field names — today the
`extensions` example invents a private `Restylable { fill; edge; text }`,
which is the protocol wanting to be official. Add a small `style.ts`:

```ts
/** The shared surface protocol: what a theme-scope restyle may assume. */
export interface SurfaceStyle { fill: Color; edge: Color; text: Color; }

/** The house recipe for an interactive surface: hover/press emphasis blends.
 *  Spread it, then add your widget's own fields. */
export const surface = (t: Tokens, ch: Channels, o: { tint?: Color; strength?: number } = {}): SurfaceStyle => {
  const tint = o.tint ?? t.surfaceHi;
  const k = (o.strength ?? 1) * (0.18 + 0.32 * ch.hover + 0.4 * ch.press);
  return {
    fill: t.mix(t.surface, tint, k),
    edge: t.mix(t.muted, o.tint ?? t.accent, ch.hover),
    text: t.mix(t.text, t.textBright, ch.hover),
  };
};
```

Two or three recipes (`surface`, maybe `trackAndThumb` for slider-likes,
`textTone` for labels) cover the observed duplication in `widgets.ts` and
`widget-board`. Rules of the game:

- Recipes take `(Tokens, Channels, opts)` and return records — they only
  *exist* inside style functions, so reaching for one pulls the author into
  the facet.
- A theme extension written against `SurfaceStyle` restyles every widget that
  used the recipe. The `extensions` example's `neon` then demonstrably hits
  Button *and* Checkbox *and* Card with one definition — a claim the README
  can't currently make.

### S3. Dogfood + culture (make the nearest example the right example)

1. **Fix the built-ins**: `Label` gets a real style facet (its `dim`/`bright`/
   `done` blending moves out of render). Audit `containers.ts` (fine — no
   render) and any other `tokens`-in-render in `src/gratify`.
2. **Migrate `examples/shared/widgets.ts`** to the curried form + recipes and
   delete the five named `*Style` interfaces. This file is the de-facto
   authoring tutorial; it must model the target idiom.
3. **Rewrite `widget-board`** (after the body facet lands — §5): every widget
   gets a style facet; `card()` becomes the `Card` composite; `track`/`thumb`
   helpers take colors from the caller's style record instead of reading
   `tokens`.
4. **Mechanical check**: extend `npm run check`'s boundary grep with one rule —
   *a file that calls `part(` may not import `tokens`*. Style functions
   receive tokens; render receives style; app-level free drawing (fx,
   gradients) can still import the singleton because those files define no
   parts. Crude, greppable, catches the exact failure mode observed.
5. **Docs**: README §3/§4 snippets move to the curried form; the skill file
   (`.cursor/skills/gratify/SKILL.md`) gets the two house rules: *"state the
   props type once via `part<Props>()`; never name a style interface"* and
   *"if `render` wants a token, the value belongs in `style`"*.

## 4. Proposal B — the `body` facet (composites: parts made of parts)

### Design

One new optional facet, deliberately on the **state clock**:

```ts
// part.ts — PartSpec
/** Composite: derive child elements from props. Runs at reconcile time
 *  (state clock), never per frame — structure is a function of state;
 *  motion stays in channels. `children` are the use-site children: place
 *  them where the composite wants its content slot. */
body?(props: P, children: Element[]): Element[];
```

- `body` is pure `props → elements`, exactly like `view` — no `GNode`, no
  channels, no time. If structure needs to vary, that variation is state and
  belongs in props (or, later, instance-local state — see forward-compat).
- The element's use-site `children` become body's *input* (the slot), not
  direct scene children. A part without `body` behaves exactly as today.
- Body children are ordinary keyed elements: reconcile matches them by key, so
  springs/channels survive re-expansion and enter/exit animations come free.
- Layout: no new mechanism. A composite normally returns **one container
  child** (`Stack`/`Row`/`Layers`) and needs no `measure`/`place` of its own —
  the default "union of children" sizing does the rest. Composites that want
  custom geometry may still declare `measure`/`place`; they then lay out the
  body's output.
- Paint order already cooperates: `drawPass` renders the part itself before
  its children, so a composite's `render` is its **chrome under the content**
  (card background, group frame). Hit-testing already prefers children, so
  chrome doesn't steal clicks.

### Where expansion happens (kernel untouched)

Expansion is a **pure pre-pass over the element tree**, sharing one
composition function with `EffCache` so all three scopes apply to `body` too:

```ts
// compose.ts (new; EffCache refactors onto composeDef)
export function composeDef(el: Element): AnyDef {
  let def = el.part as AnyDef;
  for (const e of activeThemeExts(def.name, def.ancestors)) def = e(def) as AnyDef;
  for (const e of el.exts ?? []) def = (e as (d: AnyDef) => AnyDef)(def);
  return def;
}

export function expandBodies(el: Element, depth = 0): Element {
  if (depth > 64) { console.error(`gratify: body expansion too deep at "${el.key}"`); return el; }
  const def = composeDef(el);
  const kids = def.body ? def.body(el.props, el.children ?? []) : el.children;
  return kids?.length
    ? { ...el, children: kids.map((k) => expandBodies(k, depth + 1)) }
    : el;
}
```

Runtime changes are three lines: expand the view on dirty
(`reconcile(this.root, expandBodies(app.view(doc)))`), expand the gesture and
adorn roots the same way (composites inside tooltips/previews just work), and
treat a `themeVersion` bump as dirty so a theme-scope `mapBody` can change
structure live. `reconcile`, `layout`, `animate`, `draw` are untouched.

Cost: expansion runs only on state changes, O(tree) — the same class as
`view` itself.

### The algebra addition: `mapBody`

```ts
// extend.ts
/** Wrap the structure: receive the base body's output (for a body-less part,
 *  its use-site children) and return the transformed list. */
export const mapBody = (
  f: (props: unknown, children: Element[], base: Element[]) => Element[],
): PartExt => (def) => ({
  ...def,
  body: (props: unknown, children: Element[]) =>
    f(props, children, def.body ? def.body(props, children) : children),
});
```

This completes the extension algebra's coverage of the part model:

| Facet | Extension | Power |
|---|---|---|
| `style` | `mapStyle` | looks |
| `render` | `mapRender` | paint-over decoration |
| `size` | `mapSize` | metrics |
| `channels`, `on` | `addChannels`, `addOn` | motion, behavior |
| `adorn` | `addAdorn` | anchored overlay (parallel effort) |
| **`body`** | **`mapBody`** | **structure** |

…and at all three scopes: `derivePart("labeled-slider", Slider, withLabel(…))`,
`extendTheme("dark", "card", addFooterBadge)`, `withExt(Stack(…), mapBody(…))`.
Note `mapBody` on a *body-less* part treats its use-site children as the base,
so "append a badge child to any container" is a one-liner.

### The proof widget: `Card`

```ts
// examples/shared/widgets.ts
export interface CardProps { title: string; value?: string; w?: number; }

export const Card = part<CardProps>()("card", {
  style: (t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.35 + 0.4 * ch.hover),
    edge: t.mix(t.muted, t.accent, 0.2 + 0.5 * ch.hover),
    corner: 10,
  }),
  render: (node, p, s) => p.box(node.rect, s.corner, s.fill, s.edge, 1),  // chrome under content
  body: (props, children) => [
    Stack("layout", { pad: 14, gap: 10 }, [
      Row("head", { gap: 8, justify: "between" }, [
        Label("title", { text: props.title, weight: 600, size: 12 }),
        ...(props.value ? [Label("value", { text: props.value, dim: true, size: 11 })] : []),
      ]),
      ...children,
    ]),
  ],
});
```

Small companion (discovered by writing this): `Row` wants a
`justify?: "start" | "between"` option for the title/value line — a ~6-line
addition to `containers.ts`.

Worth teaching alongside it: the **rung-1 alternative** — a plain function
`const Labeled = (key, text, el) => Row(key, { gap: 8 }, [Label(`${key}/l`, { text }), el])`
needs no framework at all. The examples should show both and say when each is
right (function = private arrangement; part = named, themable, extensible
seam — `extendTheme("dark", "card", …)` can reach every card in the app,
which no plain function permits).

### Forward-compat and non-goals

- **Local state** (plan.md M3 remainder): when instance-local state lands,
  `body` gains an optional context argument (`body(props, children, ctx)`) —
  additive, and the dropdown composite becomes expressible. Not in this plan.
- **Not a component system**: no lifecycle, no local render loop — a composite
  is a template, and all animation stays in channels.
- **Recursion**: a body that emits its own part is an authoring bug; the depth
  guard turns it into a console error instead of a hang.
- **Theme-scope structural changes** re-key children when part names change,
  so affected instances re-enter (play their enter animation) on theme toggle.
  Acceptable; document it.

## 5. Example work (the visible payoff)

1. **`borders` rewrite** — from the assessment, still unclaimed: replace the
   monolithic `Panel`+`BorderKind` with `border(kind): PartExt` built on
   `mapRender`, applied to the *shared* widgets at all three scopes, plus one
   **stacking case** (e.g. `withExt(Button(…), border("raised"), sheen)`) to
   prove decoration order is predictable (inside-out, application order).
   Needs nothing from this plan — can start any time.
2. **`composites` example (new)** — teaches rung 1 vs rung 2: `Labeled`
   function vs `Card` part, one `mapBody` use-site injection, one
   theme-scope `mapBody`.
3. **`widget-board` rewrite** — the big one: 15 cards become `Card`
   composites with real style facets; the inner controls become standalone
   parts sized by layout instead of `innerOf(r)` math. Expected net LOC drop
   and, more important, every widget becomes restylable. This example is the
   most-copied file in the repo; it must model the idiom.
4. **`extensions` example** — swap the private `Restylable` for the official
   `SurfaceStyle`, and show `neon` hitting three different part kinds.

## 6. Sequencing (around the in-flight adorn work)

The adorn effort currently has `part.ts`, `extend.ts`, `runtime.ts`,
`containers.ts`, `draw.ts`, `layout.ts`, `scene.ts` dirty — i.e. **every file
this plan touches**. Core work here must not start until that commits.

| Phase | Contents | Files | Depends on |
|---|---|---|---|
| 0 | adorn lands + commits | (parallel effort) | — |
| 1 | **S1** curried `part` overload, `PartCtor<P, S>`, `StyleOf` | `part.ts` | 0 |
| 2 | **S2** `style.ts` recipes + `SurfaceStyle`; migrate `widgets.ts`, `label.ts`; README/skill snippets | `style.ts` (new), examples | 1 |
| 3 | **B** `body` facet: `compose.ts`, `PartSpec.body`, `mapBody`, runtime 3-liner, `Row.justify`; kernel tests | `compose.ts` (new), `part.ts`, `extend.ts`, `effective.ts`, `runtime.ts`, `containers.ts` | 0 (mechanically), 1 (idiomatically) |
| 4 | examples: `Card`, `composites`, `widget-board` rewrite, `extensions` touch-up | examples only | 2, 3 |
| 5 | **S3** check-script rule (`part(` ⇒ no `tokens` import) — last, so it lands green | `scripts/check` | 4 |
| any | `borders` rewrite as `border(kind): PartExt` | examples only | nothing |

Each phase is a separate commit with `npm run test` + `npm run check` green
and the gallery visually spot-checked.

**Done-when, per goal:**

- *Style*: `widgets.ts` and `label.ts` contain zero named style interfaces
  and zero `tokens` reads in render; a `SurfaceStyle` theme extension restyles
  three different widget kinds in the `extensions` example; the check rule is
  enforced repo-wide.
- *Body*: `widget-board`'s chrome is one `Card` definition used 15 times;
  `mapBody` works at all three scopes under unit test; deleting a card child
  from the doc plays exit inside the composite.

## 7. Alternatives considered (and why not)

- **Single-signature full inference** (no curried call): works for
  style/render but silently degrades interactor callbacks to `unknown`
  (verified) — a new trap to replace the old one. Rejected as the house form;
  it remains available since it's the same function.
- **Expanding bodies inside `reconcile`**: needs def resolution injected into
  the kernel and tangles instance matching with expansion. The pure element
  pre-pass keeps `scene.ts` untouched and independently testable. Rejected.
- **`body(node)` on the frame clock** (structure reacting to channels):
  breaks the two-clock model — per-frame tree churn, reconcile every frame.
  Motion belongs in style/render via channels; appearing/disappearing UI
  (tooltips on hover) is exactly what `adorn` is for. Rejected.
- **Banning the `tokens` export**: would break legitimate app-level drawing
  (fx, ramps) and the theme cross-fade story. The narrow grep rule ("no
  `tokens` import in part-defining files") targets the actual failure mode.
