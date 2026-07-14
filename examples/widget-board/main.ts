// ============================================================================
// Example: widget board — a dozen-plus creative-tool controls, reimplemented
// from the Kea node editor's widget library.
//
// Everything here sits on a pannable canvas (drag empty space to pan, wheel to
// zoom — the surface is a part with Pan(), exactly like the node editor). Each
// widget is ONE part() definition: it draws its own card, and it reads the
// pointer in world coordinates to drive its gesture. The controls shown:
//
//   Slider · Range · Number scrub · Knob · Angle dial · Angle range ·
//   XY pad (vector 2) · Box 2D (bounds) · Box 3D (orbit cube) · Color wheel ·
//   Gradient ramp · Toggle · Checkbox · Segmented · Vector 3
//
// The point: none of these needed new framework features. Sliders and gradients
// use Drag1D; everything spatial uses Gesture (private state + the pointer in
// world space); toggles and checkboxes spring via a declared channel.
// ============================================================================

import {
  calpha, clamp, cmix, Color, Drag1D, Free, Gesture, GNode, hexOf, hsl, mount,
  Painter, Pan, part, Press, rect, Rect, tokens, v, Vec, vdist, Element,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── Card geometry + shared drawing helpers ────────────────────────────────────

const CARD_W = 212;
const CARD_H = 142;
const PAD_X = 14;
const TOP = 32;
const BOTTOM = 14;

/** The inner content area of a card (below the title strip). */
const innerOf = (r: Rect): Rect =>
  rect(r.x + PAD_X, r.y + TOP, r.w - 2 * PAD_X, r.h - TOP - BOTTOM);

/** Largest centered square inside a rect (for the spatial widgets). */
function squareIn(r: Rect): Rect {
  const s = Math.min(r.w, r.h);
  return rect(r.center.x - s / 2, r.center.y - s / 2, s, s);
}

/** Draw a card's frame + title + value readout; return the inner content rect. */
function card(paint: Painter, node: GNode<unknown>, title: string, value: string): Rect {
  const r = node.rect;
  const hover = node.ch.hover;
  const fill = tokens.mix(tokens.surface, tokens.surfaceHi, 0.35 + 0.4 * hover);
  const edge = tokens.mix(tokens.muted, tokens.accent, 0.2 + 0.5 * hover);
  paint.box(r, 10, fill, edge, 1);
  paint.label(title, v(r.x + 12, r.y + 16),
    tokens.mix(tokens.textDim, tokens.textBright, 0.4 + 0.6 * hover),
    { align: "left", weight: 600, size: 12 });
  paint.label(value, v(r.right - 12, r.y + 16), calpha(tokens.accent, 0.95),
    { align: "right", size: 11, mono: true });
  return innerOf(r);
}

/** A horizontal track filled to fraction `t`. */
function track(paint: Painter, r: Rect, t: number, fill = tokens.accent) {
  const y = r.center.y;
  paint.box(rect(r.x, y - 2.5, r.w, 5), 2.5, tokens.muted);
  if (t > 0) paint.box(rect(r.x, y - 2.5, r.w * clamp(t, 0, 1), 5), 2.5, fill);
}

/** A draggable thumb, brighter and glowing as `hot` rises. */
function thumb(paint: Painter, p: Vec, radius: number, hot: number) {
  paint.glow(tokens.accent, 9 * hot, () =>
    paint.dot(p, radius, tokens.mix(tokens.textBright, tokens.accent, 0.3 * hot)));
}

const TAU = Math.PI * 2;
const degOf = (rad: number) => ((rad * 180) / Math.PI + 360) % 360;

// ── State ─────────────────────────────────────────────────────────────────────

interface Doc {
  scalar: number;                                   // 0..1
  range: { min: number; max: number };              // 0..1
  scrub: number;                                    // unbounded
  knob: number;                                     // 0..1
  angle: number;                                    // degrees
  arc: { start: number; end: number };              // degrees
  xy: { x: number; y: number };                     // -1..1
  box: { minX: number; minY: number; maxX: number; maxY: number };  // 0..1
  cube: { yaw: number; pitch: number };             // radians
  color: { hue: number; sat: number };              // 0..1
  gradient: number;                                 // sample position 0..1
  toggle: boolean;
  check: boolean;
  segment: number;                                  // 0..2
  vec3: { x: number; y: number; z: number };        // -1..1
}

type Intent =
  | { kind: "scalar"; value: number }
  | { kind: "range"; value: { min: number; max: number } }
  | { kind: "scrub"; value: number }
  | { kind: "knob"; value: number }
  | { kind: "angle"; value: number }
  | { kind: "arc"; value: { start: number; end: number } }
  | { kind: "xy"; value: { x: number; y: number } }
  | { kind: "box"; value: Doc["box"] }
  | { kind: "cube"; value: { yaw: number; pitch: number } }
  | { kind: "color"; value: { hue: number; sat: number } }
  | { kind: "gradient"; value: number }
  | { kind: "toggle" }
  | { kind: "check" }
  | { kind: "segment"; value: number }
  | { kind: "vec3"; value: { x: number; y: number; z: number } };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "scalar": return { ...doc, scalar: intent.value };
    case "range": return { ...doc, range: intent.value };
    case "scrub": return { ...doc, scrub: intent.value };
    case "knob": return { ...doc, knob: intent.value };
    case "angle": return { ...doc, angle: intent.value };
    case "arc": return { ...doc, arc: intent.value };
    case "xy": return { ...doc, xy: intent.value };
    case "box": return { ...doc, box: intent.value };
    case "cube": return { ...doc, cube: intent.value };
    case "color": return { ...doc, color: intent.value };
    case "gradient": return { ...doc, gradient: intent.value };
    case "toggle": return { ...doc, toggle: !doc.toggle };
    case "check": return { ...doc, check: !doc.check };
    case "segment": return { ...doc, segment: intent.value };
    case "vec3": return { ...doc, vec3: intent.value };
  }
}

