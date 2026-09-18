// ============================================================================
// Example: workbench — the database browser, assembled.
//
// A schema tree on the left, the selected table's rows in a grid, and the
// relationship graph below, in draggable split panes with a status line —
// every piece a component from the other samples, composed with nothing but
// props and intents:
//
//   Split ─┬─ TreeView   (shared/tree.ts)      schema → tables → columns
//          └─ Split ─┬─ DataGrid  (shared/grid.ts)      2,000 rows per table
//                    └─ GraphPane (schema-graph/parts)  tables + foreign keys
//
// Selection is ONE fact in the Doc: pick a table in the tree, the grid shows
// its rows and the graph lights it; click a table node, the tree follows.
// Each pane keeps its own scroll (instance-local), so undo/redo of a
// selection or a layout never scrolls anything.
//
// Extension point: the graph pane is clipped but not pannable — Gratify has
// one viewport, so panning inside a pane would move the whole workbench. A
// per-pane camera facet is the next framework step for this app.
// ============================================================================

import { Element, Flow, Free, grow, Label, Mods, mount, Rect, Row, Stack, v, Vec, withUndo } from "gratify";
import { Button } from "../shared/widgets";
import { DataGrid, Column } from "../shared/grid";
import { clickSelect, EMPTY_SELECTION, nextSort, Selection, selectAll, sortedOrder, SortSpec } from "../shared/grid-math";
import { TreeView } from "../shared/tree";
import { flatten, toggleExpanded } from "../shared/tree-math";
import { Split } from "../shared/split";
import { layeredLayout } from "../shared/graph-layout";
import {
  ColumnDef, FkEdge, nextEdgeId, SAMPLE_EDGES, SAMPLE_TABLES, SampleRow, sampleRows, schemaTree, sideOfPort,
  TableDef, tableOfPort,
} from "../shared/sample-schema";
import { FkWire, GraphPane, TableNode, tableRect, tableSize } from "../schema-graph/parts";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface GridState { sort: SortSpec | null; order: number[]; selection: Selection; cursor: number | null; widths: Record<string, number> }

interface Doc {
  tables: Record<string, TableDef>;
  edges: FkEdge[];
  expanded: ReadonlySet<string>;
  /** The table whose rows the grid shows and whose node the graph lights. */
  table: string | null;
  /** The graph's multi-selection (marquee, ctrl/shift); includes `table`. */
  graphSel: ReadonlySet<string>;
  selectedEdge: string | null;
  grid: GridState;
  splitX: number;
  splitY: number;
}

type Intent =
  | { kind: "tree-toggle"; id: string }
  | { kind: "tree-select"; id: string }
  | { kind: "tree-cursor"; by: number }
  | { kind: "graph-select"; id: string; mods: Mods }
  | { kind: "marquee"; rect: Rect; mods: Mods }
  | { kind: "drag"; id: string; delta: Vec }
  | { kind: "connect"; a: string; b: string }
  | { kind: "select-edge"; id: string }
  | { kind: "delete" }
  | { kind: "clear" }
  | { kind: "arrange" }
  | { kind: "grid-sort"; key: string }
  | { kind: "grid-click"; index: number; shift: boolean; ctrl: boolean }
  | { kind: "grid-cursor"; by: number }
  | { kind: "grid-resize"; key: string; width: number }
  | { kind: "grid-all" }
  | { kind: "split"; axis: "x" | "y"; at: number };

const TREE = schemaTree(SAMPLE_TABLES, SAMPLE_EDGES);

const freshGrid = (table: TableDef | null, sort: SortSpec | null = null): GridState => {
  const rows = table ? sampleRows(table) : [];
  const order = sortedOrder(rows.length, sort && ((i) => rows[i][sort.key]), sort?.dir);
  return { sort, order, selection: EMPTY_SELECTION, cursor: null, widths: {} };
};

/** Choose a table: the tree selection, the grid contents and the graph light
 *  all follow from this one fact. A column id selects its table. */
function chooseTable(doc: Doc, id: string | null): Doc {
  const tableId = id && id.includes(".") ? id.slice(0, id.indexOf(".")) : id;
  const table = tableId && doc.tables[tableId] ? tableId : null;
  if (table === doc.table) return { ...doc, graphSel: table ? new Set([table]) : new Set(), selectedEdge: null };
  return { ...doc, table, graphSel: table ? new Set([table]) : new Set(), selectedEdge: null, grid: freshGrid(table ? doc.tables[table] : null) };
}

function arranged(doc: Doc): Doc {
  const nodes = Object.values(doc.tables).map((t) => ({ id: t.id, w: tableSize(t.columns.length).x, h: tableSize(t.columns.length).y }));
  const pos = layeredLayout(nodes, doc.edges.map((e) => ({ from: tableOfPort(e.from), to: tableOfPort(e.to) })), { gapX: 60, gapY: 24, origin: v(20, 20) });
  return { ...doc, tables: Object.fromEntries(Object.values(doc.tables).map((t) => [t.id, { ...t, pos: pos.get(t.id) ?? t.pos }])) };
}

