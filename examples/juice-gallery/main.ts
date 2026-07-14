// ============================================================================
// Example: juice gallery — a grid of common controls, each wearing a different
// "juicy" effect. The point is breadth: nine buttons and sliders, nine kinds of
// delight, and NONE of them needs a line of animation code — every effect is a
// channel (spring / impulse / chase) or a one-shot particle Fx.
//
//   Buttons                          Sliders
//   • Squash   — jelly squash/stretch, springs past on release
//   • Pop      — scale pop + particle burst + ripple ring
//   • Wobble   — a kicked impulse channel drives a decaying gelatin wobble
//   • Magnet   — the face leans toward your cursor and springs back
//   • Confetti — a shower of colorful particles on every press
//   • Spring   — the knob overshoots its target and settles (a real spring)
//   • Comet    — the knob leaves a fading trail as you drag it
//   • Elastic  — the fill blob stretches elastically and rebounds
//   • Rainbow  — a hue ramp under the knob, sparks flying as you drag
//
// Each cell is the shared `Card` composite; the control is a standalone,
// token-free part sized by layout and dropped into the card's slot.
// ============================================================================

import {
  burst, calpha, Channels, clamp, Color, Drag1D, Element, GNode, hsl, Label, mount,
  Painter, Particles, part, Press, rand, rect, Rect, Ring, Row, Stack, surface,
  Tokens, v,
} from "gratify";
import { Card } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

const TAU = Math.PI * 2;
const CW = 150, CH = 56;   // control content size; the Card pads around it

// ── One-shot effects (built on the public Particles engine) ───────────────────

/** A single dot that fades in place — dropped repeatedly to form a comet trail. */
const trail = (at: { x: number; y: number }, color: Color): Particles =>
  new Particles(color, () => ({ p: { ...at }, vel: v(0, 0), life: 0.45, max: 0.45, size: 5.5 }),
    1, { gravity: 0, drag: 2 });

/** A tight spray of sparks — flung off a slider knob as it's dragged. */
const sparkle = (at: { x: number; y: number }, color: Color): Particles =>
  new Particles(color, () => {
    const a = rand(0, TAU), sp = rand(30, 95);
    return { p: { ...at }, vel: v(Math.cos(a) * sp, Math.sin(a) * sp - 30), life: rand(0.25, 0.5), max: 0.5, size: rand(1.2, 2.6) };
  }, 5, { gravity: 80 });

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  clicks: Record<string, number>;
  sliders: Record<string, number>;   // 0..1
  lastInteract: number;              // GNode.time of the last input (drives ambient)
}

type Intent =
  | { kind: "press"; id: string; time: number }
  | { kind: "slide"; id: string; value: number; time: number };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "press":
      return { ...doc, clicks: { ...doc.clicks, [intent.id]: (doc.clicks[intent.id] ?? 0) + 1 }, lastInteract: intent.time };
    case "slide":
      return { ...doc, sliders: { ...doc.sliders, [intent.id]: intent.value }, lastInteract: intent.time };
  }
}

// ── Button props + the interactors they share ─────────────────────────────────
interface BtnProps { id: string; label: string; }
const pressIntent = (node: GNode<BtnProps>): Intent => ({ kind: "press", id: node.props.id, time: node.time ?? 0 });

// ── 1. Squash — jelly squash/stretch (a spring channel past the press) ────────
const SquashButton = part<BtnProps>()("juice-squash", {
  size: () => v(CW, CH),
  channels: { pop: { target: (n) => n.ch.press || 0, spring: { stiffness: 300, damping: 10 } } },
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent }), corner: 12 }),
  render: (node, p, s) => {
    const pop = node.ch.pop || 0, r = node.rect, c = r.center;
    // wider + shorter as it presses; the spring overshoots to tall + thin on release
    const w = r.w * (1 + 0.24 * pop), h = r.h * (1 - 0.24 * pop);
    p.box(rect(c.x - w / 2, c.y - h / 2, w, h), s.corner, s.fill, s.edge, 1.5);
    p.label(node.props.label, c, s.text, { weight: 600, size: 13 });
  },
  on: [Press(pressIntent)],
});

