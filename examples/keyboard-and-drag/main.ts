// Example: keyboard-and-drag — proves interactors compose on one part
// (README §5): Focusable + Keys + a reorder Gesture live on the same row.
// Click a row to focus it (ring eases in); ArrowUp/Down move it; or just drag
// it — rows glide around the dragged one because order is state and layout
// springs do the rest.

import {
  calpha, clamp, Color, Focusable, Gesture, GNode, hsl, Keys, mount, part,
  Stack, Label, v,
} from "gratify";

interface Item { id: string; label: string; hue: number; }
interface Doc { items: Item[]; }
type Intent = { kind: "move"; id: string; index: number };

const ROW_STEP = 46;   // row height 38 + gap 8 (used to map drag y → index)

function update(doc: Doc, i: Intent): Doc {
  const from = doc.items.findIndex((t) => t.id === i.id);
  const to = clamp(i.index, 0, doc.items.length - 1);
  if (from < 0 || from === to) return doc;
  const items = [...doc.items];
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return { items };
}

interface RowProps { id: string; label: string; hue: number; index: number; }

interface RowStyle { fill: Color; edge: Color; text: Color; ring: number; lift: number; }

const ItemRow = part<RowProps, RowStyle>("item-row", {
  size: () => v(260, 38),
  style(t, ch): RowStyle {
    return {
      fill: t.mix(t.surface, t.surfaceHi, ch.hover + ch.drag),
      edge: t.mix(t.muted, t.accent, Math.max(ch.focus, ch.drag)),
      text: t.mix(t.text, t.textBright, ch.hover),
      ring: ch.focus,
      lift: 3 * ch.drag,
    };
  },
  render(node, p, s) {
    const r = node.rect.raise(s.lift);
    p.box(r, 9, s.fill, s.edge, 1 + s.ring);
    p.dot(v(r.x + 20, r.center.y), 6, hsl(node.props.hue, 0.75, 0.6));
    p.label(node.props.label, v(r.x + 36, r.center.y), s.text, { align: "left" });
    if (s.ring > 0.02) {
      p.label("↕", v(r.right - 16, r.center.y), calpha(s.edge as Color, s.ring), { size: 12 });
    }
  },
  on: [
    Focusable(),
    Keys({
      ArrowUp: (n: GNode<RowProps>) => ({ kind: "move", id: n.props.id, index: n.props.index - 1 }),
      ArrowDown: (n: GNode<RowProps>) => ({ kind: "move", id: n.props.id, index: n.props.index + 1 }),
    }),
    Gesture<RowProps, { y0: number; start: number }>({
      begin: (n, p) => ({ y0: p.y, start: n.props.index }),
      during(s, n, p) {
        const index = s.start + Math.round((p.y - s.y0) / ROW_STEP);
        return index !== n.props.index ? { kind: "move", id: n.props.id, index } : undefined;
      },
    }),
  ],
});

function view(doc: Doc) {
  return Stack("root", { gap: 8, pad: 48 }, [
    Label("title", { text: "Reorder: click to focus, arrows or drag to move", size: 16, weight: 600, bright: true }),
    ...doc.items.map((t, i) => ItemRow(t.id, { id: t.id, label: t.label, hue: t.hue, index: i })),
  ]);
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, {
  init: {
    items: [
      { id: "a", label: "Springs", hue: 200 },
      { id: "b", label: "Channels", hue: 260 },
      { id: "c", label: "Reconcile", hue: 140 },
      { id: "d", label: "Interactors", hue: 30 },
      { id: "e", label: "Extensions", hue: 330 },
    ],
  },
  update,
  view,
});
