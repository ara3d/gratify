import{m as g,y as b,w as f,S as y,L as c,R as w,d as x,v as d}from"./runtime-BaMoeUMO.js";import{w as k}from"./middleware-DnFxgLOc.js";import{B as a}from"./widgets-BJEltdMZ.js";import{S as v,t as l,l as S,a as o,b as E,F as M,T as O,c as p,s as R,n as T,d as D}from"./parts-D8fs8QnV.js";import{D as P,M as _}from"./minimap-4fwdaaVu.js";import{a as I}from"./source-panel-CSqvtNlY.js";import"./effects-sMK-JssO.js";const q=`// ============================================================================
// Example: schema graph — tables as multi-port nodes, foreign keys as wires.
//
// A database browser's relationship diagram, built from the node-editor tier
// plus three reusable pieces: a marquee gesture (shared/marquee.ts), a
// layered auto-layout (shared/graph-layout.ts, pure, tested) and a minimap
// docked to a screen-layer corner (shared/minimap.ts) that reads the live
// viewport every frame.
//
// Try: drag a table · click / shift / ctrl to select, or drag a marquee on
// empty canvas (Alt-drag pans, wheel zooms) · drag a selection: they move
// together · drag from a column port to another table's port to add a
// foreign key (snaps green) · click a wire, Delete cuts it; Delete with tables
// selected removes them and their keys · A r r a n g e (or \`l\`) runs the
// layered layout and every table springs to its new place · ctrl+A · Escape.
// ============================================================================

import { at, Element, Free, Label, mount, Rect, Row, Stack, v, Vec, withUndo, Mods, Layers } from "gratify";
import { Button } from "../shared/widgets";
import { layeredLayout } from "../shared/graph-layout";
import { Dock, Minimap } from "../shared/minimap";
import {
  FkEdge, nextEdgeId, SAMPLE_EDGES, SAMPLE_TABLES, sideOfPort, TableDef, tableOfPort,
} from "../shared/sample-schema";
import { FkWire, Surface, TableNode, tableRect, tableSize } from "./parts";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import partsSource from "./parts.ts?raw";
import marqueeSource from "../shared/marquee.ts?raw";
import layoutSource from "../shared/graph-layout.ts?raw";
import minimapSource from "../shared/minimap.ts?raw";
import schemaSource from "../shared/sample-schema.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface Doc {
  tables: Record<string, TableDef>;
  edges: FkEdge[];
  selected: ReadonlySet<string>;     // table ids
  selectedEdge: string | null;
}

type Intent =
  | { kind: "select"; id: string; mods: Mods }
  | { kind: "marquee"; rect: Rect; mods: Mods }
  | { kind: "drag"; id: string; delta: Vec }
  | { kind: "connect"; a: string; b: string }
  | { kind: "select-edge"; id: string }
  | { kind: "delete" }
  | { kind: "clear" }
  | { kind: "select-all" }
  | { kind: "arrange" }
  | { kind: "reset" };

const withSelection = (doc: Doc, selected: ReadonlySet<string>): Doc => ({ ...doc, selected, selectedEdge: null });

/** Auto-arrange: FK edges point from the referencing table to the referenced
 *  one, so the layered layout puts referenced tables to the right. */
function arranged(doc: Doc): Doc {
  const nodes = Object.values(doc.tables).map((t) => ({ id: t.id, w: tableSize(t.columns.length).x, h: tableSize(t.columns.length).y }));
  const pos = layeredLayout(nodes, doc.edges.map((e) => ({ from: tableOfPort(e.from), to: tableOfPort(e.to) })), { gapX: 90, gapY: 36, origin: v(60, 150) });
  const tables = Object.fromEntries(Object.values(doc.tables).map((t) => [t.id, { ...t, pos: pos.get(t.id) ?? t.pos }]));
  return { ...doc, tables };
}

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "select": {
      const next = new Set(intent.mods.ctrl || intent.mods.shift ? doc.selected : []);
      if (intent.mods.ctrl && next.has(intent.id)) next.delete(intent.id); else next.add(intent.id);
      return withSelection(doc, next);
    }
    case "marquee": {
      const next = new Set(intent.mods.shift ? doc.selected : []);
      for (const t of Object.values(doc.tables)) if (tableRect(t).overlaps(intent.rect)) next.add(t.id);
      return withSelection(doc, next);
    }
    case "drag": {
      const ids = doc.selected.has(intent.id) ? doc.selected : new Set([intent.id]);
      const tables = { ...doc.tables };
      for (const id of ids) tables[id] = { ...tables[id], pos: v(tables[id].pos.x + intent.delta.x, tables[id].pos.y + intent.delta.y) };
      return { ...doc, tables };
    }
    case "connect": {
      const [from, to] = sideOfPort(intent.a) === "out" ? [intent.a, intent.b] : [intent.b, intent.a];
      if (tableOfPort(from) === tableOfPort(to)) return doc;
      // a column references one target: a new key from the same column replaces the old
      const edges = doc.edges.filter((e) => e.from !== from);
      return { ...doc, edges: [...edges, { id: nextEdgeId(), from, to }] };
    }
    case "select-edge": return { ...doc, selectedEdge: intent.id, selected: new Set() };
    case "delete": {
      if (doc.selectedEdge) return { ...doc, edges: doc.edges.filter((e) => e.id !== doc.selectedEdge), selectedEdge: null };
      if (!doc.selected.size) return doc;
      const tables = Object.fromEntries(Object.entries(doc.tables).filter(([id]) => !doc.selected.has(id)));
      const edges = doc.edges.filter((e) => !doc.selected.has(tableOfPort(e.from)) && !doc.selected.has(tableOfPort(e.to)));
      return { ...doc, tables, edges, selected: new Set() };
    }
    case "clear": return withSelection(doc, new Set());
    case "select-all": return withSelection(doc, new Set(Object.keys(doc.tables)));
    case "arrange": return arranged(doc);
    case "reset": return INITIAL;
  }
}

const INITIAL: Doc = arranged({
  tables: Object.fromEntries(SAMPLE_TABLES.map((t) => [t.id, t])),
  edges: SAMPLE_EDGES,
  selected: new Set(),
  selectedEdge: null,
});

// ── View ──────────────────────────────────────────────────────────────────────

const onScreen = (el: Element): Element => ({ ...el, layer: "screen" });

function view(doc: Doc): Element {
  const tables = Object.values(doc.tables);
  return Surface("root", {
    marquee: (rect, mods) => ({ kind: "marquee", rect, mods }),
    clear: { kind: "clear" },
    keys: {
      Delete: () => ({ kind: "delete" }),
      a: (m) => (m.ctrl ? { kind: "select-all" } : undefined),
      l: () => ({ kind: "arrange" }),
    },
  }, [
    Free("graph", {}, [
      ...doc.edges.map((e) => FkWire(e.id, {
        id: e.id, from: e.from, to: e.to,
        select: (id) => ({ kind: "select-edge", id }),
        states: { sel: doc.selectedEdge === e.id, hot: doc.selected.has(tableOfPort(e.from)) || doc.selected.has(tableOfPort(e.to)) },
      })),
      ...tables.map((t) => TableNode(t.id, {
        id: t.id, name: t.name, hue: t.hue, pos: t.pos, columns: t.columns,
        select: (id, mods) => ({ kind: "select", id, mods }),
        drag: (id, delta) => ({ kind: "drag", id, delta }),
        connect: (a, b) => ({ kind: "connect", a, b }),
        states: { sel: doc.selected.has(t.id) },
      })),
    ]),
    onScreen(Layers("hud", {}, [
      Stack("panel", { pad: 12, gap: 8 }, [
        Label("title", { text: "Schema graph", size: 15, weight: 600, bright: true }),
        Row("actions", { gap: 6 }, [
          Button("arrange", { label: "Arrange", accent: true, press: { kind: "arrange" } }),
          Button("delete", { label: "Delete", danger: true, press: { kind: "delete" } }),
          Button("reset", { label: "Reset", press: { kind: "reset" } }),
          Button("undo", { label: "Undo", press: { kind: "undo" } }),
          Button("redo", { label: "Redo", press: { kind: "redo" } }),
        ]),
        Label("sel", { text: \`\${doc.selected.size} selected · \${doc.edges.length} foreign keys · \${tables.length} tables\`, dim: true, size: 12 }),
        Label("hint", { text: "drag tables · marquee on empty · Alt-drag pans · wheel zooms · port → port adds a key · click a wire + Delete · l arranges", dim: true, size: 11 }),
      ]),
      Dock("dock", { corner: "bottom-right" }, [
        at(Minimap("map", { items: tables.map((t) => ({ id: t.id, rect: tableRect(t), hue: t.hue, selected: doc.selected.has(t.id) })) }), v(0, 0)),
      ]),
    ])),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, withUndo<Doc, Intent>({ init: INITIAL, update, view }));

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "parts.ts", code: partsSource },
  { name: "marquee.ts (shared)", code: marqueeSource },
  { name: "graph-layout.ts (shared)", code: layoutSource },
  { name: "minimap.ts (shared)", code: minimapSource },
  { name: "sample-schema.ts (shared)", code: schemaSource },
]);
`,A=`// The parts of the schema graph: a table node with one port per column, the
// foreign-key wire between ports, the rubber wire shown while dragging a new
// key, and the dot-grid surface that hosts marquee, pan, and the editor-wide
// keys. Geometry helpers (\`tableSize\`, \`tableRect\`) are exported so the app's
// pure \`update\` can hit-test the same rects the parts draw. The data types and
// port-id helpers live in shared/sample-schema.ts.

import {
  Anchor, burst, calpha, Color, hsl, Intentish, Mods, Pan, part, Press, Rect, rect, rgb, v, Vec, wireDist,
} from "gratify";
import { marquee } from "../shared/marquee";
import { ColumnDef, portId, sideOfPort, TableDef } from "../shared/sample-schema";

export const NODE_W = 220;
export const HEAD_H = 30;
export const ROW_H = 22;
const PORT_R = 4;
const PORT_GRAB = 11;

export const tableSize = (columnCount: number): Vec => v(NODE_W, HEAD_H + columnCount * ROW_H + 6);
export const tableRect = (t: TableDef): Rect => rect(t.pos.x, t.pos.y, NODE_W, tableSize(t.columns.length).y);

const rowY = (r: Rect, i: number) => r.y + HEAD_H + 3 + i * ROW_H + ROW_H / 2;

// ── Table node ────────────────────────────────────────────────────────────────
export interface TableProps {
  id: string;
  name: string;
  hue: number;
  pos: Vec;
  columns: ColumnDef[];
  select(id: string, mods: Mods): Intentish;
  drag(id: string, delta: Vec): Intentish;
  connect(from: string, to: string): Intentish;
  states?: Record<string, boolean>;
}

const SPARK = rgb(64, 186, 255);

export const TableNode = part("table-node")
  .props<TableProps>()
  .size((p) => tableSize(p.columns.length))
  .anchors((n) => n.props.columns.flatMap((c, i) => [
    { id: portId(n.props.id, c.name, "in"), pos: v(n.rect.x, rowY(n.rect, i)), meta: { table: n.props.id } },
    { id: portId(n.props.id, c.name, "out"), pos: v(n.rect.right, rowY(n.rect, i)), meta: { table: n.props.id } },
  ]))
  .style((t, ch, p) => {
    const sel = Math.min(1, ch.sel || 0);
    return {
      fill: t.mix(t.surface, t.surfaceHi, 0.35 * ch.hover + 0.5 * ch.drag),
      edge: t.mix(t.muted, t.accent, Math.max(sel, 0.5 * ch.hover)),
      edgeW: 1 + 1.2 * sel,
      glow: 14 * sel,
      head: hsl(p.hue, 0.55, 0.42 + 0.08 * ch.hover),
      title: t.textBright,
      name: t.mix(t.text, t.textBright, ch.hover),
      type: t.textDim,
      key: hsl(45, 0.8, 0.6),
      port: t.mix(t.muted, t.accent, 0.4 + 0.6 * ch.hover),
      rule: calpha(t.muted, 0.35),
      lift: 3 * ch.drag,
    };
  })
  .render((n, p, s) => {
    const r = n.rect.raise(s.lift), props = n.props;
    p.glow(calpha(s.edge, 0.9), s.glow, () => p.box(r, 8, s.fill, s.edge, s.edgeW));
    p.box(rect(r.x, r.y, r.w, HEAD_H), 8, s.head);
    p.box(rect(r.x, r.y + HEAD_H - 8, r.w, 8), 0, s.head);        // square the header's bottom corners
    p.label(props.name, v(r.x + 12, r.y + HEAD_H / 2), s.title, { align: "left", weight: 600, size: 13 });
    p.label(\`\${props.columns.length} cols\`, v(r.right - 10, r.y + HEAD_H / 2), calpha(s.title, 0.7), { align: "right", size: 10 });
    props.columns.forEach((c, i) => {
      const y = rowY(r, i);
      if (i > 0) p.line(v(r.x + 8, y - ROW_H / 2), v(r.right - 8, y - ROW_H / 2), s.rule, 1);
      if (c.pk) p.label("⚿", v(r.x + 16, y), s.key, { size: 11 });
      p.label(c.name, v(r.x + (c.pk ? 28 : 16), y), s.name, { align: "left", size: 12 });
      p.label(c.type, v(r.right - 14, y), s.type, { align: "right", size: 10, mono: true });
      p.dot(v(r.x, y), PORT_R, s.port);
      p.dot(v(r.right, y), PORT_R, s.port);
    });
  })
  // 1. wire drag — begins only on a port of THIS node; the magnetic snap looks
  //    for a port on a different table
  .gesture<{ from: string; cursor: Vec; snap?: Anchor }>({
    begin(n, p, q) {
      const port = q.nearestAnchor(p, PORT_GRAB, (a) => a.key === n.key);
      return port ? { from: port.id, cursor: p } : null;
    },
    move: (s, n, p, q) => ({
      ...s, cursor: p,
      snap: q.nearestAnchor(p, 22, (a) => a.key !== n.key && sideOfPort(a.id) !== sideOfPort(s.from)),
    }),
    view: (s, q) => {
      const a = q.anchor(s.from);
      return a ? [RubberWire("rubber", { a: a.pos, b: s.snap?.pos ?? s.cursor, snapped: !!s.snap })] : [];
    },
    up(s, n) {
      if (!s.snap) return;
      n.spawn?.(burst(s.snap.pos, SPARK));
      return n.props.connect(s.from, s.snap.id);
    },
  })
  // 2. move — relative deltas, so a multi-selection drags together
  .gesture<{ last: Vec; delta: Vec }>({
    begin: (_n, p) => ({ last: p, delta: v(0, 0) }),
    move: (s, _n, p) => ({ last: p, delta: v(p.x - s.last.x, p.y - s.last.y) }),
    during: (s, n) => (s.delta.x || s.delta.y ? n.props.drag(n.props.id, s.delta) : undefined),
  })
  .press((n, mods) => n.props.select(n.props.id, mods))
  .semantics((n) => ({ role: "group", label: n.props.name }));

// ── Foreign-key wire ──────────────────────────────────────────────────────────
export interface WireProps { id: string; from: string; to: string; select(id: string): Intentish; states?: Record<string, boolean> }

export const FkWire = part("fk-wire")
  .props<WireProps>()
  .style((t, ch) => {
    const sel = Math.min(1, ch.sel || 0), hot = Math.min(1, ch.hot || 0);
    return {
      color: t.mix(t.mix(calpha(t.textDim, 0.7), t.accent, hot), rgb(255, 200, 80), sel),
      width: 1.6 + 1.2 * Math.max(sel, hot) + 0.8 * ch.hover,
      shadow: calpha(rgb(0, 0, 0), 0.35),
    };
  })
  .hit((n, p) => {
    const a = n.anchor?.(n.props.from), b = n.anchor?.(n.props.to);
    return !!a && !!b && wireDist(a, b, p) < 8;
  })
  .render((n, p, s) => {
    const a = n.anchor?.(n.props.from), b = n.anchor?.(n.props.to);
    if (!a || !b) return;
    p.wire(a, b, s.shadow, s.width + 2.5);
    p.wire(a, b, s.color, s.width);
    p.dot(b, 3, s.color);
  })
  .on(Press((n) => n.props.select(n.props.id)));

// ── Rubber wire (gesture preview) ─────────────────────────────────────────────
const RubberWire = part("rubber-wire")
  .props<{ a: Vec; b: Vec; snapped: boolean }>()
  .style((t, _ch, p) => ({ color: p.snapped ? rgb(90, 220, 130) : calpha(t.accent, 0.8), w: p.snapped ? 2.6 : 2 }))
  .render((n, p, s) => { p.wire(n.props.a, n.props.b, s.color, s.w); p.dot(n.props.b, 4, s.color); });

// ── Surface ───────────────────────────────────────────────────────────────────
export interface SurfaceProps {
  marquee(r: Rect, mods: Mods): Intentish;
  clear: Intentish;
  keys: Record<string, (mods: Mods) => Intentish>;
  /** Draw the dot grid inside the part's own rect only (a pane), instead of
   *  across the whole visible world (an infinite canvas). */
  bounded?: boolean;
}

/** Everything a graph host shares: the dot grid, marquee, click-away, keys. */
const surfaceBase = (name: string) => part(name)
  .props<SurfaceProps>()
  .fill()
  .hit(() => true)
  .style((t) => ({ dot: calpha(t.muted, 0.35) as Color }))
  .render((n, p, s) => {
    const vw = n.view!, step = 28;
    // the visible world, intersected with our own rect when bounded
    let x0 = -vw.pan.x / vw.zoom, x1 = (vw.w - vw.pan.x) / vw.zoom;
    let y0 = -vw.pan.y / vw.zoom, y1 = (vw.h - vw.pan.y) / vw.zoom;
    if (n.props.bounded) { x0 = Math.max(x0, n.rect.x); x1 = Math.min(x1, n.rect.right); y0 = Math.max(y0, n.rect.y); y1 = Math.min(y1, n.rect.bottom); }
    x0 = Math.ceil(x0 / step) * step; y0 = Math.ceil(y0 / step) * step;
    for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) p.dot(v(x, y), 1, s.dot);
  })
  .on(marquee<SurfaceProps>({ select: (r, mods, host) => host.props.marquee(r, mods) }))
  .press((n) => n.props.clear)
  .keys({
    Delete: (n, m) => n.props.keys.Delete?.(m),
    Backspace: (n, m) => n.props.keys.Delete?.(m),
    Escape: (n) => n.props.clear,
    a: (n, m) => n.props.keys.a?.(m),
    l: (n, m) => n.props.keys.l?.(m),
  });

/** The infinite canvas: Alt-drag pans, wheel zooms (the runtime's one viewport). */
export const Surface = surfaceBase("schema-surface").on(Pan());

/** A graph inside a pane: clipped to its rect, no pan/zoom. A per-pane
 *  viewport (a camera facet) is the extension point that would let a pane
 *  pan without moving the rest of the workbench. */
export const GraphPane = surfaceBase("graph-pane").clip();
`,z=`// marquee.ts — rubber-band selection as ONE reusable gesture, zero framework
// edits (the same shape as node-editor/slice.ts). Drag on the surface: a
// translucent rectangle previews the selection as an ordinary overlay
// element; on release the world-space rect and the modifier keys leave as the
// intent the host asked for. The host decides what "inside the rect" means.
//
// It declines while Alt is held, so a Pan() listed after it still pans.

import { calpha, Gesture, GNode, Interactor, Intentish, Mods, part, Rect, rect, Vec } from "gratify";

const MarqueeBox = part("marquee-box")
  .props<{ a: Vec; b: Vec }>()
  .style((t) => ({ fill: calpha(t.accent, 0.12), edge: calpha(t.accent, 0.8) }))
  .render((n, p, s) => p.box(rectOf(n.props.a, n.props.b), 2, s.fill, s.edge, 1));

/** The normalized rect between two corners. */
export const rectOf = (a: Vec, b: Vec): Rect =>
  rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));

export interface MarqueeOpts<P> {
  /** What a completed drag emits. \`r\` is relative to the host's rect origin —
   *  the host's content coordinates, whether it is the whole canvas or a pane;
   *  \`host\` is the surface node, so the intent can come from its props. */
  select(r: Rect, mods: Mods, host: GNode<P>): Intentish;
  /** Drags shorter than this (px) are clicks, not marquees. Default 4. */
  threshold?: number;
}

export function marquee<P = unknown>(opts: MarqueeOpts<P>): Interactor<P> {
  const threshold = opts.threshold ?? 4;
  const long = (s: { a: Vec; b: Vec }) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) >= threshold;
  return Gesture<P, { a: Vec; b: Vec; mods: Mods }>({
    begin: (_n, p, q) => (q.mods.alt ? null : { a: p, b: p, mods: { ...q.mods } }),
    move: (s, _n, p, q) => ({ ...s, b: p, mods: { ...q.mods } }),
    view: (s) => (long(s) ? [MarqueeBox("marquee", { a: s.a, b: s.b })] : []),
    up: (s, n) => {
      if (!long(s)) return;
      const r = rectOf(s.a, s.b);
      return opts.select(rect(r.x - n.rect.x, r.y - n.rect.y, r.w, r.h), s.mods, n);
    },
  });
}
`,L=`// Pure layered graph layout ("arrange"): assign each node a column by the
// longest path from a source along its edges (cycles broken by discovery
// order), order each column by the mean position of the neighbors in the
// previous one (one barycenter sweep), then place columns left to right and
// nodes top to bottom with gaps. O(V + E) layering, O(V log V) ordering. No
// framework imports — kernel-tested on its own.

import type { Vec } from "gratify";

export interface LayoutNode { id: string; w: number; h: number }
export interface LayoutEdge { from: string; to: string }
export interface LayoutOpts { gapX?: number; gapY?: number; origin?: Vec }

/** Column index per node: longest path from any source (0 for sources).
 *  Edges that would close a cycle are ignored, so the result is always a DAG
 *  layering. Isolated nodes sit in column 0. */
export function layerOf(nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id));
  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of ids) { out.set(id, []); indeg.set(id, 0); }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) continue;
    out.get(e.from)!.push(e.to);
    indeg.set(e.to, indeg.get(e.to)! + 1);
  }
  const layer = new Map<string, number>();
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  for (const id of queue) layer.set(id, 0);
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    for (const to of out.get(id)!) {
      layer.set(to, Math.max(layer.get(to) ?? 0, layer.get(id)! + 1));
      indeg.set(to, indeg.get(to)! - 1);
      if (indeg.get(to) === 0) queue.push(to);
    }
  }
  // nodes still unvisited sit on cycles: break by giving them the layer after
  // their best-known predecessor, in input order
  for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, 0);
  return layer;
}

/** Positions (top-left) for every node in a layered arrangement. */
export function layeredLayout(
  nodes: readonly LayoutNode[], edges: readonly LayoutEdge[], opts: LayoutOpts = {},
): Map<string, Vec> {
  const gapX = opts.gapX ?? 80, gapY = opts.gapY ?? 40;
  const origin = opts.origin ?? { x: 0, y: 0 };
  const layer = layerOf(nodes, edges);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const columns: string[][] = [];
  for (const n of nodes) (columns[layer.get(n.id)!] ??= []).push(n.id);

  // one barycenter sweep: order a column by the mean row of its predecessors
  const rowOf = new Map<string, number>();
  const preds = new Map<string, string[]>();
  for (const e of edges) if (byId.has(e.from) && byId.has(e.to)) (preds.get(e.to) ?? preds.set(e.to, []).get(e.to)!).push(e.from);
  columns.forEach((col, ci) => {
    if (ci > 0) {
      const key = (id: string) => {
        const ps = (preds.get(id) ?? []).filter((p) => rowOf.has(p));
        return ps.length ? ps.reduce((a, p) => a + rowOf.get(p)!, 0) / ps.length : Number.MAX_SAFE_INTEGER;
      };
      col.sort((a, b) => key(a) - key(b) || a.localeCompare(b));
    }
    col.forEach((id, i) => rowOf.set(id, i));
  });

  const pos = new Map<string, Vec>();
  let x = origin.x;
  for (const col of columns) {
    if (!col) continue;
    let y = origin.y;
    let colW = 0;
    for (const id of col) {
      const n = byId.get(id)!;
      pos.set(id, { x, y });
      y += n.h + gapY;
      colW = Math.max(colW, n.w);
    }
    x += colW + gapX;
  }
  return pos;
}

/** The union of rects placed at \`pos\` — the graph's world extent. */
export function boundsOf(nodes: readonly LayoutNode[], pos: (id: string) => Vec | undefined):
  { x: number; y: number; w: number; h: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) {
    const p = pos(n.id);
    if (!p) continue;
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + n.w); y1 = Math.max(y1, p.y + n.h);
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
`,F=`// Minimap — a screen-layer overview of a world-space graph: every node as a
// small box, the current viewport as a frame, kept in sync every frame from
// \`node.view\` (the runtime's live pan/zoom) — no state, no wiring. Plus Dock,
// a screen-layer container that pins its child to a corner of the viewport.
//
// Navigation by clicking the map is an extension point: the viewport is
// runtime-owned, so it would need a "pan to" intent surface first.

import { calpha, Color, hsl, part, rect, Rect, v, Vec } from "gratify";

export interface MinimapItem { id: string; rect: Rect; hue?: number; selected?: boolean }

export interface MinimapProps {
  items: MinimapItem[];
  width?: number;
  height?: number;
}

/** Map a world rect onto the map's inner box with uniform scale, centered. */
export function mapTransform(world: Rect, box: Rect): { scale: number; ox: number; oy: number } {
  const scale = Math.min(box.w / Math.max(1, world.w), box.h / Math.max(1, world.h));
  return {
    scale,
    ox: box.x + (box.w - world.w * scale) / 2 - world.x * scale,
    oy: box.y + (box.h - world.h * scale) / 2 - world.y * scale,
  };
}

const unionWith = (a: Rect | null, b: Rect): Rect => {
  if (!a) return b;
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return rect(x, y, Math.max(a.right, b.right) - x, Math.max(a.bottom, b.bottom) - y);
};

export const Minimap = part("minimap")
  .props<MinimapProps>()
  .defaults({ width: 180, height: 120 })
  .size((p) => v(p.width, p.height))
  .style((t, ch) => ({
    fill: calpha(t.bg, 0.8 + 0.15 * ch.hover),
    edge: t.mix(t.muted, t.accent, 0.4 * ch.hover),
    node: t.muted,
    view: calpha(t.accent, 0.9),
    viewFill: calpha(t.accent, 0.08),
  }))
  .render((n, p, s) => {
    const r = n.rect, view = n.view;
    p.box(r, 8, s.fill, s.edge, 1);
    if (!view) return;
    // the world extent the map shows: every node plus the viewport itself
    const vp = rect(-view.pan.x / view.zoom, -view.pan.y / view.zoom, view.w / view.zoom, view.h / view.zoom);
    const world = n.props.items.reduce<Rect | null>((acc, it) => unionWith(acc, it.rect), vp)!;
    const m = mapTransform(world, r.inset(8));
    const px = (q: Vec) => v(m.ox + q.x * m.scale, m.oy + q.y * m.scale);
    for (const it of n.props.items) {
      const a = px(v(it.rect.x, it.rect.y));
      const color: Color = it.hue === undefined ? s.node : hsl(it.hue, 0.6, it.selected ? 0.7 : 0.5);
      p.box(rect(a.x, a.y, Math.max(2, it.rect.w * m.scale), Math.max(2, it.rect.h * m.scale)), 1, color);
    }
    const a = px(v(vp.x, vp.y));
    p.box(rect(a.x, a.y, vp.w * m.scale, vp.h * m.scale), 2, s.viewFill, s.view, 1);
  })
  .semantics((n) => ({ role: "img", label: \`minimap of \${n.props.items.length} nodes\` }));

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom";

/** Fills the viewport (screen layer) and pins its one child to a corner, or
 *  centered along the top or bottom edge. */
export const Dock = part("dock")
  .props<{ corner?: Corner; margin?: number }>()
  .defaults({ corner: "bottom-right" as Corner, margin: 12 })
  .fill()
  .arrange((p, r, kids) => kids.map((k) => {
    const x = p.corner.endsWith("right") ? r.right - p.margin - k.size.x
      : p.corner.endsWith("left") ? r.x + p.margin
      : r.x + (r.w - k.size.x) / 2;
    const y = p.corner.startsWith("bottom") ? r.bottom - p.margin - k.size.y : r.y + p.margin;
    return rect(x, y, k.size.x, k.size.y);
  }));
`,V=`// A small sample database for the browser examples: nine tables with typed
// columns and foreign keys, a deterministic row generator per table, and the
// schema as a tree. Pure data — the graph parts, the grid and the tree all
// consume it, none of them own it.

import type { Vec } from "gratify";
import type { TreeNode } from "./tree-math";

export interface ColumnDef { name: string; type: string; pk?: boolean }
export interface TableDef { id: string; name: string; hue: number; pos: Vec; columns: ColumnDef[] }
/** A foreign key: \`from\` is a \`/out\` port on the referencing column, \`to\` an
 *  \`/in\` port on the referenced column. */
export interface FkEdge { id: string; from: string; to: string }

export const portId = (table: string, column: string, side: "in" | "out") => \`\${table}:\${column}/\${side}\`;
export const tableOfPort = (id: string) => id.slice(0, id.indexOf(":"));
export const columnOfPort = (id: string) => id.slice(id.indexOf(":") + 1, id.lastIndexOf("/"));
export const sideOfPort = (id: string): "in" | "out" => (id.endsWith("/out") ? "out" : "in");

const T = (id: string, hue: number, columns: [string, string, boolean?][]): TableDef => ({
  id, name: id, hue, pos: { x: 0, y: 0 },
  columns: columns.map(([name, type, pk]) => ({ name, type, pk })),
});
let nextEdge = 1;
const FK = (fromTable: string, fromCol: string, toTable: string, toCol = "id"): FkEdge =>
  ({ id: \`fk-\${nextEdge++}\`, from: portId(fromTable, fromCol, "out"), to: portId(toTable, toCol, "in") });

export const SAMPLE_TABLES: TableDef[] = [
  T("customers", 200, [["id", "bigint", true], ["name", "text"], ["email", "text"], ["address_id", "bigint"]]),
  T("addresses", 230, [["id", "bigint", true], ["street", "text"], ["city", "text"], ["country", "char(2)"]]),
  T("orders", 150, [["id", "bigint", true], ["customer_id", "bigint"], ["placed", "timestamp"], ["status", "text"], ["ship_to", "bigint"]]),
  T("order_lines", 120, [["id", "bigint", true], ["order_id", "bigint"], ["product_id", "bigint"], ["qty", "int"], ["price", "numeric"]]),
  T("products", 30, [["id", "bigint", true], ["sku", "text"], ["name", "text"], ["category_id", "bigint"], ["supplier_id", "bigint"]]),
  T("categories", 60, [["id", "bigint", true], ["name", "text"], ["parent_id", "bigint"]]),
  T("suppliers", 300, [["id", "bigint", true], ["name", "text"], ["country", "char(2)"]]),
  T("shipments", 270, [["id", "bigint", true], ["order_id", "bigint"], ["carrier", "text"], ["shipped", "timestamp"]]),
  T("payments", 0, [["id", "bigint", true], ["order_id", "bigint"], ["amount", "numeric"], ["method", "text"]]),
];

export const SAMPLE_EDGES: FkEdge[] = [
  FK("customers", "address_id", "addresses"),
  FK("orders", "customer_id", "customers"),
  FK("orders", "ship_to", "addresses"),
  FK("order_lines", "order_id", "orders"),
  FK("order_lines", "product_id", "products"),
  FK("products", "category_id", "categories"),
  FK("products", "supplier_id", "suppliers"),
  FK("categories", "parent_id", "categories"),
  FK("shipments", "order_id", "orders"),
  FK("payments", "order_id", "orders"),
];

/** Fresh ids for keys created at runtime, disjoint from the sample's. */
export const nextEdgeId = () => \`fk-\${100 + nextEdge++}\`;

// ── Rows ──────────────────────────────────────────────────────────────────────

/** A row of a sample table: one cell per column, already formatted. */
export type SampleRow = Record<string, string | number>;

const WORDS = ["alder", "birch", "cedar", "delta", "ember", "fjord", "grove", "harbor", "indigo", "juniper", "kestrel", "lumen", "meadow", "nimbus", "orchid"];
const STATUS = ["open", "paid", "shipped", "returned"];
const COUNTRIES = ["CA", "DE", "JP", "PT", "US", "KE", "AU", "PL", "FR", "BR"];

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function cellFor(col: ColumnDef, i: number, r: () => number): string | number {
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  if (col.pk) return 1000 + i;
  if (col.name === "status") return pick(STATUS);
  if (col.name === "country") return pick(COUNTRIES);
  switch (col.type) {
    case "bigint": return 1000 + Math.floor(r() * 2000);
    case "int": return 1 + Math.floor(r() * 40);
    case "numeric": return Math.round(r() * 90000) / 100;
    case "timestamp": return new Date(2025, 0, 1 + Math.floor(r() * 365)).toISOString().slice(0, 10);
    case "char(2)": return pick(COUNTRIES);
    default: return \`\${pick(WORDS)} \${pick(WORDS)}\`;
  }
}

const rowCache = new Map<string, SampleRow[]>();

/** The rows of a table, generated once per table (deterministic per id). */
export function sampleRows(table: TableDef, count = 2000): SampleRow[] {
  const hit = rowCache.get(table.id);
  if (hit) return hit;
  const r = rng(table.id.length * 7919 + 13);
  const rows = Array.from({ length: count }, (_, i) =>
    Object.fromEntries(table.columns.map((c) => [c.name, cellFor(c, i, r)])));
  rowCache.set(table.id, rows);
  return rows;
}

// ── The schema as a tree ─────────────────────────────────────────────────────

/** database → tables → columns, with FK-referencing columns marked "key". */
export function schemaTree(tables: readonly TableDef[], edges: readonly FkEdge[], db = "shop"): TreeNode<TableDef | ColumnDef>[] {
  const fkColumns = new Set(edges.map((e) => \`\${tableOfPort(e.from)}.\${columnOfPort(e.from)}\`));
  return [{
    id: db, label: db, kind: "db", note: \`\${tables.length} tables\`,
    children: tables.map((t) => ({
      id: t.id, label: t.name, kind: "table", note: \`\${t.columns.length} cols\`, data: t,
      children: t.columns.map((c) => ({
        id: \`\${t.id}.\${c.name}\`, label: c.name, note: c.type, data: c,
        kind: c.pk || fkColumns.has(\`\${t.id}.\${c.name}\`) ? "key" : "column",
      })),
    })),
  }];
}
`,i=(e,r)=>({...e,selected:r,selectedEdge:null});function m(e){const r=Object.values(e.tables).map(t=>({id:t.id,w:l(t.columns.length).x,h:l(t.columns.length).y})),n=S(r,e.edges.map(t=>({from:o(t.from),to:o(t.to)})),{gapX:90,gapY:36,origin:d(60,150)}),s=Object.fromEntries(Object.values(e.tables).map(t=>[t.id,{...t,pos:n.get(t.id)??t.pos}]));return{...e,tables:s}}function W(e,r){switch(r.kind){case"select":{const n=new Set(r.mods.ctrl||r.mods.shift?e.selected:[]);return r.mods.ctrl&&n.has(r.id)?n.delete(r.id):n.add(r.id),i(e,n)}case"marquee":{const n=new Set(r.mods.shift?e.selected:[]);for(const s of Object.values(e.tables))p(s).overlaps(r.rect)&&n.add(s.id);return i(e,n)}case"drag":{const n=e.selected.has(r.id)?e.selected:new Set([r.id]),s={...e.tables};for(const t of n)s[t]={...s[t],pos:d(s[t].pos.x+r.delta.x,s[t].pos.y+r.delta.y)};return{...e,tables:s}}case"connect":{const[n,s]=R(r.a)==="out"?[r.a,r.b]:[r.b,r.a];if(o(n)===o(s))return e;const t=e.edges.filter(u=>u.from!==n);return{...e,edges:[...t,{id:T(),from:n,to:s}]}}case"select-edge":return{...e,selectedEdge:r.id,selected:new Set};case"delete":{if(e.selectedEdge)return{...e,edges:e.edges.filter(t=>t.id!==e.selectedEdge),selectedEdge:null};if(!e.selected.size)return e;const n=Object.fromEntries(Object.entries(e.tables).filter(([t])=>!e.selected.has(t))),s=e.edges.filter(t=>!e.selected.has(o(t.from))&&!e.selected.has(o(t.to)));return{...e,tables:n,edges:s,selected:new Set}}case"clear":return i(e,new Set);case"select-all":return i(e,new Set(Object.keys(e.tables)));case"arrange":return m(e);case"reset":return h}}const h=m({tables:Object.fromEntries(v.map(e=>[e.id,e])),edges:D,selected:new Set,selectedEdge:null}),C=e=>({...e,layer:"screen"});function N(e){const r=Object.values(e.tables);return E("root",{marquee:(n,s)=>({kind:"marquee",rect:n,mods:s}),clear:{kind:"clear"},keys:{Delete:()=>({kind:"delete"}),a:n=>n.ctrl?{kind:"select-all"}:void 0,l:()=>({kind:"arrange"})}},[b("graph",{},[...e.edges.map(n=>M(n.id,{id:n.id,from:n.from,to:n.to,select:s=>({kind:"select-edge",id:s}),states:{sel:e.selectedEdge===n.id,hot:e.selected.has(o(n.from))||e.selected.has(o(n.to))}})),...r.map(n=>O(n.id,{id:n.id,name:n.name,hue:n.hue,pos:n.pos,columns:n.columns,select:(s,t)=>({kind:"select",id:s,mods:t}),drag:(s,t)=>({kind:"drag",id:s,delta:t}),connect:(s,t)=>({kind:"connect",a:s,b:t}),states:{sel:e.selected.has(n.id)}}))]),C(f("hud",{},[y("panel",{pad:12,gap:8},[c("title",{text:"Schema graph",size:15,weight:600,bright:!0}),w("actions",{gap:6},[a("arrange",{label:"Arrange",accent:!0,press:{kind:"arrange"}}),a("delete",{label:"Delete",danger:!0,press:{kind:"delete"}}),a("reset",{label:"Reset",press:{kind:"reset"}}),a("undo",{label:"Undo",press:{kind:"undo"}}),a("redo",{label:"Redo",press:{kind:"redo"}})]),c("sel",{text:`${e.selected.size} selected · ${e.edges.length} foreign keys · ${r.length} tables`,dim:!0,size:12}),c("hint",{text:"drag tables · marquee on empty · Alt-drag pans · wheel zooms · port → port adds a key · click a wire + Delete · l arranges",dim:!0,size:11})]),P("dock",{corner:"bottom-right"},[x(_("map",{items:r.map(n=>({id:n.id,rect:p(n),hue:n.hue,selected:e.selected.has(n.id)}))}),d(0,0))])]))])}const B=document.getElementById("c");g(B,k({init:h,update:W,view:N}));I([{name:"main.ts",code:q},{name:"parts.ts",code:A},{name:"marquee.ts (shared)",code:z},{name:"graph-layout.ts (shared)",code:L},{name:"minimap.ts (shared)",code:F},{name:"sample-schema.ts (shared)",code:V}]);