// ── 2. Pop — scale pop + particle burst + ripple ring ─────────────────────────
const POP_HUE = 265;
const PopButton = part<BtnProps>()("juice-pop", {
  size: () => v(CW, CH),
  channels: { pop: { target: (n) => n.ch.press || 0, spring: { stiffness: 340, damping: 9 } } },
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent2 }), corner: 12 }),
  render: (node, p, s) => {
    const pop = node.ch.pop || 0, r = node.rect, c = r.center;
    p.push();
    p.scaleAt(c.x, c.y, 1 + 0.16 * pop);
    p.glow(s.edge, 6 + 24 * pop, () => p.box(r, s.corner, s.fill, s.edge, 1.5));
    p.label(node.props.label, c, s.text, { weight: 600, size: 13 });
    p.pop();
  },
  on: [Press((node) => {
    const o = node.pointer ?? node.rect.center;
    node.spawn?.(burst(o, hsl(POP_HUE, 0.8, 0.62)));
    node.spawn?.(new Ring(o, hsl(POP_HUE, 0.9, 0.65), 34, 0.5));
    return pressIntent(node);
  })],
});

// ── 3. Wobble — a kicked impulse channel drives a decaying gelatin wobble ──────
const WobbleButton = part<BtnProps>()("juice-wobble", {
  size: () => v(CW, CH),
  channels: { wob: { decay: 2.2 } },
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.danger }), corner: 12 }),
  render: (node, p, s) => {
    const wob = node.ch.wob || 0, t = node.time ?? 0, r = node.rect, c = r.center;
    const osc = Math.sin(t * 20) * wob;
    const w = r.w * (1 + 0.16 * osc), h = r.h * (1 - 0.16 * osc);
    const cx = c.x + Math.sin(t * 27) * 5 * wob;
    p.box(rect(cx - w / 2, c.y - h / 2, w, h), s.corner, s.fill, s.edge, 1.5);
    p.label(node.props.label, v(cx, c.y), s.text, { weight: 600, size: 13 });
  },
  on: [Press((node) => { node.kick?.("wob", 1); return pressIntent(node); })],
});

// ── 4. Magnet — the face leans toward the cursor and springs back ─────────────
const lean = (axis: "x" | "y") => (n: GNode<BtnProps>): number => {
  const p = n.pointer; if (!p) return 0;
  const half = axis === "x" ? n.rect.w / 2 : n.rect.h / 2;
  const d = (axis === "x" ? p.x - n.rect.center.x : p.y - n.rect.center.y) / half;
  return clamp(d, -1, 1) * (n.ch.hover || 0);
};
const MagnetButton = part<BtnProps>()("juice-magnet", {
  size: () => v(CW, CH),
  channels: {
    lx: { target: lean("x"), spring: { stiffness: 190, damping: 15 } },
    ly: { target: lean("y"), spring: { stiffness: 190, damping: 15 } },
  },
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent }), corner: 12 }),
  render: (node, p, s) => {
    const r = node.rect, hover = node.ch.hover || 0;
    const lx = node.ch.lx || 0, ly = node.ch.ly || 0;
    const w = r.w * (1 + 0.05 * hover), h = r.h * (1 + 0.05 * hover);
    const cx = r.center.x + lx * 10, cy = r.center.y + ly * 7;
    p.glow(s.edge, 12 * hover, () => p.box(rect(cx - w / 2, cy - h / 2, w, h), s.corner, s.fill, s.edge, 1.5));
    p.label(node.props.label, v(cx, cy), s.text, { weight: 600, size: 13 });
    p.dot(v(cx + lx * w * 0.34, cy + ly * h * 0.34), 2 + 3 * hover, calpha(s.text, 0.5 * hover));
  },
  on: [Press(pressIntent)],
});

