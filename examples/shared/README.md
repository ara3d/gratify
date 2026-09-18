# examples/shared

Reusable parts and pure helpers the examples build on. They live here, not in
the framework, on purpose: `src/gratify/` ships primitives, apps ship widgets.
Everything imports the public `gratify` barrel only.

Each pair below is a component (a `part()` that owns no state and emits
intents) and the pure arithmetic under it (framework-free, tested in
`tests/`). Keep new pieces in that shape: the math is what makes a widget
testable without a runtime.

| File | Role |
|---|---|
| `widgets.ts` | Stock controls: Button, Checkbox, Toggle, Slider, Range, CloseButton, Card, Labeled |
| `range-math.ts` | The dual-thumb range's value ↔ pixel math (`tests/range-math.test.ts`) |
| `grid.ts` | DataGrid: virtualized table with a sortable header, column grips, row selection, keyboard cursor |
| `grid-math.ts` | Column spans, the click / shift / ctrl selection algebra, sort cycling, a stable typed sort (`tests/grid-math.test.ts`) |
| `tree.ts` | TreeView: virtualized tree with springing chevrons, kind icons, the arrow-key idiom |
| `tree-math.ts` | `flatten` of an expanded tree, ancestors, expand-all, the Right/Left key moves (`tests/tree-math.test.ts`) |
| `split.ts` | Split (two panes, draggable divider, either axis) and Pane (a well that fills) |
| `marquee.ts` | Rubber-band selection as one reusable gesture; emits a host-relative rect |
| `minimap.ts` | Minimap (screen-layer overview read from the live viewport) and Dock (pin a child to a viewport corner) |
| `graph-layout.ts` | Layered auto-layout: longest-path layering, barycenter ordering, placement (`tests/graph-layout.test.ts`) |
| `sample-schema.ts` | The sample database: tables, foreign keys, a deterministic row generator, the schema as a tree |
| `source-panel.ts` | The syntax-colored source viewer every example page shows beside its canvas |

Conventions the data components follow:

- **The app owns derived state.** A grid receives `rowAt`/`keyAt` over the
  app's already-sorted rows; a tree receives the flat rows of `flatten`. The
  part never sorts, filters or flattens on its own.
- **Relative cursor intents.** Keyboard movement leaves as `moveCursor(by)`
  and the app clamps in `update`, so a burst of key repeats between frames
  never reads a stale cursor from props.
- **Scroll is instance-local.** Lists sit on `Virtual`, whose scroll offset is
  the list's own; undo never scrolls a pane.
- **Fallback sizes.** A component that fills its pane also takes `width` /
  `height` props for containers that leave an axis unbounded (a Stack).
