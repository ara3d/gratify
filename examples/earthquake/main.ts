// ============================================================================
// Example: earthquake — click anywhere to shake the world apart.
//
// A skyline of brick towers sits on the ground. Click (repeatedly!) to trigger
// tremors: the taller a brick, the more it sways — like a real building whipping
// at the top — dust flies off the ground, and the Richter readout climbs.
//
// This demo is entirely TIME-BASED, which is worth studying:
//   • The tremor is a pure function of GNode.time. Its intensity decays as
//     `magnitude * exp(-elapsed * DECAY)`, and its oscillation is `sin(time*…)`.
//     Nothing is stored frame-to-frame; render just reads the clock.
//   • Because that motion never changes any channel, the runtime's rest
//     detector can't see it — so the app opts into `ambient`, returning true
//     while a quake is still settling and false once it's calm. That is what
//     keeps the loop awake during a purely time-driven animation.
//   • The intent carries the click's timestamp (node.time), keeping update a
//     pure function; repeated clicks ADD to the magnitude that was left.
// ============================================================================

import {
  burst, calpha, clamp, hsl, mount, part, Press, rect, rgb, v, Vec,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── Tuning ──────────────────────────────────────────────────────────────────

const TOWER_COUNT = 7;
const BRICKS_PER_TOWER = 6;
const BRICK_WIDTH = 48;
const BRICK_HEIGHT = 22;
const BRICK_GAP = 3;
const CLICK_KICK = 0.5;         // how much intensity each click adds (0..1)
const DECAY = 0.5;              // how fast a quake calms, per second
const SETTLE_SECONDS = 8;       // keep the loop awake this long after a click

// ── State ─────────────────────────────────────────────────────────────────────
//
// We store the intensity at the moment of the last click and when that was, in
// GNode.time seconds. The live intensity is derived from those + the clock.

interface QuakeDocument {
  intensityAtLastShake: number;   // 0..1
  lastShakeTime: number;          // seconds (GNode.time)
  quakes: number;
}

type QuakeIntent = { kind: "shake"; time: number };

/** Intensity right now, decayed from the last shake. */
function intensityAt(document: QuakeDocument, time: number): number {
  const elapsed = time - document.lastShakeTime;
  if (elapsed < 0) return 0;
  return document.intensityAtLastShake * Math.exp(-elapsed * DECAY);
}

function update(document: QuakeDocument, intent: QuakeIntent): QuakeDocument {
  // Add the kick to whatever intensity is LEFT over from earlier — so rapid
  // clicks stack into a bigger quake.
  const leftover = intensityAt(document, intent.time);
  return {
    intensityAtLastShake: clamp(leftover + CLICK_KICK, 0, 1),
    lastShakeTime: intent.time,
    quakes: document.quakes + 1,
  };
}

// ── The stage ─────────────────────────────────────────────────────────────────

interface StageProps {
  intensityAtLastShake: number;
  lastShakeTime: number;
  quakes: number;
}

const EarthquakeStage = part<StageProps>("earthquake-stage", {

  size: () => v(0, 0),   // fill the canvas
  hit: () => true,       // the whole stage is clickable

  render(node, paint) {
    const area = node.rect;
    const time = node.time ?? 0;

    const elapsed = time - node.props.lastShakeTime;
    const intensity = elapsed < 0 ? 0
      : node.props.intensityAtLastShake * Math.exp(-elapsed * DECAY);

    // A whole-scene jitter that everything inherits.
    const globalShake = v(
      Math.sin(time * 31) * intensity * 7,
      Math.cos(time * 27) * intensity * 4,
    );

    const groundY = area.bottom - 70;
    const towerSpacing = area.w / (TOWER_COUNT + 1);

    // The towers.
    for (let towerIndex = 0; towerIndex < TOWER_COUNT; towerIndex++) {
      const baseX = area.x + towerSpacing * (towerIndex + 1);
      const towerPhase = towerIndex * 1.7;
      const hue = (towerIndex * 40 + 200) % 360;

      for (let brickIndex = 0; brickIndex < BRICKS_PER_TOWER; brickIndex++) {
        // Taller bricks sway further (heightFraction 0 at ground → 1 at top).
        const heightFraction = brickIndex / (BRICKS_PER_TOWER - 1);
        const swayAmplitude = intensity * 26 * heightFraction;
        const sway = Math.sin(time * 9 + towerPhase + heightFraction * 2.5) * swayAmplitude;

        const brickCenterX = baseX + sway + globalShake.x;
        const brickBottom = groundY - brickIndex * (BRICK_HEIGHT + BRICK_GAP) + globalShake.y;
        const brickRect = rect(
          brickCenterX - BRICK_WIDTH / 2,
          brickBottom - BRICK_HEIGHT,
          BRICK_WIDTH, BRICK_HEIGHT);

        const light = 0.5 - 0.05 * brickIndex;
        paint.box(brickRect, 3, hsl(hue, 0.45, light), calpha(rgb(0, 0, 0), 0.3), 1);
      }
    }

    // The ground.
    paint.box(rect(area.x, groundY, area.w, area.bottom - groundY), 0, hsl(30, 0.25, 0.22));
    paint.line(v(area.x, groundY), v(area.right, groundY), calpha(rgb(0, 0, 0), 0.4), 2);

    // Cracks spread across the ground as the quake intensifies.
    if (intensity > 0.35) {
      const crackAlpha = calpha(rgb(0, 0, 0), (intensity - 0.35) * 0.9);
      let x = area.x + 40;
      const points: Vec[] = [v(x, groundY + 20)];
      while (x < area.right - 40) {
        x += 28;
        points.push(v(x, groundY + 14 + Math.sin(x * 0.3 + time * 6) * 10 * intensity));
      }
      for (let i = 1; i < points.length; i++) paint.line(points[i - 1], points[i], crackAlpha, 1.5);
    }

    // A red danger wash at high intensity.
    if (intensity > 0.5) {
      paint.box(area, 0, calpha(rgb(255, 60, 40), (intensity - 0.5) * 0.18));
    }

    // Readout.
    const magnitude = (intensity * 9).toFixed(1);
    const readoutColor = intensity > 0.05
      ? hsl(20 - 20 * intensity, 0.85, 0.6)
      : calpha(rgb(255, 255, 255), 0.35);
    paint.label(`RICHTER  M ${magnitude}`,
      v(area.center.x + globalShake.x, area.y + 60), readoutColor, { size: 30, weight: 700 });
    paint.label(
      intensity > 0.05 ? `${node.props.quakes} quakes triggered` : "click anywhere to shake",
      v(area.center.x, area.y + 95), calpha(rgb(255, 255, 255), 0.5), { size: 13 });
  },

  on: [
    Press((node) => {
      // Kick up dust along the ground near the click.
      const origin = node.pointer ?? node.rect.center;
      const groundY = node.rect.bottom - 70;
      for (let i = 0; i < 3; i++) {
        node.spawn?.(burst(v(origin.x + (i - 1) * 40, groundY), hsl(35, 0.3, 0.55)));
      }
      return { kind: "shake", time: node.time ?? 0 };
    }),
  ],
});

// ── App ────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { intensityAtLastShake: 0, lastShakeTime: -999, quakes: 0 },
  update,
  view: (document) => EarthquakeStage("root", document),
  // Keep the loop awake while a quake is still settling — the shake is a pure
  // function of the clock, invisible to the channel-based rest detector.
  ambient: (document, time) => time - document.lastShakeTime < SETTLE_SECONDS,
});

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