// ── 5. Confetti — a shower of colorful particles on every press ───────────────
const ConfettiButton = part<BtnProps>()("juice-confetti", {
  size: () => v(CW, CH),
  channels: { pop: { target: (n) => n.ch.press || 0, spring: { stiffness: 360, damping: 11 } } },
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent2 }), corner: 12 }),
  render: (node, p, s) => {
    const pop = node.ch.pop || 0, r = node.rect, c = r.center;
    p.push();
    p.scaleAt(c.x, c.y, 1 + 0.1 * pop);
    p.box(r, s.corner, s.fill, s.edge, 1.5);
    p.label(node.props.label, c, s.text, { weight: 600, size: 13 });
    p.pop();
  },
  on: [Press((node) => {
    const o = node.pointer ?? node.rect.center;
    for (let i = 0; i < 6; i++) node.spawn?.(burst(o, hsl(rand(0, 360), 0.85, 0.62)));
    return pressIntent(node);
  })],
});

// ── Slider drawing base (shared by all four slider effects) ────────────────────
interface SliderProps { id: string; value: number; }
interface SliderStyle { track: Color; fill: Color; knob: Color; glow: number; }
const sliderStyle = (t: Tokens, ch: Channels): SliderStyle => ({
  track: t.muted,
  fill: t.accent,
  knob: t.mix(t.textBright, t.accent, 0.3 * (ch.hover || 0)),
  glow: 12 * (ch.hover || 0),
});
/** Track + fill to `shown`; returns the knob's screen geometry. */
const sliderBase = (p: Painter, r: Rect, shown: number, s: SliderStyle) => {
  const x = r.x + 10, w = r.w - 20, y = r.center.y;
  p.box(rect(x, y - 3, w, 6), 3, s.track);
  p.box(rect(x, y - 3, w * clamp(shown, 0, 1), 6), 3, s.fill);
  return { x, w, y, knobX: x + w * clamp(shown, 0, 1) };
};
const slideIntent = (node: GNode<SliderProps>, f: number): Intent =>
  ({ kind: "slide", id: node.props.id, value: f, time: node.time ?? 0 });

// ── 6. Spring — the knob overshoots its target and settles ────────────────────
const SpringSlider = part<SliderProps>()("juice-spring", {
  size: () => v(CW, CH),
  channels: { shown: { target: (n: GNode<SliderProps>) => n.props.value, spring: { stiffness: 240, damping: 12 } } },
  style: sliderStyle,
  render: (node, p, s) => {
    const g = sliderBase(p, node.rect, node.ch.shown ?? node.props.value, s);
    p.glow(s.fill, s.glow, () => p.dot(v(g.knobX, g.y), 8 + 2 * node.ch.hover, s.knob));
  },
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => slideIntent(node, f) })],
});

// ── 7. Comet — the knob leaves a fading trail as you drag ─────────────────────
const COMET = hsl(190, 0.85, 0.6);
const CometSlider = part<SliderProps>()("juice-comet", {
  size: () => v(CW, CH),
  style: sliderStyle,
  render: (node, p, s) => {
    const g = sliderBase(p, node.rect, node.props.value, s);
    p.glow(COMET, 10 + s.glow, () => p.dot(v(g.knobX, g.y), 8, COMET));
  },
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => {
    const r = node.rect, x = r.x + 10 + (r.w - 20) * clamp(f, 0, 1);
    node.spawn?.(trail(v(x, r.center.y), COMET));
    return slideIntent(node, f);
  } })],
});

// ── 8. Elastic — the fill blob stretches elastically and rebounds ─────────────
const ElasticSlider = part<SliderProps>()("juice-elastic", {
  size: () => v(CW, CH),
  channels: { shown: { target: (n: GNode<SliderProps>) => n.props.value, spring: { stiffness: 210, damping: 9 } } },
  style: sliderStyle,
  render: (node, p, s) => {
    const shown = node.ch.shown ?? node.props.value;
    const over = shown - node.props.value;                 // how far the spring is past target
    const g = sliderBase(p, node.rect, shown, s);
    // a blob at the fill's leading edge that squashes with the overshoot
    const rx = 9 + 26 * Math.abs(over), ry = 9 - 22 * Math.abs(over);
    p.box(rect(g.knobX - rx, g.y - ry, rx * 2, ry * 2), ry, s.fill);
  },
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => slideIntent(node, f) })],
});

