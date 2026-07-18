import{p as h,P as x,r as b,k as y,v as i,h as w,c as W,D as S,n as f,m as D,d as H,S as q,L as I,R as N}from"./source-panel-CwjQB28X.js";import{b as R,R as O,P as T,r as m}from"./effects-a29NnO1s.js";import{b as M}from"./widgets-CaJ4_Cu6.js";import{w as A}from"./widgets-BJYGvrkn.js";const X=`// ============================================================================
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
// Each cell is the shared \`Card\` composite; the control is a standalone,
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
/** Track + fill to \`shown\`; returns the knob's screen geometry. */
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
    Card(id, { title, value: \`×\${doc.clicks[id] ?? 0}\` }, [Ctl("c", { id, label })]);
  const sld = (id: string, title: string, Ctl: typeof SpringSlider) =>
    Card(id, { title, value: \`\${Math.round((doc.sliders[id] ?? 0) * 100)}%\` }, [Ctl("c", { id, value: doc.sliders[id] ?? 0 })]);

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
    ...chunk(cells, 3).map((row, i) => Row(\`row\${i}\`, { gap: 16 }, row)),
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
`,G=Math.PI*2,g=150,u=56,U=(e,n)=>new T(n,()=>({p:{...e},vel:i(0,0),life:.45,max:.45,size:5.5}),1,{gravity:0,drag:2}),L=(e,n)=>new T(n,()=>{const t=m(0,G),s=m(30,95);return{p:{...e},vel:i(Math.cos(t)*s,Math.sin(t)*s-30),life:m(.25,.5),max:.5,size:m(1.2,2.6)}},5,{gravity:80});function $(e,n){switch(n.kind){case"press":return{...e,clicks:{...e.clicks,[n.id]:(e.clicks[n.id]??0)+1},lastInteract:n.time};case"slide":return{...e,sliders:{...e.sliders,[n.id]:n.value},lastInteract:n.time}}}const v=e=>({kind:"press",id:e.props.id,time:e.time??0}),_=h()("juice-squash",{size:()=>i(g,u),channels:{pop:{target:e=>e.ch.press||0,spring:{stiffness:300,damping:10}}},style:(e,n)=>({...y(e,n,{tint:e.accent}),corner:12}),render:(e,n,t)=>{const s=e.ch.pop||0,r=e.rect,o=r.center,c=r.w*(1+.24*s),a=r.h*(1-.24*s);n.box(b(o.x-c/2,o.y-a/2,c,a),t.corner,t.fill,t.edge,1.5),n.label(e.props.label,o,t.text,{weight:600,size:13})},on:[x(v)]}),E=265,J=h()("juice-pop",{size:()=>i(g,u),channels:{pop:{target:e=>e.ch.press||0,spring:{stiffness:340,damping:9}}},style:(e,n)=>({...y(e,n,{tint:e.accent2}),corner:12}),render:(e,n,t)=>{const s=e.ch.pop||0,r=e.rect,o=r.center;n.push(),n.scaleAt(o.x,o.y,1+.16*s),n.glow(t.edge,6+24*s,()=>n.box(r,t.corner,t.fill,t.edge,1.5)),n.label(e.props.label,o,t.text,{weight:600,size:13}),n.pop()},on:[x(e=>{var t,s;const n=e.pointer??e.rect.center;return(t=e.spawn)==null||t.call(e,R(n,w(E,.8,.62))),(s=e.spawn)==null||s.call(e,new O(n,w(E,.9,.65),34,.5)),v(e)})]}),F=h()("juice-wobble",{size:()=>i(g,u),channels:{wob:{decay:2.2}},style:(e,n)=>({...y(e,n,{tint:e.danger}),corner:12}),render:(e,n,t)=>{const s=e.ch.wob||0,r=e.time??0,o=e.rect,c=o.center,a=Math.sin(r*20)*s,l=o.w*(1+.16*a),d=o.h*(1-.16*a),p=c.x+Math.sin(r*27)*5*s;n.box(b(p-l/2,c.y-d/2,l,d),t.corner,t.fill,t.edge,1.5),n.label(e.props.label,i(p,c.y),t.text,{weight:600,size:13})},on:[x(e=>{var n;return(n=e.kick)==null||n.call(e,"wob",1),v(e)})]}),j=e=>n=>{const t=n.pointer;if(!t)return 0;const s=e==="x"?n.rect.w/2:n.rect.h/2,r=(e==="x"?t.x-n.rect.center.x:t.y-n.rect.center.y)/s;return f(r,-1,1)*(n.ch.hover||0)},V=h()("juice-magnet",{size:()=>i(g,u),channels:{lx:{target:j("x"),spring:{stiffness:190,damping:15}},ly:{target:j("y"),spring:{stiffness:190,damping:15}}},style:(e,n)=>({...y(e,n,{tint:e.accent}),corner:12}),render:(e,n,t)=>{const s=e.rect,r=e.ch.hover||0,o=e.ch.lx||0,c=e.ch.ly||0,a=s.w*(1+.05*r),l=s.h*(1+.05*r),d=s.center.x+o*10,p=s.center.y+c*7;n.glow(t.edge,12*r,()=>n.box(b(d-a/2,p-l/2,a,l),t.corner,t.fill,t.edge,1.5)),n.label(e.props.label,i(d,p),t.text,{weight:600,size:13}),n.dot(i(d+o*a*.34,p+c*l*.34),2+3*r,W(t.text,.5*r))},on:[x(v)]}),K=h()("juice-confetti",{size:()=>i(g,u),channels:{pop:{target:e=>e.ch.press||0,spring:{stiffness:360,damping:11}}},style:(e,n)=>({...y(e,n,{tint:e.accent2}),corner:12}),render:(e,n,t)=>{const s=e.ch.pop||0,r=e.rect,o=r.center;n.push(),n.scaleAt(o.x,o.y,1+.1*s),n.box(r,t.corner,t.fill,t.edge,1.5),n.label(e.props.label,o,t.text,{weight:600,size:13}),n.pop()},on:[x(e=>{var t;const n=e.pointer??e.rect.center;for(let s=0;s<6;s++)(t=e.spawn)==null||t.call(e,R(n,w(m(0,360),.85,.62)));return v(e)})]}),C=(e,n)=>({track:e.muted,fill:e.accent,knob:e.mix(e.textBright,e.accent,.3*(n.hover||0)),glow:12*(n.hover||0)}),B=(e,n,t,s)=>{const r=n.x+10,o=n.w-20,c=n.center.y;return e.box(b(r,c-3,o,6),3,s.track),e.box(b(r,c-3,o*f(t,0,1),6),3,s.fill),{x:r,w:o,y:c,knobX:r+o*f(t,0,1)}},P=(e,n)=>({kind:"slide",id:e.props.id,value:n,time:e.time??0}),Q=h()("juice-spring",{size:()=>i(g,u),channels:{shown:{target:e=>e.props.value,spring:{stiffness:240,damping:12}}},style:C,render:(e,n,t)=>{const s=B(n,e.rect,e.ch.shown??e.props.value,t);n.glow(t.fill,t.glow,()=>n.dot(i(s.knobX,s.y),8+2*e.ch.hover,t.knob))},on:[S({axis:"x",pad:10,to:(e,n)=>P(e,n)})]}),z=w(190,.85,.6),Y=h()("juice-comet",{size:()=>i(g,u),style:C,render:(e,n,t)=>{const s=B(n,e.rect,e.props.value,t);n.glow(z,10+t.glow,()=>n.dot(i(s.knobX,s.y),8,z))},on:[S({axis:"x",pad:10,to:(e,n)=>{var r;const t=e.rect,s=t.x+10+(t.w-20)*f(n,0,1);return(r=e.spawn)==null||r.call(e,U(i(s,t.center.y),z)),P(e,n)}})]}),Z=h()("juice-elastic",{size:()=>i(g,u),channels:{shown:{target:e=>e.props.value,spring:{stiffness:210,damping:9}}},style:C,render:(e,n,t)=>{const s=e.ch.shown??e.props.value,r=s-e.props.value,o=B(n,e.rect,s,t),c=9+26*Math.abs(r),a=9-22*Math.abs(r);n.box(b(o.knobX-c,o.y-a,c*2,a*2),a,t.fill)},on:[S({axis:"x",pad:10,to:(e,n)=>P(e,n)})]}),ee=h()("juice-rainbow",{size:()=>i(g,u),style:C,render:(e,n,t)=>{const s=e.rect,r=s.x+10,o=s.w-20,c=s.center.y,a=f(e.props.value,0,1),l=40;for(let p=0;p<l;p++){const k=p/l;if(k>a){n.box(b(r+o*k,c-3,o/l+1,6),0,t.track);continue}n.box(b(r+o*k,c-3,o/l+1,6),0,w(k*320,.8,.56))}const d=w(a*320,.85,.6);n.glow(d,8+t.glow,()=>n.dot(i(r+o*a,c),8+2*e.ch.hover,d))},on:[S({axis:"x",pad:10,to:(e,n)=>{var r;const t=e.rect,s=t.x+10+(t.w-20)*f(n,0,1);return(r=e.spawn)==null||r.call(e,L(i(s,t.center.y),w(f(n,0,1)*320,.85,.62))),P(e,n)}})]}),ne=(e,n)=>e.reduce((t,s,r)=>(r%n?t[t.length-1].push(s):t.push([s]),t),[]);function te(e){const n=(r,o,c,a)=>M(r,{title:o,value:`×${e.clicks[r]??0}`},[a("c",{id:r,label:c})]),t=(r,o,c)=>M(r,{title:o,value:`${Math.round((e.sliders[r]??0)*100)}%`},[c("c",{id:r,value:e.sliders[r]??0})]),s=[n("squash","Squash","press",_),n("pop","Pop","press",J),n("wobble","Wobble","press",F),n("magnet","Magnet","hover me",V),n("confetti","Confetti","press",K),t("spring","Spring",Q),t("comet","Comet",Y),t("elastic","Elastic",Z),t("rainbow","Rainbow",ee)];return q("root",{gap:16,pad:32,align:"center"},[I("title",{text:"Juice gallery",size:22,weight:700,bright:!0}),I("sub",{text:"Nine controls, nine effects — every one a channel or a particle, zero animation code.",dim:!0,size:12}),...ne(s,3).map((r,o)=>N(`row${o}`,{gap:16},r))])}const se=document.getElementById("c");D(se,{init:{clicks:{},sliders:{spring:.4,comet:.5,elastic:.35,rainbow:.6},lastInteract:-999},update:$,view:te,ambient:(e,n)=>n-e.lastInteract<2.5});H([{name:"main.ts",code:X},{name:"widgets.ts (shared)",code:A}]);
