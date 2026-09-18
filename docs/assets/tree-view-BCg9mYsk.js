import{m as y,S as T,F as $,L as i,i as w,R as E}from"./runtime-BaMoeUMO.js";import{w as S}from"./middleware-DnFxgLOc.js";import{B as p,C as M}from"./widgets-BJEltdMZ.js";import{f as x,T as N,a as R,b as C,t as _}from"./tree-DtcbVjp_.js";import{a as D}from"./source-panel-CSqvtNlY.js";import"./virtual-CUT1_9te.js";const A=`// ============================================================================
// Example: tree view — a schema explorer over ~8,000 nodes.
//
// Databases → schemas → tables / views → columns, keys and indexes. The app
// holds the expanded set and the selection; \`flatten\` (tree-math.ts) turns
// the open branches into the rows on screen, and \`TreeView\` (tree.ts) shows
// them through a \`Virtual\` list, so an all-expanded schema of thousands of
// rows costs the same per frame as a collapsed one.
//
// Try: click a chevron, or a row · arrows: Right opens / steps in, Left
// closes / steps out, Up/Down, Home/End · Enter toggles a branch · Expand all
// / Collapse all · the detail card follows the selection · undo the
// selection: the scroll offset is the tree's own, so it stays put.
// ============================================================================

import { Flow, grow, Label, mount, Row, Stack, Element, withUndo } from "gratify";
import { Button, Card } from "../shared/widgets";
import { TreeView } from "../shared/tree";
import { allBranchIds, ancestorsOf, flatten, toggleExpanded, TreeNode } from "../shared/tree-math";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import treeSource from "../shared/tree.ts?raw";
import mathSource from "../shared/tree-math.ts?raw";

// ── A synthetic schema (seeded, so reloads match) ─────────────────────────────

interface Meta { path: string; type?: string; rows?: number }

const TYPES = ["int", "bigint", "text", "varchar(64)", "numeric(12,2)", "timestamp", "boolean", "uuid", "jsonb"];
const WORDS = ["order", "customer", "invoice", "line", "shipment", "product", "price", "region", "account", "event", "audit", "session", "tag", "note", "address"];

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function makeSchema(): TreeNode<Meta>[] {
  const r = rng(11);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const dbs = ["shop", "warehouse", "analytics"];
  return dbs.map((db) => ({
    id: db, label: db, kind: "db", note: "database", data: { path: db },
    children: ["public", "staging"].map((schema) => {
      const tables: TreeNode<Meta>[] = Array.from({ length: 60 }, (_, ti) => {
        const name = \`\${pick(WORDS)}_\${pick(WORDS)}s_\${ti}\`;
        const rows = Math.floor(r() * 5_000_000);
        const cols: TreeNode<Meta>[] = Array.from({ length: 4 + Math.floor(r() * 36) }, (_, ci) => {
          const type = ci === 0 ? "bigint" : pick(TYPES);
          return { id: \`\${db}.\${schema}.\${name}.c\${ci}\`, label: ci === 0 ? "id" : \`\${pick(WORDS)}_\${ci}\`, kind: ci === 0 ? "key" : "column", note: type, data: { path: \`\${db}.\${schema}.\${name}\`, type } };
        });
        const idx: TreeNode<Meta>[] = Array.from({ length: Math.floor(r() * 3) }, (_, ii) => ({
          id: \`\${db}.\${schema}.\${name}.i\${ii}\`, label: \`\${name}_idx\${ii}\`, kind: "index", note: "btree", data: { path: \`\${db}.\${schema}.\${name}\` },
        }));
        return { id: \`\${db}.\${schema}.\${name}\`, label: name, kind: "table", note: rows.toLocaleString(), data: { path: \`\${db}.\${schema}\`, rows }, children: [...cols, ...idx] };
      });
      const views: TreeNode<Meta>[] = Array.from({ length: 6 }, (_, vi) => ({
        id: \`\${db}.\${schema}.v\${vi}\`, label: \`v_\${pick(WORDS)}_summary_\${vi}\`, kind: "view", note: "view", data: { path: \`\${db}.\${schema}\` },
      }));
      return { id: \`\${db}.\${schema}\`, label: schema, kind: "schema", note: \`\${tables.length} tables\`, data: { path: db }, children: [...tables, ...views] };
    }),
  }));
}

const SCHEMA = makeSchema();
const NODE_COUNT = (() => { let n = 0; const walk = (xs: TreeNode<Meta>[]) => { for (const x of xs) { n++; if (x.children) walk(x.children); } }; walk(SCHEMA); return n; })();

// ── State ─────────────────────────────────────────────────────────────────────

interface Doc {
  expanded: ReadonlySet<string>;
  selected: string | null;
  activated: string | null;
}

type Intent =
  | { kind: "toggle"; id: string }
  | { kind: "select"; id: string }
  | { kind: "cursor"; by: number }
  | { kind: "activate"; id: string }
  | { kind: "expand-all" }
  | { kind: "collapse-all" }
  | { kind: "jump"; id: string };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "toggle": return { ...doc, expanded: toggleExpanded(doc.expanded, intent.id) };
    case "select": return { ...doc, selected: intent.id };
    case "cursor": {
      const rows = flatten(SCHEMA, doc.expanded);
      if (!rows.length) return doc;
      const cur = doc.selected === null ? -1 : rows.findIndex((r) => r.node.id === doc.selected);
      const next = Math.max(0, Math.min(rows.length - 1, (cur < 0 ? (intent.by > 0 ? -1 : rows.length) : cur) + intent.by));
      return { ...doc, selected: rows[next].node.id };
    }
    case "activate": return { ...doc, activated: intent.id };
    case "expand-all": return { ...doc, expanded: allBranchIds(SCHEMA) };
    case "collapse-all": return { ...doc, expanded: new Set(["shop"]) };
    case "jump": {
      // reveal a deep node: open every ancestor, then select it
      const expanded = new Set(doc.expanded);
      for (const id of ancestorsOf(SCHEMA, intent.id)) expanded.add(id);
      return { ...doc, expanded, selected: intent.id };
    }
  }
}

// ── View ──────────────────────────────────────────────────────────────────────

const findNode = (id: string | null): TreeNode<Meta> | null => {
  if (id === null) return null;
  let out: TreeNode<Meta> | null = null;
  const walk = (xs: TreeNode<Meta>[]) => { for (const x of xs) { if (x.id === id) out = x; else if (x.children) walk(x.children); } };
  walk(SCHEMA);
  return out;
};

// the 4th column of the 18th table of analytics.staging — three levels down
const DEEP_ID = SCHEMA[2].children![1].children![17].children![3].id;

function view(doc: Doc): Element {
  const rows = flatten(SCHEMA, doc.expanded);
  const node = findNode(doc.selected);
  return Stack("root", { gap: 10, pad: 16, align: "stretch" }, [
    Flow("bar", { gap: 8, pad: 0 }, [
      Label("title", { text: "Schema", size: 16, weight: 600, bright: true }),
      Label("n", { text: \`\${rows.length.toLocaleString()} rows shown of \${NODE_COUNT.toLocaleString()} nodes\`, dim: true, size: 12 }),
      Button("expand", { label: "Expand all", press: { kind: "expand-all" } }),
      Button("collapse", { label: "Collapse all", press: { kind: "collapse-all" } }),
      Button("jump", { label: "Jump to a deep column", accent: true, press: { kind: "jump", id: DEEP_ID } }),
      Button("undo", { label: "Undo", press: { kind: "undo" } }),
      Button("redo", { label: "Redo", press: { kind: "redo" } }),
    ]),
    grow(Row("body", { gap: 12, align: "stretch" }, [
      grow(TreeView<Meta>("tree", {
        rows,
        selected: doc.selected,
        toggle: (id) => ({ kind: "toggle", id }),
        select: (id) => ({ kind: "select", id }),
        moveCursor: (by) => ({ kind: "cursor", by }),
        activate: (id) => ({ kind: "activate", id }),
      })),
      Card("detail", { title: node ? node.label : "nothing selected", value: node?.kind }, [
        Label("path", { text: node?.data?.path ?? "click a row, or use the arrow keys", dim: true, size: 11 }),
        ...(node?.data?.type ? [Label("type", { text: \`type \${node.data.type}\`, size: 12 })] : []),
        ...(node?.data?.rows !== undefined ? [Label("rows", { text: \`\${node.data.rows.toLocaleString()} rows\`, size: 12 })] : []),
        ...(node?.children ? [Label("kids", { text: \`\${node.children.length} children\`, size: 12 })] : []),
        Label("act", { text: doc.activated ? \`Enter on \${doc.activated.split(".").pop()}\` : "Enter activates a leaf", dim: true, size: 11 }),
      ]),
    ])),
    Label("hint", { text: "chevron toggles · row selects · → opens / steps in · ← closes / steps out · ↑↓ Home End · Enter · undo reverts selection, not scroll", dim: true, size: 11 }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, withUndo<Doc, Intent>({
  init: { expanded: new Set(["shop", "shop.public"]), selected: null, activated: null },
  update,
  view,
}));

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "tree.ts (shared)", code: treeSource },
  { name: "tree-math.ts (shared)", code: mathSource },
]);
`,I=`// TreeView — a virtualized tree (a schema explorer): chevrons that spring
// open, kind icons, notes, a selection the keyboard drives with the standard
// arrow idiom (Right opens / steps in, Left closes / steps out). It renders the
// FLAT rows the app derives with \`flatten\` (tree-math.ts) — the app owns which
// branches are open, so the tree part is a pure function of props and every
// interaction leaves as an intent.
//
//   TreeView ─ TreeFrame (focusable, clipped) ─ Virtual ─ TreeRow × visible

import { calpha, Color, Element, fitText, Focusable, hsl, Intentish, part, rect, v, Virtual } from "gratify";
import { arrowLeft, arrowRight, FlatRow, TreeMove } from "./tree-math";

export interface TreeProps<T = unknown> {
  /** The visible rows, from \`flatten(roots, expanded)\`. */
  rows: FlatRow<T>[];
  /** The selected node id (also the keyboard cursor), or null. */
  selected: string | null;
  rowHeight?: number;
  width?: number;
  height?: number;
  // ── intents ──
  toggle(id: string): Intentish;
  select(id: string): Intentish;
  /** Move the cursor by \`by\` rows (relative; the app clamps). */
  moveCursor(by: number): Intentish;
  /** Enter on a leaf. */
  activate?(id: string): Intentish;
  states?: Record<string, boolean>;
}

const INDENT = 16;
const PAD = 10;
const CHEVRON_ZONE = 18;
const finiteOr = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

/** A hue per node kind, so a schema reads at a glance. Unknown kinds are grey. */
const KIND_HUE: Record<string, number> = { db: 200, schema: 260, table: 150, view: 40, column: 0, key: 45, index: 300 };
const kindColor = (kind: string | undefined, dim: Color): Color =>
  kind && kind in KIND_HUE ? hsl(KIND_HUE[kind], 0.6, 0.6) : dim;

// ── One row ───────────────────────────────────────────────────────────────────
interface RowProps {
  id: string;
  label: string;
  kind?: string;
  note?: string;
  depth: number;
  branch: boolean;
  expanded: boolean;
  toggle(id: string): Intentish;
  select(id: string): Intentish;
  states?: Record<string, boolean>;
}

const TreeRow = part("tree-row")
  .props<RowProps>()
  .size(() => v(0, 0))
  .channels({ open: { target: (n) => (n.props.expanded ? 1 : 0), spring: { stiffness: 320, damping: 22 } } })
  .style((t, ch, p) => {
    const sel = Math.min(1, ch.sel || 0);
    return {
      fill: t.mix(calpha(t.accent, 0), calpha(t.accent, 0.22), Math.max(sel, 0.4 * ch.hover)),
      text: t.mix(p.branch ? t.text : t.textDim, t.textBright, Math.max(sel, ch.hover)),
      note: t.textDim,
      chevron: t.mix(t.textDim, t.textBright, ch.hover),
      icon: kindColor(p.kind, t.muted),
      turn: ch.open,
    };
  })
  .render((n, p, s) => {
    const r = n.rect, props = n.props;
    const x0 = r.x + PAD + props.depth * INDENT;
    p.box(r, 4, s.fill);
    if (props.branch) {
      // a chevron turning from ▸ to ▾ as \`open\` springs 0→1
      const c = v(x0 + 6, r.center.y), a = (Math.PI / 2) * s.turn, k = 3.5;
      const rot = (dx: number, dy: number) => v(c.x + dx * Math.cos(a) - dy * Math.sin(a), c.y + dx * Math.sin(a) + dy * Math.cos(a));
      p.line(rot(-k * 0.5, -k), rot(k * 0.5, 0), s.chevron, 1.6);
      p.line(rot(k * 0.5, 0), rot(-k * 0.5, k), s.chevron, 1.6);
    }
    const ix = x0 + CHEVRON_ZONE;
    p.box(rect(ix, r.center.y - 6, 12, 12), 3, calpha(s.icon, 0.85));
    p.label((props.kind ?? "?")[0].toUpperCase(), v(ix + 6, r.center.y + 0.5), calpha(s.note, 0), { size: 8 });
    const noteW = props.note ? p.measure.text(props.note, 11).x : 0;
    const lx = ix + 18;
    p.label(fitText(p.measure, props.label, r.right - PAD - noteW - 8 - lx, 12), v(lx, r.center.y), s.text, { size: 12, align: "left" });
    if (props.note) p.label(props.note, v(r.right - PAD, r.center.y), s.note, { size: 11, align: "right", mono: true });
  })
  // clicking the chevron zone toggles; anywhere else selects
  .press((n) =>
    n.props.branch && n.pointer && n.pointer.x < n.rect.x + PAD + n.props.depth * INDENT + CHEVRON_ZONE
      ? n.props.toggle(n.props.id)
      : n.props.select(n.props.id))
  .semantics((n) => ({ role: "treeitem", label: n.props.label, value: n.props.expanded }));

// ── The frame: focusable, clipped, keyboard idiom ─────────────────────────────
interface FrameProps extends Pick<TreeProps, "toggle" | "moveCursor" | "activate" | "select"> {
  width: number;
  height: number;
  rows: FlatRow[];
  cursor: number;   // flat index or -1
}

const moveOf = (n: { props: FrameProps }, move: TreeMove | null): Intentish =>
  move === null ? undefined
  : move.kind === "toggle" ? n.props.toggle(move.id)
  : n.props.moveCursor(move.index - n.props.cursor);

const TreeFrame = part("tree-frame")
  .props<FrameProps>()
  .measure((p, avail) => v(finiteOr(avail.x, p.width), finiteOr(avail.y, p.height)))
  .arrange((_p, r, kids) => kids.map(() => r))
  .clip()
  .style((t, ch) => ({ fill: t.surface, edge: t.mix(t.muted, t.accent, 0.7 * ch.focus) }))
  .render((n, p, s) => p.box(n.rect, 6, s.fill, s.edge, 1))
  .on(Focusable())
  .keys({
    ArrowDown: (n) => n.props.moveCursor(1),
    ArrowUp: (n) => n.props.moveCursor(-1),
    Home: (n) => n.props.moveCursor(-n.props.rows.length),
    End: (n) => n.props.moveCursor(n.props.rows.length),
    ArrowRight: (n) => moveOf(n, arrowRight(n.props.rows, n.props.cursor)),
    ArrowLeft: (n) => moveOf(n, arrowLeft(n.props.rows, n.props.cursor)),
    Enter: (n) => {
      const row = n.props.rows[n.props.cursor];
      return !row ? undefined : row.branch ? n.props.toggle(row.node.id) : n.props.activate?.(row.node.id);
    },
  })
  .semantics((n) => ({ role: "tree", value: n.props.rows.length }));

// ── The tree ──────────────────────────────────────────────────────────────────
const Tree = part("tree-view")
  .props<TreeProps<any>>()
  .defaults({ rowHeight: 24, width: 260, height: 320 })
  .body((p, _kids, _l, size) => {
    const cursor = p.selected === null ? -1 : p.rows.findIndex((r) => r.node.id === p.selected);
    const row = (i: number): Element => {
      const r = p.rows[i];
      return TreeRow(r.node.id, {
        id: r.node.id, label: r.node.label, kind: r.node.kind, note: r.node.note,
        depth: r.depth, branch: r.branch, expanded: r.expanded,
        toggle: p.toggle, select: p.select,
        states: { sel: p.selected === r.node.id },
      });
    };
    return [TreeFrame("frame", {
      width: size.x || p.width, height: size.y || p.height,
      rows: p.rows, cursor, toggle: p.toggle, select: p.select, moveCursor: p.moveCursor, activate: p.activate,
    }, [
      Virtual("rows", { count: p.rows.length, rowHeight: p.rowHeight, row, reveal: cursor >= 0 ? cursor : undefined }),
    ])];
  });

/** A typed constructor over the untyped part: \`TreeView<Payload>("tree", props)\`. */
export const TreeView = <T>(key: string, props: TreeProps<T>): Element => Tree(key, props as TreeProps<any>);
`,O=`// Pure arithmetic under the tree view (tree.ts): flattening an expanded tree
// into the rows a virtualized list shows, and the keyboard moves over that
// flat list. No framework imports — kernel-tested on its own.

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  /** A kind tag the row renderer maps to an icon/color ("db", "table", …). */
  kind?: string;
  /** A trailing note: a count, a type, a size. */
  note?: string;
  children?: TreeNode<T>[];
  /** App payload, untouched by the tree. */
  data?: T;
}

/** One visible row of an expanded tree. */
export interface FlatRow<T = unknown> {
  node: TreeNode<T>;
  depth: number;
  /** Has children (shows a chevron). */
  branch: boolean;
  expanded: boolean;
  /** Flat index of the parent row, or -1 for a root. */
  parent: number;
}

/** The rows an expanded tree shows, depth-first, in document order. Only the
 *  children of expanded branches are walked, so a 100k-node schema with a few
 *  tables open costs the rows on screen, not the schema. */
export function flatten<T>(roots: readonly TreeNode<T>[], expanded: ReadonlySet<string>): FlatRow<T>[] {
  const out: FlatRow<T>[] = [];
  const walk = (nodes: readonly TreeNode<T>[], depth: number, parent: number) => {
    for (const node of nodes) {
      const branch = !!node.children?.length;
      const open = branch && expanded.has(node.id);
      const index = out.length;
      out.push({ node, depth, branch, expanded: open, parent });
      if (open) walk(node.children!, depth + 1, index);
    }
  };
  walk(roots, 0, -1);
  return out;
}

/** Toggle one id in an expanded set (a new set; the input is untouched). */
export function toggleExpanded(expanded: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

/** Every branch id under \`roots\` — "expand all". */
export function allBranchIds<T>(roots: readonly TreeNode<T>[]): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: readonly TreeNode<T>[]) => {
    for (const n of nodes) if (n.children?.length) { out.add(n.id); walk(n.children); }
  };
  walk(roots);
  return out;
}

/** The ids on the path from a root down to \`id\` (exclusive) — what must be
 *  expanded for \`id\` to be visible. Empty when \`id\` is a root or unknown. */
export function ancestorsOf<T>(roots: readonly TreeNode<T>[], id: string): string[] {
  const path: string[] = [];
  const find = (nodes: readonly TreeNode<T>[]): boolean => {
    for (const n of nodes) {
      if (n.id === id) return true;
      if (n.children?.length) {
        path.push(n.id);
        if (find(n.children)) return true;
        path.pop();
      }
    }
    return false;
  };
  return find(roots) ? path : [];
}

/** What an arrow key does at a flat row, in the standard tree idiom:
 *  Right opens a closed branch or steps into an open one; Left closes an open
 *  branch or steps to the parent. Returns the move, or null for no-op. */
export type TreeMove = { kind: "toggle"; id: string } | { kind: "cursor"; index: number };

export function arrowRight<T>(rows: readonly FlatRow<T>[], index: number): TreeMove | null {
  const row = rows[index];
  if (!row?.branch) return null;
  if (!row.expanded) return { kind: "toggle", id: row.node.id };
  return index + 1 < rows.length ? { kind: "cursor", index: index + 1 } : null;
}

export function arrowLeft<T>(rows: readonly FlatRow<T>[], index: number): TreeMove | null {
  const row = rows[index];
  if (!row) return null;
  if (row.branch && row.expanded) return { kind: "toggle", id: row.node.id };
  return row.parent >= 0 ? { kind: "cursor", index: row.parent } : null;
}
`,L=["int","bigint","text","varchar(64)","numeric(12,2)","timestamp","boolean","uuid","jsonb"],u=["order","customer","invoice","line","shipment","product","price","region","account","event","audit","session","tag","note","address"];function P(n){return()=>(n=n*1664525+1013904223>>>0,n/4294967296)}function z(){const n=P(11),r=t=>t[Math.floor(n()*t.length)];return["shop","warehouse","analytics"].map(t=>({id:t,label:t,kind:"db",note:"database",data:{path:t},children:["public","staging"].map(o=>{const d=Array.from({length:60},(f,h)=>{const l=`${r(u)}_${r(u)}s_${h}`,m=Math.floor(n()*5e6),b=Array.from({length:4+Math.floor(n()*36)},(v,s)=>{const g=s===0?"bigint":r(L);return{id:`${t}.${o}.${l}.c${s}`,label:s===0?"id":`${r(u)}_${s}`,kind:s===0?"key":"column",note:g,data:{path:`${t}.${o}.${l}`,type:g}}}),k=Array.from({length:Math.floor(n()*3)},(v,s)=>({id:`${t}.${o}.${l}.i${s}`,label:`${l}_idx${s}`,kind:"index",note:"btree",data:{path:`${t}.${o}.${l}`}}));return{id:`${t}.${o}.${l}`,label:l,kind:"table",note:m.toLocaleString(),data:{path:`${t}.${o}`,rows:m},children:[...b,...k]}}),a=Array.from({length:6},(f,h)=>({id:`${t}.${o}.v${h}`,label:`v_${r(u)}_summary_${h}`,kind:"view",note:"view",data:{path:`${t}.${o}`}}));return{id:`${t}.${o}`,label:o,kind:"schema",note:`${d.length} tables`,data:{path:t},children:[...d,...a]}})}))}const c=z(),H=(()=>{let n=0;const r=e=>{for(const t of e)n++,t.children&&r(t.children)};return r(c),n})();function F(n,r){switch(r.kind){case"toggle":return{...n,expanded:_(n.expanded,r.id)};case"select":return{...n,selected:r.id};case"cursor":{const e=x(c,n.expanded);if(!e.length)return n;const t=n.selected===null?-1:e.findIndex(d=>d.node.id===n.selected),o=Math.max(0,Math.min(e.length-1,(t<0?r.by>0?-1:e.length:t)+r.by));return{...n,selected:e[o].node.id}}case"activate":return{...n,activated:r.id};case"expand-all":return{...n,expanded:C(c)};case"collapse-all":return{...n,expanded:new Set(["shop"])};case"jump":{const e=new Set(n.expanded);for(const t of R(c,r.id))e.add(t);return{...n,expanded:e,selected:r.id}}}}const B=n=>{if(n===null)return null;let r=null;const e=t=>{for(const o of t)o.id===n?r=o:o.children&&e(o.children)};return e(c),r},V=c[2].children[1].children[17].children[3].id;function U(n){var t,o,d;const r=x(c,n.expanded),e=B(n.selected);return T("root",{gap:10,pad:16,align:"stretch"},[$("bar",{gap:8,pad:0},[i("title",{text:"Schema",size:16,weight:600,bright:!0}),i("n",{text:`${r.length.toLocaleString()} rows shown of ${H.toLocaleString()} nodes`,dim:!0,size:12}),p("expand",{label:"Expand all",press:{kind:"expand-all"}}),p("collapse",{label:"Collapse all",press:{kind:"collapse-all"}}),p("jump",{label:"Jump to a deep column",accent:!0,press:{kind:"jump",id:V}}),p("undo",{label:"Undo",press:{kind:"undo"}}),p("redo",{label:"Redo",press:{kind:"redo"}})]),w(E("body",{gap:12,align:"stretch"},[w(N("tree",{rows:r,selected:n.selected,toggle:a=>({kind:"toggle",id:a}),select:a=>({kind:"select",id:a}),moveCursor:a=>({kind:"cursor",by:a}),activate:a=>({kind:"activate",id:a})})),M("detail",{title:e?e.label:"nothing selected",value:e==null?void 0:e.kind},[i("path",{text:((t=e==null?void 0:e.data)==null?void 0:t.path)??"click a row, or use the arrow keys",dim:!0,size:11}),...(o=e==null?void 0:e.data)!=null&&o.type?[i("type",{text:`type ${e.data.type}`,size:12})]:[],...((d=e==null?void 0:e.data)==null?void 0:d.rows)!==void 0?[i("rows",{text:`${e.data.rows.toLocaleString()} rows`,size:12})]:[],...e!=null&&e.children?[i("kids",{text:`${e.children.length} children`,size:12})]:[],i("act",{text:n.activated?`Enter on ${n.activated.split(".").pop()}`:"Enter activates a leaf",dim:!0,size:11})])])),i("hint",{text:"chevron toggles · row selects · → opens / steps in · ← closes / steps out · ↑↓ Home End · Enter · undo reverts selection, not scroll",dim:!0,size:11})])}const j=document.getElementById("c");y(j,S({init:{expanded:new Set(["shop","shop.public"]),selected:null,activated:null},update:F,view:U}));D([{name:"main.ts",code:A},{name:"tree.ts (shared)",code:I},{name:"tree-math.ts (shared)",code:O}]);
