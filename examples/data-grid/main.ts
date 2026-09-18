// ============================================================================
// Example: data grid — 10,000 rows, and the frame costs what 30 rows cost.
//
// The table is the workhorse of a database browser, and it is the example
// that needed the viewport tier: `Virtual` builds only the rows on screen,
// `clip` masks the rest from paint AND hit-testing, `Wheel` scrolls under the
// pointer, `pin` keeps rows exactly under the wheel (no spring lag), and the
// header sorts / resizes columns through ordinary intents.
//
// Try: click a header to sort (asc → desc → none) · drag a header edge to
// resize · click / shift-click / ctrl-click rows · arrows, Home/End, PageUp/
// PageDown move the cursor (the list keeps it in view) · ctrl+A selects all ·
// the filter buttons cut the row set — the scroll clamps and the frame cost
// stays flat. The Doc holds ONLY data, sort, selection and cursor: the scroll
// offset is instance-local, so undo never scrolls the grid.
// ============================================================================

import { Flow, grow, Label, mount, Row, Stack, Element, withUndo } from "gratify";
import { Button } from "../shared/widgets";
import { DataGrid, Column } from "../shared/grid";
import {
  clickSelect, EMPTY_SELECTION, nextSort, Selection, selectAll, sortedOrder, SortSpec,
} from "../shared/grid-math";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import gridSource from "../shared/grid.ts?raw";
import mathSource from "../shared/grid-math.ts?raw";

// ── A deterministic 10k-row dataset (a seeded PRNG, so reloads match) ─────────

interface Order { id: number; customer: string; city: string; status: string; qty: number; total: number; placed: string }

const CUSTOMERS = ["Acme Corp", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises", "Hooli", "Vandelay Imports", "Wonka", "Cyberdyne"];
const CITIES = ["Toronto", "Berlin", "Osaka", "Lisbon", "Denver", "Nairobi", "Sydney", "Montréal", "Kraków", "Austin"];
const STATUS = ["open", "paid", "shipped", "returned"];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeOrders(count: number): Order[] {
  const r = rng(7);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  return Array.from({ length: count }, (_, i) => {
    const qty = 1 + Math.floor(r() * 40);
    const day = 1 + Math.floor(r() * 365);
    const date = new Date(2025, 0, day);
    return {
      id: 100000 + i, customer: pick(CUSTOMERS), city: pick(CITIES), status: pick(STATUS),
      qty, total: Math.round(qty * (4 + r() * 300) * 100) / 100,
      placed: date.toISOString().slice(0, 10),
    };
  });
}

const ORDERS = makeOrders(10_000);

// ── Columns: how each field is shown and sorted ───────────────────────────────

const COLUMNS: Column<Order>[] = [
  { key: "id", title: "Order", width: 90, mono: true, cell: (o) => String(o.id) },
  { key: "customer", title: "Customer", width: 170, cell: (o) => o.customer },
  { key: "city", title: "City", width: 120, cell: (o) => o.city },
  { key: "status", title: "Status", width: 90, cell: (o) => o.status },
  { key: "qty", title: "Qty", width: 60, align: "right", mono: true, cell: (o) => String(o.qty) },
  { key: "total", title: "Total", width: 100, align: "right", mono: true, cell: (o) => o.total.toFixed(2) },
  { key: "placed", title: "Placed", width: 110, mono: true, cell: (o) => o.placed },
];

const valueOf = (o: Order, key: string): number | string => o[key as keyof Order];

// ── State ─────────────────────────────────────────────────────────────────────

interface Doc {
  filter: string | null;        // a status, or all
  widths: Record<string, number>;
  sort: SortSpec | null;
  order: number[];              // indices into ORDERS after filter + sort
  selection: Selection;
  cursor: number | null;        // display index
  opened: number | null;        // last activated order id
}

type Intent =
  | { kind: "sort"; key: string }
  | { kind: "filter"; status: string | null }
  | { kind: "resize"; key: string; width: number }
  | { kind: "click"; index: number; shift: boolean; ctrl: boolean }
  | { kind: "cursor"; by: number }
  | { kind: "select-all" }
  | { kind: "open"; index: number };

/** The display order for a filter + sort: O(n log n), on the state clock only. */
function orderFor(filter: string | null, sort: SortSpec | null): number[] {
  const rows = filter ? ORDERS.filter((o) => o.status === filter) : ORDERS;
  return sortedOrder(rows.length, sort && ((i) => valueOf(rows[i], sort.key)), sort?.dir)
    .map((i) => ORDERS.indexOf(rows[i]));
}

const keyAt = (doc: Doc) => (i: number) => String(ORDERS[doc.order[i]].id);

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "sort": {
      const sort = nextSort(doc.sort, intent.key);
      return { ...doc, sort, order: orderFor(doc.filter, sort), cursor: null };
    }
    case "filter":
      return { ...doc, filter: intent.status, order: orderFor(intent.status, doc.sort), cursor: null };
    case "resize":
      return { ...doc, widths: { ...doc.widths, [intent.key]: intent.width } };
    case "click":
      return { ...doc, selection: clickSelect(doc.selection, intent.index, keyAt(doc), intent), cursor: intent.index };
    case "cursor": {
      if (!doc.order.length) return doc;
      const index = Math.max(0, Math.min(doc.order.length - 1, (doc.cursor ?? (intent.by > 0 ? -1 : doc.order.length)) + intent.by));
      return { ...doc, cursor: index, selection: clickSelect(doc.selection, index, keyAt(doc), { shift: false, ctrl: false }) };
    }
    case "select-all":
      return { ...doc, selection: selectAll(doc.order.length, keyAt(doc)) };
    case "open":
      return { ...doc, opened: ORDERS[doc.order[intent.index]].id };
  }
}

