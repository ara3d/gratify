import{m as R,S as b,L as l,y as A,F as O,i as L,R as D,v as k}from"./runtime-BaMoeUMO.js";import{w as z}from"./middleware-DnFxgLOc.js";import{B as u}from"./widgets-BJEltdMZ.js";import{D as M,a as G,c as f,n as F,s as I,E as C}from"./grid-BKhLO1qQ.js";import{f as y,T as B,t as $}from"./tree-DtcbVjp_.js";import{S as w}from"./split-WwqU7KnC.js";import{e as j,S as x,f as h,G as Y,F as _,a as d,T as q,s as X,n as N,c as V,t as S,l as K,d as E}from"./parts-D8fs8QnV.js";import{a as U}from"./source-panel-CSqvtNlY.js";import"./virtual-CUT1_9te.js";import"./effects-sMK-JssO.js";const W=`// ============================================================================
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
  /** The graph's multi-selection (marquee, ctrl/shift); includes \`table\`. */
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
      Label("crumb", { text: table ? \`shop › \${table.name}\` : "shop", dim: true, size: 12 }),
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
      Label("s1", { text: table ? \`\${table.name} · \${table.columns.length} columns · \${rows.length.toLocaleString()} rows\` : "no table", dim: true, size: 11 }),
      Label("s2", { text: \`\${doc.grid.selection.keys.size} rows selected\`, dim: true, size: 11 }),
      Label("s3", { text: \`\${doc.graphSel.size} tables selected · \${doc.edges.length} keys\`, dim: true, size: 11 }),
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
`,T=j(x,E),m=(e,t=null)=>{const n=e?h(e):[],r=I(n.length,t&&(i=>n[i][t.key]),t==null?void 0:t.dir);return{sort:t,order:r,selection:C,cursor:null,widths:{}}};function c(e,t){const n=t&&t.includes(".")?t.slice(0,t.indexOf(".")):t,r=n&&e.tables[n]?n:null;return r===e.table?{...e,graphSel:r?new Set([r]):new Set,selectedEdge:null}:{...e,table:r,graphSel:r?new Set([r]):new Set,selectedEdge:null,grid:m(r?e.tables[r]:null)}}function P(e){const t=Object.values(e.tables).map(r=>({id:r.id,w:S(r.columns.length).x,h:S(r.columns.length).y})),n=K(t,e.edges.map(r=>({from:d(r.from),to:d(r.to)})),{gapX:60,gapY:24,origin:k(20,20)});return{...e,tables:Object.fromEntries(Object.values(e.tables).map(r=>[r.id,{...r,pos:n.get(r.id)??r.pos}]))}}const g=e=>{const t=e.table?h(e.tables[e.table]):[];return n=>String(t[e.grid.order[n]].id)};function H(e,t){switch(t.kind){case"tree-toggle":return{...e,expanded:$(e.expanded,t.id)};case"tree-select":return c(e,t.id);case"tree-cursor":{const n=y(T,e.expanded),r=e.table===null?-1:n.findIndex(p=>p.node.id===e.table),i=Math.max(0,Math.min(n.length-1,(r<0?t.by>0?-1:n.length:r)+t.by));return n.length?c(e,n[i].node.id):e}case"graph-select":{if(!t.mods.ctrl&&!t.mods.shift)return c(e,t.id);const n=new Set(e.graphSel);return t.mods.ctrl&&n.has(t.id)?n.delete(t.id):n.add(t.id),{...e,graphSel:n,selectedEdge:null}}case"marquee":{const n=new Set(t.mods.shift?e.graphSel:[]);for(const r of Object.values(e.tables))V(r).overlaps(t.rect)&&n.add(r.id);return{...e,graphSel:n,selectedEdge:null}}case"drag":{const n=e.graphSel.has(t.id)?e.graphSel:new Set([t.id]),r={...e.tables};for(const i of n)r[i]={...r[i],pos:k(r[i].pos.x+t.delta.x,r[i].pos.y+t.delta.y)};return{...e,tables:r}}case"connect":{const[n,r]=X(t.a)==="out"?[t.a,t.b]:[t.b,t.a];return d(n)===d(r)?e:{...e,edges:[...e.edges.filter(i=>i.from!==n),{id:N(),from:n,to:r}]}}case"select-edge":return{...e,selectedEdge:t.id};case"delete":return e.selectedEdge?{...e,edges:e.edges.filter(n=>n.id!==e.selectedEdge),selectedEdge:null}:e;case"clear":return{...e,graphSel:new Set,selectedEdge:null};case"arrange":return P(e);case"grid-sort":return e.table?{...e,grid:{...m(e.tables[e.table],F(e.grid.sort,t.key)),widths:e.grid.widths}}:e;case"grid-click":return{...e,grid:{...e.grid,selection:f(e.grid.selection,t.index,g(e),t),cursor:t.index}};case"grid-cursor":{const n=e.grid.order.length;if(!n)return e;const r=Math.max(0,Math.min(n-1,(e.grid.cursor??(t.by>0?-1:n))+t.by));return{...e,grid:{...e.grid,cursor:r,selection:f(e.grid.selection,r,g(e),{shift:!1,ctrl:!1})}}}case"grid-resize":return{...e,grid:{...e.grid,widths:{...e.grid.widths,[t.key]:t.width}}};case"grid-all":return{...e,grid:{...e.grid,selection:G(e.grid.order.length,g(e))}};case"split":return t.axis==="x"?{...e,splitX:t.at}:{...e,splitY:t.at}}}const J=e=>e.pk?80:e.type==="text"?150:e.type==="timestamp"?110:100,Q=(e,t)=>e.columns.map(n=>({key:n.name,title:n.name,width:t[n.name]??J(n),align:n.type==="bigint"||n.type==="int"||n.type==="numeric"?"right":"left",mono:n.type!=="text"&&n.type!=="char(2)",cell:r=>typeof r[n.name]=="number"&&n.type==="numeric"?r[n.name].toFixed(2):String(r[n.name])}));function Z(e){const t=e.table?e.tables[e.table]:null,n=t?h(t):[],r=y(T,e.expanded),i=Object.values(e.tables),p=t?M("grid",{columns:Q(t,e.grid.widths),count:e.grid.order.length,rowAt:s=>n[e.grid.order[s]],keyAt:g(e),sort:e.grid.sort,selected:e.grid.selection.keys,cursor:e.grid.cursor,sortBy:s=>({kind:"grid-sort",key:s}),clickRow:(s,a)=>({kind:"grid-click",index:s,shift:a.shift,ctrl:a.ctrl}),resize:(s,a)=>({kind:"grid-resize",key:s,width:a}),moveCursor:s=>({kind:"grid-cursor",by:s}),selectAll:()=>({kind:"grid-all"})}):b("empty",{pad:24},[l("e",{text:"select a table in the tree, or click one in the graph",dim:!0})]),v=Y("graph",{bounded:!0,marquee:(s,a)=>({kind:"marquee",rect:s,mods:a}),clear:{kind:"clear"},keys:{Delete:()=>({kind:"delete"}),l:()=>({kind:"arrange"})}},[A("nodes",{},[...e.edges.map(s=>_(s.id,{id:s.id,from:s.from,to:s.to,select:a=>({kind:"select-edge",id:a}),states:{sel:e.selectedEdge===s.id,hot:e.graphSel.has(d(s.from))||e.graphSel.has(d(s.to))}})),...i.map(s=>q(s.id,{id:s.id,name:s.name,hue:s.hue,pos:s.pos,columns:s.columns,select:(a,o)=>({kind:"graph-select",id:a,mods:o}),drag:(a,o)=>({kind:"drag",id:a,delta:o}),connect:(a,o)=>({kind:"connect",a,b:o}),states:{sel:e.graphSel.has(s.id)}}))])]);return b("root",{gap:8,pad:12,align:"stretch"},[O("bar",{gap:8,pad:0},[l("title",{text:"Workbench",size:16,weight:600,bright:!0}),l("crumb",{text:t?`shop › ${t.name}`:"shop",dim:!0,size:12}),u("arrange",{label:"Arrange graph",press:{kind:"arrange"}}),u("undo",{label:"Undo",press:{kind:"undo"}}),u("redo",{label:"Redo",press:{kind:"redo"}})]),L(w("h",{axis:"x",at:e.splitX,min:.15,set:s=>({kind:"split",axis:"x",at:s})},[B("tree",{rows:r,selected:e.table,toggle:s=>({kind:"tree-toggle",id:s}),select:s=>({kind:"tree-select",id:s}),moveCursor:s=>({kind:"tree-cursor",by:s})}),w("v",{axis:"y",at:e.splitY,min:.15,set:s=>({kind:"split",axis:"y",at:s})},[p,v])])),D("status",{gap:16},[l("s1",{text:t?`${t.name} · ${t.columns.length} columns · ${n.length.toLocaleString()} rows`:"no table",dim:!0,size:11}),l("s2",{text:`${e.grid.selection.keys.size} rows selected`,dim:!0,size:11}),l("s3",{text:`${e.graphSel.size} tables selected · ${e.edges.length} keys`,dim:!0,size:11}),l("s4",{text:"drag the dividers · tree ↑↓←→ · grid sort/resize/select · graph marquee, port→port, l arranges",dim:!0,size:11})])])}const ee=document.getElementById("c");R(ee,z({init:c(P({tables:Object.fromEntries(x.map(e=>[e.id,e])),edges:E,expanded:new Set(["shop"]),table:null,graphSel:new Set,selectedEdge:null,grid:m(null),splitX:.3,splitY:.45}),"orders"),update:H,view:Z}));U([{name:"main.ts",code:W}]);
