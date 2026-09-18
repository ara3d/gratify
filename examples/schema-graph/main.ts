// ============================================================================
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
// selected removes them and their keys · A r r a n g e (or `l`) runs the
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
        Label("sel", { text: `${doc.selected.size} selected · ${doc.edges.length} foreign keys · ${tables.length} tables`, dim: true, size: 12 }),
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
