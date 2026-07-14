// ============================================================================
// slice.ts — a NEW editor gesture in ONE app-side file, zero framework edits.
//
// Hold Shift and drag a line across wires: every wire the line crosses is
// cut, Blender-style. This file is the plan's M3 acceptance test, and it uses
// exactly the three bounded powers a Gratify gesture gets:
//
//   1. PRIVATE STATE — the two endpoints of the line being dragged.
//   2. THE QUERY    — read-only scene access: anchor positions (where the
//                     wires actually are right now) and modifier keys.
//   3. AN OVERLAY VIEW — the red preview line, contributed as an ordinary
//                     element while the gesture runs. The element tree stays
//                     the whole truth of what is on screen, even mid-drag.
//
// Writes still travel one road: the intents returned from up().
// ============================================================================

import {
  calpha, Color,
  Gesture,
  Interactor,
  part,
  Vec,
  wireCrossesSegment,   // sampled bezier-vs-segment intersection (core/curve)
} from "gratify";

/** The shape of an edge as the surface's props carry it. */
export interface EdgeRef {
  id: string;
  from: string;   // anchor id of the source socket, e.g. "time/out"
  to: string;     // anchor id of the target socket, e.g. "mix/in"
}

// ── The preview element ───────────────────────────────────────────────────────
//
// An ordinary part. The gesture emits one of these into the overlay layer on
// every frame while the drag is active; it exit-fades when the gesture ends.

interface SliceLineProps {
  a: Vec;   // where the drag started (world coordinates)
  b: Vec;   // where the pointer is now
}

const SliceLine = part<SliceLineProps, { stroke: Color }>("slice-line", {

  style: (tokens) => ({ stroke: tokens.danger }),

  render(node, painter, style) {
    painter.line(node.props.a, node.props.b, calpha(style.stroke, 0.9), 2);
    painter.dot(node.props.a, 3, style.stroke);
    painter.dot(node.props.b, 3, style.stroke);
  },
});

// ── The gesture ───────────────────────────────────────────────────────────────

interface SliceState {
  a: Vec;
  b: Vec;
}

/**
 * Build the slice interactor. The edge list arrives as a FUNCTION OF THE
 * HOST'S PROPS — the gesture never stores the document, so it always sees
 * current state, and the business shape (EdgeRef) stays the app's vocabulary.
 *
 * Attach it to the surface part's `on:` list, before Pan(): begin() declines
 * (returns null) when Shift isn't held, which lets the pan interactor run.
 */
export function slice(edgesOfProps: (props: unknown) => EdgeRef[]): Interactor<unknown> {

  return Gesture<unknown, SliceState>({

    // Only begin when Shift is held — otherwise decline, and the next
    // interactor on the surface (Pan) gets the drag instead.
    begin: (_node, pointer, query) =>
      query.mods.shift ? { a: pointer, b: pointer } : null,

    // Track the pointer.
    move: (state, _node, pointer) => ({ ...state, b: pointer }),

    // The preview: one overlay element, re-described every frame.
    view: (state) => [
      SliceLine("slice-preview", { a: state.a, b: state.b }),
    ],

    // On release: cut every wire whose curve crosses the dragged segment.
    up(state, node, _pointer, query) {
      const intentsToDispatch: unknown[] = [];

      for (const edge of edgesOfProps(node.props)) {
        const sourceAnchor = query.anchor(edge.from);
        const targetAnchor = query.anchor(edge.to);
        if (!sourceAnchor || !targetAnchor) continue;

        const crossed = wireCrossesSegment(
          sourceAnchor.pos, targetAnchor.pos,   // the wire's endpoints
          state.a, state.b,                     // the slice line
        );
        if (crossed) {
          intentsToDispatch.push({ kind: "disconnect", id: edge.id });
        }
      }

      return intentsToDispatch;
    },
  });
}

export { SliceLine };