// Every widget carries its board position so the Free container can place it.
type Pos = { pos: Vec };

// ── 1. Slider (scalar 0..1) — Drag1D ──────────────────────────────────────────

const Slider = part<Pos & { value: number }>("w-slider", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const inner = card(paint, node, "Slider", node.props.value.toFixed(2));
    const bar = rect(inner.x, inner.center.y - 10, inner.w, 20);
    track(paint, bar, node.props.value);
    thumb(paint, v(bar.x + bar.w * node.props.value, bar.center.y), 7 + 1.5 * node.ch.hover, node.ch.hover);
  },
  // Drag1D's `pad` matches the card's PAD_X, so the fraction lines up with the bar.
  on: [Drag1D({ axis: "x", pad: PAD_X, to: (_n, f) => ({ kind: "scalar", value: f }) })],
});

// ── 2. Range (min..max) — Gesture, nearest thumb ──────────────────────────────

const Range = part<Pos & { min: number; max: number }>("w-range", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const p = node.props;
    const inner = card(paint, node, "Range", `${p.min.toFixed(2)}–${p.max.toFixed(2)}`);
    const y = inner.center.y;
    paint.box(rect(inner.x, y - 2.5, inner.w, 5), 2.5, tokens.muted);
    const xMin = inner.x + inner.w * p.min, xMax = inner.x + inner.w * p.max;
    paint.box(rect(xMin, y - 2.5, xMax - xMin, 5), 2.5, tokens.accent);
    thumb(paint, v(xMin, y), 7, node.ch.hover);
    thumb(paint, v(xMax, y), 7, node.ch.hover);
  },
  on: [
    Gesture<Pos & { min: number; max: number }, { which: "min" | "max" }>({
      begin(node, pointer) {
        const inner = innerOf(node.rect);
        const f = clamp((pointer.x - inner.x) / inner.w, 0, 1);
        return { which: Math.abs(f - node.props.min) <= Math.abs(f - node.props.max) ? "min" : "max" };
      },
      during(state, node, pointer) {
        const inner = innerOf(node.rect);
        const f = clamp((pointer.x - inner.x) / inner.w, 0, 1);
        const { min, max } = node.props;
        const value = state.which === "min" ? { min: Math.min(f, max), max } : { min, max: Math.max(f, min) };
        return { kind: "range", value };
      },
    }),
  ],
});

// ── 3. Number scrub — Gesture, relative horizontal drag ───────────────────────

