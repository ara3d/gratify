// ============================================================================
// Example: node editor — the editor-tier flagship.
//
// Everything editor-grade here is built from ordinary Gratify concepts:
//
//   • THE SURFACE IS A PART. The dot grid is its render; pan/zoom is its
//     Pan() interactor; Delete-to-cut is its Keys(); the slice gesture
//     (slice.ts — a separate app file) is just one more entry in its `on:`.
//
//   • WIRES ARE ELEMENTS. Each edge in the document becomes a keyed Wire
//     element whose geometry is two ANCHOR REFERENCES. Because wires are real
//     elements they hit-test (by distance to the curve), select, theme, and
//     exit-fade when deleted — none of that is special-cased.
//
//   • ANCHORS connect geometry between parts: each node publishes the world
//     position of its sockets every layout pass; wires and gestures resolve
//     them through the read-only query.
//
// Controls: drag node body = move · drag a socket = wire (snaps green) ·
// click wire = select, Del = cut · Shift-drag empty = slice · drag empty =
// pan · wheel = zoom.
// ============================================================================

import {
  Anchor,
  burst,
  calpha, Color,
  Element,
  Free,             // container that places children at their props.pos
  Gesture,
  GNode,
  hsl,
  Keys,
  mount,
  Pan,              // surface interactor: drag empty space pans, wheel zooms
  part,
  Press,
  rect, rgb,
  v, Vec, vdist,
  wireDist,         // distance from a point to a wire curve (hit-testing)
  Stack, Label,
} from "gratify";
import { slice, EdgeRef } from "./slice";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import sliceSource from "./slice.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  title: string;
  hue: number;      // header accent color
  pos: Vec;         // world-space position — Free reads this to place the node
}

interface GraphDocument {
  nodes: Record<string, GraphNode>;
  edges: EdgeRef[];
  selectedEdgeId: string | null;
}

type GraphIntent =
  | { kind: "move"; id: string; pos: Vec }
  | { kind: "connect"; a: string; b: string }      // two anchor ids, either order
  | { kind: "disconnect"; id: string }
  | { kind: "select"; id: string | null };

let nextEdgeNumber = 100;

function update(document: GraphDocument, intent: GraphIntent): GraphDocument {
  switch (intent.kind) {

    case "move":
      return {
        ...document,
        nodes: { ...document.nodes, [intent.id]: { ...document.nodes[intent.id], pos: intent.pos } },
      };

    case "connect": {
      // Normalize so `from` is always the output socket.
      const [from, to] = intent.a.endsWith("/out") ? [intent.a, intent.b] : [intent.b, intent.a];

      // An input holds exactly one wire: connecting replaces what was there.
      const remainingEdges = document.edges.filter((edge) => edge.to !== to);

      return {
        ...document,
        edges: [...remainingEdges, { id: `edge-${nextEdgeNumber++}`, from, to }],
      };
    }

    case "disconnect":
      return {
        ...document,
        edges: document.edges.filter((edge) => edge.id !== intent.id),
        selectedEdgeId: document.selectedEdgeId === intent.id ? null : document.selectedEdgeId,
      };

    case "select":
      return { ...document, selectedEdgeId: intent.id };
  }
}

// ── Socket-compatibility rules (the app's business, passed to gestures) --------

const socketKind = (anchorId: string) => (anchorId.endsWith("/out") ? "out" : "in");
const nodeOfSocket = (anchorId: string) => anchorId.split("/")[0];

/** A wire may connect an output to an input on a different node. */
const canConnect = (fromAnchorId: string, candidate: Anchor) =>
  socketKind(fromAnchorId) !== socketKind(candidate.id) &&
  nodeOfSocket(fromAnchorId) !== nodeOfSocket(candidate.id);

// ── The surface ───────────────────────────────────────────────────────────────

interface SurfaceProps {
  edges: EdgeRef[];
  selectedEdgeId: string | null;
}

const Surface = part<SurfaceProps, { gridDot: Color }>("surface", {

  style: (t) => ({ gridDot: calpha(t.muted, 0.35) }),

  // The surface is the infinite canvas behind everything: it fills whatever
  // room it's offered (the viewport).
  measure: (_p, avail) => avail,
  hit: () => true,

  // Its render is the dot grid. node.view carries the live viewport, so we
  // only draw the dots that are actually visible.
  render(node, painter, style) {
    const viewport = node.view!;
    const GRID_SPACING = 28;

    const worldLeft = Math.floor(-viewport.pan.x / viewport.zoom / GRID_SPACING) * GRID_SPACING;
    const worldRight = (viewport.w - viewport.pan.x) / viewport.zoom;
    const worldTop = Math.floor(-viewport.pan.y / viewport.zoom / GRID_SPACING) * GRID_SPACING;
    const worldBottom = (viewport.h - viewport.pan.y) / viewport.zoom;

    for (let x = worldLeft; x <= worldRight; x += GRID_SPACING) {
      for (let y = worldTop; y <= worldBottom; y += GRID_SPACING) {
        painter.dot(v(x, y), 1, style.gridDot);
      }
    }
  },

  on: [
    // The slice gesture from slice.ts — declines unless Shift is held,
    // so it composes cleanly with Pan below.
    slice((props) => (props as SurfaceProps).edges),

    // Drag empty space to pan; mouse wheel zooms toward the cursor.
    Pan(),

    // Clicking empty space clears the wire selection.
    Press(() => ({ kind: "select", id: null })),

    // Delete cuts the selected wire. Keys on the surface act as the
    // editor-wide fallback (nothing else claimed the key first).
    Keys({
      Delete: (node: GNode<SurfaceProps>) =>
        node.props.selectedEdgeId ? { kind: "disconnect", id: node.props.selectedEdgeId } : null,
      Backspace: (node: GNode<SurfaceProps>) =>
        node.props.selectedEdgeId ? { kind: "disconnect", id: node.props.selectedEdgeId } : null,
    }),
  ],
});

