// Example: node editor — the M3 flagship. Proves the editor tier:
//   surface as a part (grid = its render, pan/zoom = its Pan(), keys = Keys()),
//   anchors + connectors (wires are keyed elements: they exit-animate,
//   hit-test by curve distance, select, delete),
//   gestures with state + query + overlay view (wire drag with magnetic snap),
//   and the slice gesture in its own file (slice.ts) — zero framework edits.
//
// Controls: drag node body = move · drag a socket = wire (snaps green) ·
// click wire = select, Del = cut · Shift-drag empty = slice wires ·
// drag empty = pan · wheel = zoom.

import {
  burst, calpha, Color, Free, Gesture, GNode, hsl, Keys, mount, Pan, part,
  Press, rect, rgb, tokens, v, Vec, vdist, wireDist, Element, Anchor, Label,
} from "gratify";
import { slice, EdgeRef } from "./slice";

// ---- state ---------------------------------------------------------------------
interface NodeM { id: string; title: string; hue: number; pos: Vec; }
interface Doc { nodes: Record<string, NodeM>; edges: EdgeRef[]; sel: string | null; }

type Intent =
  | { kind: "move"; id: string; pos: Vec }
  | { kind: "connect"; a: string; b: string }
  | { kind: "disconnect"; id: string }
  | { kind: "select"; id: string | null };

let nextEdge = 100;

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "move":
      return { ...doc, nodes: { ...doc.nodes, [i.id]: { ...doc.nodes[i.id], pos: i.pos } } };
    case "connect": {
      const [from, to] = i.a.endsWith("/out") ? [i.a, i.b] : [i.b, i.a];
      const edges = doc.edges.filter((e) => e.to !== to);          // an input holds one edge
      return { ...doc, edges: [...edges, { id: `e${nextEdge++}`, from, to }] };
    }
    case "disconnect":
      return { ...doc, edges: doc.edges.filter((e) => e.id !== i.id), sel: doc.sel === i.id ? null : doc.sel };
    case "select":
      return { ...doc, sel: i.id };
  }
}

const sockKind = (anchorId: string) => (anchorId.endsWith("/out") ? "out" : "in");
const nodeOfSock = (anchorId: string) => anchorId.split("/")[0];
const compatible = (a: string, b: Anchor) =>
  sockKind(a) !== sockKind(b.id) && nodeOfSock(a) !== nodeOfSock(b.id);

// ---- the surface (grid, pan/zoom, slice, keys, click-away) -----------------------
interface SurfaceProps { edges: EdgeRef[]; sel: string | null; }

const Surface = part<SurfaceProps, { dot: Color }>("surface", {
  style: (t) => ({ dot: calpha(t.muted, 0.35) }),
  hit: () => true,                       // the infinite canvas behind everything
  render(node, p, s) {
    const vp = node.view!;
    const G = 28;
    const x0 = Math.floor(-vp.pan.x / vp.zoom / G) * G, x1 = (vp.w - vp.pan.x) / vp.zoom;
    const y0 = Math.floor(-vp.pan.y / vp.zoom / G) * G, y1 = (vp.h - vp.pan.y) / vp.zoom;
    for (let x = x0; x <= x1; x += G)
      for (let y = y0; y <= y1; y += G) p.dot(v(x, y), 1, s.dot);
  },
  on: [
    slice((props) => (props as SurfaceProps).edges),   // shift-drag: app-side file
    Pan(),                                             // drag empty space; wheel zooms
    Press(() => ({ kind: "select", id: null })),
    Keys({
      Delete: (n: GNode<SurfaceProps>) => (n.props.sel ? { kind: "disconnect", id: n.props.sel } : null),
      Backspace: (n: GNode<SurfaceProps>) => (n.props.sel ? { kind: "disconnect", id: n.props.sel } : null),
    }),
  ],
});

// ---- nodes ----------------------------------------------------------------------
interface NodeProps { id: string; title: string; hue: number; pos: Vec; }

interface NodeStyle { fill: Color; edge: Color; text: Color; lift: number; sock: Color; }

const SOCK_R = 5.5;