const NumberScrub = part<Pos & { value: number }>("w-scrub", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const inner = card(paint, node, "Number", node.props.value.toFixed(1));
    paint.label(node.props.value.toFixed(1), inner.center,
      tokens.mix(tokens.text, tokens.textBright, node.ch.hover), { size: 26, weight: 700 });
    paint.label("‹ drag horizontally ›", v(inner.center.x, inner.bottom - 6),
      calpha(tokens.textDim, 0.8), { size: 10 });
  },
  on: [
    Gesture<Pos & { value: number }, { start: number; startX: number }>({
      begin: (node, pointer) => ({ start: node.props.value, startX: pointer.x }),
      during: (state, _node, pointer) => ({ kind: "scrub", value: state.start + (pointer.x - state.startX) * 0.5 }),
    }),
  ],
});

// ── 4. Knob (rotary) — Gesture, vertical drag ─────────────────────────────────

const Knob = part<Pos & { value: number }>("w-knob", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const inner = card(paint, node, "Knob", `${Math.round(node.props.value * 100)}%`);
    const sq = squareIn(inner);
    const c = sq.center, radius = sq.w / 2 - 6;
    paint.ring(c, radius, tokens.muted, 3);
    // 270° sweep from 135° to 405°.
    const a = (0.75 + node.props.value * 1.5) * Math.PI;
    const tip = v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius);
    paint.line(c, tip, tokens.accent, 3);
    thumb(paint, tip, 5 + node.ch.hover * 2, node.ch.hover);
    paint.dot(c, 3, tokens.textDim);
  },
  on: [
    Gesture<Pos & { value: number }, { start: number; startY: number }>({
      begin: (node, pointer) => ({ start: node.props.value, startY: pointer.y }),
      during: (state, _node, pointer) =>
        ({ kind: "knob", value: clamp(state.start - (pointer.y - state.startY) * 0.006, 0, 1) }),
    }),
  ],
});

// ── 5. Angle dial (0..360°) — Gesture, absolute angle ─────────────────────────

const AngleDial = part<Pos & { angle: number }>("w-angle", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const inner = card(paint, node, "Angle", `${Math.round(node.props.angle)}°`);
    const sq = squareIn(inner);
    const c = sq.center, radius = sq.w / 2 - 6;
    paint.ring(c, radius, tokens.muted, 2);
    const a = (node.props.angle * Math.PI) / 180;
    const tip = v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius);
    paint.line(c, tip, tokens.accent, 2.5);
    thumb(paint, tip, 5 + node.ch.hover * 2, node.ch.hover);
    paint.dot(c, 3, tokens.textDim);
  },
  on: [
    Gesture<Pos & { angle: number }, Record<string, never>>({
      begin: () => ({}),
      during(_state, node, pointer) {
        const c = squareIn(innerOf(node.rect)).center;
        return { kind: "angle", value: degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x)) };
      },
    }),
  ],
});

// ── 6. Angle range (arc interval) — Gesture, nearest handle ───────────────────

/** Draw a dotted arc from angle `a0` to `a1` (degrees, increasing). */
function drawArc(paint: Painter, c: Vec, radius: number, a0: number, a1: number, col: Color) {
  const span = ((a1 - a0 + 360) % 360) || 360;
  const steps = Math.max(2, Math.round(span / 8));
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + (span * i) / steps) * Math.PI) / 180;
    paint.dot(v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 2, col);
  }
}

const AngleRange = part<Pos & { start: number; end: number }>("w-arc", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const p = node.props;
    const inner = card(paint, node, "Arc", `${Math.round(p.start)}°–${Math.round(p.end)}°`);
    const sq = squareIn(inner);
    const c = sq.center, radius = sq.w / 2 - 6;
    paint.ring(c, radius, tokens.muted, 1.5);
    drawArc(paint, c, radius, p.start, p.end, tokens.accent);
    for (const angle of [p.start, p.end]) {
      const a = (angle * Math.PI) / 180;
      thumb(paint, v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 5 + node.ch.hover * 2, node.ch.hover);
    }
  },
  on: [
    Gesture<Pos & { start: number; end: number }, { which: "start" | "end" }>({
      begin(node, pointer) {
        const c = squareIn(innerOf(node.rect)).center;
        const a = degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x));
        const dist = (x: number) => Math.min((a - x + 360) % 360, (x - a + 360) % 360);
        return { which: dist(node.props.start) <= dist(node.props.end) ? "start" : "end" };
      },
      during(state, node, pointer) {
        const c = squareIn(innerOf(node.rect)).center;
        const a = degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x));
        return { kind: "arc", value: { ...node.props, [state.which]: a } as { start: number; end: number } };
      },
    }),
  ],
});

