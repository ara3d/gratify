// ============================================================================
// Example: magnify — a bouncing lens that magnifies whatever is under it.
//
// A circular lens drifts around the canvas on its own (a Lissajous bounce, a
// function of GNode.time). Tiles that fall under it swell up and spread apart,
// like a magnifying glass over a grid. Move your mouse over the canvas to grab
// the lens; move it away and the lens resumes bouncing.
//
// The whole scene is ONE part. Its render:
//   1. figures out where the lens is (pointer, or the time-based bounce),
//   2. draws every tile, applying a fisheye transform to the ones inside the
//      lens (bigger, and pushed outward to make room),
//   3. draws the glass lens on top.
//
// Because the lens never stops moving, the app opts into `ambient: () => true`
// so the render-on-demand loop stays awake.
// ============================================================================

import {
  calpha, clamp, hsl, mount, Painter, part, rect, Rect, rgb, v, Vec, vdist,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── Tuning ──────────────────────────────────────────────────────────────────

const TILE_SPACING = 60;
const TILE_SIZE = 42;
const LENS_RADIUS = 115;
const MAX_MAGNIFICATION = 2.5;
const SPREAD = LENS_RADIUS * 0.16;   // how far magnified tiles push outward

const smoothstep = (t: number) => t * t * (3 - 2 * t);

// ── The stage ─────────────────────────────────────────────────────────────────
//
// This part has no props and no state — everything it draws is a function of
// its rect, the pointer, and the clock. Returning v(0,0) from size() lets the
// runtime stretch it to fill the whole canvas.

const MagnifyStage = part<Record<string, never>>("magnify-stage", {

  size: () => v(0, 0),

  render(node, paint) {
    const area = node.rect;
    const time = node.time ?? 0;

    // 1. Where is the lens? Follow the pointer if the mouse is over the canvas;
    //    otherwise trace a smooth bouncing path from the clock.
    const marginX = LENS_RADIUS + 20;
    const marginY = LENS_RADIUS + 20;
    const bounce: Vec = v(
      area.center.x + (area.w / 2 - marginX) * Math.sin(time * 0.7),
      area.center.y + (area.h / 2 - marginY) * Math.sin(time * 1.06 + 1.3),
    );
    const lens: Vec = node.pointer
      ? v(clamp(node.pointer.x, area.x, area.right), clamp(node.pointer.y, area.y, area.bottom))
      : bounce;

    // 2. Draw the tile grid, magnifying tiles inside the lens.
    const cols = Math.ceil(area.w / TILE_SPACING);
    const rows = Math.ceil(area.h / TILE_SPACING);
    const originX = area.x + (area.w - (cols - 1) * TILE_SPACING) / 2;
    const originY = area.y + (area.h - (rows - 1) * TILE_SPACING) / 2;

    let tileNumber = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tileNumber++;
        const home = v(originX + col * TILE_SPACING, originY + row * TILE_SPACING);

        const distance = vdist(home, lens);
        let center = home;
        let magnification = 1;

        if (distance < LENS_RADIUS) {
          const t = distance / LENS_RADIUS;                  // 0 center … 1 rim
          magnification = 1 + (MAX_MAGNIFICATION - 1) * (1 - smoothstep(t));
          if (distance > 0.001) {
            const direction = v((home.x - lens.x) / distance, (home.y - lens.y) / distance);
            const push = (magnification - 1) * SPREAD;
            center = v(home.x + direction.x * push, home.y + direction.y * push);
          }
        }

        drawTile(paint, center, TILE_SIZE * magnification, tileNumber, magnification);
      }
    }

    // 3. The glass: a faint fill, a bright rim, and a highlight arc.
    paint.dot(lens, LENS_RADIUS, calpha(rgb(255, 255, 255), 0.05));
    paint.ring(lens, LENS_RADIUS, calpha(rgb(255, 255, 255), 0.85), 3);
    paint.ring(lens, LENS_RADIUS - 4, calpha(rgb(120, 190, 255), 0.5), 2);
    // a small glint, up and to the left
    paint.dot(v(lens.x - LENS_RADIUS * 0.35, lens.y - LENS_RADIUS * 0.4), 6, calpha(rgb(255, 255, 255), 0.7));
  },
});

/** Draw one tile: a rounded square with a number, colored by its index. */
function drawTile(paint: Painter, center: Vec, size: number, index: number, magnification: number) {
  const half = size / 2;
  const r: Rect = rect(center.x - half, center.y - half, size, size);
  const hue = (index * 33) % 360;
  const lightness = 0.42 + 0.12 * (magnification - 1);   // magnified tiles brighten
  const fill = hsl(hue, 0.55, lightness);
  paint.box(r, Math.max(3, size * 0.18), fill, calpha(rgb(255, 255, 255), 0.15 * magnification), 1);
  paint.label(String(index), center, rgb(255, 255, 255), { size: Math.max(9, size * 0.32), weight: 600 });
}

// ── App ────────────────────────────────────────────────────────────────────────

type MagnifyDoc = Record<string, never>;
type MagnifyIntent = { kind: "noop" };

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {},
  update: (doc: MagnifyDoc, _intent: MagnifyIntent) => doc,
  view: () => MagnifyStage("root", {}),
  ambient: () => true,   // the lens bounces forever — never sleep
});

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
