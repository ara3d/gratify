// The M3 acceptance test (plan §M3): a NEW editor gesture added as ONE
// app-side file with ZERO framework edits. Shift-drag a line across wires to
// cut every wire it crosses — Blender-style.
//
// It uses exactly the three bounded gesture powers: private state (the two
// endpoints), the read-only Query (anchor positions + modifiers), and an
// overlay view (the slice line preview).

import {
  calpha, Color, Gesture, Interactor, part, Vec, wireCrossesSegment,
} from "gratify";

export interface EdgeRef { id: string; from: string; to: string; }

// ---- the preview element (overlay layer, world coords) -----------------------
const SliceLine = part<{ a: Vec; b: Vec }, { stroke: Color }>("slice-line", {
  style: (t) => ({ stroke: t.danger }),
  render(node, p, s) {
    p.line(node.props.a, node.props.b, calpha(s.stroke, 0.9), 2);
    p.dot(node.props.a, 3, s.stroke);
    p.dot(node.props.b, 3, s.stroke);
  },
});

// ---- the gesture ---------------------------------------------------------------
/** Attach to the surface. `edges` come from the surface's props each event, so
 *  the gesture always sees current state — it never stores the doc. */
export function slice(edgesOf: (props: unknown) => EdgeRef[]): Interactor<unknown> {
  return Gesture<unknown, { a: Vec; b: Vec }>({
    begin: (_n, p, q) => (q.mods.shift ? { a: p, b: p } : null),   // decline → pan runs
    move: (s, _n, p) => ({ ...s, b: p }),
    view: (s) => [SliceLine("slice", { a: s.a, b: s.b })],
    up(s, node, _p, q) {
      const cut: unknown[] = [];
      for (const e of edgesOf(node.props)) {
        const a = q.anchor(e.from), b = q.anchor(e.to);
        if (a && b && wireCrossesSegment(a.pos, b.pos, s.a, s.b)) {
          cut.push({ kind: "disconnect", id: e.id });
        }
      }
      return cut;
    },
  });
}

export { SliceLine };
