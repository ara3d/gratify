// ============================================================================
// Example: split-pane — custom layout parts, reflow, and live resize.
//
// The layout parts are shared (examples/shared/split.ts), each ONE part()
// with measure/arrange — no framework changes, exactly as "a custom layout is
// a part" promises:
//
//   • Split — hands its two panes a rect split by a fraction, with a draggable
//     Divider between them that emits `set(fraction)`; the app owns the
//     fraction, so it is undoable state like any other.
//   • Pane  — a well that stretches its single child to fill it.
//
// The wrapping row is `Flow`, a Gratify built-in: with real two-phase layout
// it reports an honest height from the width it's given, so it composes
// anywhere.
//
// The left pane is a Flow of fixed-size buttons. The right pane holds an
// EXTERNAL slider that sets every button's width. Drag the divider → both panes
// re-lay-out; drag the slider → every button resizes and the Flow re-wraps;
// resize the window → everything reflows. All of it glides for free: layout
// results feed position springs and size eases, so nothing is animated by hand.
// ============================================================================

import { Flow, grow, Intentish, Label, mount, part, Press, Stack, surface, v, Element } from "gratify";
import { Slider } from "../shared/widgets";
import { Pane, Split } from "../shared/split";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import splitSource from "../shared/split.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── Geometry constants ────────────────────────────────────────────────────────
const MIN_W = 52, MAX_W = 176;   // button width range the slider spans

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  split: number;             // 0..1 — divider position
  width01: number;           // 0..1 — button width, mapped to [MIN_W, MAX_W]
  labels: string[];
  lastClicked: string | null;
}

type Intent =
  | { kind: "split"; value: number }
  | { kind: "width"; value: number }
  | { kind: "click"; label: string };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "split": return { ...doc, split: intent.value };
    case "width": return { ...doc, width01: intent.value };
    case "click": return { ...doc, lastClicked: intent.label };
  }
}

const widthOf = (width01: number) => MIN_W + width01 * (MAX_W - MIN_W);

// ── FixedButton — a fixed-size button whose width comes from a prop ───────────
const FixedButton = part<{ label: string; w: number; press: Intentish }>()("fixed-button", {
  size: (props) => v(props.w, 34),
  style: (t, ch) => ({ ...surface(t, ch, {}), corner: 7 }),
  render: (node, paint, s) => {
    paint.box(node.rect, s.corner, s.fill, s.edge, 1);
    paint.label(node.props.label, node.rect.center, s.text, { weight: 500, size: 12 });
  },
  on: [Press((node) => node.props.press)],
});

// ── View ──────────────────────────────────────────────────────────────────────
// The root Stack pads the viewport; its one child, the Split, fills the rest
// (a Stack arranged to the viewport stretches its lone child to the slack).
function view(doc: Doc): Element {
  const w = widthOf(doc.width01);
  const buttons = doc.labels.map((label, i) =>
    FixedButton(`b${i}`, { label, w, press: { kind: "click", label } }));

  return Stack("root", { pad: 16, align: "stretch" }, [
    grow(Split("split", { at: doc.split, min: 0.12, set: (value) => ({ kind: "split", value }) }, [
      Pane("left", {}, [Flow("flow", { gap: 10, pad: 14 }, buttons)]),
      Pane("right", {}, [
        Stack("controls", { gap: 14, pad: 20, align: "stretch" }, [
          Label("h", { text: "Controls", weight: 600, size: 15, bright: true }),
          Label("cap", { text: "Button width (drives every button in the left pane)", dim: true, size: 11 }),
          Slider("width", { value: doc.width01, set: (value) => ({ kind: "width", value }) }),
          Label("readout", { text: `width ${Math.round(w)}px  ·  split ${Math.round(doc.split * 100)}%`, dim: true, size: 11 }),
          Label("last", { text: doc.lastClicked ? `last clicked: ${doc.lastClicked}` : "click a button →", dim: true, size: 11 }),
          Label("hint", { text: "Drag the divider · drag the slider · resize the window — it all reflows.", dim: true, size: 11 }),
        ]),
      ]),
    ])),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    split: 0.62,
    width01: 0.3,
    lastClicked: null,
    labels: Array.from({ length: 14 }, (_, i) => `Button ${i + 1}`),
  },
  update,
  view,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "split.ts (shared)", code: splitSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
