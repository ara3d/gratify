import{p as h,D as T,r as u,v as i,G as f,j as d,c as M,n as _,h as k,b as $,P as D,l as L,m as K,d as J,z as I,k as Q}from"./source-panel-cwX9nwkb.js";import{C as Z}from"./widgets-DkU5qRHh.js";import{w as nn}from"./widgets-deNE_SuD.js";const en=`// ============================================================================
// Example: widget board — a dozen-plus creative-tool controls, reimplemented
// from the Kea node editor's widget library, now as COMPOSITES.
//
// Every card is the shared \`Card\` part (widgets.ts) used 15 times: its body
// facet supplies the title/value chrome and a content slot. Into that slot goes
// ONE interactive control part — a standalone part sized by layout, so it reads
// its OWN rect (no \`innerOf(card)\` offset math) and its gesture works in its
// own coordinates. And no control reads the \`tokens\` singleton: colors resolve
// in a \`style\` facet, so each control is restylable and themable (enforced by
// \`npm run check\`).
//
// Everything sits on a pannable canvas (drag empty space to pan, wheel to
// zoom). The controls: Slider · Range · Number scrub · Knob · Angle dial ·
// Angle range · XY pad · Box 2D · Box 3D · Color wheel · Gradient ramp ·
// Toggle · Checkbox · Segmented · Vector 3.
// ============================================================================

import {
  calpha, clamp, cmix, Color, Drag1D, Free, Gesture, GNode, hexOf, hsl, mount,
  Painter, Pan, part, Press, rect, Rect, Tokens, Channels, v, Vec, vdist, Element,
} from "gratify";
import { Card } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── Content geometry ──────────────────────────────────────────────────────────
// Each control declares this intrinsic size; the Card's Stack pads around it, so
// the card ends up ~212×148 — the layout does the arithmetic, not the widget.
const CW = 184;   // content width
const CH = 92;    // content height

/** Largest centered square inside a rect (for the spatial widgets). */
function squareIn(r: Rect): Rect {
  const s = Math.min(r.w, r.h);
  return rect(r.center.x - s / 2, r.center.y - s / 2, s, s);
}

// ── The control palette recipe + shared drawing helpers ───────────────────────
// One recipe resolves the colors every control shares; each control's \`style\`
// spreads it and adds its own fields. Because it takes (Tokens, Channels), the
// only way to reach a token is from inside a style function — the pit of success.
interface Ctrl {
  muted: Color; accent: Color; bright: Color; dim: Color; well: Color;
  thumb: Color; glow: number;
}
const ctrl = (t: Tokens, ch: Channels): Ctrl => ({
  muted: t.muted,
  accent: t.accent,
  bright: t.textBright,
  dim: t.textDim,
  well: calpha(t.bg, 0.5),
  thumb: t.mix(t.textBright, t.accent, 0.3 * (ch.hover || 0)),
  glow: 9 * (ch.hover || 0),
});

/** A horizontal track filled to fraction \`frac\`. */
function track(paint: Painter, r: Rect, frac: number, muted: Color, fill: Color) {
  const y = r.center.y;
  paint.box(rect(r.x, y - 2.5, r.w, 5), 2.5, muted);
  if (frac > 0) paint.box(rect(r.x, y - 2.5, r.w * clamp(frac, 0, 1), 5), 2.5, fill);
}

/** A draggable thumb, brighter and glowing as \`hot\` rises. */
function thumb(paint: Painter, p: Vec, radius: number, glow: number, accent: Color, core: Color) {
  paint.glow(accent, glow, () => paint.dot(p, radius, core));
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

// ── 1. Slider (scalar 0..1) — Drag1D ──────────────────────────────────────────

const SliderCtl = part<{ value: number }>()("w-slider", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const r = node.rect;
    const bar = rect(r.x + 8, r.center.y - 10, r.w - 16, 20);
    track(paint, bar, node.props.value, s.muted, s.accent);
    thumb(paint, v(bar.x + bar.w * node.props.value, bar.center.y), 7 + 1.5 * node.ch.hover, s.glow, s.accent, s.thumb);
  },
  on: [Drag1D({ axis: "x", pad: 8, to: (_n, f) => ({ kind: "scalar", value: f }) })],
});

// ── 2. Range (min..max) — Gesture, nearest thumb ──────────────────────────────

const RangeCtl = part<{ min: number; max: number }>()("w-range", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const p = node.props, r = node.rect;
    const inner = rect(r.x + 8, r.y, r.w - 16, r.h);
    const y = inner.center.y;
    paint.box(rect(inner.x, y - 2.5, inner.w, 5), 2.5, s.muted);
    const xMin = inner.x + inner.w * p.min, xMax = inner.x + inner.w * p.max;
    paint.box(rect(xMin, y - 2.5, xMax - xMin, 5), 2.5, s.accent);
    thumb(paint, v(xMin, y), 7, s.glow, s.accent, s.thumb);
    thumb(paint, v(xMax, y), 7, s.glow, s.accent, s.thumb);
  },
  on: [
    Gesture<{ min: number; max: number }, { which: "min" | "max" }>({
      begin(node, pointer) {
        const inner = rect(node.rect.x + 8, node.rect.y, node.rect.w - 16, node.rect.h);
        const f = clamp((pointer.x - inner.x) / inner.w, 0, 1);
        return { which: Math.abs(f - node.props.min) <= Math.abs(f - node.props.max) ? "min" : "max" };
      },
      during(state, node, pointer) {
        const inner = rect(node.rect.x + 8, node.rect.y, node.rect.w - 16, node.rect.h);
        const f = clamp((pointer.x - inner.x) / inner.w, 0, 1);
        const { min, max } = node.props;
        const value = state.which === "min" ? { min: Math.min(f, max), max } : { min, max: Math.max(f, min) };
        return { kind: "range", value };
      },
    }),
  ],
});

// ── 3. Number scrub — Gesture, relative horizontal drag ───────────────────────

const NumberScrubCtl = part<{ value: number }>()("w-scrub", {
  size: () => v(CW, CH),
  style: (t, ch) => ({ ...ctrl(t, ch), text: t.mix(t.text, t.textBright, ch.hover || 0) }),
  render: (node, paint, s) => {
    const r = node.rect;
    paint.label(node.props.value.toFixed(1), r.center, s.text, { size: 26, weight: 700 });
    paint.label("‹ drag horizontally ›", v(r.center.x, r.bottom - 6), calpha(s.dim, 0.8), { size: 10 });
  },
  on: [
    Gesture<{ value: number }, { start: number; startX: number }>({
      begin: (node, pointer) => ({ start: node.props.value, startX: pointer.x }),
      during: (state, _node, pointer) => ({ kind: "scrub", value: state.start + (pointer.x - state.startX) * 0.5 }),
    }),
  ],
});

// ── 4. Knob (rotary) — Gesture, vertical drag ─────────────────────────────────

const KnobCtl = part<{ value: number }>()("w-knob", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const sq = squareIn(node.rect);
    const c = sq.center, radius = sq.w / 2 - 6;
    paint.ring(c, radius, s.muted, 3);
    const a = (0.75 + node.props.value * 1.5) * Math.PI;   // 270° sweep from 135°
    const tip = v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius);
    paint.line(c, tip, s.accent, 3);
    thumb(paint, tip, 5 + node.ch.hover * 2, s.glow, s.accent, s.thumb);
    paint.dot(c, 3, s.dim);
  },
  on: [
    Gesture<{ value: number }, { start: number; startY: number }>({
      begin: (node, pointer) => ({ start: node.props.value, startY: pointer.y }),
      during: (state, _node, pointer) =>
        ({ kind: "knob", value: clamp(state.start - (pointer.y - state.startY) * 0.006, 0, 1) }),
    }),
  ],
});

// ── 5. Angle dial (0..360°) — Gesture, absolute angle ─────────────────────────

const AngleDialCtl = part<{ angle: number }>()("w-angle", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const sq = squareIn(node.rect);
    const c = sq.center, radius = sq.w / 2 - 6;
    paint.ring(c, radius, s.muted, 2);
    const a = (node.props.angle * Math.PI) / 180;
    const tip = v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius);
    paint.line(c, tip, s.accent, 2.5);
    thumb(paint, tip, 5 + node.ch.hover * 2, s.glow, s.accent, s.thumb);
    paint.dot(c, 3, s.dim);
  },
  on: [
    Gesture<{ angle: number }, Record<string, never>>({
      begin: () => ({}),
      during(_state, node, pointer) {
        const c = squareIn(node.rect).center;
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

const AngleRangeCtl = part<{ start: number; end: number }>()("w-arc", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const p = node.props;
    const sq = squareIn(node.rect);
    const c = sq.center, radius = sq.w / 2 - 6;
    paint.ring(c, radius, s.muted, 1.5);
    drawArc(paint, c, radius, p.start, p.end, s.accent);
    for (const angle of [p.start, p.end]) {
      const a = (angle * Math.PI) / 180;
      thumb(paint, v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 5 + node.ch.hover * 2, s.glow, s.accent, s.thumb);
    }
  },
  on: [
    Gesture<{ start: number; end: number }, { which: "start" | "end" }>({
      begin(node, pointer) {
        const c = squareIn(node.rect).center;
        const a = degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x));
        const dist = (x: number) => Math.min((a - x + 360) % 360, (x - a + 360) % 360);
        return { which: dist(node.props.start) <= dist(node.props.end) ? "start" : "end" };
      },
      during(state, node, pointer) {
        const c = squareIn(node.rect).center;
        const a = degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x));
        return { kind: "arc", value: { ...node.props, [state.which]: a } as { start: number; end: number } };
      },
    }),
  ],
});

// ── 7. XY pad (vector 2) — Gesture ────────────────────────────────────────────

const XYPadCtl = part<{ x: number; y: number }>()("w-xy", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const p = node.props;
    const sq = squareIn(node.rect);
    paint.box(sq, 6, s.well, s.muted, 1);
    paint.line(v(sq.x, sq.center.y), v(sq.right, sq.center.y), calpha(s.muted, 0.6));
    paint.line(v(sq.center.x, sq.y), v(sq.center.x, sq.bottom), calpha(s.muted, 0.6));
    const dot = v(sq.center.x + (p.x * sq.w) / 2, sq.center.y - (p.y * sq.h) / 2);
    thumb(paint, dot, 6 + node.ch.hover * 2, s.glow, s.accent, s.thumb);
  },
  on: [
    Gesture<{ x: number; y: number }, Record<string, never>>({
      begin: () => ({}),
      during(_state, node, pointer) {
        const sq = squareIn(node.rect);
        return { kind: "xy", value: {
          x: clamp(((pointer.x - sq.center.x) / (sq.w / 2)), -1, 1),
          y: clamp((-(pointer.y - sq.center.y) / (sq.h / 2)), -1, 1),
        } };
      },
    }),
  ],
});

// ── 8. Box 2D (bounds) — Gesture, nearest corner ──────────────────────────────

const Box2DCtl = part<Doc["box"]>()("w-box2d", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const p = node.props;
    const sq = squareIn(node.rect);
    paint.box(sq, 6, s.well, s.muted, 1);
    const toScreen = (fx: number, fy: number) => v(sq.x + fx * sq.w, sq.bottom - fy * sq.h);   // y up
    const a = toScreen(p.minX, p.minY), b = toScreen(p.maxX, p.maxY);
    paint.box(rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)), 3,
      calpha(s.accent, 0.2), s.accent, 1.5);
    thumb(paint, a, 5 + node.ch.hover, s.glow, s.accent, s.thumb);
    thumb(paint, b, 5 + node.ch.hover, s.glow, s.accent, s.thumb);
  },
  on: [
    Gesture<Doc["box"], { corner: "min" | "max" }>({
      begin(node, pointer) {
        const sq = squareIn(node.rect);
        const p = node.props;
        const toScreen = (fx: number, fy: number) => v(sq.x + fx * sq.w, sq.bottom - fy * sq.h);
        const dMin = vdist(pointer, toScreen(p.minX, p.minY));
        const dMax = vdist(pointer, toScreen(p.maxX, p.maxY));
        return { corner: dMin <= dMax ? "min" : "max" };
      },
      during(state, node, pointer) {
        const sq = squareIn(node.rect);
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

const Box3DCtl = part<{ yaw: number; pitch: number }>()("w-box3d", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const { yaw, pitch } = node.props;
    const sq = squareIn(node.rect);
    const c = sq.center, scale = sq.w / 2 - 8;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const project = ([x, y, z]: [number, number, number]): Vec => {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;      // yaw about Y
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;     // pitch about X
      const persp = 1 / (1 + z2 * 0.18);                      // gentle perspective
      return v(c.x + x1 * scale * persp, c.y + y2 * scale * persp);
    };
    const pts = CUBE_VERTS.map(project);
    for (const [i, j] of CUBE_EDGES) paint.line(pts[i], pts[j], calpha(s.accent, 0.85), 1.5);
    for (const p of pts) paint.dot(p, 2.5, s.bright);
  },
  on: [
    Gesture<{ yaw: number; pitch: number }, { yaw: number; pitch: number; x: number; y: number }>({
      begin: (node, pointer) => ({ yaw: node.props.yaw, pitch: node.props.pitch, x: pointer.x, y: pointer.y }),
      during: (st, _node, pointer) => ({
        kind: "cube",
        value: {
          yaw: st.yaw + (pointer.x - st.x) * 0.012,
          pitch: clamp(st.pitch + (pointer.y - st.y) * 0.012, -1.3, 1.3),
        },
      }),
    }),
  ],
});

// ── 10. Color wheel (HSV) — Gesture ───────────────────────────────────────────

const ColorWheelCtl = part<{ hue: number; sat: number }>()("w-color", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const { hue, sat } = node.props;
    const sq = squareIn(node.rect);
    const c = sq.center, radius = sq.w / 2 - 4;
    for (let i = 0; i < 72; i++) {                    // the hue ring
      const a = (i / 72) * TAU;
      paint.dot(v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 3, hsl((i / 72) * 360, 0.7, 0.55));
    }
    paint.dot(c, radius - 8, hsl(hue * 360, sat, 0.55));   // selected color, center
    const a = hue * TAU, rr = sat * (radius - 8);
    thumb(paint, v(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr), 5 + node.ch.hover * 2, s.glow, s.accent, s.thumb);
  },
  on: [
    Gesture<{ hue: number; sat: number }, Record<string, never>>({
      begin: () => ({}),
      during(_state, node, pointer) {
        const sq = squareIn(node.rect);
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

const GradientCtl = part<{ at: number }>()("w-gradient", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const at = node.props.at, r = node.rect;
    const bar = rect(r.x + 8, r.center.y - 14, r.w - 16, 28);
    const slices = 48;
    for (let i = 0; i < slices; i++)     // fake a gradient fill with thin slices
      paint.box(rect(bar.x + (bar.w * i) / slices, bar.y, bar.w / slices + 1, bar.h), 0, cmix(RAMP_A, RAMP_B, i / slices));
    const x = bar.x + bar.w * at;
    paint.box(rect(x - 2, bar.y - 4, 4, bar.h + 8), 1, s.bright);
    thumb(paint, v(x, bar.bottom + 8), 5 + node.ch.hover, s.glow, s.accent, s.thumb);
  },
  on: [Drag1D({ axis: "x", pad: 8, to: (_n, f) => ({ kind: "gradient", value: f }) })],
});

// ── 12. Toggle switch — Press + spring channel ────────────────────────────────

const ToggleCtl = part<{ on: boolean }>()("w-toggle", {
  size: () => v(CW, CH),
  channels: { on: { target: (n: GNode<{ on: boolean }>) => (n.props.on ? 1 : 0), spring: { stiffness: 260, damping: 20 } } },
  style: (t, ch) => ({ ...ctrl(t, ch), track: t.mix(t.muted, t.accent, clamp(ch.on || 0, 0, 1)) }),
  render: (node, paint, s) => {
    const r = node.rect;
    const t = clamp(node.ch.on, 0, 1);
    const sw = rect(r.center.x - 26, r.center.y - 13, 52, 26);
    paint.box(sw, 13, s.track);
    paint.glow(s.accent, 8 * node.ch.hover, () => paint.dot(v(sw.x + 13 + t * 26, sw.center.y), 9, s.bright));
  },
  on: [Press(() => ({ kind: "toggle" }))],
});

// ── 13. Checkbox — Press + spring channel ─────────────────────────────────────

const CheckboxCtl = part<{ on: boolean }>()("w-check", {
  size: () => v(CW, CH),
  channels: { on: { target: (n: GNode<{ on: boolean }>) => (n.props.on ? 1 : 0), spring: { stiffness: 340, damping: 22 } } },
  style: (t, ch) => {
    const on = clamp(ch.on || 0, 0, 1);
    return { ...ctrl(t, ch), fill: t.mix(t.surface, t.accent, on * 0.9), edge: t.mix(t.muted, t.accent, Math.max(on, ch.hover || 0)) };
  },
  render: (node, paint, s) => {
    const r = node.rect;
    const t = clamp(node.ch.on, 0, 1);
    const bx = rect(r.center.x - 15, r.center.y - 15, 30, 30);
    paint.box(bx, 7, s.fill, s.edge, 1.5);
    if (t > 0.02) {
      const c = bx.center, k = Math.min(1.1, t);
      paint.line(v(c.x - 6 * k, c.y), v(c.x - 1.5 * k, c.y + 5 * k), s.bright, 2.5);
      paint.line(v(c.x - 1.5 * k, c.y + 5 * k), v(c.x + 7 * k, c.y - 5.5 * k), s.bright, 2.5);
    }
  },
  on: [Press(() => ({ kind: "check" }))],
});

// ── 14. Segmented control — Press reads pointer to pick a cell ─────────────────

const SEGMENTS = ["Move", "Rotate", "Scale"];

const SegmentedCtl = part<{ index: number }>()("w-segment", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const r = node.rect;
    const bar = rect(r.x, r.center.y - 15, r.w, 30);
    paint.box(bar, 8, s.well, s.muted, 1);
    const cellW = bar.w / SEGMENTS.length;
    const active = rect(bar.x + cellW * node.props.index + 2, bar.y + 2, cellW - 4, bar.h - 4);
    paint.box(active, 6, calpha(s.accent, 0.8));
    SEGMENTS.forEach((label, i) =>
      paint.label(label, v(bar.x + cellW * (i + 0.5), bar.center.y),
        i === node.props.index ? s.bright : s.dim, { size: 11, weight: 600 }));
  },
  on: [
    Press((node) => {
      const r = node.rect;
      const px = (node.pointer ?? r.center).x;
      const i = clamp(Math.floor(((px - r.x) / r.w) * SEGMENTS.length), 0, SEGMENTS.length - 1);
      return { kind: "segment", value: i };
    }),
  ],
});

// ── 15. Vector 3 (three scrub rows) — Gesture picks a row ──────────────────────

const AXES: ("x" | "y" | "z")[] = ["x", "y", "z"];
const AXIS_HUE = { x: 0, y: 130, z: 215 };

const Vector3Ctl = part<{ x: number; y: number; z: number }>()("w-vec3", {
  size: () => v(CW, CH),
  style: (t, ch) => ctrl(t, ch),
  render: (node, paint, s) => {
    const p = node.props, r = node.rect;
    const rowH = r.h / 3;
    AXES.forEach((axis, i) => {
      const y = r.y + rowH * (i + 0.5);
      const barX = r.x + 22, barW = r.w - 30;
      paint.label(axis.toUpperCase(), v(r.x + 4, y), hsl(AXIS_HUE[axis], 0.6, 0.6), { size: 11, weight: 700, align: "left" });
      paint.box(rect(barX, y - 2, barW, 4), 2, s.muted);
      const t = (p[axis] + 1) / 2;                                    // -1..1 → 0..1
      paint.dot(v(barX + barW * clamp(t, 0, 1), y), 5, hsl(AXIS_HUE[axis], 0.6, 0.6));
    });
  },
  on: [
    Gesture<{ x: number; y: number; z: number }, { axis: "x" | "y" | "z"; start: number; startX: number }>({
      begin(node, pointer) {
        const r = node.rect;
        const row = clamp(Math.floor((pointer.y - r.y) / (r.h / 3)), 0, 2);
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
// The board still draws free canvas chrome (grid, hint) — it defines no part
// content of its own beyond the Pan surface. It reads tokens directly, and is
// ALLOWED to: the check rule targets part-defining files' style/render leaks,
// and this file's parts are all token-free. (The grid is app-level free drawing.)

const Board = part<Record<string, never>>()("widget-board", {
  measure: (_p, avail) => avail,   // fill the viewport (was size:()=>v(0,0))
  hit: () => true,
  style: (t) => ({ dot: calpha(t.muted, 0.35), hint: calpha(t.textDim, 0.9) }),
  render: (node, paint, s) => {
    const vp = node.view!;
    const G = 32;
    const x0 = Math.floor(-vp.pan.x / vp.zoom / G) * G, x1 = (vp.w - vp.pan.x) / vp.zoom;
    const y0 = Math.floor(-vp.pan.y / vp.zoom / G) * G, y1 = (vp.h - vp.pan.y) / vp.zoom;
    for (let x = x0; x <= x1; x += G)
      for (let y = y0; y <= y1; y += G) paint.dot(v(x, y), 1, s.dot);
    paint.label("drag the controls · drag empty space to pan · wheel to zoom",
      v(120, 22), s.hint, { align: "left", size: 12 });
  },
  on: [Pan()],
});

// ── View: each control wrapped in a Card composite, laid out in a grid ─────────

const CARD_W = 212, CARD_H = 150;
const COLS = 3;
const at = (i: number): Vec => v(24 + (i % COLS) * (CARD_W + 16), 44 + Math.floor(i / COLS) * (CARD_H + 16));

/** A card wrapping one control part, positioned on the board. */
const cell = (i: number, title: string, value: string, ctl: Element): Element =>
  ({ ...Card(title.toLowerCase().replace(/\\s+/g, "-"), { title, value }, [ctl]), pos: at(i) });

function view(doc: Doc): Element {
  const cards: Element[] = [
    cell(0, "Slider", doc.scalar.toFixed(2), SliderCtl("c", { value: doc.scalar })),
    cell(1, "Range", \`\${doc.range.min.toFixed(2)}–\${doc.range.max.toFixed(2)}\`, RangeCtl("c", { min: doc.range.min, max: doc.range.max })),
    cell(2, "Number", doc.scrub.toFixed(1), NumberScrubCtl("c", { value: doc.scrub })),
    cell(3, "Knob", \`\${Math.round(doc.knob * 100)}%\`, KnobCtl("c", { value: doc.knob })),
    cell(4, "Angle", \`\${Math.round(doc.angle)}°\`, AngleDialCtl("c", { angle: doc.angle })),
    cell(5, "Arc", \`\${Math.round(doc.arc.start)}°–\${Math.round(doc.arc.end)}°\`, AngleRangeCtl("c", { start: doc.arc.start, end: doc.arc.end })),
    cell(6, "Vector 2", \`\${doc.xy.x.toFixed(2)}, \${doc.xy.y.toFixed(2)}\`, XYPadCtl("c", { x: doc.xy.x, y: doc.xy.y })),
    cell(7, "Bounds 2D", \`\${doc.box.minX.toFixed(1)},\${doc.box.minY.toFixed(1)}→\${doc.box.maxX.toFixed(1)},\${doc.box.maxY.toFixed(1)}\`, Box2DCtl("c", { ...doc.box })),
    cell(8, "Box 3D", \`\${Math.round(degOf(doc.cube.yaw))}°\`, Box3DCtl("c", { yaw: doc.cube.yaw, pitch: doc.cube.pitch })),
    cell(9, "Color", hexOf(hsl(doc.color.hue * 360, doc.color.sat, 0.55)), ColorWheelCtl("c", { hue: doc.color.hue, sat: doc.color.sat })),
    cell(10, "Gradient", hexOf(cmix(RAMP_A, RAMP_B, doc.gradient)), GradientCtl("c", { at: doc.gradient })),
    cell(11, "Toggle", doc.toggle ? "on" : "off", ToggleCtl("c", { on: doc.toggle })),
    cell(12, "Checkbox", doc.check ? "✓" : "—", CheckboxCtl("c", { on: doc.check })),
    cell(13, "Mode", SEGMENTS[doc.segment], SegmentedCtl("c", { index: doc.segment })),
    cell(14, "Vector 3", \`\${doc.vec3.x.toFixed(1)},\${doc.vec3.y.toFixed(1)},\${doc.vec3.z.toFixed(1)}\`, Vector3Ctl("c", { x: doc.vec3.x, y: doc.vec3.y, z: doc.vec3.z })),
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

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
`,p=184,b=92;function v(n){const e=Math.min(n.w,n.h);return u(n.center.x-e/2,n.center.y-e/2,e,e)}const g=(n,e)=>({muted:n.muted,accent:n.accent,bright:n.textBright,dim:n.textDim,well:M(n.bg,.5),thumb:n.mix(n.textBright,n.accent,.3*(e.hover||0)),glow:9*(e.hover||0)});function tn(n,e,t,r,a){const c=e.center.y;n.box(u(e.x,c-2.5,e.w,5),2.5,r),t>0&&n.box(u(e.x,c-2.5,e.w*d(t,0,1),5),2.5,a)}function w(n,e,t,r,a,c){n.glow(a,r,()=>n.dot(e,t,c))}const A=Math.PI*2,X=n=>(n*180/Math.PI+360)%360;function rn(n,e){switch(e.kind){case"scalar":return{...n,scalar:e.value};case"range":return{...n,range:e.value};case"scrub":return{...n,scrub:e.value};case"knob":return{...n,knob:e.value};case"angle":return{...n,angle:e.value};case"arc":return{...n,arc:e.value};case"xy":return{...n,xy:e.value};case"box":return{...n,box:e.value};case"cube":return{...n,cube:e.value};case"color":return{...n,color:e.value};case"gradient":return{...n,gradient:e.value};case"toggle":return{...n,toggle:!n.toggle};case"check":return{...n,check:!n.check};case"segment":return{...n,segment:e.value};case"vec3":return{...n,vec3:e.value}}}const an=h()("w-slider",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.rect,a=u(r.x+8,r.center.y-10,r.w-16,20);tn(e,a,n.props.value,t.muted,t.accent),w(e,i(a.x+a.w*n.props.value,a.center.y),7+1.5*n.ch.hover,t.glow,t.accent,t.thumb)},on:[T({axis:"x",pad:8,to:(n,e)=>({kind:"scalar",value:e})})]}),cn=h()("w-range",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.props,a=n.rect,c=u(a.x+8,a.y,a.w-16,a.h),o=c.center.y;e.box(u(c.x,o-2.5,c.w,5),2.5,t.muted);const s=c.x+c.w*r.min,l=c.x+c.w*r.max;e.box(u(s,o-2.5,l-s,5),2.5,t.accent),w(e,i(s,o),7,t.glow,t.accent,t.thumb),w(e,i(l,o),7,t.glow,t.accent,t.thumb)},on:[f({begin(n,e){const t=u(n.rect.x+8,n.rect.y,n.rect.w-16,n.rect.h),r=d((e.x-t.x)/t.w,0,1);return{which:Math.abs(r-n.props.min)<=Math.abs(r-n.props.max)?"min":"max"}},during(n,e,t){const r=u(e.rect.x+8,e.rect.y,e.rect.w-16,e.rect.h),a=d((t.x-r.x)/r.w,0,1),{min:c,max:o}=e.props;return{kind:"range",value:n.which==="min"?{min:Math.min(a,o),max:o}:{min:c,max:Math.max(a,c)}}}})]}),on=h()("w-scrub",{size:()=>i(p,b),style:(n,e)=>({...g(n,e),text:n.mix(n.text,n.textBright,e.hover||0)}),render:(n,e,t)=>{const r=n.rect;e.label(n.props.value.toFixed(1),r.center,t.text,{size:26,weight:700}),e.label("‹ drag horizontally ›",i(r.center.x,r.bottom-6),M(t.dim,.8),{size:10})},on:[f({begin:(n,e)=>({start:n.props.value,startX:e.x}),during:(n,e,t)=>({kind:"scrub",value:n.start+(t.x-n.startX)*.5})})]}),sn=h()("w-knob",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=v(n.rect),a=r.center,c=r.w/2-6;e.ring(a,c,t.muted,3);const o=(.75+n.props.value*1.5)*Math.PI,s=i(a.x+Math.cos(o)*c,a.y+Math.sin(o)*c);e.line(a,s,t.accent,3),w(e,s,5+n.ch.hover*2,t.glow,t.accent,t.thumb),e.dot(a,3,t.dim)},on:[f({begin:(n,e)=>({start:n.props.value,startY:e.y}),during:(n,e,t)=>({kind:"knob",value:d(n.start-(t.y-n.startY)*.006,0,1)})})]}),ln=h()("w-angle",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=v(n.rect),a=r.center,c=r.w/2-6;e.ring(a,c,t.muted,2);const o=n.props.angle*Math.PI/180,s=i(a.x+Math.cos(o)*c,a.y+Math.sin(o)*c);e.line(a,s,t.accent,2.5),w(e,s,5+n.ch.hover*2,t.glow,t.accent,t.thumb),e.dot(a,3,t.dim)},on:[f({begin:()=>({}),during(n,e,t){const r=v(e.rect).center;return{kind:"angle",value:X(Math.atan2(t.y-r.y,t.x-r.x))}}})]});function un(n,e,t,r,a,c){const o=(a-r+360)%360||360,s=Math.max(2,Math.round(o/8));for(let l=0;l<=s;l++){const m=(r+o*l/s)*Math.PI/180;n.dot(i(e.x+Math.cos(m)*t,e.y+Math.sin(m)*t),2,c)}}const dn=h()("w-arc",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.props,a=v(n.rect),c=a.center,o=a.w/2-6;e.ring(c,o,t.muted,1.5),un(e,c,o,r.start,r.end,t.accent);for(const s of[r.start,r.end]){const l=s*Math.PI/180;w(e,i(c.x+Math.cos(l)*o,c.y+Math.sin(l)*o),5+n.ch.hover*2,t.glow,t.accent,t.thumb)}},on:[f({begin(n,e){const t=v(n.rect).center,r=X(Math.atan2(e.y-t.y,e.x-t.x)),a=c=>Math.min((r-c+360)%360,(c-r+360)%360);return{which:a(n.props.start)<=a(n.props.end)?"start":"end"}},during(n,e,t){const r=v(e.rect).center,a=X(Math.atan2(t.y-r.y,t.x-r.x));return{kind:"arc",value:{...e.props,[n.which]:a}}}})]}),mn=h()("w-xy",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.props,a=v(n.rect);e.box(a,6,t.well,t.muted,1),e.line(i(a.x,a.center.y),i(a.right,a.center.y),M(t.muted,.6)),e.line(i(a.center.x,a.y),i(a.center.x,a.bottom),M(t.muted,.6));const c=i(a.center.x+r.x*a.w/2,a.center.y-r.y*a.h/2);w(e,c,6+n.ch.hover*2,t.glow,t.accent,t.thumb)},on:[f({begin:()=>({}),during(n,e,t){const r=v(e.rect);return{kind:"xy",value:{x:d((t.x-r.center.x)/(r.w/2),-1,1),y:d(-(t.y-r.center.y)/(r.h/2),-1,1)}}}})]}),hn=h()("w-box2d",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.props,a=v(n.rect);e.box(a,6,t.well,t.muted,1);const c=(l,m)=>i(a.x+l*a.w,a.bottom-m*a.h),o=c(r.minX,r.minY),s=c(r.maxX,r.maxY);e.box(u(Math.min(o.x,s.x),Math.min(o.y,s.y),Math.abs(s.x-o.x),Math.abs(s.y-o.y)),3,M(t.accent,.2),t.accent,1.5),w(e,o,5+n.ch.hover,t.glow,t.accent,t.thumb),w(e,s,5+n.ch.hover,t.glow,t.accent,t.thumb)},on:[f({begin(n,e){const t=v(n.rect),r=n.props,a=(s,l)=>i(t.x+s*t.w,t.bottom-l*t.h),c=_(e,a(r.minX,r.minY)),o=_(e,a(r.maxX,r.maxY));return{corner:c<=o?"min":"max"}},during(n,e,t){const r=v(e.rect),a=d((t.x-r.x)/r.w,0,1),c=d((r.bottom-t.y)/r.h,0,1),o=e.props,s=n.corner==="min"?{...o,minX:Math.min(a,o.maxX),minY:Math.min(c,o.maxY)}:{...o,maxX:Math.max(a,o.minX),maxY:Math.max(c,o.minY)};return{kind:"box",value:{minX:s.minX,minY:s.minY,maxX:s.maxX,maxY:s.maxY}}}})]}),F=[];for(let n=0;n<8;n++)F.push([n&1?1:-1,n&2?1:-1,n&4?1:-1]);const H=[];for(let n=0;n<8;n++)for(let e=n+1;e<8;e++){const t=n^e;(t===1||t===2||t===4)&&H.push([n,e])}const xn=h()("w-box3d",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const{yaw:r,pitch:a}=n.props,c=v(n.rect),o=c.center,s=c.w/2-8,l=Math.cos(r),m=Math.sin(r),y=Math.cos(a),C=Math.sin(a),N=([z,S,G])=>{const U=z*l+G*m,Y=-z*m+G*l,j=S*y-Y*C,P=1/(1+(S*C+Y*y)*.18);return i(o.x+U*s*P,o.y+j*s*P)},E=F.map(N);for(const[z,S]of H)e.line(E[z],E[S],M(t.accent,.85),1.5);for(const z of E)e.dot(z,2.5,t.bright)},on:[f({begin:(n,e)=>({yaw:n.props.yaw,pitch:n.props.pitch,x:e.x,y:e.y}),during:(n,e,t)=>({kind:"cube",value:{yaw:n.yaw+(t.x-n.x)*.012,pitch:d(n.pitch+(t.y-n.y)*.012,-1.3,1.3)}})})]}),pn=h()("w-color",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const{hue:r,sat:a}=n.props,c=v(n.rect),o=c.center,s=c.w/2-4;for(let y=0;y<72;y++){const C=y/72*A;e.dot(i(o.x+Math.cos(C)*s,o.y+Math.sin(C)*s),3,k(y/72*360,.7,.55))}e.dot(o,s-8,k(r*360,a,.55));const l=r*A,m=a*(s-8);w(e,i(o.x+Math.cos(l)*m,o.y+Math.sin(l)*m),5+n.ch.hover*2,t.glow,t.accent,t.thumb)},on:[f({begin:()=>({}),during(n,e,t){const r=v(e.rect),a=r.center,c=r.w/2-12,o=t.x-a.x,s=t.y-a.y;return{kind:"color",value:{hue:(Math.atan2(s,o)/A%1+1)%1,sat:d(Math.hypot(o,s)/c,0,1)}}}})]}),O=k(205,.75,.55),V=k(330,.75,.58),bn=h()("w-gradient",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.props.at,a=n.rect,c=u(a.x+8,a.center.y-14,a.w-16,28),o=48;for(let l=0;l<o;l++)e.box(u(c.x+c.w*l/o,c.y,c.w/o+1,c.h),0,$(O,V,l/o));const s=c.x+c.w*r;e.box(u(s-2,c.y-4,4,c.h+8),1,t.bright),w(e,i(s,c.bottom+8),5+n.ch.hover,t.glow,t.accent,t.thumb)},on:[T({axis:"x",pad:8,to:(n,e)=>({kind:"gradient",value:e})})]}),gn=h()("w-toggle",{size:()=>i(p,b),channels:{on:{target:n=>n.props.on?1:0,spring:{stiffness:260,damping:20}}},style:(n,e)=>({...g(n,e),track:n.mix(n.muted,n.accent,d(e.on||0,0,1))}),render:(n,e,t)=>{const r=n.rect,a=d(n.ch.on,0,1),c=u(r.center.x-26,r.center.y-13,52,26);e.box(c,13,t.track),e.glow(t.accent,8*n.ch.hover,()=>e.dot(i(c.x+13+a*26,c.center.y),9,t.bright))},on:[D(()=>({kind:"toggle"}))]}),yn=h()("w-check",{size:()=>i(p,b),channels:{on:{target:n=>n.props.on?1:0,spring:{stiffness:340,damping:22}}},style:(n,e)=>{const t=d(e.on||0,0,1);return{...g(n,e),fill:n.mix(n.surface,n.accent,t*.9),edge:n.mix(n.muted,n.accent,Math.max(t,e.hover||0))}},render:(n,e,t)=>{const r=n.rect,a=d(n.ch.on,0,1),c=u(r.center.x-15,r.center.y-15,30,30);if(e.box(c,7,t.fill,t.edge,1.5),a>.02){const o=c.center,s=Math.min(1.1,a);e.line(i(o.x-6*s,o.y),i(o.x-1.5*s,o.y+5*s),t.bright,2.5),e.line(i(o.x-1.5*s,o.y+5*s),i(o.x+7*s,o.y-5.5*s),t.bright,2.5)}},on:[D(()=>({kind:"check"}))]}),q=["Move","Rotate","Scale"],vn=h()("w-segment",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.rect,a=u(r.x,r.center.y-15,r.w,30);e.box(a,8,t.well,t.muted,1);const c=a.w/q.length,o=u(a.x+c*n.props.index+2,a.y+2,c-4,a.h-4);e.box(o,6,M(t.accent,.8)),q.forEach((s,l)=>e.label(s,i(a.x+c*(l+.5),a.center.y),l===n.props.index?t.bright:t.dim,{size:11,weight:600}))},on:[D(n=>{const e=n.rect,t=(n.pointer??e.center).x;return{kind:"segment",value:d(Math.floor((t-e.x)/e.w*q.length),0,q.length-1)}})]}),B=["x","y","z"],R={x:0,y:130,z:215},wn=h()("w-vec3",{size:()=>i(p,b),style:(n,e)=>g(n,e),render:(n,e,t)=>{const r=n.props,a=n.rect,c=a.h/3;B.forEach((o,s)=>{const l=a.y+c*(s+.5),m=a.x+22,y=a.w-30;e.label(o.toUpperCase(),i(a.x+4,l),k(R[o],.6,.6),{size:11,weight:700,align:"left"}),e.box(u(m,l-2,y,4),2,t.muted);const C=(r[o]+1)/2;e.dot(i(m+y*d(C,0,1),l),5,k(R[o],.6,.6))})},on:[f({begin(n,e){const t=n.rect,r=d(Math.floor((e.y-t.y)/(t.h/3)),0,2),a=B[r];return{axis:a,start:n.props[a],startX:e.x}},during(n,e,t){const r=d(n.start+(t.x-n.startX)*.01,-1,1);return{kind:"vec3",value:{...e.props,[n.axis]:r}}}})]}),fn=h()("widget-board",{measure:(n,e)=>e,hit:()=>!0,style:n=>({dot:M(n.muted,.35),hint:M(n.textDim,.9)}),render:(n,e,t)=>{const r=n.view,a=32,c=Math.floor(-r.pan.x/r.zoom/a)*a,o=(r.w-r.pan.x)/r.zoom,s=Math.floor(-r.pan.y/r.zoom/a)*a,l=(r.h-r.pan.y)/r.zoom;for(let m=c;m<=o;m+=a)for(let y=s;y<=l;y+=a)e.dot(i(m,y),1,t.dot);e.label("drag the controls · drag empty space to pan · wheel to zoom",i(120,22),t.hint,{align:"left",size:12})},on:[L()]}),Mn=212,Cn=150,W=3,kn=n=>i(24+n%W*(Mn+16),44+Math.floor(n/W)*(Cn+16)),x=(n,e,t,r)=>({...Z(e.toLowerCase().replace(/\s+/g,"-"),{title:e,value:t},[r]),pos:kn(n)});function zn(n){const e=[x(0,"Slider",n.scalar.toFixed(2),an("c",{value:n.scalar})),x(1,"Range",`${n.range.min.toFixed(2)}–${n.range.max.toFixed(2)}`,cn("c",{min:n.range.min,max:n.range.max})),x(2,"Number",n.scrub.toFixed(1),on("c",{value:n.scrub})),x(3,"Knob",`${Math.round(n.knob*100)}%`,sn("c",{value:n.knob})),x(4,"Angle",`${Math.round(n.angle)}°`,ln("c",{angle:n.angle})),x(5,"Arc",`${Math.round(n.arc.start)}°–${Math.round(n.arc.end)}°`,dn("c",{start:n.arc.start,end:n.arc.end})),x(6,"Vector 2",`${n.xy.x.toFixed(2)}, ${n.xy.y.toFixed(2)}`,mn("c",{x:n.xy.x,y:n.xy.y})),x(7,"Bounds 2D",`${n.box.minX.toFixed(1)},${n.box.minY.toFixed(1)}→${n.box.maxX.toFixed(1)},${n.box.maxY.toFixed(1)}`,hn("c",{...n.box})),x(8,"Box 3D",`${Math.round(X(n.cube.yaw))}°`,xn("c",{yaw:n.cube.yaw,pitch:n.cube.pitch})),x(9,"Color",I(k(n.color.hue*360,n.color.sat,.55)),pn("c",{hue:n.color.hue,sat:n.color.sat})),x(10,"Gradient",I($(O,V,n.gradient)),bn("c",{at:n.gradient})),x(11,"Toggle",n.toggle?"on":"off",gn("c",{on:n.toggle})),x(12,"Checkbox",n.check?"✓":"—",yn("c",{on:n.check})),x(13,"Mode",q[n.segment],vn("c",{index:n.segment})),x(14,"Vector 3",`${n.vec3.x.toFixed(1)},${n.vec3.y.toFixed(1)},${n.vec3.z.toFixed(1)}`,wn("c",{x:n.vec3.x,y:n.vec3.y,z:n.vec3.z}))];return fn("root",{},[Q("cards",{},e)])}const qn=document.getElementById("c");K(qn,{init:{scalar:.4,range:{min:.25,max:.75},scrub:42,knob:.6,angle:45,arc:{start:20,end:200},xy:{x:.35,y:.5},box:{minX:.2,minY:.25,maxX:.75,maxY:.7},cube:{yaw:.7,pitch:.4},color:{hue:.58,sat:.7},gradient:.5,toggle:!0,check:!0,segment:0,vec3:{x:.3,y:-.2,z:.6}},update:rn,view:zn});J([{name:"main.ts",code:en},{name:"widgets.ts (shared)",code:nn}]);