// ── 7. XY pad (vector 2) — Gesture ────────────────────────────────────────────

const XYPad = part<Pos & { x: number; y: number }>("w-xy", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const p = node.props;
    const inner = card(paint, node, "Vector 2", `${p.x.toFixed(2)}, ${p.y.toFixed(2)}`);
    const sq = squareIn(inner);
    paint.box(sq, 6, calpha(tokens.bg, 0.5), tokens.muted, 1);
    paint.line(v(sq.x, sq.center.y), v(sq.right, sq.center.y), calpha(tokens.muted, 0.6));
    paint.line(v(sq.center.x, sq.y), v(sq.center.x, sq.bottom), calpha(tokens.muted, 0.6));
    const dot = v(sq.center.x + (p.x * sq.w) / 2, sq.center.y - (p.y * sq.h) / 2);
    thumb(paint, dot, 6 + node.ch.hover * 2, node.ch.hover);
  },
  on: [
    Gesture<Pos & { x: number; y: number }, Record<string, never>>({
      begin: () => ({}),
      during(_state, node, pointer) {
        const sq = squareIn(innerOf(node.rect));
        return { kind: "xy", value: {
          x: clamp(((pointer.x - sq.center.x) / (sq.w / 2)), -1, 1),
          y: clamp((-(pointer.y - sq.center.y) / (sq.h / 2)), -1, 1),
        } };
      },
    }),
  ],
});

// ── 8. Box 2D (bounds) — Gesture, nearest corner ──────────────────────────────

const Box2D = part<Pos & Doc["box"]>("w-box2d", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const p = node.props;
    const inner = card(paint, node, "Bounds 2D", `${p.minX.toFixed(1)},${p.minY.toFixed(1)}→${p.maxX.toFixed(1)},${p.maxY.toFixed(1)}`);
    const sq = squareIn(inner);
    paint.box(sq, 6, calpha(tokens.bg, 0.5), tokens.muted, 1);
    const toScreen = (fx: number, fy: number) => v(sq.x + fx * sq.w, sq.bottom - fy * sq.h);   // y up
    const a = toScreen(p.minX, p.minY), b = toScreen(p.maxX, p.maxY);
    paint.box(rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)), 3,
      calpha(tokens.accent, 0.2), tokens.accent, 1.5);
    thumb(paint, a, 5 + node.ch.hover, node.ch.hover);
    thumb(paint, b, 5 + node.ch.hover, node.ch.hover);
  },
  on: [
    Gesture<Pos & Doc["box"], { corner: "min" | "max" }>({
      begin(node, pointer) {
        const sq = squareIn(innerOf(node.rect));
        const p = node.props;
        const toScreen = (fx: number, fy: number) => v(sq.x + fx * sq.w, sq.bottom - fy * sq.h);
        const dMin = vdist(pointer, toScreen(p.minX, p.minY));
        const dMax = vdist(pointer, toScreen(p.maxX, p.maxY));
        return { corner: dMin <= dMax ? "min" : "max" };
      },
      during(state, node, pointer) {
        const sq = squareIn(innerOf(node.rect));
        const fx = clamp((pointer.x - sq.x) / sq.w, 0, 1);
        const fy = clamp((sq.bottom - pointer.y) / sq.h, 0, 1);
        const p = node.props;
        const value = state.corner === "min"
          ? { ...p, minX: Math.min(fx, p.maxX), minY: Math.min(fy, p.maxY) }
          : { ...p, maxX: Math.max(fx, p.minX), maxY: Math.max(fy, p.minY) };
        return { kind: "box", value: { minX: value.minX, minY: value.minY, maxX: value.maxX, maxY: value.maxY } };
      },
    }),
  ],
});

// ── 9. Box 3D (orbit cube) — Gesture, drag to rotate ──────────────────────────

const CUBE_VERTS: [number, number, number][] = [];
for (let i = 0; i < 8; i++) CUBE_VERTS.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);
const CUBE_EDGES: [number, number][] = [];
for (let i = 0; i < 8; i++)
  for (let j = i + 1; j < 8; j++) {
    const d = i ^ j;
    if (d === 1 || d === 2 || d === 4) CUBE_EDGES.push([i, j]);
  }

