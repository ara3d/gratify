// ============================================================================
// Example: tree view — a schema explorer over ~8,000 nodes.
//
// Databases → schemas → tables / views → columns, keys and indexes. The app
// holds the expanded set and the selection; `flatten` (tree-math.ts) turns
// the open branches into the rows on screen, and `TreeView` (tree.ts) shows
// them through a `Virtual` list, so an all-expanded schema of thousands of
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
        const name = `${pick(WORDS)}_${pick(WORDS)}s_${ti}`;
        const rows = Math.floor(r() * 5_000_000);
        const cols: TreeNode<Meta>[] = Array.from({ length: 4 + Math.floor(r() * 36) }, (_, ci) => {
          const type = ci === 0 ? "bigint" : pick(TYPES);
          return { id: `${db}.${schema}.${name}.c${ci}`, label: ci === 0 ? "id" : `${pick(WORDS)}_${ci}`, kind: ci === 0 ? "key" : "column", note: type, data: { path: `${db}.${schema}.${name}`, type } };
        });
        const idx: TreeNode<Meta>[] = Array.from({ length: Math.floor(r() * 3) }, (_, ii) => ({
          id: `${db}.${schema}.${name}.i${ii}`, label: `${name}_idx${ii}`, kind: "index", note: "btree", data: { path: `${db}.${schema}.${name}` },
        }));
        return { id: `${db}.${schema}.${name}`, label: name, kind: "table", note: rows.toLocaleString(), data: { path: `${db}.${schema}`, rows }, children: [...cols, ...idx] };
      });
      const views: TreeNode<Meta>[] = Array.from({ length: 6 }, (_, vi) => ({
        id: `${db}.${schema}.v${vi}`, label: `v_${pick(WORDS)}_summary_${vi}`, kind: "view", note: "view", data: { path: `${db}.${schema}` },
      }));
      return { id: `${db}.${schema}`, label: schema, kind: "schema", note: `${tables.length} tables`, data: { path: db }, children: [...tables, ...views] };
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
      Label("n", { text: `${rows.length.toLocaleString()} rows shown of ${NODE_COUNT.toLocaleString()} nodes`, dim: true, size: 12 }),
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
        ...(node?.data?.type ? [Label("type", { text: `type ${node.data.type}`, size: 12 })] : []),
        ...(node?.data?.rows !== undefined ? [Label("rows", { text: `${node.data.rows.toLocaleString()} rows`, size: 12 })] : []),
        ...(node?.children ? [Label("kids", { text: `${node.children.length} children`, size: 12 })] : []),
        Label("act", { text: doc.activated ? `Enter on ${doc.activated.split(".").pop()}` : "Enter activates a leaf", dim: true, size: 11 }),
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