const NodeP = part<NodeProps, NodeStyle>("gnode", {
  size: () => v(150, 56),
  anchors: (n) => [
    { id: `${n.props.id}/in`, pos: v(n.rect.x, n.rect.center.y), meta: { kind: "in" } },
    { id: `${n.props.id}/out`, pos: v(n.rect.right, n.rect.center.y), meta: { kind: "out" } },
  ],
  style(t, ch): NodeStyle {
    return {
      fill: t.mix(t.surface, t.surfaceHi, 0.4 * ch.hover + 0.6 * ch.drag),
      edge: t.mix(t.muted, t.accent, 0.5 * ch.hover + 0.5 * ch.drag),
      text: t.mix(t.text, t.textBright, ch.hover),
      lift: 3 * ch.drag,
      sock: t.accent,
    };
  },
  render(node, p, s) {
    const r = node.rect.raise(s.lift);
    p.box(r, 10, s.fill, s.edge, 1.2);
    p.box(rect(r.x, r.y, r.w, 6), 3, hsl(node.props.hue, 0.7, 0.55));
    p.label(node.props.title, v(r.x + 12, r.center.y + 3), s.text, { align: "left", weight: 500 });
    p.dot(v(r.x, r.center.y), SOCK_R, s.sock);
    p.dot(v(r.right, r.center.y), SOCK_R, s.sock);
  },
  on: [
    // wire drag — starts only near a socket; otherwise declines and the node drag runs
    Gesture<NodeProps, { from: string; cur: Vec; snap?: Anchor }>({
      begin(n, p, q) {
        for (const suffix of ["/out", "/in"]) {
          const a = q.anchor(n.props.id + suffix);
          if (a && vdist(a.pos, p) < 14) return { from: a.id, cur: p };
        }
        return null;
      },
      move: (s, _n, p, q) => ({ ...s, cur: p, snap: q.nearestAnchor(p, 26, (a) => compatible(s.from, a)) }),
      view: (s, q) => {
        const a = q.anchor(s.from);
        return a ? [Rubber("rubber", { a: a.pos, b: s.snap?.pos ?? s.cur, ok: !!s.snap })] : [];
      },
      up(s, node) {
        if (!s.snap) return;
        node.spawn?.(burst(s.snap.pos, tokens.accent));
        return { kind: "connect", a: s.from, b: s.snap.id };
      },
    }),
    // node drag — live move intents; layout springs give the glide
    Gesture<NodeProps, { off: Vec }>({
      begin: (n, p) => ({ off: v(p.x - n.props.pos.x, p.y - n.props.pos.y) }),
      during: (s, n, p) => ({ kind: "move", id: n.props.id, pos: v(p.x - s.off.x, p.y - s.off.y) }),
    }),
  ],
});

// ---- wires (connectors: elements whose geometry is anchor references) -------------
interface WireProps { id: string; from: string; to: string; states?: Record<string, boolean>; }

const Wire = part<WireProps, { col: Color; sel: number }>("wire", {
  style: (t, ch) => ({ col: t.accent, sel: ch.sel || 0 }),
  hit(node, p) {
    const a = node.anchor?.(node.props.from), b = node.anchor?.(node.props.to);
    return !!a && !!b && wireDist(a, b, p) < 8;
  },
  render(node, p, s) {
    const a = node.anchor?.(node.props.from), b = node.anchor?.(node.props.to);
    if (!a || !b) return;
    p.wire(a, b, calpha({ r: 0, g: 0, b: 0, a: 1 }, 0.35), 4.5);
    const col = s.sel > 0.02 ? tokens.mix(s.col, rgb(255, 200, 80), s.sel) : s.col;
    p.wire(a, b, calpha(col, 0.9), 2.2 + 1.6 * s.sel + 0.8 * node.ch.hover);
  },
  on: [Press((n: GNode<WireProps>) => ({ kind: "select", id: n.props.id }))],
});

// ---- gesture previews (overlay layer) ---------------------------------------------
const Rubber = part<{ a: Vec; b: Vec; ok: boolean }, { col: Color }>("rubber", {
  style: (t) => ({ col: t.accent }),
  render(node, p, s) {
    const col = node.props.ok ? { r: 90, g: 220, b: 130, a: 1 } : calpha(s.col, 0.8);
    p.wire(node.props.a, node.props.b, col, node.props.ok ? 2.6 : 2);
    p.dot(node.props.b, 4, col);
  },
});

// ---- view ---------------------------------------------------------------------------
const screenEl = (el: Element): Element => ({ ...el, layer: "screen" });

function view(doc: Doc): Element {
  return Surface("root", { edges: doc.edges, sel: doc.sel }, [
    Free("graph", {}, [
      ...doc.edges.map((e) => Wire(e.id, { id: e.id, from: e.from, to: e.to, states: { sel: doc.sel === e.id } })),
      ...Object.values(doc.nodes).map((n) => NodeP(n.id, { id: n.id, title: n.title, hue: n.hue, pos: n.pos })),
    ]),
    screenEl(Label("hint", {
      text: "drag node · drag socket = wire · click wire + Del = cut · Shift-drag = slice · drag/wheel = pan/zoom",
      dim: true, size: 12,
    })),
  ]);
}

// ---- mount ---------------------------------------------------------------------------
const N = (id: string, title: string, hue: number, x: number, y: number): NodeM =>
  ({ id, title, hue, pos: v(x, y) });

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, {
  init: {
    nodes: {
      time: N("time", "Time", 200, 120, 140),
      noise: N("noise", "Noise", 260, 120, 300),
      mix: N("mix", "Mix", 140, 380, 220),
      out: N("out", "Output", 30, 640, 220),
    },
    edges: [
      { id: "e1", from: "time/out", to: "mix/in" },
      { id: "e2", from: "mix/out", to: "out/in" },
    ],
    sel: null,
  },
  update,
  view,
});