// ── 9. Rainbow — a hue ramp under the knob, sparks as you drag ────────────────
const RainbowSlider = part<SliderProps>()("juice-rainbow", {
  size: () => v(CW, CH),
  style: sliderStyle,
  render: (node, p, s) => {
    const r = node.rect, x = r.x + 10, w = r.w - 20, y = r.center.y;
    const val = clamp(node.props.value, 0, 1);
    const slices = 40;
    for (let i = 0; i < slices; i++) {                     // a hue ramp filled to the value
      const f = i / slices;
      if (f > val) { p.box(rect(x + w * f, y - 3, w / slices + 1, 6), 0, s.track); continue; }
      p.box(rect(x + w * f, y - 3, w / slices + 1, 6), 0, hsl(f * 320, 0.8, 0.56));
    }
    const knob = hsl(val * 320, 0.85, 0.6);
    p.glow(knob, 8 + s.glow, () => p.dot(v(x + w * val, y), 8 + 2 * node.ch.hover, knob));
  },
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => {
    const r = node.rect, x = r.x + 10 + (r.w - 20) * clamp(f, 0, 1);
    node.spawn?.(sparkle(v(x, r.center.y), hsl(clamp(f, 0, 1) * 320, 0.85, 0.62)));
    return slideIntent(node, f);
  } })],
});

// ── View: a 3×3 grid of Card composites ───────────────────────────────────────
const chunk = <T,>(xs: T[], n: number): T[][] =>
  xs.reduce<T[][]>((rows, x, i) => (i % n ? rows[rows.length - 1].push(x) : rows.push([x]), rows), []);

function view(doc: Doc): Element {
  const btn = (id: string, title: string, label: string, Ctl: typeof SquashButton) =>
    Card(id, { title, value: `×${doc.clicks[id] ?? 0}` }, [Ctl("c", { id, label })]);
  const sld = (id: string, title: string, Ctl: typeof SpringSlider) =>
    Card(id, { title, value: `${Math.round((doc.sliders[id] ?? 0) * 100)}%` }, [Ctl("c", { id, value: doc.sliders[id] ?? 0 })]);

  const cells: Element[] = [
    btn("squash", "Squash", "press", SquashButton),
    btn("pop", "Pop", "press", PopButton),
    btn("wobble", "Wobble", "press", WobbleButton),
    btn("magnet", "Magnet", "hover me", MagnetButton),
    btn("confetti", "Confetti", "press", ConfettiButton),
    sld("spring", "Spring", SpringSlider),
    sld("comet", "Comet", CometSlider),
    sld("elastic", "Elastic", ElasticSlider),
    sld("rainbow", "Rainbow", RainbowSlider),
  ];

  return Stack("root", { gap: 16, pad: 32, align: "center" }, [
    Label("title", { text: "Juice gallery", size: 22, weight: 700, bright: true }),
    Label("sub", { text: "Nine controls, nine effects — every one a channel or a particle, zero animation code.", dim: true, size: 12 }),
    ...chunk(cells, 3).map((row, i) => Row(`row${i}`, { gap: 16 }, row)),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    clicks: {},
    sliders: { spring: 0.4, comet: 0.5, elastic: 0.35, rainbow: 0.6 },
    lastInteract: -999,
  },
  update,
  view,
  // The impulse/time effects (wobble) settle a beat after you let go; keep the
  // loop awake briefly so their tails play out. Spring/particle effects wake it
  // on their own (channels move; particles live).
  ambient: (doc, time) => time - doc.lastInteract < 2.5,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