const rowKeyAt = (doc: Doc) => {
  const rows = doc.table ? sampleRows(doc.tables[doc.table]) : [];
  return (i: number) => String(rows[doc.grid.order[i]].id);
};

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "tree-toggle": return { ...doc, expanded: toggleExpanded(doc.expanded, intent.id) };
    case "tree-select": return chooseTable(doc, intent.id);
    case "tree-cursor": {
      const rows = flatten(TREE, doc.expanded);
      const cur = doc.table === null ? -1 : rows.findIndex((r) => r.node.id === doc.table);
      const next = Math.max(0, Math.min(rows.length - 1, (cur < 0 ? (intent.by > 0 ? -1 : rows.length) : cur) + intent.by));
      return rows.length ? chooseTable(doc, rows[next].node.id) : doc;
    }
    case "graph-select": {
      if (!intent.mods.ctrl && !intent.mods.shift) return chooseTable(doc, intent.id);
      const graphSel = new Set(doc.graphSel);
      if (intent.mods.ctrl && graphSel.has(intent.id)) graphSel.delete(intent.id); else graphSel.add(intent.id);
      return { ...doc, graphSel, selectedEdge: null };
    }
    case "marquee": {
      const graphSel = new Set(intent.mods.shift ? doc.graphSel : []);
      for (const t of Object.values(doc.tables)) if (tableRect(t).overlaps(intent.rect)) graphSel.add(t.id);
      return { ...doc, graphSel, selectedEdge: null };
    }
    case "drag": {
      const ids = doc.graphSel.has(intent.id) ? doc.graphSel : new Set([intent.id]);
      const tables = { ...doc.tables };
      for (const id of ids) tables[id] = { ...tables[id], pos: v(tables[id].pos.x + intent.delta.x, tables[id].pos.y + intent.delta.y) };
      return { ...doc, tables };
    }
    case "connect": {
      const [from, to] = sideOfPort(intent.a) === "out" ? [intent.a, intent.b] : [intent.b, intent.a];
      if (tableOfPort(from) === tableOfPort(to)) return doc;
      return { ...doc, edges: [...doc.edges.filter((e) => e.from !== from), { id: nextEdgeId(), from, to }] };
    }
    case "select-edge": return { ...doc, selectedEdge: intent.id };
    case "delete":
      return doc.selectedEdge ? { ...doc, edges: doc.edges.filter((e) => e.id !== doc.selectedEdge), selectedEdge: null } : doc;
    case "clear": return { ...doc, graphSel: new Set(), selectedEdge: null };
    case "arrange": return arranged(doc);
    case "grid-sort": {
      if (!doc.table) return doc;
      return { ...doc, grid: { ...freshGrid(doc.tables[doc.table], nextSort(doc.grid.sort, intent.key)), widths: doc.grid.widths } };
    }
    case "grid-click":
      return { ...doc, grid: { ...doc.grid, selection: clickSelect(doc.grid.selection, intent.index, rowKeyAt(doc), intent), cursor: intent.index } };
    case "grid-cursor": {
      const n = doc.grid.order.length;
      if (!n) return doc;
      const index = Math.max(0, Math.min(n - 1, (doc.grid.cursor ?? (intent.by > 0 ? -1 : n)) + intent.by));
      return { ...doc, grid: { ...doc.grid, cursor: index, selection: clickSelect(doc.grid.selection, index, rowKeyAt(doc), { shift: false, ctrl: false }) } };
    }
    case "grid-resize": return { ...doc, grid: { ...doc.grid, widths: { ...doc.grid.widths, [intent.key]: intent.width } } };
    case "grid-all": return { ...doc, grid: { ...doc.grid, selection: selectAll(doc.grid.order.length, rowKeyAt(doc)) } };
    case "split": return intent.axis === "x" ? { ...doc, splitX: intent.at } : { ...doc, splitY: intent.at };
  }
}

// ── View ──────────────────────────────────────────────────────────────────────

const widthFor = (c: ColumnDef) => (c.pk ? 80 : c.type === "text" ? 150 : c.type === "timestamp" ? 110 : 100);

const gridColumns = (t: TableDef, widths: Record<string, number>): Column<SampleRow>[] =>
  t.columns.map((c) => ({
    key: c.name, title: c.name, width: widths[c.name] ?? widthFor(c),
    align: c.type === "bigint" || c.type === "int" || c.type === "numeric" ? "right" : "left",
    mono: c.type !== "text" && c.type !== "char(2)",
    cell: (r) => (typeof r[c.name] === "number" && c.type === "numeric" ? (r[c.name] as number).toFixed(2) : String(r[c.name])),
  }));

