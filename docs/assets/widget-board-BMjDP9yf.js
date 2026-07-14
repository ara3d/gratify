import{p as l,D as N,r as x,t as c,v as u,G as M,f as h,c as w,j as O,x as U,h as z,a as T,P as E,k as Z,m as nn,d as en,n as tn}from"./source-panel-1CdPGxVg.js";const rn=`// ============================================================================
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

/** A horizontal track filled to fraction \`t\`. */
function track(paint: Painter, r: Rect, t: number, fill = tokens.accent) {
  const y = r.center.y;
  paint.box(rect(r.x, y - 2.5, r.w, 5), 2.5, tokens.muted);
  if (t > 0) paint.box(rect(r.x, y - 2.5, r.w * clamp(t, 0, 1), 5), 2.5, fill);
}

/** A draggable thumb, brighter and glowing as \`hot\` rises. */
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
  // Drag1D's \`pad\` matches the card's PAD_X, so the fraction lines up with the bar.
  on: [Drag1D({ axis: "x", pad: PAD_X, to: (_n, f) => ({ kind: "scalar", value: f }) })],
});

// ── 2. Range (min..max) — Gesture, nearest thumb ──────────────────────────────

const Range = part<Pos & { min: number; max: number }>("w-range", {
  size: () => v(CARD_W, CARD_H),
  render(node, paint) {
    const p = node.props;
    const inner = card(paint, node, "Range", \`\${p.min.toFixed(2)}–\${p.max.toFixed(2)}\`);
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
    const inner = card(paint, node, "Knob", \`\${Math.round(node.props.value * 100)}%\`);
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
    const inner = card(paint, node, "Angle", \`\${Math.round(node.props.angle)}°\`);
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

/** Draw a dotted arc from angle \`a0\` to \`a1\` (degrees, increasing). */
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
    const inner = card(paint, node, "Arc", \`\${Math.round(p.start)}°–\${Math.round(p.end)}°\`);
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
    const inner = card(paint, node, "Vector 2", \`\${p.x.toFixed(2)}, \${p.y.toFixed(2)}\`);
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
    const inner = card(paint, node, "Bounds 2D", \`\${p.minX.toFixed(1)},\${p.minY.toFixed(1)}→\${p.maxX.toFixed(1)},\${p.maxY.toFixed(1)}\`);
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
    const inner = card(paint, node, "Box 3D", \`\${Math.round(degOf(yaw))}°\`);
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
    const inner = card(paint, node, "Vector 3", \`\${p.x.toFixed(1)},\${p.y.toFixed(1)},\${p.z.toFixed(1)}\`);
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
`,m=212,b=142,R=14,I=32,on=14,k=n=>x(n.x+R,n.y+I,n.w-2*R,n.h-I-on);function y(n){const e=Math.min(n.w,n.h);return x(n.center.x-e/2,n.center.y-e/2,e,e)}function v(n,e,t,r){const o=e.rect,a=e.ch.hover,s=c.mix(c.surface,c.surfaceHi,.35+.4*a),i=c.mix(c.muted,c.accent,.2+.5*a);return n.box(o,10,s,i,1),n.label(t,u(o.x+12,o.y+16),c.mix(c.textDim,c.textBright,.4+.6*a),{align:"left",weight:600,size:12}),n.label(r,u(o.right-12,o.y+16),w(c.accent,.95),{align:"right",size:11,mono:!0}),k(o)}function an(n,e,t,r=c.accent){const o=e.center.y;n.box(x(e.x,o-2.5,e.w,5),2.5,c.muted),t>0&&n.box(x(e.x,o-2.5,e.w*h(t,0,1),5),2.5,r)}function f(n,e,t,r){n.glow(c.accent,9*r,()=>n.dot(e,t,c.mix(c.textBright,c.accent,.3*r)))}const S=Math.PI*2,X=n=>(n*180/Math.PI+360)%360;function sn(n,e){switch(e.kind){case"scalar":return{...n,scalar:e.value};case"range":return{...n,range:e.value};case"scrub":return{...n,scrub:e.value};case"knob":return{...n,knob:e.value};case"angle":return{...n,angle:e.value};case"arc":return{...n,arc:e.value};case"xy":return{...n,xy:e.value};case"box":return{...n,box:e.value};case"cube":return{...n,cube:e.value};case"color":return{...n,color:e.value};case"gradient":return{...n,gradient:e.value};case"toggle":return{...n,toggle:!n.toggle};case"check":return{...n,check:!n.check};case"segment":return{...n,segment:e.value};case"vec3":return{...n,vec3:e.value}}}const cn=l("w-slider",{size:()=>u(m,b),render(n,e){const t=v(e,n,"Slider",n.props.value.toFixed(2)),r=x(t.x,t.center.y-10,t.w,20);an(e,r,n.props.value),f(e,u(r.x+r.w*n.props.value,r.center.y),7+1.5*n.ch.hover,n.ch.hover)},on:[N({axis:"x",pad:R,to:(n,e)=>({kind:"scalar",value:e})})]}),un=l("w-range",{size:()=>u(m,b),render(n,e){const t=n.props,r=v(e,n,"Range",`${t.min.toFixed(2)}–${t.max.toFixed(2)}`),o=r.center.y;e.box(x(r.x,o-2.5,r.w,5),2.5,c.muted);const a=r.x+r.w*t.min,s=r.x+r.w*t.max;e.box(x(a,o-2.5,s-a,5),2.5,c.accent),f(e,u(a,o),7,n.ch.hover),f(e,u(s,o),7,n.ch.hover)},on:[M({begin(n,e){const t=k(n.rect),r=h((e.x-t.x)/t.w,0,1);return{which:Math.abs(r-n.props.min)<=Math.abs(r-n.props.max)?"min":"max"}},during(n,e,t){const r=k(e.rect),o=h((t.x-r.x)/r.w,0,1),{min:a,max:s}=e.props;return{kind:"range",value:n.which==="min"?{min:Math.min(o,s),max:s}:{min:a,max:Math.max(o,a)}}}})]}),dn=l("w-scrub",{size:()=>u(m,b),render(n,e){const t=v(e,n,"Number",n.props.value.toFixed(1));e.label(n.props.value.toFixed(1),t.center,c.mix(c.text,c.textBright,n.ch.hover),{size:26,weight:700}),e.label("‹ drag horizontally ›",u(t.center.x,t.bottom-6),w(c.textDim,.8),{size:10})},on:[M({begin:(n,e)=>({start:n.props.value,startX:e.x}),during:(n,e,t)=>({kind:"scrub",value:n.start+(t.x-n.startX)*.5})})]}),pn=l("w-knob",{size:()=>u(m,b),render(n,e){const t=v(e,n,"Knob",`${Math.round(n.props.value*100)}%`),r=y(t),o=r.center,a=r.w/2-6;e.ring(o,a,c.muted,3);const s=(.75+n.props.value*1.5)*Math.PI,i=u(o.x+Math.cos(s)*a,o.y+Math.sin(s)*a);e.line(o,i,c.accent,3),f(e,i,5+n.ch.hover*2,n.ch.hover),e.dot(o,3,c.textDim)},on:[M({begin:(n,e)=>({start:n.props.value,startY:e.y}),during:(n,e,t)=>({kind:"knob",value:h(n.start-(t.y-n.startY)*.006,0,1)})})]}),xn=l("w-angle",{size:()=>u(m,b),render(n,e){const t=v(e,n,"Angle",`${Math.round(n.props.angle)}°`),r=y(t),o=r.center,a=r.w/2-6;e.ring(o,a,c.muted,2);const s=n.props.angle*Math.PI/180,i=u(o.x+Math.cos(s)*a,o.y+Math.sin(s)*a);e.line(o,i,c.accent,2.5),f(e,i,5+n.ch.hover*2,n.ch.hover),e.dot(o,3,c.textDim)},on:[M({begin:()=>({}),during(n,e,t){const r=y(k(e.rect)).center;return{kind:"angle",value:X(Math.atan2(t.y-r.y,t.x-r.x))}}})]});function hn(n,e,t,r,o,a){const s=(o-r+360)%360||360,i=Math.max(2,Math.round(s/8));for(let d=0;d<=i;d++){const p=(r+s*d/i)*Math.PI/180;n.dot(u(e.x+Math.cos(p)*t,e.y+Math.sin(p)*t),2,a)}}const ln=l("w-arc",{size:()=>u(m,b),render(n,e){const t=n.props,r=v(e,n,"Arc",`${Math.round(t.start)}°–${Math.round(t.end)}°`),o=y(r),a=o.center,s=o.w/2-6;e.ring(a,s,c.muted,1.5),hn(e,a,s,t.start,t.end,c.accent);for(const i of[t.start,t.end]){const d=i*Math.PI/180;f(e,u(a.x+Math.cos(d)*s,a.y+Math.sin(d)*s),5+n.ch.hover*2,n.ch.hover)}},on:[M({begin(n,e){const t=y(k(n.rect)).center,r=X(Math.atan2(e.y-t.y,e.x-t.x)),o=a=>Math.min((r-a+360)%360,(a-r+360)%360);return{which:o(n.props.start)<=o(n.props.end)?"start":"end"}},during(n,e,t){const r=y(k(e.rect)).center,o=X(Math.atan2(t.y-r.y,t.x-r.x));return{kind:"arc",value:{...e.props,[n.which]:o}}}})]}),mn=l("w-xy",{size:()=>u(m,b),render(n,e){const t=n.props,r=v(e,n,"Vector 2",`${t.x.toFixed(2)}, ${t.y.toFixed(2)}`),o=y(r);e.box(o,6,w(c.bg,.5),c.muted,1),e.line(u(o.x,o.center.y),u(o.right,o.center.y),w(c.muted,.6)),e.line(u(o.center.x,o.y),u(o.center.x,o.bottom),w(c.muted,.6));const a=u(o.center.x+t.x*o.w/2,o.center.y-t.y*o.h/2);f(e,a,6+n.ch.hover*2,n.ch.hover)},on:[M({begin:()=>({}),during(n,e,t){const r=y(k(e.rect));return{kind:"xy",value:{x:h((t.x-r.center.x)/(r.w/2),-1,1),y:h(-(t.y-r.center.y)/(r.h/2),-1,1)}}}})]}),bn=l("w-box2d",{size:()=>u(m,b),render(n,e){const t=n.props,r=v(e,n,"Bounds 2D",`${t.minX.toFixed(1)},${t.minY.toFixed(1)}→${t.maxX.toFixed(1)},${t.maxY.toFixed(1)}`),o=y(r);e.box(o,6,w(c.bg,.5),c.muted,1);const a=(d,p)=>u(o.x+d*o.w,o.bottom-p*o.h),s=a(t.minX,t.minY),i=a(t.maxX,t.maxY);e.box(x(Math.min(s.x,i.x),Math.min(s.y,i.y),Math.abs(i.x-s.x),Math.abs(i.y-s.y)),3,w(c.accent,.2),c.accent,1.5),f(e,s,5+n.ch.hover,n.ch.hover),f(e,i,5+n.ch.hover,n.ch.hover)},on:[M({begin(n,e){const t=y(k(n.rect)),r=n.props,o=(i,d)=>u(t.x+i*t.w,t.bottom-d*t.h),a=O(e,o(r.minX,r.minY)),s=O(e,o(r.maxX,r.maxY));return{corner:a<=s?"min":"max"}},during(n,e,t){const r=y(k(e.rect)),o=h((t.x-r.x)/r.w,0,1),a=h((r.bottom-t.y)/r.h,0,1),s=e.props,i=n.corner==="min"?{...s,minX:Math.min(o,s.maxX),minY:Math.min(a,s.maxY)}:{...s,maxX:Math.max(o,s.minX),maxY:Math.max(a,s.minY)};return{kind:"box",value:{minX:i.minX,minY:i.minY,maxX:i.maxX,maxY:i.maxY}}}})]}),j=[];for(let n=0;n<8;n++)j.push([n&1?1:-1,n&2?1:-1,n&4?1:-1]);const K=[];for(let n=0;n<8;n++)for(let e=n+1;e<8;e++){const t=n^e;(t===1||t===2||t===4)&&K.push([n,e])}const gn=l("w-box3d",{size:()=>u(m,b),render(n,e){const{yaw:t,pitch:r}=n.props,o=v(e,n,"Box 3D",`${Math.round(X(t))}°`),a=y(o),s=a.center,i=a.w/2-8,d=Math.cos(t),p=Math.sin(t),D=Math.cos(r),P=Math.sin(r),L=([A,_,G])=>{const J=A*d+G*p,B=-A*p+G*d,Q=_*D-B*P,Y=1/(1+(_*P+B*D)*.18);return u(s.x+J*i*Y,s.y+Q*i*Y)},C=j.map(L);for(const[A,_]of K)e.line(C[A],C[_],w(c.accent,.85),1.5);for(const A of C)e.dot(A,2.5,c.textBright)},on:[M({begin:(n,e)=>({yaw:n.props.yaw,pitch:n.props.pitch,x:e.x,y:e.y}),during:(n,e,t)=>({kind:"cube",value:{yaw:n.yaw+(t.x-n.x)*.012,pitch:h(n.pitch+(t.y-n.y)*.012,-1.3,1.3)}})})]}),vn=l("w-color",{size:()=>u(m,b),render(n,e){const{hue:t,sat:r}=n.props,o=v(e,n,"Color",U(z(t*360,r,.55))),a=y(o),s=a.center,i=a.w/2-4;for(let D=0;D<72;D++){const P=D/72*S;e.dot(u(s.x+Math.cos(P)*i,s.y+Math.sin(P)*i),3,z(D/72*360,.7,.55))}e.dot(s,i-8,z(t*360,r,.55));const d=t*S,p=r*(i-8);f(e,u(s.x+Math.cos(d)*p,s.y+Math.sin(d)*p),5+n.ch.hover*2,n.ch.hover)},on:[M({begin:()=>({}),during(n,e,t){const r=y(k(e.rect)),o=r.center,a=r.w/2-12,s=t.x-o.x,i=t.y-o.y;return{kind:"color",value:{hue:(Math.atan2(i,s)/S%1+1)%1,sat:h(Math.hypot(s,i)/a,0,1)}}}})]}),F=z(205,.75,.55),$=z(330,.75,.58),yn=l("w-gradient",{size:()=>u(m,b),render(n,e){const t=n.props.at,r=v(e,n,"Gradient",U(T(F,$,t))),o=x(r.x,r.center.y-14,r.w,28),a=48;for(let i=0;i<a;i++)e.box(x(o.x+o.w*i/a,o.y,o.w/a+1,o.h),0,T(F,$,i/a));const s=o.x+o.w*t;e.box(x(s-2,o.y-4,4,o.h+8),1,c.textBright),f(e,u(s,o.bottom+8),5+n.ch.hover,n.ch.hover)},on:[N({axis:"x",pad:R,to:(n,e)=>({kind:"gradient",value:e})})]}),wn=l("w-toggle",{size:()=>u(m,b),channels:{on:{target:n=>n.props.on?1:0,spring:{stiffness:260,damping:20}}},render(n,e){const t=v(e,n,"Toggle",n.props.on?"on":"off"),r=h(n.ch.on,0,1),o=x(t.center.x-26,t.center.y-13,52,26);e.box(o,13,c.mix(c.muted,c.accent,r)),e.glow(c.accent,8*n.ch.hover,()=>e.dot(u(o.x+13+r*26,o.center.y),9,c.textBright))},on:[E(()=>({kind:"toggle"}))]}),kn=l("w-check",{size:()=>u(m,b),channels:{on:{target:n=>n.props.on?1:0,spring:{stiffness:340,damping:22}}},render(n,e){const t=v(e,n,"Checkbox",n.props.on?"✓":"—"),r=h(n.ch.on,0,1),o=x(t.center.x-15,t.center.y-15,30,30);if(e.box(o,7,c.mix(c.surface,c.accent,r*.9),c.mix(c.muted,c.accent,Math.max(r,n.ch.hover)),1.5),r>.02){const a=o.center,s=Math.min(1.1,r);e.line(u(a.x-6*s,a.y),u(a.x-1.5*s,a.y+5*s),c.textBright,2.5),e.line(u(a.x-1.5*s,a.y+5*s),u(a.x+7*s,a.y-5.5*s),c.textBright,2.5)}},on:[E(()=>({kind:"check"}))]}),q=["Move","Rotate","Scale"],fn=l("w-segment",{size:()=>u(m,b),render(n,e){const t=v(e,n,"Mode",q[n.props.index]),r=x(t.x,t.center.y-15,t.w,30);e.box(r,8,w(c.bg,.5),c.muted,1);const o=r.w/q.length,a=x(r.x+o*n.props.index+2,r.y+2,o-4,r.h-4);e.box(a,6,w(c.accent,.8)),q.forEach((s,i)=>e.label(s,u(r.x+o*(i+.5),r.center.y),i===n.props.index?c.textBright:c.textDim,{size:11,weight:600}))},on:[E(n=>{const e=k(n.rect),t=(n.pointer??n.rect.center).x;return{kind:"segment",value:h(Math.floor((t-e.x)/e.w*q.length),0,q.length-1)}})]}),W=["x","y","z"],H={x:0,y:130,z:215},Mn=l("w-vec3",{size:()=>u(m,b),render(n,e){const t=n.props,r=v(e,n,"Vector 3",`${t.x.toFixed(1)},${t.y.toFixed(1)},${t.z.toFixed(1)}`),o=r.h/3;W.forEach((a,s)=>{const i=r.y+o*(s+.5),d=r.x+22,p=r.w-30;e.label(a.toUpperCase(),u(r.x+4,i),z(H[a],.6,.6),{size:11,weight:700,align:"left"}),e.box(x(d,i-2,p,4),2,c.muted);const D=(t[a]+1)/2;e.dot(u(d+p*h(D,0,1),i),5,z(H[a],.6,.6))})},on:[M({begin(n,e){const t=k(n.rect),r=h(Math.floor((e.y-t.y)/(t.h/3)),0,2),o=W[r];return{axis:o,start:n.props[o],startX:e.x}},during(n,e,t){const r=h(n.start+(t.x-n.startX)*.01,-1,1);return{kind:"vec3",value:{...e.props,[n.axis]:r}}}})]}),Dn=l("widget-board",{size:()=>u(0,0),hit:()=>!0,render(n,e){const t=n.view,r=32,o=Math.floor(-t.pan.x/t.zoom/r)*r,a=(t.w-t.pan.x)/t.zoom,s=Math.floor(-t.pan.y/t.zoom/r)*r,i=(t.h-t.pan.y)/t.zoom;for(let d=o;d<=a;d+=r)for(let p=s;p<=i;p+=r)e.dot(u(d,p),1,w(c.muted,.35));e.label("drag the controls · drag empty space to pan · wheel to zoom",u(120,22),w(c.textDim,.9),{align:"left",size:12})},on:[Z()]}),V=3,g=n=>u(24+n%V*(m+16),44+Math.floor(n/V)*(b+16));function zn(n){const e=[cn("slider",{pos:g(0),value:n.scalar}),un("range",{pos:g(1),min:n.range.min,max:n.range.max}),dn("scrub",{pos:g(2),value:n.scrub}),pn("knob",{pos:g(3),value:n.knob}),xn("angle",{pos:g(4),angle:n.angle}),ln("arc",{pos:g(5),start:n.arc.start,end:n.arc.end}),mn("xy",{pos:g(6),x:n.xy.x,y:n.xy.y}),bn("box2d",{pos:g(7),...n.box}),gn("box3d",{pos:g(8),yaw:n.cube.yaw,pitch:n.cube.pitch}),vn("color",{pos:g(9),hue:n.color.hue,sat:n.color.sat}),yn("gradient",{pos:g(10),at:n.gradient}),wn("toggle",{pos:g(11),on:n.toggle}),kn("check",{pos:g(12),on:n.check}),fn("segment",{pos:g(13),index:n.segment}),Mn("vec3",{pos:g(14),x:n.vec3.x,y:n.vec3.y,z:n.vec3.z})];return Dn("root",{},[tn("cards",{},e)])}const An=document.getElementById("c");nn(An,{init:{scalar:.4,range:{min:.25,max:.75},scrub:42,knob:.6,angle:45,arc:{start:20,end:200},xy:{x:.35,y:.5},box:{minX:.2,minY:.25,maxX:.75,maxY:.7},cube:{yaw:.7,pitch:.4},color:{hue:.58,sat:.7},gradient:.5,toggle:!0,check:!0,segment:0,vec3:{x:.3,y:-.2,z:.6}},update:sn,view:zn});en([{name:"main.ts",code:rn}]);