const Box3D = part<Pos & { yaw: number; pitch: number }>("w-box3d", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const { yaw, pitch } = node.props;
    const inner = card(paint, node, "Box 3D", `${Math.round(degOf(yaw))}°`);
    const sq = squareIn(inner);
    const c = sq.center, scale = sq.w / 2 - 8;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const project = ([x, y, z]: [number, number, number]): Vec => {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;      // yaw about Y
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;     // pitch about X
      const persp = 1 / (1 + z2 * 0.18);                      // gentle perspective
      return v(c.x + x1 * scale * persp, c.y + y2 * scale * persp);
    };
    const pts = CUBE_VERTS.map(project);
    for (const [i, j] of CUBE_EDGES) paint.line(pts[i], pts[j], calpha(tokens.accent, 0.85), 1.5);
    for (const p of pts) paint.dot(p, 2.5, tokens.textBright);
  },
  on: [
    Gesture<Pos & { yaw: number; pitch: number }, { yaw: number; pitch: number; x: number; y: number }>({
      begin: (node, pointer) => ({ yaw: node.props.yaw, pitch: node.props.pitch, x: pointer.x, y: pointer.y }),
      during: (s, _node, pointer) => ({
        kind: "cube",
        value: {
          yaw: s.yaw + (pointer.x - s.x) * 0.012,
          pitch: clamp(s.pitch + (pointer.y - s.y) * 0.012, -1.3, 1.3),
        },
      }),
    }),
  ],
});

// ── 10. Color wheel (HSV) — Gesture ───────────────────────────────────────────

const ColorWheel = part<Pos & { hue: number; sat: number }>("w-color", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const { hue, sat } = node.props;
    const inner = card(paint, node, "Color", hexOf(hsl(hue * 360, sat, 0.55)));
    const sq = squareIn(inner);
    const c = sq.center, radius = sq.w / 2 - 4;
    for (let i = 0; i < 72; i++) {                    // the hue ring
      const a = (i / 72) * TAU;
      paint.dot(v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 3, hsl((i / 72) * 360, 0.7, 0.55));
    }
    paint.dot(c, radius - 8, hsl(hue * 360, sat, 0.55));   // selected color, center
    const a = hue * TAU, rr = sat * (radius - 8);
    thumb(paint, v(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr), 5 + node.ch.hover * 2, node.ch.hover);
  },
  on: [
    Gesture<Pos & { hue: number; sat: number }, Record<string, never>>({
      begin: () => ({}),
      during(_state, node, pointer) {
        const sq = squareIn(innerOf(node.rect));
        const c = sq.center, radius = sq.w / 2 - 12;
        const dx = pointer.x - c.x, dy = pointer.y - c.y;
        return { kind: "color", value: {
          hue: ((Math.atan2(dy, dx) / TAU) % 1 + 1) % 1,
          sat: clamp(Math.hypot(dx, dy) / radius, 0, 1),
        } };
      },
    }),
  ],
});

// ── 11. Gradient ramp — Drag1D samples a two-color ramp ───────────────────────

const RAMP_A = hsl(205, 0.75, 0.55);
const RAMP_B = hsl(330, 0.75, 0.58);

const Gradient = part<Pos & { at: number }>("w-gradient", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const at = node.props.at;
    const inner = card(paint, node, "Gradient", hexOf(cmix(RAMP_A, RAMP_B, at)));
    const bar = rect(inner.x, inner.center.y - 14, inner.w, 28);
    const slices = 48;
    for (let i = 0; i < slices; i++)     // fake a gradient fill with thin slices
      paint.box(rect(bar.x + (bar.w * i) / slices, bar.y, bar.w / slices + 1, bar.h), 0, cmix(RAMP_A, RAMP_B, i / slices));
    const x = bar.x + bar.w * at;
    paint.box(rect(x - 2, bar.y - 4, 4, bar.h + 8), 1, tokens.textBright);
    thumb(paint, v(x, bar.bottom + 8), 5 + node.ch.hover, node.ch.hover);
  },
  on: [Drag1D({ axis: "x", pad: PAD_X, to: (_n, f) => ({ kind: "gradient", value: f }) })],
});

// ── 12. Toggle switch — Press + spring channel ────────────────────────────────