function view(doc: Doc): Element {
  const table = doc.table ? doc.tables[doc.table] : null;
  const rows = table ? sampleRows(table) : [];
  const treeRows = flatten(TREE, doc.expanded);
  const tables = Object.values(doc.tables);

  const gridPane: Element = table
    ? DataGrid<SampleRow>("grid", {
        columns: gridColumns(table, doc.grid.widths),
        count: doc.grid.order.length,
        rowAt: (i) => rows[doc.grid.order[i]],
        keyAt: rowKeyAt(doc),
        sort: doc.grid.sort, selected: doc.grid.selection.keys, cursor: doc.grid.cursor,
        sortBy: (key) => ({ kind: "grid-sort", key }),
        clickRow: (index, mods) => ({ kind: "grid-click", index, shift: mods.shift, ctrl: mods.ctrl }),
        resize: (key, width) => ({ kind: "grid-resize", key, width }),
        moveCursor: (by) => ({ kind: "grid-cursor", by }),
        selectAll: () => ({ kind: "grid-all" }),
      })
    : Stack("empty", { pad: 24 }, [Label("e", { text: "select a table in the tree, or click one in the graph", dim: true })]);

  const graphPane = GraphPane("graph", {
    bounded: true,
    marquee: (rect, mods) => ({ kind: "marquee", rect, mods }),
    clear: { kind: "clear" },
    keys: { Delete: () => ({ kind: "delete" }), l: () => ({ kind: "arrange" }) },
  }, [Free("nodes", {}, [
    ...doc.edges.map((e) => FkWire(e.id, {
      id: e.id, from: e.from, to: e.to,
      select: (id) => ({ kind: "select-edge", id }),
      states: { sel: doc.selectedEdge === e.id, hot: doc.graphSel.has(tableOfPort(e.from)) || doc.graphSel.has(tableOfPort(e.to)) },
    })),
    ...tables.map((t) => TableNode(t.id, {
      id: t.id, name: t.name, hue: t.hue, pos: t.pos, columns: t.columns,
      select: (id, mods) => ({ kind: "graph-select", id, mods }),
      drag: (id, delta) => ({ kind: "drag", id, delta }),
      connect: (a, b) => ({ kind: "connect", a, b }),
      states: { sel: doc.graphSel.has(t.id) },
    })),
  ])]);

  return Stack("root", { gap: 8, pad: 12, align: "stretch" }, [
    Flow("bar", { gap: 8, pad: 0 }, [
      Label("title", { text: "Workbench", size: 16, weight: 600, bright: true }),
      Label("crumb", { text: table ? `shop › ${table.name}` : "shop", dim: true, size: 12 }),
      Button("arrange", { label: "Arrange graph", press: { kind: "arrange" } }),
      Button("undo", { label: "Undo", press: { kind: "undo" } }),
      Button("redo", { label: "Redo", press: { kind: "redo" } }),
    ]),
    grow(Split("h", { axis: "x", at: doc.splitX, min: 0.15, set: (at) => ({ kind: "split", axis: "x", at }) }, [
      TreeView<TableDef | ColumnDef>("tree", {
        rows: treeRows,
        selected: doc.table,
        toggle: (id) => ({ kind: "tree-toggle", id }),
        select: (id) => ({ kind: "tree-select", id }),
        moveCursor: (by) => ({ kind: "tree-cursor", by }),
      }),
      Split("v", { axis: "y", at: doc.splitY, min: 0.15, set: (at) => ({ kind: "split", axis: "y", at }) }, [
        gridPane,
        graphPane,
      ]),
    ])),
    Row("status", { gap: 16 }, [
      Label("s1", { text: table ? `${table.name} · ${table.columns.length} columns · ${rows.length.toLocaleString()} rows` : "no table", dim: true, size: 11 }),
      Label("s2", { text: `${doc.grid.selection.keys.size} rows selected`, dim: true, size: 11 }),
      Label("s3", { text: `${doc.graphSel.size} tables selected · ${doc.edges.length} keys`, dim: true, size: 11 }),
      Label("s4", { text: "drag the dividers · tree ↑↓←→ · grid sort/resize/select · graph marquee, port→port, l arranges", dim: true, size: 11 }),
    ]),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, withUndo<Doc, Intent>({
  init: chooseTable(arranged({
    tables: Object.fromEntries(SAMPLE_TABLES.map((t) => [t.id, t])),
    edges: SAMPLE_EDGES,
    expanded: new Set(["shop"]),
    table: null, graphSel: new Set(), selectedEdge: null,
    grid: freshGrid(null),
    splitX: 0.3, splitY: 0.45,
  }), "orders"),
  update,
  view,
}));

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
