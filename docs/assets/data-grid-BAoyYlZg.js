import{m,S as g,F as w,L as i,i as y,R as k}from"./runtime-BaMoeUMO.js";import{w as f}from"./middleware-DnFxgLOc.js";import{B as c}from"./widgets-BJEltdMZ.js";import{s as b,E as x,D as S,a as v,c as u,n as A}from"./grid-BKhLO1qQ.js";import{a as R}from"./source-panel-CSqvtNlY.js";import"./virtual-CUT1_9te.js";const E=`// ============================================================================
// Example: data grid — 10,000 rows, and the frame costs what 30 rows cost.
//
// The table is the workhorse of a database browser, and it is the example
// that needed the viewport tier: \`Virtual\` builds only the rows on screen,
// \`clip\` masks the rest from paint AND hit-testing, \`Wheel\` scrolls under the
// pointer, \`pin\` keeps rows exactly under the wheel (no spring lag), and the
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
      Label("n", { text: \`\${doc.order.length.toLocaleString()} of \${ORDERS.length.toLocaleString()} rows\`, dim: true, size: 12 }),
      ...[null, "open", "paid", "shipped", "returned"].map((s) =>
        Button(\`f-\${s ?? "all"}\`, { label: s ?? "all", accent: doc.filter === s, press: { kind: "filter", status: s } })),
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
      Label("sel", { text: \`\${doc.selection.keys.size} selected · total \${total.toFixed(2)}\`, dim: true, size: 12 }),
      Label("cur", { text: doc.cursor === null ? "no cursor" : \`cursor at row \${doc.cursor + 1}\`, dim: true, size: 12 }),
      Label("open", { text: doc.opened === null ? "Enter opens the cursor row" : \`opened order \${doc.opened}\`, dim: true, size: 12 }),
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
`,D=`// DataGrid — a virtualized table: sortable header, drag-to-resize columns,
// click / shift / ctrl row selection, a keyboard cursor, and one hit target
// per row. It owns no state: rows come in as \`rowAt\`/\`keyAt\` accessors over
// the app's (already sorted) data, and every interaction leaves as an intent.
//
// Structure (one body composite, two leaves, one Virtual):
//   DataGrid ─ GridFrame ─┬─ Header   (one part for all cells; picks the
//             (focusable) │            column from the pointer)
//                         └─ Virtual ─ GridRow × visible (cells pre-formatted
//                                      on the state clock, fitted at paint)
// The pure arithmetic — spans, selection algebra, sort — is in grid-math.ts.

import {
  calpha, Element, fitText, Focusable, Intentish, Mods, part, rect, Rect, v, Virtual,
} from "gratify";
import { clampColumnW, columnAt, ColumnSpan, columnSpans, nearColumnEdge, SortSpec } from "./grid-math";

export interface Column<R = unknown> {
  key: string;
  title: string;
  width: number;
  align?: "left" | "right";
  mono?: boolean;
  /** The cell text for a row. Called only for rows on screen. */
  cell(row: R): string;
}

export interface GridProps<R = unknown> {
  columns: Column<R>[];
  count: number;
  /** The row at a display index (after the app's own sort/filter). */
  rowAt(index: number): R;
  /** A stable key per row (a primary key) — row identity across sorts. */
  keyAt(index: number): string;
  sort: SortSpec | null;
  selected: ReadonlySet<string>;
  /** The keyboard cursor row, kept in view. */
  cursor: number | null;
  rowHeight?: number;
  /** Fallback size when the container leaves an axis unbounded. */
  width?: number;
  height?: number;
  // ── intents ──
  sortBy(key: string): Intentish;
  clickRow(index: number, mods: Mods): Intentish;
  resize(key: string, width: number): Intentish;
  /** Move the keyboard cursor by \`by\` rows (Home/End pass ±count; the app
   *  clamps). Relative, so a burst of key repeats between frames never reads
   *  a stale cursor from props. */
  moveCursor(by: number): Intentish;
  selectAll?(): Intentish;
  /** Enter on the cursor row. */
  activate?(index: number): Intentish;
  states?: Record<string, boolean>;
}

export const HEADER_H = 28;
const PAD = 8;
const finiteOr = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

// ── A row: all its cells, pre-formatted; states drive the highlight ───────────
interface RowProps {
  index: number;
  cells: string[];
  spans: ColumnSpan[];
  columns: Pick<Column, "align" | "mono">[];
  clickRow(index: number, mods: Mods): Intentish;
  states?: Record<string, boolean>;
}

const GridRow = part("grid-row")
  .props<RowProps>()
  .size(() => v(0, 0))                 // Virtual sizes rows; the leaf never measures
  .style((t, ch, p) => {
    const sel = Math.min(1, ch.sel || 0), cur = Math.min(1, ch.cursor || 0);
    return {
      fill: t.mix(calpha(t.surfaceHi, p.index % 2 ? 0.25 : 0), calpha(t.accent, 0.22), Math.max(sel, 0.45 * ch.hover)),
      edge: calpha(t.accent, 0.85 * cur),
      text: t.mix(t.text, t.textBright, Math.max(sel, ch.hover)),
      rule: calpha(t.muted, 0.35),
    };
  })
  .render((n, p, s) => {
    const r = n.rect, props = n.props;
    p.box(r, 0, s.fill);
    if (s.edge.a > 0.02) p.box(r.inset(0.5), 2, calpha(s.edge, 0), s.edge, 1);
    for (let i = 0; i < props.cells.length; i++) {
      const sp = props.spans[i], col = props.columns[i];
      const text = fitText(p.measure, props.cells[i], sp.w - 2 * PAD, 12);
      const right = col.align === "right";
      p.label(text, v(r.x + sp.x + (right ? sp.w - PAD : PAD), r.center.y), s.text,
        { size: 12, align: right ? "right" : "left", mono: col.mono });
    }
    p.line(v(r.x, r.bottom - 0.5), v(r.right, r.bottom - 0.5), s.rule, 1);
  })
  .press((n, mods) => n.props.clickRow(n.props.index, mods))
  .semantics((n) => ({ role: "row", label: n.props.cells.join(", ") }));

// ── The header: titles, sort arrows, and the resize grips ─────────────────────
interface HeaderProps {
  columns: Pick<Column, "key" | "title" | "align">[];
  spans: ColumnSpan[];
  sort: SortSpec | null;
  sortBy(key: string): Intentish;
  resize(key: string, width: number): Intentish;
}

interface ResizeDrag { key: string; w0: number; x0: number }

const Header = part("grid-header")
  .props<HeaderProps>()
  .size(() => v(0, HEADER_H))
  .style((t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.6),
    text: t.mix(t.textDim, t.text, ch.hover),
    arrow: t.accent,
    grip: t.mix(t.muted, t.accent, ch.hover),
    rule: t.muted,
  }))
  .render((n, p, s) => {
    const r = n.rect, props = n.props;
    p.box(r, 0, s.fill);
    const px = n.pointer ? n.pointer.x - r.x : NaN;
    props.columns.forEach((col, i) => {
      const sp = props.spans[i];
      const right = col.align === "right";
      const sorted = props.sort?.key === col.key;
      const room = sp.w - 2 * PAD - (sorted ? 14 : 0);
      p.label(fitText(p.measure, col.title, room, 12), v(r.x + sp.x + (right ? sp.w - PAD - (sorted ? 14 : 0) : PAD), r.center.y),
        s.text, { size: 12, weight: 600, align: right ? "right" : "left" });
      if (sorted) {
        p.label(props.sort!.dir === "asc" ? "▲" : "▼", v(r.x + sp.x + (right ? sp.w - PAD - 5 : sp.w - PAD - 5), r.center.y),
          s.arrow, { size: 9 });
      }
      const edgeX = r.x + sp.x + sp.w;
      const near = nearColumnEdge(sp, px) ? 1 : 0;
      p.line(v(edgeX - 0.5, r.y + 6), v(edgeX - 0.5, r.bottom - 6), near ? s.grip : s.rule, near ? 2 : 1);
    });
    p.line(v(r.x, r.bottom - 0.5), v(r.right, r.bottom - 0.5), s.rule, 1);
  })
  // Resize begins only on a grip; elsewhere it declines and the press sorts.
  .gesture<ResizeDrag>({
    begin(n, pt) {
      const x = pt.x - n.rect.x;
      const i = n.props.spans.findIndex((sp) => nearColumnEdge(sp, x));
      return i < 0 ? null : { key: n.props.columns[i].key, w0: n.props.spans[i].w, x0: pt.x };
    },
    during: (st, n, pt) => n.props.resize(st.key, clampColumnW(st.w0 + (pt.x - st.x0))),
  })
  .press((n) => {
    const i = columnAt(n.props.spans, (n.pointer?.x ?? -1) - n.rect.x);
    return i < 0 ? undefined : n.props.sortBy(n.props.columns[i].key);
  })
  .semantics(() => ({ role: "rowheader" }));

// ── The frame: header on top, rows below; fills its room ──────────────────────
const GridFrame = part("grid-frame")
  .props<{ width: number; height: number }>()
  .measure((p, avail) => v(finiteOr(avail.x, p.width), finiteOr(avail.y, p.height)))
  .arrange((_p, r) => [
    rect(r.x, r.y, r.w, HEADER_H),
    rect(r.x, r.y + HEADER_H, r.w, Math.max(0, r.h - HEADER_H)),
  ])
  .clip()
  .style((t, ch) => ({ fill: t.surface, edge: t.mix(t.muted, t.accent, 0.7 * ch.focus) }))
  .render((n, p, s) => p.box(n.rect, 6, s.fill, s.edge, 1));

// ── The grid ──────────────────────────────────────────────────────────────────
const Grid = part("data-grid")
  .props<GridProps<any>>()
  .defaults({ rowHeight: 26, width: 480, height: 320 })
  .body((p, _kids, _l, size) => {
    const spans = columnSpans(p.columns.map((c) => c.width));
    const meta = p.columns.map((c) => ({ align: c.align, mono: c.mono }));
    const row = (i: number): Element => {
      const r = p.rowAt(i);
      return GridRow(p.keyAt(i), {
        index: i,
        cells: p.columns.map((c) => c.cell(r)),
        spans, columns: meta, clickRow: p.clickRow,
        states: { sel: p.selected.has(p.keyAt(i)), cursor: p.cursor === i },
      });
    };
    return [GridFrame("frame", { width: size.x || p.width, height: size.y || p.height }, [
      Header("head", { columns: p.columns, spans, sort: p.sort, sortBy: p.sortBy, resize: p.resize }),
      Virtual("rows", {
        count: p.count, rowHeight: p.rowHeight, row,
        reveal: p.cursor ?? undefined,
        width: p.width, height: p.height - HEADER_H,
      }),
    ])];
  })
  .on(Focusable())
  .keys({
    ArrowDown: (n) => n.props.moveCursor(1),
    ArrowUp: (n) => n.props.moveCursor(-1),
    Home: (n) => n.props.moveCursor(-n.props.count),
    End: (n) => n.props.moveCursor(n.props.count),
    PageDown: (n) => n.props.moveCursor(pageRows(n.rect, n.props.rowHeight)),
    PageUp: (n) => n.props.moveCursor(-pageRows(n.rect, n.props.rowHeight)),
    Enter: (n) => (n.props.cursor === null ? undefined : n.props.activate?.(n.props.cursor)),
    a: (n, mods) => (mods.ctrl ? n.props.selectAll?.() : undefined),
  })
  .semantics((n) => ({ role: "grid", value: n.props.count }));

const pageRows = (r: Rect, rowHeight: number) => Math.max(1, Math.floor((r.h - HEADER_H) / rowHeight) - 1);

/** A typed constructor over the untyped part: \`DataGrid<Row>("grid", props)\`. */
export const DataGrid = <R>(key: string, props: GridProps<R>): Element => Grid(key, props as GridProps<any>);
`,C=`// Pure arithmetic under the data grid (grid.ts): column placement, the
// selection algebra for click / shift-click / ctrl-click, and a stable sort
// over row indices. No framework imports — kernel-tested on its own.

/** A column's placed span along the row. */
export interface ColumnSpan { x: number; w: number }

export const MIN_COLUMN_W = 40;

/** Left edges and widths of columns laid end to end from \`x0\`. */
export function columnSpans(widths: readonly number[], x0 = 0): ColumnSpan[] {
  const out: ColumnSpan[] = [];
  let x = x0;
  for (const w of widths) { out.push({ x, w }); x += w; }
  return out;
}

/** The column whose span contains \`x\`, or -1. */
export function columnAt(spans: readonly ColumnSpan[], x: number): number {
  return spans.findIndex((s) => x >= s.x && x < s.x + s.w);
}

/** Is \`x\` within \`grip\` px of the right edge of column \`i\`? (resize handle) */
export const nearColumnEdge = (span: ColumnSpan, x: number, grip = 5): boolean =>
  Math.abs(x - (span.x + span.w)) <= grip;

/** A width clamped to the minimum a column may shrink to. */
export const clampColumnW = (w: number): number => Math.max(MIN_COLUMN_W, Math.round(w));

/** The selection of a list, as row keys plus the anchor a shift-click extends
 *  from. Immutable: every operation returns a new selection. */
export interface Selection {
  keys: ReadonlySet<string>;
  /** Index of the row the last plain/ctrl click landed on. */
  anchor: number | null;
}

export const EMPTY_SELECTION: Selection = { keys: new Set(), anchor: null };

/** Apply a click on row \`index\` (whose key is \`keyAt(index)\`) with modifiers:
 *  plain = select only it; ctrl = toggle it; shift = select the range from the
 *  anchor (ctrl+shift adds the range). Rows are addressed through \`keyAt\` so
 *  a 100k-row table never materializes a key array. */
export function clickSelect(
  sel: Selection, index: number, keyAt: (i: number) => string,
  mods: { shift: boolean; ctrl: boolean },
): Selection {
  const key = keyAt(index);
  if (mods.shift && sel.anchor !== null) {
    const lo = Math.min(sel.anchor, index), hi = Math.max(sel.anchor, index);
    const keys = new Set(mods.ctrl ? sel.keys : []);
    for (let i = lo; i <= hi; i++) keys.add(keyAt(i));
    return { keys, anchor: sel.anchor };
  }
  if (mods.ctrl) {
    const keys = new Set(sel.keys);
    if (keys.has(key)) keys.delete(key); else keys.add(key);
    return { keys, anchor: index };
  }
  return { keys: new Set([key]), anchor: index };
}

/** Select rows \`[0, count)\`. */
export function selectAll(count: number, keyAt: (i: number) => string): Selection {
  const keys = new Set<string>();
  for (let i = 0; i < count; i++) keys.add(keyAt(i));
  return { keys, anchor: 0 };
}

export type SortDir = "asc" | "desc";
export interface SortSpec { key: string; dir: SortDir }

/** The next sort when a header is clicked: a new column sorts ascending; the
 *  same column flips; a third click on a flipped column clears the sort. */
export function nextSort(cur: SortSpec | null, key: string): SortSpec | null {
  if (!cur || cur.key !== key) return { key, dir: "asc" };
  return cur.dir === "asc" ? { key, dir: "desc" } : null;
}

/** Row indices \`[0, count)\` ordered by \`valueAt\`, stable, numbers before
 *  strings, nulls last. O(n log n); for a stale \`null\` sort returns identity. */
export function sortedOrder(
  count: number, valueAt: ((i: number) => number | string | null | undefined) | null, dir: SortDir = "asc",
): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  if (!valueAt) return order;
  const sign = dir === "asc" ? 1 : -1;
  const values = order.map(valueAt);
  order.sort((a, b) => sign * compare(values[a], values[b]) || a - b);
  return order;
}

function compare(a: number | string | null | undefined, b: number | string | null | undefined): number {
  const an = a == null, bn = b == null;
  if (an || bn) return an && bn ? 0 : an ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}
`,O=["Acme Corp","Globex","Initech","Umbrella","Stark Industries","Wayne Enterprises","Hooli","Vandelay Imports","Wonka","Cyberdyne"],z=["Toronto","Berlin","Osaka","Lisbon","Denver","Nairobi","Sydney","Montréal","Kraków","Austin"],M=["open","paid","shipped","returned"];function T(e){return()=>(e=e*1664525+1013904223>>>0,e/4294967296)}function I(e){const t=T(7),r=n=>n[Math.floor(t()*n.length)];return Array.from({length:e},(n,o)=>{const l=1+Math.floor(t()*40),p=1+Math.floor(t()*365),h=new Date(2025,0,p);return{id:1e5+o,customer:r(O),city:r(z),status:r(M),qty:l,total:Math.round(l*(4+t()*300)*100)/100,placed:h.toISOString().slice(0,10)}})}const s=I(1e4),H=[{key:"id",title:"Order",width:90,mono:!0,cell:e=>String(e.id)},{key:"customer",title:"Customer",width:170,cell:e=>e.customer},{key:"city",title:"City",width:120,cell:e=>e.city},{key:"status",title:"Status",width:90,cell:e=>e.status},{key:"qty",title:"Qty",width:60,align:"right",mono:!0,cell:e=>String(e.qty)},{key:"total",title:"Total",width:100,align:"right",mono:!0,cell:e=>e.total.toFixed(2)},{key:"placed",title:"Placed",width:110,mono:!0,cell:e=>e.placed}],P=(e,t)=>e[t];function d(e,t){const r=e?s.filter(n=>n.status===e):s;return b(r.length,t&&(n=>P(r[n],t.key)),t==null?void 0:t.dir).map(n=>s.indexOf(r[n]))}const a=e=>t=>String(s[e.order[t]].id);function L(e,t){switch(t.kind){case"sort":{const r=A(e.sort,t.key);return{...e,sort:r,order:d(e.filter,r),cursor:null}}case"filter":return{...e,filter:t.status,order:d(t.status,e.sort),cursor:null};case"resize":return{...e,widths:{...e.widths,[t.key]:t.width}};case"click":return{...e,selection:u(e.selection,t.index,a(e),t),cursor:t.index};case"cursor":{if(!e.order.length)return e;const r=Math.max(0,Math.min(e.order.length-1,(e.cursor??(t.by>0?-1:e.order.length))+t.by));return{...e,cursor:r,selection:u(e.selection,r,a(e),{shift:!1,ctrl:!1})}}case"select-all":return{...e,selection:v(e.order.length,a(e))};case"open":return{...e,opened:s[e.order[t.index]].id}}}function U(e){const t=H.map(n=>({...n,width:e.widths[n.key]??n.width})),r=e.selection.keys.size?[...e.selection.keys].reduce((n,o)=>{var l;return n+(((l=s[Number(o)-1e5])==null?void 0:l.total)??0)},0):0;return g("root",{gap:10,pad:16,align:"stretch"},[w("bar",{gap:8,pad:0},[i("title",{text:"Orders",size:16,weight:600,bright:!0}),i("n",{text:`${e.order.length.toLocaleString()} of ${s.length.toLocaleString()} rows`,dim:!0,size:12}),...[null,"open","paid","shipped","returned"].map(n=>c(`f-${n??"all"}`,{label:n??"all",accent:e.filter===n,press:{kind:"filter",status:n}})),c("undo",{label:"Undo",press:{kind:"undo"}}),c("redo",{label:"Redo",press:{kind:"redo"}})]),y(S("grid",{columns:t,count:e.order.length,rowAt:n=>s[e.order[n]],keyAt:a(e),sort:e.sort,selected:e.selection.keys,cursor:e.cursor,sortBy:n=>({kind:"sort",key:n}),clickRow:(n,o)=>({kind:"click",index:n,shift:o.shift,ctrl:o.ctrl}),resize:(n,o)=>({kind:"resize",key:n,width:o}),moveCursor:n=>({kind:"cursor",by:n}),selectAll:()=>({kind:"select-all"}),activate:n=>({kind:"open",index:n})})),k("status",{gap:14},[i("sel",{text:`${e.selection.keys.size} selected · total ${r.toFixed(2)}`,dim:!0,size:12}),i("cur",{text:e.cursor===null?"no cursor":`cursor at row ${e.cursor+1}`,dim:!0,size:12}),i("open",{text:e.opened===null?"Enter opens the cursor row":`opened order ${e.opened}`,dim:!0,size:12}),i("hint",{text:"wheel · drag the bar · headers sort and resize · shift/ctrl click · arrows, PageUp/Down, Home/End, ctrl+A",dim:!0,size:11})])])}const G=document.getElementById("c");m(G,f({init:{filter:null,widths:{},sort:null,order:d(null,null),selection:x,cursor:null,opened:null},update:L,view:U}));R([{name:"main.ts",code:E},{name:"grid.ts (shared)",code:D},{name:"grid-math.ts (shared)",code:C}]);