const Toggle = part<Pos & { on: boolean }>("w-toggle", {
  size: () => v(CARD_W, CARD_H),
  channels: { on: { target: (n: GNode<Pos & { on: boolean }>) => (n.props.on ? 1 : 0), spring: { stiffness: 260, damping: 20 } } },
  render(node, paint) {
    const inner = card(paint, node, "Toggle", node.props.on ? "on" : "off");
    const t = clamp(node.ch.on, 0, 1);
    const sw = rect(inner.center.x - 26, inner.center.y - 13, 52, 26);
    paint.box(sw, 13, tokens.mix(tokens.muted, tokens.accent, t));
    paint.glow(tokens.accent, 8 * node.ch.hover, () => paint.dot(v(sw.x + 13 + t * 26, sw.center.y), 9, tokens.textBright));
  },
  on: [Press(() => ({ kind: "toggle" }))],
});

// ── 13. Checkbox — Press + spring channel ─────────────────────────────────────

const Checkbox = part<Pos & { on: boolean }>("w-check", {
  size: () => v(CARD_W, CARD_H),
  channels: { on: { target: (n: GNode<Pos & { on: boolean }>) => (n.props.on ? 1 : 0), spring: { stiffness: 340, damping: 22 } } },
  render(node, paint) {
    const inner = card(paint, node, "Checkbox", node.props.on ? "✓" : "—");
    const t = clamp(node.ch.on, 0, 1);
    const bx = rect(inner.center.x - 15, inner.center.y - 15, 30, 30);
    paint.box(bx, 7, tokens.mix(tokens.surface, tokens.accent, t * 0.9), tokens.mix(tokens.muted, tokens.accent, Math.max(t, node.ch.hover)), 1.5);
    if (t > 0.02) {
      const c = bx.center, k = Math.min(1.1, t);
      paint.line(v(c.x - 6 * k, c.y), v(c.x - 1.5 * k, c.y + 5 * k), tokens.textBright, 2.5);
      paint.line(v(c.x - 1.5 * k, c.y + 5 * k), v(c.x + 7 * k, c.y - 5.5 * k), tokens.textBright, 2.5);
    }
  },
  on: [Press(() => ({ kind: "check" }))],
});

// ── 14. Segmented control — Press reads pointer to pick a cell ─────────────────

const SEGMENTS = ["Move", "Rotate", "Scale"];

const Segmented = part<Pos & { index: number }>("w-segment", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const inner = card(paint, node, "Mode", SEGMENTS[node.props.index]);
    const bar = rect(inner.x, inner.center.y - 15, inner.w, 30);
    paint.box(bar, 8, calpha(tokens.bg, 0.5), tokens.muted, 1);
    const cellW = bar.w / SEGMENTS.length;
    const active = rect(bar.x + cellW * node.props.index + 2, bar.y + 2, cellW - 4, bar.h - 4);
    paint.box(active, 6, calpha(tokens.accent, 0.8));
    SEGMENTS.forEach((label, i) =>
      paint.label(label, v(bar.x + cellW * (i + 0.5), bar.center.y),
        i === node.props.index ? tokens.textBright : tokens.textDim, { size: 11, weight: 600 }));
  },
  on: [
    Press((node) => {
      const inner = innerOf(node.rect);
      const px = (node.pointer ?? node.rect.center).x;
      const i = clamp(Math.floor(((px - inner.x) / inner.w) * SEGMENTS.length), 0, SEGMENTS.length - 1);
      return { kind: "segment", value: i };
    }),
  ],
});

// ── 15. Vector 3 (three scrub rows) — Gesture picks a row ──────────────────────

const AXES: ("x" | "y" | "z")[] = ["x", "y", "z"];
const AXIS_HUE = { x: 0, y: 130, z: 215 };