// ── Nodes ─────────────────────────────────────────────────────────────────────

interface NodeProps {
  id: string;
  title: string;
  hue: number;
  pos: Vec;
}

interface NodeStyle {
  fill: Color;
  edge: Color;
  text: Color;
  lift: number;
  socket: Color;
}

const SOCKET_RADIUS = 5.5;
const SOCKET_GRAB_RADIUS = 14;   // how close a press must be to start a wire

const GraphNodePart = part<NodeProps, NodeStyle>("graph-node", {

  size: () => v(150, 56),

  // ANCHORS: publish the world position of both sockets each layout pass.
  // Wires, the magnetic snap, and connect-bursts all read these — geometry
  // between parts flows through the anchor registry, never through globals.
  anchors: (node) => [
    { id: `${node.props.id}/in`, pos: v(node.rect.x, node.rect.center.y), meta: { kind: "in" } },
    { id: `${node.props.id}/out`, pos: v(node.rect.right, node.rect.center.y), meta: { kind: "out" } },
  ],

  style(t, channels): NodeStyle {
    return {
      fill: t.mix(t.surface, t.surfaceHi, 0.4 * channels.hover + 0.6 * channels.drag),
      edge: t.mix(t.muted, t.accent, 0.5 * channels.hover + 0.5 * channels.drag),
      text: t.mix(t.text, t.textBright, channels.hover),
      lift: 3 * channels.drag,
      socket: t.accent,
    };
  },

  render(node, painter, style) {
    const r = node.rect.raise(style.lift);
    painter.box(r, 10, style.fill, style.edge, 1.2);
    painter.box(rect(r.x, r.y, r.w, 6), 3, hsl(node.props.hue, 0.7, 0.55));   // header stripe
    painter.label(node.props.title, v(r.x + 12, r.center.y + 3), style.text, { align: "left", weight: 500 });

    // The sockets, drawn at the same spots the anchors publish.
    painter.dot(v(r.x, r.center.y), SOCKET_RADIUS, style.socket);
    painter.dot(v(r.right, r.center.y), SOCKET_RADIUS, style.socket);
  },

  on: [
    // GESTURE 1 — wire drag. Starts ONLY if the press lands near a socket;
    // otherwise begin() returns null and the node-move gesture (below) runs.
    Gesture<NodeProps, { fromAnchorId: string; cursor: Vec; snap?: Anchor }>({

      begin(node, pointer, query) {
        for (const suffix of ["/out", "/in"]) {
          const anchor = query.anchor(node.props.id + suffix);
          if (anchor && vdist(anchor.pos, pointer) < SOCKET_GRAB_RADIUS) {
            return { fromAnchorId: anchor.id, cursor: pointer };
          }
        }
        return null;   // not near a socket — decline
      },

      // Magnetic snap: ask the query for the nearest COMPATIBLE socket within
      // 26 world pixels. The compatibility predicate is the app's, not the
      // framework's.
      move: (state, _node, pointer, query) => ({
        ...state,
        cursor: pointer,
        snap: query.nearestAnchor(pointer, 26, (candidate) => canConnect(state.fromAnchorId, candidate)),
      }),

      // The live rubber wire — an overlay element re-described every frame.
      view(state, query) {
        const fromAnchor = query.anchor(state.fromAnchorId);
        if (!fromAnchor) return [];
        return [RubberWire("rubber-wire", {
          a: fromAnchor.pos,
          b: state.snap?.pos ?? state.cursor,
          snapped: state.snap !== undefined,
        })];
      },

      up(state, node) {
        if (!state.snap) return;                                  // dropped on nothing
        node.spawn?.(burst(state.snap.pos, SNAP_SPARK));          // one-shot juice
        return { kind: "connect", a: state.fromAnchorId, b: state.snap.id };
      },
    }),

    // GESTURE 2 — node move. `during` dispatches a move intent on every
    // pointer move; the node's position spring is what makes it glide.
    Gesture<NodeProps, { grabOffset: Vec }>({

      begin: (node, pointer) => ({
        grabOffset: v(pointer.x - node.props.pos.x, pointer.y - node.props.pos.y),
      }),

      during: (state, node, pointer) => ({
        kind: "move",
        id: node.props.id,
        pos: v(pointer.x - state.grabOffset.x, pointer.y - state.grabOffset.y),
      }),
    }),
  ],
});

