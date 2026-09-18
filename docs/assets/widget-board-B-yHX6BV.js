import{p,D as F,r as v,v as i,G as C,c as w,w as h,y as E,h as k,b as T,P as G,q as L,m as K,E as _,u as J}from"./runtime-DNEt0yeT.js";import{R as Q,b as Z}from"./widgets-BUxxEPAc.js";import{a as nn}from"./source-panel-CSqvtNlY.js";import{w as rn}from"./widgets-EtuMVc6k.js";const en=`// ============================================================================\r
// Example: widget board — a dozen-plus creative-tool controls, reimplemented\r
// from the Kea node editor's widget library, now as COMPOSITES.\r
//\r
// Every card is the shared \`Card\` part (widgets.ts) used 15 times: its body\r
// facet supplies the title/value chrome and a content slot. Into that slot goes\r
// ONE interactive control part — a standalone part sized by layout, so it reads\r
// its OWN rect (no \`innerOf(card)\` offset math) and its gesture works in its\r
// own coordinates. And no control reads the \`tokens\` singleton: colors resolve\r
// in a \`style\` facet, so each control is restylable and themable (enforced by\r
// \`npm run check\`).\r
//\r
// Everything sits on a pannable canvas (drag empty space to pan, wheel to\r
// zoom). The controls: Slider · Range · Number scrub · Bezier ramp · Angle dial ·\r
// Angle range · XY pad · Box 2D · Box 3D · Color wheel · Gradient ramp ·\r
// Toggle · Checkbox · Segmented · Vector 3.\r
// ============================================================================\r
\r
import {\r
  calpha, clamp, cmix, Color, Drag1D, Free, Gesture, GNode, hexOf, hsl, mount,\r
  Painter, Pan, part, Press, rect, Rect, Tokens, Channels, v, Vec, vdist, Element,\r
} from "gratify";\r
import { Card, Range } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
// ── Content geometry ──────────────────────────────────────────────────────────\r
// Each control declares this intrinsic size; the Card's Stack pads around it, so\r
// the card ends up ~212×148 — the layout does the arithmetic, not the widget.\r
const CW = 184;   // content width\r
const CH = 92;    // content height\r
\r
/** Largest centered square inside a rect (for the spatial widgets). */\r
function squareIn(r: Rect): Rect {\r
  const s = Math.min(r.w, r.h);\r
  return rect(r.center.x - s / 2, r.center.y - s / 2, s, s);\r
}\r
\r
// ── The control palette recipe + shared drawing helpers ───────────────────────\r
// One recipe resolves the colors every control shares; each control's \`style\`\r
// spreads it and adds its own fields. Because it takes (Tokens, Channels), the\r
// only way to reach a token is from inside a style function — the pit of success.\r
interface Ctrl {\r
  muted: Color; accent: Color; bright: Color; dim: Color; well: Color;\r
  thumb: Color; glow: number;\r
}\r
const ctrl = (t: Tokens, ch: Channels): Ctrl => ({\r
  muted: t.muted,\r
  accent: t.accent,\r
  bright: t.textBright,\r
  dim: t.textDim,\r
  well: calpha(t.bg, 0.5),\r
  thumb: t.mix(t.textBright, t.accent, 0.3 * (ch.hover || 0)),\r
  glow: 9 * (ch.hover || 0),\r
});\r
\r
/** A horizontal track filled to fraction \`frac\`. */\r
function track(paint: Painter, r: Rect, frac: number, muted: Color, fill: Color) {\r
  const y = r.center.y;\r
  paint.box(rect(r.x, y - 2.5, r.w, 5), 2.5, muted);\r
  if (frac > 0) paint.box(rect(r.x, y - 2.5, r.w * clamp(frac, 0, 1), 5), 2.5, fill);\r
}\r
\r
/** A draggable thumb, brighter and glowing as \`hot\` rises. */\r
function thumb(paint: Painter, p: Vec, radius: number, glow: number, accent: Color, core: Color) {\r
  paint.glow(accent, glow, () => paint.dot(p, radius, core));\r
}\r
\r
const TAU = Math.PI * 2;\r
const degOf = (rad: number) => ((rad * 180) / Math.PI + 360) % 360;\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface Doc {\r
  scalar: number;                                   // 0..1\r
  range: { min: number; max: number };              // 0..100, step 1\r
  scrub: number;                                    // unbounded\r
  ease: { x1: number; y1: number; x2: number; y2: number };   // cubic-bezier handles, 0..1\r
  angle: number;                                    // degrees\r
  arc: { start: number; end: number };              // degrees\r
  xy: { x: number; y: number };                     // -1..1\r
  box: { minX: number; minY: number; maxX: number; maxY: number };  // 0..1\r
  cube: { yaw: number; pitch: number };             // radians\r
  color: { hue: number; sat: number };              // 0..1\r
  gradient: number;                                 // sample position 0..1\r
  toggle: boolean;\r
  check: boolean;\r
  segment: number;                                  // 0..2\r
  vec3: { x: number; y: number; z: number };        // -1..1\r
}\r
\r
type Intent =\r
  | { kind: "scalar"; value: number }\r
  | { kind: "range"; value: { min: number; max: number } }\r
  | { kind: "scrub"; value: number }\r
  | { kind: "ease"; value: Doc["ease"] }\r
  | { kind: "angle"; value: number }\r
  | { kind: "arc"; value: { start: number; end: number } }\r
  | { kind: "xy"; value: { x: number; y: number } }\r
  | { kind: "box"; value: Doc["box"] }\r
  | { kind: "cube"; value: { yaw: number; pitch: number } }\r
  | { kind: "color"; value: { hue: number; sat: number } }\r
  | { kind: "gradient"; value: number }\r
  | { kind: "toggle" }\r
  | { kind: "check" }\r
  | { kind: "segment"; value: number }\r
  | { kind: "vec3"; value: { x: number; y: number; z: number } };\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "scalar": return { ...doc, scalar: intent.value };\r
    case "range": return { ...doc, range: intent.value };\r
    case "scrub": return { ...doc, scrub: intent.value };\r
    case "ease": return { ...doc, ease: intent.value };\r
    case "angle": return { ...doc, angle: intent.value };\r
    case "arc": return { ...doc, arc: intent.value };\r
    case "xy": return { ...doc, xy: intent.value };\r
    case "box": return { ...doc, box: intent.value };\r
    case "cube": return { ...doc, cube: intent.value };\r
    case "color": return { ...doc, color: intent.value };\r
    case "gradient": return { ...doc, gradient: intent.value };\r
    case "toggle": return { ...doc, toggle: !doc.toggle };\r
    case "check": return { ...doc, check: !doc.check };\r
    case "segment": return { ...doc, segment: intent.value };\r
    case "vec3": return { ...doc, vec3: intent.value };\r
  }\r
}\r
\r
// ── 1. Slider (scalar 0..1) — Drag1D ──────────────────────────────────────────\r
\r
const SliderCtl = part<{ value: number }>()("w-slider", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const r = node.rect;\r
    const bar = rect(r.x + 8, r.center.y - 10, r.w - 16, 20);\r
    track(paint, bar, node.props.value, s.muted, s.accent);\r
    thumb(paint, v(bar.x + bar.w * node.props.value, bar.center.y), 7 + 1.5 * node.ch.hover, s.glow, s.accent, s.thumb);\r
  },\r
  on: [Drag1D({ axis: "x", pad: 8, to: (_n, f) => ({ kind: "scalar", value: f }) })],\r
});\r
\r
// ── 2. Range (min..max) — the shared catalog Range (widgets.ts) ───────────────\r
// Dual thumbs, window drag between them, domain 0..100 with step 1, and value\r
// labels above the thumbs while dragging. Thumb math lives in\r
// shared/range-math.ts (pure, kernel-tested in tests/range-math.test.ts).\r
\r
// ── 3. Number scrub — Gesture, relative horizontal drag ───────────────────────\r
\r
const NumberScrubCtl = part<{ value: number }>()("w-scrub", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ({ ...ctrl(t, ch), text: t.mix(t.text, t.textBright, ch.hover || 0) }),\r
  render: (node, paint, s) => {\r
    const r = node.rect;\r
    paint.label(node.props.value.toFixed(1), r.center, s.text, { size: 26, weight: 700 });\r
    paint.label("‹ drag horizontally ›", v(r.center.x, r.bottom - 6), calpha(s.dim, 0.8), { size: 10 });\r
  },\r
  on: [\r
    Gesture<{ value: number }, { start: number; startX: number }>({\r
      begin: (node, pointer) => ({ start: node.props.value, startX: pointer.x }),\r
      during: (state, _node, pointer) => ({ kind: "scrub", value: state.start + (pointer.x - state.startX) * 0.5 }),\r
    }),\r
  ],\r
});\r
\r
// ── 4. Bezier ramp (easing curve) — Gesture, nearest handle ───────────────────\r
// A cubic-bezier from (0,0) to (1,1) with two draggable handles — the CSS\r
// \`cubic-bezier(x1, y1, x2, y2)\` editor. Curve y is unclamped visually within\r
// the square; handle coords clamp to 0..1.\r
\r
type Ease = Doc["ease"];\r
\r
/** Point on the unit cubic bezier (P0 = 0,0 · P3 = 1,1) at parameter t. */\r
function bezierAt(e: Ease, t: number): Vec {\r
  const u = 1 - t, uu3 = 3 * u * u * t, tt3 = 3 * u * t * t, ttt = t * t * t;\r
  return v(uu3 * e.x1 + tt3 * e.x2 + ttt, uu3 * e.y1 + tt3 * e.y2 + ttt);\r
}\r
\r
const BezierRampCtl = part<Ease>()("w-bezier", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const e = node.props;\r
    const sq = squareIn(node.rect);\r
    const toScreen = (p: Vec) => v(sq.x + p.x * sq.w, sq.bottom - p.y * sq.h);   // y up\r
    paint.box(sq, 6, s.well, s.muted, 1);\r
    paint.line(v(sq.x, sq.bottom), v(sq.right, sq.y), calpha(s.muted, 0.6));     // linear reference\r
    // the curve, sampled\r
    let prev = toScreen(v(0, 0));\r
    for (let i = 1; i <= 24; i++) {\r
      const p = toScreen(bezierAt(e, i / 24));\r
      paint.line(prev, p, s.accent, 2);\r
      prev = p;\r
    }\r
    // handle stems + thumbs\r
    const h1 = toScreen(v(e.x1, e.y1)), h2 = toScreen(v(e.x2, e.y2));\r
    paint.line(toScreen(v(0, 0)), h1, calpha(s.dim, 0.8), 1);\r
    paint.line(toScreen(v(1, 1)), h2, calpha(s.dim, 0.8), 1);\r
    thumb(paint, h1, 5 + node.ch.hover, s.glow, s.accent, s.thumb);\r
    thumb(paint, h2, 5 + node.ch.hover, s.glow, s.accent, s.thumb);\r
  },\r
  on: [\r
    Gesture<Ease, { which: "1" | "2" }>({\r
      begin(node, pointer) {\r
        const sq = squareIn(node.rect);\r
        const toScreen = (x: number, y: number) => v(sq.x + x * sq.w, sq.bottom - y * sq.h);\r
        const e = node.props;\r
        const d1 = vdist(pointer, toScreen(e.x1, e.y1)), d2 = vdist(pointer, toScreen(e.x2, e.y2));\r
        return { which: d1 <= d2 ? "1" : "2" };\r
      },\r
      during(state, node, pointer) {\r
        const sq = squareIn(node.rect);\r
        const fx = clamp((pointer.x - sq.x) / sq.w, 0, 1);\r
        const fy = clamp((sq.bottom - pointer.y) / sq.h, 0, 1);\r
        const e = node.props;\r
        const value: Ease = state.which === "1"\r
          ? { ...e, x1: fx, y1: fy } : { ...e, x2: fx, y2: fy };\r
        return { kind: "ease", value };\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── 5. Angle dial (0..360°) — Gesture, absolute angle ─────────────────────────\r
\r
const AngleDialCtl = part<{ angle: number }>()("w-angle", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const sq = squareIn(node.rect);\r
    const c = sq.center, radius = sq.w / 2 - 6;\r
    paint.ring(c, radius, s.muted, 2);\r
    const a = (node.props.angle * Math.PI) / 180;\r
    const tip = v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius);\r
    paint.line(c, tip, s.accent, 2.5);\r
    thumb(paint, tip, 5 + node.ch.hover * 2, s.glow, s.accent, s.thumb);\r
    paint.dot(c, 3, s.dim);\r
  },\r
  on: [\r
    Gesture<{ angle: number }, Record<string, never>>({\r
      begin: () => ({}),\r
      during(_state, node, pointer) {\r
        const c = squareIn(node.rect).center;\r
        return { kind: "angle", value: degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x)) };\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── 6. Angle range (arc interval) — Gesture, nearest handle ───────────────────\r
\r
/** Draw a dotted arc from angle \`a0\` to \`a1\` (degrees, increasing). */\r
function drawArc(paint: Painter, c: Vec, radius: number, a0: number, a1: number, col: Color) {\r
  const span = ((a1 - a0 + 360) % 360) || 360;\r
  const steps = Math.max(2, Math.round(span / 8));\r
  for (let i = 0; i <= steps; i++) {\r
    const a = ((a0 + (span * i) / steps) * Math.PI) / 180;\r
    paint.dot(v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 2, col);\r
  }\r
}\r
\r
const AngleRangeCtl = part<{ start: number; end: number }>()("w-arc", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const p = node.props;\r
    const sq = squareIn(node.rect);\r
    const c = sq.center, radius = sq.w / 2 - 6;\r
    paint.ring(c, radius, s.muted, 1.5);\r
    drawArc(paint, c, radius, p.start, p.end, s.accent);\r
    for (const angle of [p.start, p.end]) {\r
      const a = (angle * Math.PI) / 180;\r
      thumb(paint, v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 5 + node.ch.hover * 2, s.glow, s.accent, s.thumb);\r
    }\r
  },\r
  on: [\r
    Gesture<{ start: number; end: number }, { which: "start" | "end" }>({\r
      begin(node, pointer) {\r
        const c = squareIn(node.rect).center;\r
        const a = degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x));\r
        const dist = (x: number) => Math.min((a - x + 360) % 360, (x - a + 360) % 360);\r
        return { which: dist(node.props.start) <= dist(node.props.end) ? "start" : "end" };\r
      },\r
      during(state, node, pointer) {\r
        const c = squareIn(node.rect).center;\r
        const a = degOf(Math.atan2(pointer.y - c.y, pointer.x - c.x));\r
        return { kind: "arc", value: { ...node.props, [state.which]: a } as { start: number; end: number } };\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── 7. XY pad (vector 2) — Gesture ────────────────────────────────────────────\r
\r
const XYPadCtl = part<{ x: number; y: number }>()("w-xy", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const p = node.props;\r
    const sq = squareIn(node.rect);\r
    paint.box(sq, 6, s.well, s.muted, 1);\r
    paint.line(v(sq.x, sq.center.y), v(sq.right, sq.center.y), calpha(s.muted, 0.6));\r
    paint.line(v(sq.center.x, sq.y), v(sq.center.x, sq.bottom), calpha(s.muted, 0.6));\r
    const dot = v(sq.center.x + (p.x * sq.w) / 2, sq.center.y - (p.y * sq.h) / 2);\r
    thumb(paint, dot, 6 + node.ch.hover * 2, s.glow, s.accent, s.thumb);\r
  },\r
  on: [\r
    Gesture<{ x: number; y: number }, Record<string, never>>({\r
      begin: () => ({}),\r
      during(_state, node, pointer) {\r
        const sq = squareIn(node.rect);\r
        return { kind: "xy", value: {\r
          x: clamp(((pointer.x - sq.center.x) / (sq.w / 2)), -1, 1),\r
          y: clamp((-(pointer.y - sq.center.y) / (sq.h / 2)), -1, 1),\r
        } };\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── 8. Box 2D (bounds) — Gesture, nearest corner ──────────────────────────────\r
\r
const Box2DCtl = part<Doc["box"]>()("w-box2d", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const p = node.props;\r
    const sq = squareIn(node.rect);\r
    paint.box(sq, 6, s.well, s.muted, 1);\r
    const toScreen = (fx: number, fy: number) => v(sq.x + fx * sq.w, sq.bottom - fy * sq.h);   // y up\r
    const a = toScreen(p.minX, p.minY), b = toScreen(p.maxX, p.maxY);\r
    paint.box(rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)), 3,\r
      calpha(s.accent, 0.2), s.accent, 1.5);\r
    thumb(paint, a, 5 + node.ch.hover, s.glow, s.accent, s.thumb);\r
    thumb(paint, b, 5 + node.ch.hover, s.glow, s.accent, s.thumb);\r
  },\r
  on: [\r
    Gesture<Doc["box"], { corner: "min" | "max" }>({\r
      begin(node, pointer) {\r
        const sq = squareIn(node.rect);\r
        const p = node.props;\r
        const toScreen = (fx: number, fy: number) => v(sq.x + fx * sq.w, sq.bottom - fy * sq.h);\r
        const dMin = vdist(pointer, toScreen(p.minX, p.minY));\r
        const dMax = vdist(pointer, toScreen(p.maxX, p.maxY));\r
        return { corner: dMin <= dMax ? "min" : "max" };\r
      },\r
      during(state, node, pointer) {\r
        const sq = squareIn(node.rect);\r
        const fx = clamp((pointer.x - sq.x) / sq.w, 0, 1);\r
        const fy = clamp((sq.bottom - pointer.y) / sq.h, 0, 1);\r
        const p = node.props;\r
        const value = state.corner === "min"\r
          ? { ...p, minX: Math.min(fx, p.maxX), minY: Math.min(fy, p.maxY) }\r
          : { ...p, maxX: Math.max(fx, p.minX), maxY: Math.max(fy, p.minY) };\r
        return { kind: "box", value: { minX: value.minX, minY: value.minY, maxX: value.maxX, maxY: value.maxY } };\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── 9. Box 3D (orbit cube) — Gesture, drag to rotate ──────────────────────────\r
\r
const CUBE_VERTS: [number, number, number][] = [];\r
for (let i = 0; i < 8; i++) CUBE_VERTS.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]);\r
const CUBE_EDGES: [number, number][] = [];\r
for (let i = 0; i < 8; i++)\r
  for (let j = i + 1; j < 8; j++) {\r
    const d = i ^ j;\r
    if (d === 1 || d === 2 || d === 4) CUBE_EDGES.push([i, j]);\r
  }\r
\r
const Box3DCtl = part<{ yaw: number; pitch: number }>()("w-box3d", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const { yaw, pitch } = node.props;\r
    const sq = squareIn(node.rect);\r
    const c = sq.center, scale = sq.w / 2 - 8;\r
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);\r
    const project = ([x, y, z]: [number, number, number]): Vec => {\r
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;      // yaw about Y\r
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;     // pitch about X\r
      const persp = 1 / (1 + z2 * 0.18);                      // gentle perspective\r
      return v(c.x + x1 * scale * persp, c.y + y2 * scale * persp);\r
    };\r
    const pts = CUBE_VERTS.map(project);\r
    for (const [i, j] of CUBE_EDGES) paint.line(pts[i], pts[j], calpha(s.accent, 0.85), 1.5);\r
    for (const p of pts) paint.dot(p, 2.5, s.bright);\r
  },\r
  on: [\r
    Gesture<{ yaw: number; pitch: number }, { yaw: number; pitch: number; x: number; y: number }>({\r
      begin: (node, pointer) => ({ yaw: node.props.yaw, pitch: node.props.pitch, x: pointer.x, y: pointer.y }),\r
      during: (st, _node, pointer) => ({\r
        kind: "cube",\r
        value: {\r
          yaw: st.yaw + (pointer.x - st.x) * 0.012,\r
          pitch: clamp(st.pitch + (pointer.y - st.y) * 0.012, -1.3, 1.3),\r
        },\r
      }),\r
    }),\r
  ],\r
});\r
\r
// ── 10. Color wheel (HSV) — Gesture ───────────────────────────────────────────\r
\r
const ColorWheelCtl = part<{ hue: number; sat: number }>()("w-color", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const { hue, sat } = node.props;\r
    const sq = squareIn(node.rect);\r
    const c = sq.center, radius = sq.w / 2 - 4;\r
    for (let i = 0; i < 72; i++) {                    // the hue ring\r
      const a = (i / 72) * TAU;\r
      paint.dot(v(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius), 3, hsl((i / 72) * 360, 0.7, 0.55));\r
    }\r
    paint.dot(c, radius - 8, hsl(hue * 360, sat, 0.55));   // selected color, center\r
    const a = hue * TAU, rr = sat * (radius - 8);\r
    thumb(paint, v(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr), 5 + node.ch.hover * 2, s.glow, s.accent, s.thumb);\r
  },\r
  on: [\r
    Gesture<{ hue: number; sat: number }, Record<string, never>>({\r
      begin: () => ({}),\r
      during(_state, node, pointer) {\r
        const sq = squareIn(node.rect);\r
        const c = sq.center, radius = sq.w / 2 - 12;\r
        const dx = pointer.x - c.x, dy = pointer.y - c.y;\r
        return { kind: "color", value: {\r
          hue: ((Math.atan2(dy, dx) / TAU) % 1 + 1) % 1,\r
          sat: clamp(Math.hypot(dx, dy) / radius, 0, 1),\r
        } };\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── 11. Gradient ramp — Drag1D samples a two-color ramp ───────────────────────\r
\r
const RAMP_A = hsl(205, 0.75, 0.55);\r
const RAMP_B = hsl(330, 0.75, 0.58);\r
\r
const GradientCtl = part<{ at: number }>()("w-gradient", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const at = node.props.at, r = node.rect;\r
    const bar = rect(r.x + 8, r.center.y - 14, r.w - 16, 28);\r
    const slices = 48;\r
    for (let i = 0; i < slices; i++)     // fake a gradient fill with thin slices\r
      paint.box(rect(bar.x + (bar.w * i) / slices, bar.y, bar.w / slices + 1, bar.h), 0, cmix(RAMP_A, RAMP_B, i / slices));\r
    const x = bar.x + bar.w * at;\r
    paint.box(rect(x - 2, bar.y - 4, 4, bar.h + 8), 1, s.bright);\r
    thumb(paint, v(x, bar.bottom + 8), 5 + node.ch.hover, s.glow, s.accent, s.thumb);\r
  },\r
  on: [Drag1D({ axis: "x", pad: 8, to: (_n, f) => ({ kind: "gradient", value: f }) })],\r
});\r
\r
// ── 12. Toggle switch — Press + spring channel ────────────────────────────────\r
\r
const ToggleCtl = part<{ on: boolean }>()("w-toggle", {\r
  size: () => v(CW, CH),\r
  channels: { on: { target: (n: GNode<{ on: boolean }>) => (n.props.on ? 1 : 0), spring: { stiffness: 260, damping: 20 } } },\r
  style: (t, ch) => ({ ...ctrl(t, ch), track: t.mix(t.muted, t.accent, clamp(ch.on || 0, 0, 1)) }),\r
  render: (node, paint, s) => {\r
    const r = node.rect;\r
    const t = clamp(node.ch.on, 0, 1);\r
    const sw = rect(r.center.x - 26, r.center.y - 13, 52, 26);\r
    paint.box(sw, 13, s.track);\r
    paint.glow(s.accent, 8 * node.ch.hover, () => paint.dot(v(sw.x + 13 + t * 26, sw.center.y), 9, s.bright));\r
  },\r
  on: [Press(() => ({ kind: "toggle" }))],\r
});\r
\r
// ── 13. Checkbox — Press + spring channel ─────────────────────────────────────\r
\r
const CheckboxCtl = part<{ on: boolean }>()("w-check", {\r
  size: () => v(CW, CH),\r
  channels: { on: { target: (n: GNode<{ on: boolean }>) => (n.props.on ? 1 : 0), spring: { stiffness: 340, damping: 22 } } },\r
  style: (t, ch) => {\r
    const on = clamp(ch.on || 0, 0, 1);\r
    return { ...ctrl(t, ch), fill: t.mix(t.surface, t.accent, on * 0.9), edge: t.mix(t.muted, t.accent, Math.max(on, ch.hover || 0)) };\r
  },\r
  render: (node, paint, s) => {\r
    const r = node.rect;\r
    const t = clamp(node.ch.on, 0, 1);\r
    const bx = rect(r.center.x - 15, r.center.y - 15, 30, 30);\r
    paint.box(bx, 7, s.fill, s.edge, 1.5);\r
    if (t > 0.02) {\r
      const c = bx.center, k = Math.min(1.1, t);\r
      paint.line(v(c.x - 6 * k, c.y), v(c.x - 1.5 * k, c.y + 5 * k), s.bright, 2.5);\r
      paint.line(v(c.x - 1.5 * k, c.y + 5 * k), v(c.x + 7 * k, c.y - 5.5 * k), s.bright, 2.5);\r
    }\r
  },\r
  on: [Press(() => ({ kind: "check" }))],\r
});\r
\r
// ── 14. Segmented control — Press reads pointer to pick a cell ─────────────────\r
\r
const SEGMENTS = ["Move", "Rotate", "Scale"];\r
\r
const SegmentedCtl = part<{ index: number }>()("w-segment", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const r = node.rect;\r
    const bar = rect(r.x, r.center.y - 15, r.w, 30);\r
    paint.box(bar, 8, s.well, s.muted, 1);\r
    const cellW = bar.w / SEGMENTS.length;\r
    const active = rect(bar.x + cellW * node.props.index + 2, bar.y + 2, cellW - 4, bar.h - 4);\r
    paint.box(active, 6, calpha(s.accent, 0.8));\r
    SEGMENTS.forEach((label, i) =>\r
      paint.label(label, v(bar.x + cellW * (i + 0.5), bar.center.y),\r
        i === node.props.index ? s.bright : s.dim, { size: 11, weight: 600 }));\r
  },\r
  on: [\r
    Press((node) => {\r
      const r = node.rect;\r
      const px = (node.pointer ?? r.center).x;\r
      const i = clamp(Math.floor(((px - r.x) / r.w) * SEGMENTS.length), 0, SEGMENTS.length - 1);\r
      return { kind: "segment", value: i };\r
    }),\r
  ],\r
});\r
\r
// ── 15. Vector 3 (three scrub rows) — Gesture picks a row ──────────────────────\r
\r
const AXES: ("x" | "y" | "z")[] = ["x", "y", "z"];\r
const AXIS_HUE = { x: 0, y: 130, z: 215 };\r
\r
const Vector3Ctl = part<{ x: number; y: number; z: number }>()("w-vec3", {\r
  size: () => v(CW, CH),\r
  style: (t, ch) => ctrl(t, ch),\r
  render: (node, paint, s) => {\r
    const p = node.props, r = node.rect;\r
    const rowH = r.h / 3;\r
    AXES.forEach((axis, i) => {\r
      const y = r.y + rowH * (i + 0.5);\r
      const barX = r.x + 22, barW = r.w - 30;\r
      paint.label(axis.toUpperCase(), v(r.x + 4, y), hsl(AXIS_HUE[axis], 0.6, 0.6), { size: 11, weight: 700, align: "left" });\r
      paint.box(rect(barX, y - 2, barW, 4), 2, s.muted);\r
      const t = (p[axis] + 1) / 2;                                    // -1..1 → 0..1\r
      paint.dot(v(barX + barW * clamp(t, 0, 1), y), 5, hsl(AXIS_HUE[axis], 0.6, 0.6));\r
    });\r
  },\r
  on: [\r
    Gesture<{ x: number; y: number; z: number }, { axis: "x" | "y" | "z"; start: number; startX: number }>({\r
      begin(node, pointer) {\r
        const r = node.rect;\r
        const row = clamp(Math.floor((pointer.y - r.y) / (r.h / 3)), 0, 2);\r
        const axis = AXES[row];\r
        return { axis, start: node.props[axis], startX: pointer.x };\r
      },\r
      during(state, node, pointer) {\r
        const next = clamp(state.start + (pointer.x - state.startX) * 0.01, -1, 1);\r
        return { kind: "vec3", value: { ...node.props, [state.axis]: next } as { x: number; y: number; z: number } };\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── The board (pannable surface) ──────────────────────────────────────────────\r
// The board still draws free canvas chrome (grid, hint) — it defines no part\r
// content of its own beyond the Pan surface. It reads tokens directly, and is\r
// ALLOWED to: the check rule targets part-defining files' style/render leaks,\r
// and this file's parts are all token-free. (The grid is app-level free drawing.)\r
\r
const Board = part<Record<string, never>>()("widget-board", {\r
  measure: (_p, avail) => avail,   // fill the viewport (was size:()=>v(0,0))\r
  hit: () => true,\r
  style: (t) => ({ dot: calpha(t.muted, 0.35), hint: calpha(t.textDim, 0.9) }),\r
  render: (node, paint, s) => {\r
    const vp = node.view!;\r
    const G = 32;\r
    const x0 = Math.floor(-vp.pan.x / vp.zoom / G) * G, x1 = (vp.w - vp.pan.x) / vp.zoom;\r
    const y0 = Math.floor(-vp.pan.y / vp.zoom / G) * G, y1 = (vp.h - vp.pan.y) / vp.zoom;\r
    for (let x = x0; x <= x1; x += G)\r
      for (let y = y0; y <= y1; y += G) paint.dot(v(x, y), 1, s.dot);\r
    paint.label("drag the controls · drag empty space to pan · wheel to zoom",\r
      v(120, 22), s.hint, { align: "left", size: 12 });\r
  },\r
  on: [Pan()],\r
});\r
\r
// ── View: each control wrapped in a Card composite, laid out in a grid ─────────\r
\r
const CARD_W = 212, CARD_H = 150;\r
const COLS = 3;\r
const at = (i: number): Vec => v(24 + (i % COLS) * (CARD_W + 16), 44 + Math.floor(i / COLS) * (CARD_H + 16));\r
\r
/** A card wrapping one control part, positioned on the board. */\r
const cell = (i: number, title: string, value: string, ctl: Element): Element =>\r
  ({ ...Card(title.toLowerCase().replace(/\\s+/g, "-"), { title, value }, [ctl]), pos: at(i) });\r
\r
function view(doc: Doc): Element {\r
  const cards: Element[] = [\r
    cell(0, "Slider", doc.scalar.toFixed(2), SliderCtl("c", { value: doc.scalar })),\r
    cell(1, "Range", \`\${doc.range.min}–\${doc.range.max}\`,\r
      Range("c", { min: doc.range.min, max: doc.range.max, lo: 0, hi: 100, step: 1, width: CW,\r
        set: (min, max) => ({ kind: "range", value: { min, max } }) })),\r
    cell(2, "Number", doc.scrub.toFixed(1), NumberScrubCtl("c", { value: doc.scrub })),\r
    cell(3, "Ease", \`\${doc.ease.x1.toFixed(2)},\${doc.ease.y1.toFixed(2)},\${doc.ease.x2.toFixed(2)},\${doc.ease.y2.toFixed(2)}\`,\r
      BezierRampCtl("c", { ...doc.ease })),\r
    cell(4, "Angle", \`\${Math.round(doc.angle)}°\`, AngleDialCtl("c", { angle: doc.angle })),\r
    cell(5, "Arc", \`\${Math.round(doc.arc.start)}°–\${Math.round(doc.arc.end)}°\`, AngleRangeCtl("c", { start: doc.arc.start, end: doc.arc.end })),\r
    cell(6, "Vector 2", \`\${doc.xy.x.toFixed(2)}, \${doc.xy.y.toFixed(2)}\`, XYPadCtl("c", { x: doc.xy.x, y: doc.xy.y })),\r
    cell(7, "Bounds 2D", \`\${doc.box.minX.toFixed(1)},\${doc.box.minY.toFixed(1)}→\${doc.box.maxX.toFixed(1)},\${doc.box.maxY.toFixed(1)}\`, Box2DCtl("c", { ...doc.box })),\r
    cell(8, "Box 3D", \`\${Math.round(degOf(doc.cube.yaw))}°\`, Box3DCtl("c", { yaw: doc.cube.yaw, pitch: doc.cube.pitch })),\r
    cell(9, "Color", hexOf(hsl(doc.color.hue * 360, doc.color.sat, 0.55)), ColorWheelCtl("c", { hue: doc.color.hue, sat: doc.color.sat })),\r
    cell(10, "Gradient", hexOf(cmix(RAMP_A, RAMP_B, doc.gradient)), GradientCtl("c", { at: doc.gradient })),\r
    cell(11, "Toggle", doc.toggle ? "on" : "off", ToggleCtl("c", { on: doc.toggle })),\r
    cell(12, "Checkbox", doc.check ? "✓" : "—", CheckboxCtl("c", { on: doc.check })),\r
    cell(13, "Mode", SEGMENTS[doc.segment], SegmentedCtl("c", { index: doc.segment })),\r
    cell(14, "Vector 3", \`\${doc.vec3.x.toFixed(1)},\${doc.vec3.y.toFixed(1)},\${doc.vec3.z.toFixed(1)}\`, Vector3Ctl("c", { x: doc.vec3.x, y: doc.vec3.y, z: doc.vec3.z })),\r
  ];\r
  return Board("root", {}, [Free("cards", {}, cards)]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: {\r
    scalar: 0.4,\r
    range: { min: 25, max: 75 },\r
    scrub: 42,\r
    ease: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },   // ease-in-out\r
    angle: 45,\r
    arc: { start: 20, end: 200 },\r
    xy: { x: 0.35, y: 0.5 },\r
    box: { minX: 0.2, minY: 0.25, maxX: 0.75, maxY: 0.7 },\r
    cube: { yaw: 0.7, pitch: 0.4 },\r
    color: { hue: 0.58, sat: 0.7 },\r
    gradient: 0.5,\r
    toggle: true,\r
    check: true,\r
    segment: 0,\r
    vec3: { x: 0.3, y: -0.2, z: 0.6 },\r
  },\r
  update,\r
  view,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,b=184,g=92;function m(n){const r=Math.min(n.w,n.h);return v(n.center.x-r/2,n.center.y-r/2,r,r)}const y=(n,r)=>({muted:n.muted,accent:n.accent,bright:n.textBright,dim:n.textDim,well:w(n.bg,.5),thumb:n.mix(n.textBright,n.accent,.3*(r.hover||0)),glow:9*(r.hover||0)});function tn(n,r,e,t,o){const a=r.center.y;n.box(v(r.x,a-2.5,r.w,5),2.5,t),e>0&&n.box(v(r.x,a-2.5,r.w*h(e,0,1),5),2.5,o)}function f(n,r,e,t,o,a){n.glow(o,t,()=>n.dot(r,e,a))}const D=Math.PI*2,X=n=>(n*180/Math.PI+360)%360;function on(n,r){switch(r.kind){case"scalar":return{...n,scalar:r.value};case"range":return{...n,range:r.value};case"scrub":return{...n,scrub:r.value};case"ease":return{...n,ease:r.value};case"angle":return{...n,angle:r.value};case"arc":return{...n,arc:r.value};case"xy":return{...n,xy:r.value};case"box":return{...n,box:r.value};case"cube":return{...n,cube:r.value};case"color":return{...n,color:r.value};case"gradient":return{...n,gradient:r.value};case"toggle":return{...n,toggle:!n.toggle};case"check":return{...n,check:!n.check};case"segment":return{...n,segment:r.value};case"vec3":return{...n,vec3:r.value}}}const an=p()("w-slider",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.rect,o=v(t.x+8,t.center.y-10,t.w-16,20);tn(r,o,n.props.value,e.muted,e.accent),f(r,i(o.x+o.w*n.props.value,o.center.y),7+1.5*n.ch.hover,e.glow,e.accent,e.thumb)},on:[F({axis:"x",pad:8,to:(n,r)=>({kind:"scalar",value:r})})]}),cn=p()("w-scrub",{size:()=>i(b,g),style:(n,r)=>({...y(n,r),text:n.mix(n.text,n.textBright,r.hover||0)}),render:(n,r,e)=>{const t=n.rect;r.label(n.props.value.toFixed(1),t.center,e.text,{size:26,weight:700}),r.label("‹ drag horizontally ›",i(t.center.x,t.bottom-6),w(e.dim,.8),{size:10})},on:[C({begin:(n,r)=>({start:n.props.value,startX:r.x}),during:(n,r,e)=>({kind:"scrub",value:n.start+(e.x-n.startX)*.5})})]});function sn(n,r){const e=1-r,t=3*e*e*r,o=3*e*r*r,a=r*r*r;return i(t*n.x1+o*n.x2+a,t*n.y1+o*n.y2+a)}const ln=p()("w-bezier",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.props,o=m(n.rect),a=u=>i(o.x+u.x*o.w,o.bottom-u.y*o.h);r.box(o,6,e.well,e.muted,1),r.line(i(o.x,o.bottom),i(o.right,o.y),w(e.muted,.6));let c=a(i(0,0));for(let u=1;u<=24;u++){const d=a(sn(t,u/24));r.line(c,d,e.accent,2),c=d}const s=a(i(t.x1,t.y1)),l=a(i(t.x2,t.y2));r.line(a(i(0,0)),s,w(e.dim,.8),1),r.line(a(i(1,1)),l,w(e.dim,.8),1),f(r,s,5+n.ch.hover,e.glow,e.accent,e.thumb),f(r,l,5+n.ch.hover,e.glow,e.accent,e.thumb)},on:[C({begin(n,r){const e=m(n.rect),t=(s,l)=>i(e.x+s*e.w,e.bottom-l*e.h),o=n.props,a=E(r,t(o.x1,o.y1)),c=E(r,t(o.x2,o.y2));return{which:a<=c?"1":"2"}},during(n,r,e){const t=m(r.rect),o=h((e.x-t.x)/t.w,0,1),a=h((t.bottom-e.y)/t.h,0,1),c=r.props;return{kind:"ease",value:n.which==="1"?{...c,x1:o,y1:a}:{...c,x2:o,y2:a}}}})]}),un=p()("w-angle",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=m(n.rect),o=t.center,a=t.w/2-6;r.ring(o,a,e.muted,2);const c=n.props.angle*Math.PI/180,s=i(o.x+Math.cos(c)*a,o.y+Math.sin(c)*a);r.line(o,s,e.accent,2.5),f(r,s,5+n.ch.hover*2,e.glow,e.accent,e.thumb),r.dot(o,3,e.dim)},on:[C({begin:()=>({}),during(n,r,e){const t=m(r.rect).center;return{kind:"angle",value:X(Math.atan2(e.y-t.y,e.x-t.x))}}})]});function dn(n,r,e,t,o,a){const c=(o-t+360)%360||360,s=Math.max(2,Math.round(c/8));for(let l=0;l<=s;l++){const u=(t+c*l/s)*Math.PI/180;n.dot(i(r.x+Math.cos(u)*e,r.y+Math.sin(u)*e),2,a)}}const hn=p()("w-arc",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.props,o=m(n.rect),a=o.center,c=o.w/2-6;r.ring(a,c,e.muted,1.5),dn(r,a,c,t.start,t.end,e.accent);for(const s of[t.start,t.end]){const l=s*Math.PI/180;f(r,i(a.x+Math.cos(l)*c,a.y+Math.sin(l)*c),5+n.ch.hover*2,e.glow,e.accent,e.thumb)}},on:[C({begin(n,r){const e=m(n.rect).center,t=X(Math.atan2(r.y-e.y,r.x-e.x)),o=a=>Math.min((t-a+360)%360,(a-t+360)%360);return{which:o(n.props.start)<=o(n.props.end)?"start":"end"}},during(n,r,e){const t=m(r.rect).center,o=X(Math.atan2(e.y-t.y,e.x-t.x));return{kind:"arc",value:{...r.props,[n.which]:o}}}})]}),mn=p()("w-xy",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.props,o=m(n.rect);r.box(o,6,e.well,e.muted,1),r.line(i(o.x,o.center.y),i(o.right,o.center.y),w(e.muted,.6)),r.line(i(o.center.x,o.y),i(o.center.x,o.bottom),w(e.muted,.6));const a=i(o.center.x+t.x*o.w/2,o.center.y-t.y*o.h/2);f(r,a,6+n.ch.hover*2,e.glow,e.accent,e.thumb)},on:[C({begin:()=>({}),during(n,r,e){const t=m(r.rect);return{kind:"xy",value:{x:h((e.x-t.center.x)/(t.w/2),-1,1),y:h(-(e.y-t.center.y)/(t.h/2),-1,1)}}}})]}),xn=p()("w-box2d",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.props,o=m(n.rect);r.box(o,6,e.well,e.muted,1);const a=(l,u)=>i(o.x+l*o.w,o.bottom-u*o.h),c=a(t.minX,t.minY),s=a(t.maxX,t.maxY);r.box(v(Math.min(c.x,s.x),Math.min(c.y,s.y),Math.abs(s.x-c.x),Math.abs(s.y-c.y)),3,w(e.accent,.2),e.accent,1.5),f(r,c,5+n.ch.hover,e.glow,e.accent,e.thumb),f(r,s,5+n.ch.hover,e.glow,e.accent,e.thumb)},on:[C({begin(n,r){const e=m(n.rect),t=n.props,o=(s,l)=>i(e.x+s*e.w,e.bottom-l*e.h),a=E(r,o(t.minX,t.minY)),c=E(r,o(t.maxX,t.maxY));return{corner:a<=c?"min":"max"}},during(n,r,e){const t=m(r.rect),o=h((e.x-t.x)/t.w,0,1),a=h((t.bottom-e.y)/t.h,0,1),c=r.props,s=n.corner==="min"?{...c,minX:Math.min(o,c.maxX),minY:Math.min(a,c.maxY)}:{...c,maxX:Math.max(o,c.minX),maxY:Math.max(a,c.minY)};return{kind:"box",value:{minX:s.minX,minY:s.minY,maxX:s.maxX,maxY:s.maxY}}}})]}),W=[];for(let n=0;n<8;n++)W.push([n&1?1:-1,n&2?1:-1,n&4?1:-1]);const H=[];for(let n=0;n<8;n++)for(let r=n+1;r<8;r++){const e=n^r;(e===1||e===2||e===4)&&H.push([n,r])}const pn=p()("w-box3d",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const{yaw:t,pitch:o}=n.props,a=m(n.rect),c=a.center,s=a.w/2-8,l=Math.cos(t),u=Math.sin(t),d=Math.cos(o),M=Math.sin(o),N=([q,S,P])=>{const U=q*l+P*u,B=-q*u+P*l,j=S*d-B*M,R=1/(1+(S*M+B*d)*.18);return i(c.x+U*s*R,c.y+j*s*R)},A=W.map(N);for(const[q,S]of H)r.line(A[q],A[S],w(e.accent,.85),1.5);for(const q of A)r.dot(q,2.5,e.bright)},on:[C({begin:(n,r)=>({yaw:n.props.yaw,pitch:n.props.pitch,x:r.x,y:r.y}),during:(n,r,e)=>({kind:"cube",value:{yaw:n.yaw+(e.x-n.x)*.012,pitch:h(n.pitch+(e.y-n.y)*.012,-1.3,1.3)}})})]}),bn=p()("w-color",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const{hue:t,sat:o}=n.props,a=m(n.rect),c=a.center,s=a.w/2-4;for(let d=0;d<72;d++){const M=d/72*D;r.dot(i(c.x+Math.cos(M)*s,c.y+Math.sin(M)*s),3,k(d/72*360,.7,.55))}r.dot(c,s-8,k(t*360,o,.55));const l=t*D,u=o*(s-8);f(r,i(c.x+Math.cos(l)*u,c.y+Math.sin(l)*u),5+n.ch.hover*2,e.glow,e.accent,e.thumb)},on:[C({begin:()=>({}),during(n,r,e){const t=m(r.rect),o=t.center,a=t.w/2-12,c=e.x-o.x,s=e.y-o.y;return{kind:"color",value:{hue:(Math.atan2(s,c)/D%1+1)%1,sat:h(Math.hypot(c,s)/a,0,1)}}}})]}),V=k(205,.75,.55),O=k(330,.75,.58),gn=p()("w-gradient",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.props.at,o=n.rect,a=v(o.x+8,o.center.y-14,o.w-16,28),c=48;for(let l=0;l<c;l++)r.box(v(a.x+a.w*l/c,a.y,a.w/c+1,a.h),0,T(V,O,l/c));const s=a.x+a.w*t;r.box(v(s-2,a.y-4,4,a.h+8),1,e.bright),f(r,i(s,a.bottom+8),5+n.ch.hover,e.glow,e.accent,e.thumb)},on:[F({axis:"x",pad:8,to:(n,r)=>({kind:"gradient",value:r})})]}),yn=p()("w-toggle",{size:()=>i(b,g),channels:{on:{target:n=>n.props.on?1:0,spring:{stiffness:260,damping:20}}},style:(n,r)=>({...y(n,r),track:n.mix(n.muted,n.accent,h(r.on||0,0,1))}),render:(n,r,e)=>{const t=n.rect,o=h(n.ch.on,0,1),a=v(t.center.x-26,t.center.y-13,52,26);r.box(a,13,e.track),r.glow(e.accent,8*n.ch.hover,()=>r.dot(i(a.x+13+o*26,a.center.y),9,e.bright))},on:[G(()=>({kind:"toggle"}))]}),vn=p()("w-check",{size:()=>i(b,g),channels:{on:{target:n=>n.props.on?1:0,spring:{stiffness:340,damping:22}}},style:(n,r)=>{const e=h(r.on||0,0,1);return{...y(n,r),fill:n.mix(n.surface,n.accent,e*.9),edge:n.mix(n.muted,n.accent,Math.max(e,r.hover||0))}},render:(n,r,e)=>{const t=n.rect,o=h(n.ch.on,0,1),a=v(t.center.x-15,t.center.y-15,30,30);if(r.box(a,7,e.fill,e.edge,1.5),o>.02){const c=a.center,s=Math.min(1.1,o);r.line(i(c.x-6*s,c.y),i(c.x-1.5*s,c.y+5*s),e.bright,2.5),r.line(i(c.x-1.5*s,c.y+5*s),i(c.x+7*s,c.y-5.5*s),e.bright,2.5)}},on:[G(()=>({kind:"check"}))]}),z=["Move","Rotate","Scale"],wn=p()("w-segment",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.rect,o=v(t.x,t.center.y-15,t.w,30);r.box(o,8,e.well,e.muted,1);const a=o.w/z.length,c=v(o.x+a*n.props.index+2,o.y+2,a-4,o.h-4);r.box(c,6,w(e.accent,.8)),z.forEach((s,l)=>r.label(s,i(o.x+a*(l+.5),o.center.y),l===n.props.index?e.bright:e.dim,{size:11,weight:600}))},on:[G(n=>{const r=n.rect,e=(n.pointer??r.center).x;return{kind:"segment",value:h(Math.floor((e-r.x)/r.w*z.length),0,z.length-1)}})]}),Y=["x","y","z"],I={x:0,y:130,z:215},fn=p()("w-vec3",{size:()=>i(b,g),style:(n,r)=>y(n,r),render:(n,r,e)=>{const t=n.props,o=n.rect,a=o.h/3;Y.forEach((c,s)=>{const l=o.y+a*(s+.5),u=o.x+22,d=o.w-30;r.label(c.toUpperCase(),i(o.x+4,l),k(I[c],.6,.6),{size:11,weight:700,align:"left"}),r.box(v(u,l-2,d,4),2,e.muted);const M=(t[c]+1)/2;r.dot(i(u+d*h(M,0,1),l),5,k(I[c],.6,.6))})},on:[C({begin(n,r){const e=n.rect,t=h(Math.floor((r.y-e.y)/(e.h/3)),0,2),o=Y[t];return{axis:o,start:n.props[o],startX:r.x}},during(n,r,e){const t=h(n.start+(e.x-n.startX)*.01,-1,1);return{kind:"vec3",value:{...r.props,[n.axis]:t}}}})]}),Cn=p()("widget-board",{measure:(n,r)=>r,hit:()=>!0,style:n=>({dot:w(n.muted,.35),hint:w(n.textDim,.9)}),render:(n,r,e)=>{const t=n.view,o=32,a=Math.floor(-t.pan.x/t.zoom/o)*o,c=(t.w-t.pan.x)/t.zoom,s=Math.floor(-t.pan.y/t.zoom/o)*o,l=(t.h-t.pan.y)/t.zoom;for(let u=a;u<=c;u+=o)for(let d=s;d<=l;d+=o)r.dot(i(u,d),1,e.dot);r.label("drag the controls · drag empty space to pan · wheel to zoom",i(120,22),e.hint,{align:"left",size:12})},on:[L()]}),Mn=212,kn=150,$=3,qn=n=>i(24+n%$*(Mn+16),44+Math.floor(n/$)*(kn+16)),x=(n,r,e,t)=>({...Z(r.toLowerCase().replace(/\s+/g,"-"),{title:r,value:e},[t]),pos:qn(n)});function zn(n){const r=[x(0,"Slider",n.scalar.toFixed(2),an("c",{value:n.scalar})),x(1,"Range",`${n.range.min}–${n.range.max}`,Q("c",{min:n.range.min,max:n.range.max,lo:0,hi:100,step:1,width:b,set:(e,t)=>({kind:"range",value:{min:e,max:t}})})),x(2,"Number",n.scrub.toFixed(1),cn("c",{value:n.scrub})),x(3,"Ease",`${n.ease.x1.toFixed(2)},${n.ease.y1.toFixed(2)},${n.ease.x2.toFixed(2)},${n.ease.y2.toFixed(2)}`,ln("c",{...n.ease})),x(4,"Angle",`${Math.round(n.angle)}°`,un("c",{angle:n.angle})),x(5,"Arc",`${Math.round(n.arc.start)}°–${Math.round(n.arc.end)}°`,hn("c",{start:n.arc.start,end:n.arc.end})),x(6,"Vector 2",`${n.xy.x.toFixed(2)}, ${n.xy.y.toFixed(2)}`,mn("c",{x:n.xy.x,y:n.xy.y})),x(7,"Bounds 2D",`${n.box.minX.toFixed(1)},${n.box.minY.toFixed(1)}→${n.box.maxX.toFixed(1)},${n.box.maxY.toFixed(1)}`,xn("c",{...n.box})),x(8,"Box 3D",`${Math.round(X(n.cube.yaw))}°`,pn("c",{yaw:n.cube.yaw,pitch:n.cube.pitch})),x(9,"Color",_(k(n.color.hue*360,n.color.sat,.55)),bn("c",{hue:n.color.hue,sat:n.color.sat})),x(10,"Gradient",_(T(V,O,n.gradient)),gn("c",{at:n.gradient})),x(11,"Toggle",n.toggle?"on":"off",yn("c",{on:n.toggle})),x(12,"Checkbox",n.check?"✓":"—",vn("c",{on:n.check})),x(13,"Mode",z[n.segment],wn("c",{index:n.segment})),x(14,"Vector 3",`${n.vec3.x.toFixed(1)},${n.vec3.y.toFixed(1)},${n.vec3.z.toFixed(1)}`,fn("c",{x:n.vec3.x,y:n.vec3.y,z:n.vec3.z}))];return Cn("root",{},[J("cards",{},r)])}const Sn=document.getElementById("c");K(Sn,{init:{scalar:.4,range:{min:25,max:75},scrub:42,ease:{x1:.42,y1:0,x2:.58,y2:1},angle:45,arc:{start:20,end:200},xy:{x:.35,y:.5},box:{minX:.2,minY:.25,maxX:.75,maxY:.7},cube:{yaw:.7,pitch:.4},color:{hue:.58,sat:.7},gradient:.5,toggle:!0,check:!0,segment:0,vec3:{x:.3,y:-.2,z:.6}},update:on,view:zn});nn([{name:"main.ts",code:en},{name:"widgets.ts (shared)",code:rn}]);