const Vector3 = part<Pos & { x: number; y: number; z: number }>("w-vec3", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const p = node.props;
    const inner = card(paint, node, "Vector 3", `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`);
    const rowH = inner.h / 3;
    AXES.forEach((axis, i) => {
      const y = inner.y + rowH * (i + 0.5);
      const barX = inner.x + 22, barW = inner.w - 30;
      paint.label(axis.toUpperCase(), v(inner.x + 4, y), hsl(AXIS_HUE[axis], 0.6, 0.6), { size: 11, weight: 700, align: "left" });
      paint.box(rect(barX, y - 2, barW, 4), 2, tokens.muted);
      const t = (p[axis] + 1) / 2;                                    // -1..1 → 0..1
      paint.dot(v(barX + barW * clamp(t, 0, 1), y), 5, hsl(AXIS_HUE[axis], 0.6, 0.6));
    });
  },
  on: [
    Gesture<Pos & { x: number; y: number; z: number }, { axis: "x" | "y" | "z"; start: number; startX: number }>({
      begin(node, pointer) {
        const inner = innerOf(node.rect);
        const row = clamp(Math.floor((pointer.y - inner.y) / (inner.h / 3)), 0, 2);
        const axis = AXES[row];
        return { axis, start: node.props[axis], startX: pointer.x };
      },
      during(state, node, pointer) {
        const next = clamp(state.start + (pointer.x - state.startX) * 0.01, -1, 1);
        return { kind: "vec3", value: { ...node.props, [state.axis]: next } as { x: number; y: number; z: number } };
      },
    }),
  ],
});

// ── The board (pannable surface) ──────────────────────────────────────────────

const Board = part<Record<string, never>>("widget-board", {
  size: () => v(0, 0),
  hit: () => true,
  render(node, paint) {
    const vp = node.view!;
    const G = 32;
    const x0 = Math.floor(-vp.pan.x / vp.zoom / G) * G, x1 = (vp.w - vp.pan.x) / vp.zoom;
    const y0 = Math.floor(-vp.pan.y / vp.zoom / G) * G, y1 = (vp.h - vp.pan.y) / vp.zoom;
    for (let x = x0; x <= x1; x += G)
      for (let y = y0; y <= y1; y += G) paint.dot(v(x, y), 1, calpha(tokens.muted, 0.35));
    paint.label("drag the controls · drag empty space to pan · wheel to zoom",
      v(120, 22), calpha(tokens.textDim, 0.9), { align: "left", size: 12 });
  },
  on: [Pan()],
});

// ── View: lay the widgets out in a grid ───────────────────────────────────────

const COLS = 3;
const at = (i: number): Vec => v(24 + (i % COLS) * (CARD_W + 16), 44 + Math.floor(i / COLS) * (CARD_H + 16));

function view(doc: Doc): Element {
  const cards: Element[] = [
    Slider("slider", { pos: at(0), value: doc.scalar }),
    Range("range", { pos: at(1), min: doc.range.min, max: doc.range.max }),
    NumberScrub("scrub", { pos: at(2), value: doc.scrub }),
    Knob("knob", { pos: at(3), value: doc.knob }),
    AngleDial("angle", { pos: at(4), angle: doc.angle }),
    AngleRange("arc", { pos: at(5), start: doc.arc.start, end: doc.arc.end }),
    XYPad("xy", { pos: at(6), x: doc.xy.x, y: doc.xy.y }),
    Box2D("box2d", { pos: at(7), ...doc.box }),
    Box3D("box3d", { pos: at(8), yaw: doc.cube.yaw, pitch: doc.cube.pitch }),
    ColorWheel("color", { pos: at(9), hue: doc.color.hue, sat: doc.color.sat }),
    Gradient("gradient", { pos: at(10), at: doc.gradient }),
    Toggle("toggle", { pos: at(11), on: doc.toggle }),
    Checkbox("check", { pos: at(12), on: doc.check }),
    Segmented("segment", { pos: at(13), index: doc.segment }),
    Vector3("vec3", { pos: at(14), x: doc.vec3.x, y: doc.vec3.y, z: doc.vec3.z }),
  ];
  return Board("root", {}, [Free("cards", {}, cards)]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    scalar: 0.4,
    range: { min: 0.25, max: 0.75 },
    scrub: 42,
    knob: 0.6,
    angle: 45,
    arc: { start: 20, end: 200 },
    xy: { x: 0.35, y: 0.5 },
    box: { minX: 0.2, minY: 0.25, maxX: 0.75, maxY: 0.7 },
    cube: { yaw: 0.7, pitch: 0.4 },
    color: { hue: 0.58, sat: 0.7 },
    gradient: 0.5,
    toggle: true,
    check: true,
    segment: 0,
    vec3: { x: 0.3, y: -0.2, z: 0.6 },
  },
  update,
  view,
});

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
