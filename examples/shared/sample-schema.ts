// A small sample database for the browser examples: nine tables with typed
// columns and foreign keys, a deterministic row generator per table, and the
// schema as a tree. Pure data — the graph parts, the grid and the tree all
// consume it, none of them own it.

import type { Vec } from "gratify";
import type { TreeNode } from "./tree-math";

export interface ColumnDef { name: string; type: string; pk?: boolean }
export interface TableDef { id: string; name: string; hue: number; pos: Vec; columns: ColumnDef[] }
/** A foreign key: `from` is a `/out` port on the referencing column, `to` an
 *  `/in` port on the referenced column. */
export interface FkEdge { id: string; from: string; to: string }

export const portId = (table: string, column: string, side: "in" | "out") => `${table}:${column}/${side}`;
export const tableOfPort = (id: string) => id.slice(0, id.indexOf(":"));
export const columnOfPort = (id: string) => id.slice(id.indexOf(":") + 1, id.lastIndexOf("/"));
export const sideOfPort = (id: string): "in" | "out" => (id.endsWith("/out") ? "out" : "in");

const T = (id: string, hue: number, columns: [string, string, boolean?][]): TableDef => ({
  id, name: id, hue, pos: { x: 0, y: 0 },
  columns: columns.map(([name, type, pk]) => ({ name, type, pk })),
});
let nextEdge = 1;
const FK = (fromTable: string, fromCol: string, toTable: string, toCol = "id"): FkEdge =>
  ({ id: `fk-${nextEdge++}`, from: portId(fromTable, fromCol, "out"), to: portId(toTable, toCol, "in") });

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
export const nextEdgeId = () => `fk-${100 + nextEdge++}`;

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
    default: return `${pick(WORDS)} ${pick(WORDS)}`;
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
  const fkColumns = new Set(edges.map((e) => `${tableOfPort(e.from)}.${columnOfPort(e.from)}`));
  return [{
    id: db, label: db, kind: "db", note: `${tables.length} tables`,
    children: tables.map((t) => ({
      id: t.id, label: t.name, kind: "table", note: `${t.columns.length} cols`, data: t,
      children: t.columns.map((c) => ({
        id: `${t.id}.${c.name}`, label: c.name, note: c.type, data: c,
        kind: c.pk || fkColumns.has(`${t.id}.${c.name}`) ? "key" : "column",
      })),
    })),
  }];
}