// ── Wires (connectors) ─────────────────────────────────────────────────────────

interface WireProps {
  id: string;
  from: string;   // anchor id
  to: string;     // anchor id
  states?: Record<string, boolean>;
}

// A fixed accent for the one-shot connect spark. A part-defining file may not
// import the `tokens` singleton (npm run check), and a gesture callback has no
// style facet to read; a constant juice color is fine for a transient burst.
const SNAP_SPARK = rgb(64, 186, 255);

const Wire = part<WireProps, { color: Color; selected: number }>("wire", {

  // The gold selection blend is resolved HERE, in style — render just paints it.
  style: (t, channels) => {
    const selected = channels.sel || 0;     // the `sel` state tag, eased 0..1
    return {
      color: selected > 0.02 ? t.mix(t.accent, rgb(255, 200, 80), selected) : t.accent,
      selected,
    };
  },

  // Custom hit test: a wire is "hit" when the pointer is within 8 world px
  // of its curve — not its bounding rect.
  hit(node, pointer) {
    const a = node.anchor?.(node.props.from);
    const b = node.anchor?.(node.props.to);
    return !!a && !!b && wireDist(a, b, pointer) < 8;
  },

  render(node, painter, style) {
    const a = node.anchor?.(node.props.from);
    const b = node.anchor?.(node.props.to);
    if (!a || !b) return;   // an endpoint's node is mid-exit — skip a frame

    // Shadow pass, then the wire itself. Selection blends toward gold and
    // thickens; hover thickens slightly (the affordance for "clickable").
    painter.wire(a, b, calpha(rgb(0, 0, 0), 0.35), 4.5);
    painter.wire(a, b, calpha(style.color, 0.9), 2.2 + 1.6 * style.selected + 0.8 * node.ch.hover);
  },

  on: [
    Press((node: GNode<WireProps>) => ({ kind: "select", id: node.props.id })),
  ],
});

// ── The rubber-wire preview (overlay layer) ─────────────────────────────────────

interface RubberWireProps {
  a: Vec;
  b: Vec;
  snapped: boolean;   // true → green "will connect" look
}

const RubberWire = part<RubberWireProps, { color: Color }>("rubber-wire", {

  style: (t) => ({ color: t.accent }),

  render(node, painter, style) {
    const color = node.props.snapped
      ? rgb(90, 220, 130)                  // green: release to connect
      : calpha(style.color, 0.8);
    painter.wire(node.props.a, node.props.b, color, node.props.snapped ? 2.6 : 2);
    painter.dot(node.props.b, 4, color);
  },
});

// ── View ──────────────────────────────────────────────────────────────────────

/** Mark an element (and its subtree) as screen-layer: untransformed HUD. */
const onScreenLayer = (element: Element): Element => ({ ...element, layer: "screen" });

function view(document: GraphDocument): Element {
  return Surface("root", { edges: document.edges, selectedEdgeId: document.selectedEdgeId }, [

    // World-layer content. Wires first, so nodes draw over them.
    Free("graph", {}, [

      ...document.edges.map((edge) =>
        Wire(edge.id, {
          id: edge.id,
          from: edge.from,
          to: edge.to,
          states: { sel: document.selectedEdgeId === edge.id },
        })),

      ...Object.values(document.nodes).map((graphNode) =>
        GraphNodePart(graphNode.id, {
          id: graphNode.id,
          title: graphNode.title,
          hue: graphNode.hue,
          pos: graphNode.pos,
        })),
    ]),

    // Screen-layer HUD: stays put while the world pans and zooms.
    onScreenLayer(Stack("hud", { pad: 12 }, [
      Label("hint", {
        text: "drag node · drag socket = wire · click wire + Del = cut · Shift-drag = slice · drag/wheel = pan/zoom",
        dim: true, size: 12,
      }),
    ])),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const makeNode = (id: string, title: string, hue: number, x: number, y: number): GraphNode =>
  ({ id, title, hue, pos: v(x, y) });

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    nodes: {
      time: makeNode("time", "Time", 200, 120, 140),
      noise: makeNode("noise", "Noise", 260, 120, 300),
      mix: makeNode("mix", "Mix", 140, 380, 220),
      out: makeNode("out", "Output", 30, 640, 220),
    },
    edges: [
      { id: "edge-1", from: "time/out", to: "mix/in" },
      { id: "edge-2", from: "mix/out", to: "out/in" },
    ],
    selectedEdgeId: null,
  },
  update,
  view,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "slice.ts", code: sliceSource },
]);
