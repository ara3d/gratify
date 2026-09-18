// ============================================================================
// Virtual — a scrolling list of fixed-height rows that builds only the rows
// its viewport can show. The data-view primitive: a 100k-row table costs the
// same per frame as a 30-row one.
//
// It composes four framework seams rather than adding a special case:
//   • `body(props, children, local, size)` — the window of rows is a function
//     of the scroll offset and the viewport's arranged height;
//   • `local`/`reduce` — the scroll offset is instance-local (undo must never
//     scroll a list; guide §4d litmus test), changed by Local intents from the
//     wheel and the scrollbar;
//   • `clip` on the inner viewport — rows outside it are neither painted nor
//     hittable;
//   • `pin(row)` — rows take their scrolled positions immediately; springs
//     would only lag behind the wheel.
// Row elements are keyed by the app (`row(index)`), so a row that stays on
// screen while others scroll keeps its channels — a hovered row stays lit.
// `reveal` brings a row into view with minimal motion until the user next
// scrolls, which is how a search hit or keyboard selection is kept visible.
// ============================================================================

import { calpha, Rect, v, Vec } from "./core";
import { Local } from "./interact";
import { part } from "./part";
import { at, pin, Element } from "./scene";
import { clampScroll, revealScroll, scrollOfThumb, Thumb, thumbOf, windowOf } from "./scroll";

export interface VirtualProps {
  count: number;
  rowHeight: number;
  /** Build one row; only rows inside the viewport (plus overscan) are ever
   *  asked for. Rows are stretched to the viewport's width and `rowHeight`. */
  row(index: number): Element;
  /** Extra rows built above and below the visible ones. Default 2. */
  overscan?: number;
  /** A row index to keep in view: the list scrolls the minimum distance to
   *  show it, until the user scrolls away. Re-setting the same index after
   *  that does nothing; set a new one to reveal again. */
  reveal?: number;
  /** Width when the container does not constrain it (a Row). Default 320. */
  width?: number;
  /** Height when the container does not constrain it (a Stack). Default 240. */
  height?: number;
  states?: Record<string, boolean>;
}

/** Instance-local scroll state. `revealed` is the `reveal` prop value the
 *  user has already scrolled away from — see `shownScroll`. */
export interface VirtualLocal { scroll: number; revealed?: number }

export type VirtualIntent =
  | { kind: "by"; px: number }     // relative (wheel, page)
  | { kind: "to"; px: number };    // absolute (thumb drag)

const GUTTER = 10;      // scrollbar column at the right edge
const THUMB_W = 6;
const finiteOr = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

/** The scroll offset the list shows: the local one, or — until the user
 *  scrolls after `reveal` changed — the offset that reveals that row. Pure,
 *  shared by the body (what to build) and the reducer (what to scroll from). */
export function shownScroll(
  local: VirtualLocal, props: { count: number; rowHeight: number; reveal?: number }, viewHeight: number,
): number {
  const base = clampScroll(local.scroll, props.count, props.rowHeight, viewHeight);
  if (props.reveal === undefined || local.revealed === props.reveal) return base;
  return revealScroll(props.reveal, props.count, props.rowHeight, viewHeight, base);
}

// ── The viewport: fills its room, clips, lays rows out from their `pos` ──────
interface ViewportProps { width: number; height: number; rowHeight: number; thumb: Thumb | null }

const Viewport = part("virtual-viewport")
  .props<ViewportProps>()
  .measure((p, avail) => v(finiteOr(avail.x, p.width), finiteOr(avail.y, p.height)))
  .arrange((p, r, kids) => {
    const w = r.w - (p.thumb ? GUTTER : 0);
    return kids.map((k) => new Rect(r.x, r.y + (k.pos?.y ?? 0), w, p.rowHeight));
  })
  .clip()
  .style((t, ch) => ({
    track: calpha(t.muted, 0.18),
    thumb: t.mix(calpha(t.muted, 0.9), t.accent, 0.5 * ch.hover),
  }))
  .render((n, p, s) => {
    const t = n.props.thumb;
    if (!t) return;
    const x = n.rect.right - GUTTER + (GUTTER - THUMB_W) / 2;
    p.box(new Rect(x, n.rect.y, THUMB_W, n.rect.h), THUMB_W / 2, s.track);
    p.box(new Rect(x, n.rect.y + t.start, THUMB_W, t.len), THUMB_W / 2, s.thumb);
  });

// ── The list ─────────────────────────────────────────────────────────────────
interface ThumbDrag { y0: number; scroll0: number; page: number; moved: boolean }

const inGutter = (rect: Rect, p: Vec) => p.x >= rect.right - GUTTER;

export const Virtual = part("virtual")
  .props<VirtualProps>()
  .defaults({ overscan: 2, width: 320, height: 240 })
  .local<VirtualLocal>({ scroll: 0 })
  .reduce((l, i: VirtualIntent, n): readonly [VirtualLocal] => {
    const p = n.props, viewH = n.rect.h;
    const to = i.kind === "by" ? shownScroll(l, p, viewH) + i.px : i.px;
    return [{ scroll: clampScroll(to, p.count, p.rowHeight, viewH), revealed: p.reveal }];
  })
  .body((p, _kids, l, size) => {
    const viewH = size.y;
    const scroll = shownScroll(l, p, viewH);
    const w = windowOf(p.count, p.rowHeight, viewH, scroll, p.overscan);
    const rows: Element[] = [];
    for (let i = w.first; i <= w.last; i++)
      rows.push(pin(at(p.row(i), v(0, w.offset + (i - w.first) * p.rowHeight))));
    const thumb = thumbOf(p.count, p.rowHeight, viewH, scroll, viewH);
    // The viewport takes the room it is offered; when the parent leaves an axis
    // unbounded it takes the composite's own arranged size (the parent may
    // still have arranged us to a rect, as a pane does), else the prop fallback.
    const width = size.x || p.width, height = size.y || p.height;
    return [Viewport("viewport", { width, height, rowHeight: p.rowHeight, thumb }, rows)];
  })
  .wheel((_n, d) => Local<VirtualIntent>({ kind: "by", px: d.y }))
  // The scrollbar: press the thumb and drag, or click the track to page. The
  // gesture declines outside the gutter so row presses are untouched.
  .gesture<ThumbDrag>({
    begin(n, p) {
      if (!inGutter(n.rect, p)) return null;
      const props = n.props, viewH = n.rect.h;
      const scroll0 = shownScroll(n.local, props, viewH);
      const t = thumbOf(props.count, props.rowHeight, viewH, scroll0, viewH);
      if (!t) return null;
      const y = p.y - n.rect.y;
      const page = y < t.start ? -1 : y > t.start + t.len ? 1 : 0;
      return { y0: p.y, scroll0, page, moved: false };
    },
    move: (s, _n, p) => (s.moved || Math.abs(p.y - s.y0) > 3 ? { ...s, moved: true } : s),
    during(s, n, p) {
      if (s.page !== 0 || !s.moved) return;
      const props = n.props, viewH = n.rect.h;
      const t0 = thumbOf(props.count, props.rowHeight, viewH, s.scroll0, viewH);
      if (!t0) return;
      const px = scrollOfThumb(t0.start + (p.y - s.y0), props.count, props.rowHeight, viewH, viewH);
      return Local<VirtualIntent>({ kind: "to", px });
    },
    up: (s, n) => (s.page !== 0 && !s.moved ? Local<VirtualIntent>({ kind: "by", px: s.page * n.rect.h }) : undefined),
  })
  .semantics((n) => ({ role: "list", value: n.props.count }));
