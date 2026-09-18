// ============================================================================
// Window math — the pure arithmetic behind floating windows: frames, edge
// hit-zones, edge-anchored resizing, magnetic snapping to the desktop, dock
// slots for minimized windows, and the `WindowSet` reducer an app embeds in
// its Doc. No parts, no painter — kernel-testable without a DOM. The parts in
// window.ts are thin over these functions.
// ============================================================================

import { clamp, Rect, v, Vec } from "./core";

/** Where a window sits and how big it is, in desktop coordinates. */
export interface WindowFrame { pos: Vec; size: Vec }

/** normal = at its frame · maximized = fills the desktop · minimized = a pill
 *  in the dock. The frame survives both so restore returns exactly there. */
export type WindowMode = "normal" | "maximized" | "minimized";

/** One window's state as the app stores it. Everything else (active, z-order)
 *  derives from the set's `order`. */
export interface WindowRec { id: string; frame: WindowFrame; mode: WindowMode }

/** Every window, plus their z-order: `order[last]` is topmost. */
export interface WindowSet { order: string[]; byId: Record<string, WindowRec> }

/** What a window's chrome emits. The app passes these through one `to(...)`
 *  prop and usually hands them straight to `reduceWindows`. */
export type WindowEvent =
  | { kind: "focus"; id: string }
  | { kind: "close"; id: string }
  | { kind: "minimize"; id: string }
  | { kind: "restore"; id: string }        // minimized → normal (and raise)
  | { kind: "toggle-max"; id: string }     // normal ⇄ maximized
  | { kind: "frame"; id: string; frame: WindowFrame };   // moved or resized

/** A compass edge or corner of a window frame, for resizing. */
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const emptyWindowSet: WindowSet = { order: [], byId: {} };

export const frameRect = (f: WindowFrame): Rect => new Rect(f.pos.x, f.pos.y, f.size.x, f.size.y);

// ── Edges ─────────────────────────────────────────────────────────────────────

/** Which edge/corner of `r` the point `p` lies on, within `grab` px of the
 *  boundary (inside or outside). Corners win where two bands meet. `null`
 *  means the point is in the interior (or far outside). */
export function edgeAt(r: Rect, p: Vec, grab: number): ResizeEdge | null {
  if (p.x < r.x - grab || p.x > r.right + grab || p.y < r.y - grab || p.y > r.bottom + grab) return null;
  const n = p.y <= r.y + grab, s = p.y >= r.bottom - grab;
  const w = p.x <= r.x + grab, e = p.x >= r.right - grab;
  const ns = n ? "n" : s ? "s" : "";
  const ew = e ? "e" : w ? "w" : "";
  const edge = ns + ew;
  return edge === "" ? null : (edge as ResizeEdge);
}

/** Resize `frame` by dragging `edge` a total of `delta` from where the drag
 *  began. The opposite edge stays put; the frame never shrinks below `min`.
 *  Pure over the ORIGINAL frame, so a drag re-derives from its start state
 *  and never accumulates rounding. */
export function resizeFrame(frame: WindowFrame, edge: ResizeEdge, delta: Vec, min: Vec): WindowFrame {
  let { x, y } = frame.pos;
  let { x: w, y: h } = frame.size;
  if (edge.includes("e")) w = Math.max(min.x, w + delta.x);
  if (edge.includes("s")) h = Math.max(min.y, h + delta.y);
  if (edge.includes("w")) { const nw = Math.max(min.x, w - delta.x); x += w - nw; w = nw; }
  if (edge.includes("n")) { const nh = Math.max(min.y, h - delta.y); y += h - nh; h = nh; }
  return { pos: v(x, y), size: v(w, h) };
}

// ── Placement ─────────────────────────────────────────────────────────────────

/** Snap each side of `frame` to the matching side of `bounds` when within
 *  `threshold` px — the magnetic-edge feel while dragging. Position only. */
export function snapToBounds(frame: WindowFrame, bounds: Rect, threshold: number): WindowFrame {
  const r = frameRect(frame);
  const near = (a: number, b: number) => Math.abs(a - b) <= threshold;
  const x = near(r.x, bounds.x) ? bounds.x : near(r.right, bounds.right) ? bounds.right - r.w : r.x;
  const y = near(r.y, bounds.y) ? bounds.y : near(r.bottom, bounds.bottom) ? bounds.bottom - r.h : r.y;
  return { ...frame, pos: v(x, y) };
}