// ── View ──────────────────────────────────────────────────────────────────────

function view(doc: Doc): Element {
  const columns = COLUMNS.map((c) => ({ ...c, width: doc.widths[c.key] ?? c.width }));
  const total = doc.selection.keys.size
    ? [...doc.selection.keys].reduce((a, k) => a + (ORDERS[Number(k) - 100000]?.total ?? 0), 0)
    : 0;
  return Stack("root", { gap: 10, pad: 16, align: "stretch" }, [
    Flow("bar", { gap: 8, pad: 0 }, [
      Label("title", { text: "Orders", size: 16, weight: 600, bright: true }),
      Label("n", { text: `${doc.order.length.toLocaleString()} of ${ORDERS.length.toLocaleString()} rows`, dim: true, size: 12 }),
      ...[null, "open", "paid", "shipped", "returned"].map((s) =>
        Button(`f-${s ?? "all"}`, { label: s ?? "all", accent: doc.filter === s, press: { kind: "filter", status: s } })),
      Button("undo", { label: "Undo", press: { kind: "undo" } }),
      Button("redo", { label: "Redo", press: { kind: "redo" } }),
    ]),
    // grow(): the grid takes whatever height the bar and status line leave.
    grow(DataGrid<Order>("grid", {
        columns,
        count: doc.order.length,
        rowAt: (i) => ORDERS[doc.order[i]],
        keyAt: keyAt(doc),
        sort: doc.sort,
        selected: doc.selection.keys,
        cursor: doc.cursor,
        sortBy: (key) => ({ kind: "sort", key }),
        clickRow: (index, mods) => ({ kind: "click", index, shift: mods.shift, ctrl: mods.ctrl }),
        resize: (key, width) => ({ kind: "resize", key, width }),
        moveCursor: (by) => ({ kind: "cursor", by }),
        selectAll: () => ({ kind: "select-all" }),
        activate: (index) => ({ kind: "open", index }),
      })),
    Row("status", { gap: 14 }, [
      Label("sel", { text: `${doc.selection.keys.size} selected · total ${total.toFixed(2)}`, dim: true, size: 12 }),
      Label("cur", { text: doc.cursor === null ? "no cursor" : `cursor at row ${doc.cursor + 1}`, dim: true, size: 12 }),
      Label("open", { text: doc.opened === null ? "Enter opens the cursor row" : `opened order ${doc.opened}`, dim: true, size: 12 }),
      Label("hint", { text: "wheel · drag the bar · headers sort and resize · shift/ctrl click · arrows, PageUp/Down, Home/End, ctrl+A", dim: true, size: 11 }),
    ]),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, withUndo<Doc, Intent>({
  init: {
    filter: null, widths: {}, sort: null, order: orderFor(null, null),
    selection: EMPTY_SELECTION, cursor: null, opened: null,
  },
  update,
  view,
}));

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "grid.ts (shared)", code: gridSource },
  { name: "grid-math.ts (shared)", code: mathSource },
]);
