// Example: undo — proves app-wide policy middleware (README "undo/redo as a
// three-line middleware"). The app knows nothing about history: withUndo(app)
// wraps it. Undoing a delete replays the dot's ENTER animation — to Gratify,
// undo is just another state change, so it animates like everything else.

import { mount, part, withUndo, hsl, Stack, Row, Label, v, GNode } from "gratify";
import { Button } from "../shared/widgets";

interface Dot { id: string; hue: number; }
interface Doc { dots: Dot[]; next: number; }

type Intent = { kind: "add" } | { kind: "pop" } | { kind: "shuffle" };

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "add":
      return { next: doc.next + 1, dots: [...doc.dots, { id: `d${doc.next}`, hue: (doc.next * 47) % 360 }] };
    case "pop":
      return { ...doc, dots: doc.dots.slice(0, -1) };
    case "shuffle":
      return { ...doc, dots: doc.dots.map((d) => ({ ...d, hue: (d.hue + 120) % 360 })) };
  }
}

// A dot: hue eases via a declared channel, so shuffle (and un-shuffle) fades.
interface DotProps { hue: number; }
const DotPart = part<DotProps>("dot", {
  size: () => v(26, 26),
  channels: {
    hue: { target: (n: GNode<DotProps>) => n.props.hue, rate: 8 },
  },
  render(node, p) {
    p.glow(hsl(node.ch.hue, 0.8, 0.6), 6 + 6 * node.ch.hover, () =>
      p.dot(node.rect.center, 11 + 2 * node.ch.hover, hsl(node.ch.hue, 0.8, 0.62)));
  },
  on: [], // hoverable, no intents
});

function view(doc: Doc) {
  return Stack("root", { gap: 16, pad: 48 }, [
    Label("title", { text: "Undoable dots", size: 20, weight: 600, bright: true }),
    Row("toolbar", { gap: 8 }, [
      Button("add", { label: "+ Dot", press: { kind: "add" }, accent: true }),
      Button("pop", { label: "Remove", press: { kind: "pop" }, danger: true }),
      Button("shuffle", { label: "Shuffle hues", press: { kind: "shuffle" } }),
    ]),
    Row("dots", { gap: 8 }, doc.dots.map((d) => DotPart(d.id, { hue: d.hue }))),
    Row("history", { gap: 8 }, [
      Button("undo", { label: "⟲ Undo", press: { kind: "undo" } }),
      Button("redo", { label: "⟳ Redo", press: { kind: "redo" } }),
    ]),
    Label("hint", { text: "Delete a dot, then undo — it pops back in through its enter animation.", dim: true }),
  ]);
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, withUndo({
  init: { dots: [{ id: "d-a", hue: 10 }, { id: "d-b", hue: 130 }, { id: "d-c", hue: 250 }], next: 0 },
  update,
  view,
}));
