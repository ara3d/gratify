// DataGrid — a virtualized table: sortable header, drag-to-resize columns,
// click / shift / ctrl row selection, a keyboard cursor, and one hit target
// per row. It owns no state: rows come in as `rowAt`/`keyAt` accessors over
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
  /** Move the keyboard cursor by `by` rows (Home/End pass ±count; the app
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

/** A typed constructor over the untyped part: `DataGrid<Row>("grid", props)`. */
export const DataGrid = <R>(key: string, props: GridProps<R>): Element => Grid(key, props as GridProps<any>);
