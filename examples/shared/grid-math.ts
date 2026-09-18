// Pure arithmetic under the data grid (grid.ts): column placement, the
// selection algebra for click / shift-click / ctrl-click, and a stable sort
// over row indices. No framework imports — kernel-tested on its own.

/** A column's placed span along the row. */
export interface ColumnSpan { x: number; w: number }

export const MIN_COLUMN_W = 40;

/** Left edges and widths of columns laid end to end from `x0`. */
export function columnSpans(widths: readonly number[], x0 = 0): ColumnSpan[] {
  const out: ColumnSpan[] = [];
  let x = x0;
  for (const w of widths) { out.push({ x, w }); x += w; }
  return out;
}

/** The column whose span contains `x`, or -1. */
export function columnAt(spans: readonly ColumnSpan[], x: number): number {
  return spans.findIndex((s) => x >= s.x && x < s.x + s.w);
}

/** Is `x` within `grip` px of the right edge of column `i`? (resize handle) */
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

/** Apply a click on row `index` (whose key is `keyAt(index)`) with modifiers:
 *  plain = select only it; ctrl = toggle it; shift = select the range from the
 *  anchor (ctrl+shift adds the range). Rows are addressed through `keyAt` so
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

/** Select rows `[0, count)`. */
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

/** Row indices `[0, count)` ordered by `valueAt`, stable, numbers before
 *  strings, nulls last. O(n log n); for a stale `null` sort returns identity. */
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
