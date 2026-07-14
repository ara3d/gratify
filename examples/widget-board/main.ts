// ============================================================================
// Example: widget board — a dozen-plus creative-tool controls, reimplemented
// from the Kea node editor's widget library, now as COMPOSITES.
//
// Every card is the shared `Card` part (widgets.ts) used 15 times: its body
// facet supplies the title/value chrome and a content slot. Into that slot goes
// ONE interactive control part — a standalone part sized by layout, so it reads
// its OWN rect (no `innerOf(card)` offset math) and its gesture works in its
// own coordinates. And no control reads the `tokens` singleton: colors resolve
// in a `style` facet, so each control is restylable and themable (enforced by
// `npm run check`).
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
// One recipe resolves the colors every control shares; each control's `style`
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

/** A horizontal track filled to fraction `frac`. */
function track(paint: Painter, r: Rect, frac: number, muted: Color, fill: Color) {
  const y = r.center.y;
  paint.box(rect(r.x, y - 2.5, r.w, 5), 2.5, muted);
  if (frac > 0) paint.box(rect(r.x, y - 2.5, r.w * clamp(frac, 0, 1), 5), 2.5, fill);
}

/** A draggable thumb, brighter and glowing as `hot` rises. */
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

/** Draw a dotted arc from angle `a0` to `a1` (degrees, increasing). */
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
  size: () => v(0, 0),
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
  ({ ...Card(title.toLowerCase().replace(/\s+/g, "-"), { title, value }, [ctl]), pos: at(i) });

function view(doc: Doc): Element {
  const cards: Element[] = [
    cell(0, "Slider", doc.scalar.toFixed(2), SliderCtl("c", { value: doc.scalar })),
    cell(1, "Range", `${doc.range.min.toFixed(2)}–${doc.range.max.toFixed(2)}`, RangeCtl("c", { min: doc.range.min, max: doc.range.max })),
    cell(2, "Number", doc.scrub.toFixed(1), NumberScrubCtl("c", { value: doc.scrub })),
    cell(3, "Knob", `${Math.round(doc.knob * 100)}%`, KnobCtl("c", { value: doc.knob })),
    cell(4, "Angle", `${Math.round(doc.angle)}°`, AngleDialCtl("c", { angle: doc.angle })),
    cell(5, "Arc", `${Math.round(doc.arc.start)}°–${Math.round(doc.arc.end)}°`, AngleRangeCtl("c", { start: doc.arc.start, end: doc.arc.end })),
    cell(6, "Vector 2", `${doc.xy.x.toFixed(2)}, ${doc.xy.y.toFixed(2)}`, XYPadCtl("c", { x: doc.xy.x, y: doc.xy.y })),
    cell(7, "Bounds 2D", `${doc.box.minX.toFixed(1)},${doc.box.minY.toFixed(1)}→${doc.box.maxX.toFixed(1)},${doc.box.maxY.toFixed(1)}`, Box2DCtl("c", { ...doc.box })),
    cell(8, "Box 3D", `${Math.round(degOf(doc.cube.yaw))}°`, Box3DCtl("c", { yaw: doc.cube.yaw, pitch: doc.cube.pitch })),
    cell(9, "Color", hexOf(hsl(doc.color.hue * 360, doc.color.sat, 0.55)), ColorWheelCtl("c", { hue: doc.color.hue, sat: doc.color.sat })),
    cell(10, "Gradient", hexOf(cmix(RAMP_A, RAMP_B, doc.gradient)), GradientCtl("c", { at: doc.gradient })),
    cell(11, "Toggle", doc.toggle ? "on" : "off", ToggleCtl("c", { on: doc.toggle })),
    cell(12, "Checkbox", doc.check ? "✓" : "—", CheckboxCtl("c", { on: doc.check })),
    cell(13, "Mode", SEGMENTS[doc.segment], SegmentedCtl("c", { index: doc.segment })),
    cell(14, "Vector 3", `${doc.vec3.x.toFixed(1)},${doc.vec3.y.toFixed(1)},${doc.vec3.z.toFixed(1)}`, Vector3Ctl("c", { x: doc.vec3.x, y: doc.vec3.y, z: doc.vec3.z })),
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
