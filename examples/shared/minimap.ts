// Minimap — a screen-layer overview of a world-space graph: every node as a
// small box, the current viewport as a frame, kept in sync every frame from
// `node.view` (the runtime's live pan/zoom) — no state, no wiring. Plus Dock,
// a screen-layer container that pins its child to a corner of the viewport.
//
// Navigation by clicking the map is an extension point: the viewport is
// runtime-owned, so it would need a "pan to" intent surface first.

import { calpha, Color, hsl, part, rect, Rect, v, Vec } from "gratify";

export interface MinimapItem { id: string; rect: Rect; hue?: number; selected?: boolean }

export interface MinimapProps {
  items: MinimapItem[];
  width?: number;
  height?: number;
}

/** Map a world rect onto the map's inner box with uniform scale, centered. */
export function mapTransform(world: Rect, box: Rect): { scale: number; ox: number; oy: number } {
  const scale = Math.min(box.w / Math.max(1, world.w), box.h / Math.max(1, world.h));
  return {
    scale,
    ox: box.x + (box.w - world.w * scale) / 2 - world.x * scale,
    oy: box.y + (box.h - world.h * scale) / 2 - world.y * scale,
  };
}

const unionWith = (a: Rect | null, b: Rect): Rect => {
  if (!a) return b;
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return rect(x, y, Math.max(a.right, b.right) - x, Math.max(a.bottom, b.bottom) - y);
};

export const Minimap = part("minimap")
  .props<MinimapProps>()
  .defaults({ width: 180, height: 120 })
  .size((p) => v(p.width, p.height))
  .style((t, ch) => ({
    fill: calpha(t.bg, 0.8 + 0.15 * ch.hover),
    edge: t.mix(t.muted, t.accent, 0.4 * ch.hover),
    node: t.muted,
    view: calpha(t.accent, 0.9),
    viewFill: calpha(t.accent, 0.08),
  }))
  .render((n, p, s) => {
    const r = n.rect, view = n.view;
    p.box(r, 8, s.fill, s.edge, 1);
    if (!view) return;
    // the world extent the map shows: every node plus the viewport itself
    const vp = rect(-view.pan.x / view.zoom, -view.pan.y / view.zoom, view.w / view.zoom, view.h / view.zoom);
    const world = n.props.items.reduce<Rect | null>((acc, it) => unionWith(acc, it.rect), vp)!;
    const m = mapTransform(world, r.inset(8));
    const px = (q: Vec) => v(m.ox + q.x * m.scale, m.oy + q.y * m.scale);
    for (const it of n.props.items) {
      const a = px(v(it.rect.x, it.rect.y));
      const color: Color = it.hue === undefined ? s.node : hsl(it.hue, 0.6, it.selected ? 0.7 : 0.5);
      p.box(rect(a.x, a.y, Math.max(2, it.rect.w * m.scale), Math.max(2, it.rect.h * m.scale)), 1, color);
    }
    const a = px(v(vp.x, vp.y));
    p.box(rect(a.x, a.y, vp.w * m.scale, vp.h * m.scale), 2, s.viewFill, s.view, 1);
  })
  .semantics((n) => ({ role: "img", label: `minimap of ${n.props.items.length} nodes` }));

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Fills the viewport (screen layer) and pins its one child to a corner. */
export const Dock = part("dock")
  .props<{ corner?: Corner; margin?: number }>()
  .defaults({ corner: "bottom-right" as Corner, margin: 12 })
  .fill()
  .arrange((p, r, kids) => kids.map((k) => {
    const x = p.corner.endsWith("right") ? r.right - p.margin - k.size.x : r.x + p.margin;
    const y = p.corner.startsWith("bottom") ? r.bottom - p.margin - k.size.y : r.y + p.margin;
    return rect(x, y, k.size.x, k.size.y);
  }));