/** Keep a window reachable: at least `keep` px of its width stays inside
 *  `bounds` horizontally, and its top edge never leaves the bounds' top or
 *  falls below `bounds.bottom - keep`. Position only; size is untouched. */
export function clampFrame(frame: WindowFrame, bounds: Rect, keep: number): WindowFrame {
  const x = clamp(frame.pos.x, bounds.x - frame.size.x + keep, bounds.right - keep);
  const y = clamp(frame.pos.y, bounds.y, Math.max(bounds.y, bounds.bottom - keep));
  return { ...frame, pos: v(x, y) };
}

/** The frame for the n-th window opened at a default spot: a cascade that
 *  steps down-right and wraps after `wrap` windows. */
export function cascadeFrame(index: number, size: Vec, origin: Vec, step = 28, wrap = 8): WindowFrame {
  const k = index % wrap;
  return { pos: v(origin.x + k * step, origin.y + k * step), size };
}

/** The pill rect for the `slot`-th minimized window in a dock along the
 *  bottom of `bounds`, left to right. */
export function dockSlot(bounds: Rect, slot: number, pill: Vec, gap = 8): Rect {
  return new Rect(bounds.x + slot * (pill.x + gap), bounds.bottom - pill.y, pill.x, pill.y);
}

/** Where the desktop places a window: its frame, the whole desktop (`bounds`)
 *  when maximized, or a dock pill when minimized. `slot` is its index among
 *  the minimized windows. */
export function placeWindow(rec: WindowRec, bounds: Rect, slot: number, pill: Vec): Rect {
  switch (rec.mode) {
    case "normal": return frameRect(rec.frame);
    case "maximized": return bounds;
    case "minimized": return dockSlot(bounds, slot, pill);
  }
}

// ── The window set ─────────────────────────────────────────────────────────────

/** Topmost window that is not minimized — the one drawn active. */
export function activeWindowId(set: WindowSet): string | undefined {
  for (let i = set.order.length - 1; i >= 0; i--) {
    const rec = set.byId[set.order[i]];
    if (rec && rec.mode !== "minimized") return rec.id;
  }
  return undefined;
}

/** The ordered records, bottom to top. */
export const windowsOf = (set: WindowSet): WindowRec[] =>
  set.order.map((id) => set.byId[id]).filter((r): r is WindowRec => r !== undefined);

/** Bring `id` to the top of the z-order. Unknown ids are a no-op. */
export function raiseWindow(set: WindowSet, id: string): WindowSet {
  if (!set.byId[id] || set.order[set.order.length - 1] === id) return set;
  return { ...set, order: [...set.order.filter((k) => k !== id), id] };
}

/** Add (or replace) a window and raise it. */
export function openWindow(set: WindowSet, rec: WindowRec): WindowSet {
  return raiseWindow({ order: set.order.includes(rec.id) ? set.order : [...set.order, rec.id], byId: { ...set.byId, [rec.id]: rec } }, rec.id);
}

export function closeWindow(set: WindowSet, id: string): WindowSet {
  if (!set.byId[id]) return set;
  const byId = { ...set.byId };
  delete byId[id];
  return { order: set.order.filter((k) => k !== id), byId };
}

const patch = (set: WindowSet, id: string, f: (r: WindowRec) => WindowRec): WindowSet =>
  set.byId[id] ? { ...set, byId: { ...set.byId, [id]: f(set.byId[id]) } } : set;

/** Apply one chrome event. Focus, restore, and frame changes also raise the
 *  window, so whatever the user touched last is on top. */
export function reduceWindows(set: WindowSet, ev: WindowEvent): WindowSet {
  switch (ev.kind) {
    case "focus": return raiseWindow(set, ev.id);
    case "close": return closeWindow(set, ev.id);
    case "minimize": return patch(set, ev.id, (r) => ({ ...r, mode: "minimized" }));
    case "restore": return raiseWindow(patch(set, ev.id, (r) => ({ ...r, mode: "normal" })), ev.id);
    case "toggle-max":
      return raiseWindow(patch(set, ev.id, (r) => ({ ...r, mode: r.mode === "maximized" ? "normal" : "maximized" })), ev.id);
    case "frame": return raiseWindow(patch(set, ev.id, (r) => ({ ...r, frame: ev.frame })), ev.id);
  }
}
