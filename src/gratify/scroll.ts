// ============================================================================
// Scroll arithmetic for fixed-height rows — the pure kernel under `Virtual`
// (virtual.ts) and anything else that scrolls a uniform list: extent, clamp,
// the visible window, minimal-motion reveal, and the scrollbar thumb mapping
// in both directions. No scene, no DOM; every function is a total function of
// its numbers, so a scrolling widget's behavior is testable without a runtime.
// ============================================================================

import { clamp } from "./core";

/** The rows worth building this frame, and where the first of them sits. */
export interface ScrollWindow {
  first: number;
  /** The last row in the window, or `first - 1` when there are none. */
  last: number;
  /** Where row `first` is drawn, relative to the top of the viewport (≤ 0). */
  offset: number;
}

/** How tall the whole list would be if every row were drawn. */
export const extentOf = (count: number, rowHeight: number): number =>
  Math.max(0, count) * rowHeight;

/** The furthest a list can scroll before its last row sits on the bottom edge. */
export const maxScroll = (count: number, rowHeight: number, viewHeight: number): number =>
  Math.max(0, extentOf(count, rowHeight) - viewHeight);

/** A scroll offset brought back inside the list (NaN/Infinity read as 0). */
export const clampScroll = (scroll: number, count: number, rowHeight: number, viewHeight: number): number =>
  clamp(Number.isFinite(scroll) ? scroll : 0, 0, maxScroll(count, rowHeight, viewHeight));

/** The rows on screen at a scroll offset, plus `overscan` rows on each side so
 *  a fast scroll never shows a gap. An empty list gives an empty window. */
export function windowOf(
  count: number, rowHeight: number, viewHeight: number, scroll: number, overscan = 1,
): ScrollWindow {
  if (count <= 0 || rowHeight <= 0) return { first: 0, last: -1, offset: 0 };
  const top = clampScroll(scroll, count, rowHeight, viewHeight);
  const first = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const last = Math.min(count - 1, Math.ceil((top + viewHeight) / rowHeight) - 1 + overscan);
  return { first, last, offset: first * rowHeight - top };
}

/** The scroll offset that brings `index` fully into view, moving as little as
 *  possible (none at all when it is already visible). */
export function revealScroll(
  index: number, count: number, rowHeight: number, viewHeight: number, scroll: number,
): number {
  const top = clamp(index, 0, Math.max(0, count - 1)) * rowHeight;
  const bottom = top + rowHeight;
  const wanted = top < scroll ? top : bottom > scroll + viewHeight ? bottom - viewHeight : scroll;
  return clampScroll(wanted, count, rowHeight, viewHeight);
}

/** A scrollbar thumb along a track of `trackLen` px. */
export interface Thumb { start: number; len: number }

/** The thumb for a scroll state, or null when the content fits (no bar). The
 *  thumb never shrinks below `minLen`, so a 100k-row list still shows a grip. */
export function thumbOf(
  count: number, rowHeight: number, viewHeight: number, scroll: number, trackLen: number, minLen = 24,
): Thumb | null {
  const extent = extentOf(count, rowHeight);
  const max = maxScroll(count, rowHeight, viewHeight);
  if (max <= 0 || trackLen <= 0) return null;
  const len = clamp((viewHeight / extent) * trackLen, Math.min(minLen, trackLen), trackLen);
  const start = (clampScroll(scroll, count, rowHeight, viewHeight) / max) * (trackLen - len);
  return { start, len };
}

/** The inverse of `thumbOf`: the scroll offset for a thumb start position —
 *  what a thumb drag emits. Total: outside the track clamps. */
export function scrollOfThumb(
  thumbStart: number, count: number, rowHeight: number, viewHeight: number, trackLen: number, minLen = 24,
): number {
  const t = thumbOf(count, rowHeight, viewHeight, 0, trackLen, minLen);
  if (!t) return 0;
  const travel = trackLen - t.len;
  const frac = travel > 0 ? clamp(thumbStart / travel, 0, 1) : 0;
  return frac * maxScroll(count, rowHeight, viewHeight);
}
