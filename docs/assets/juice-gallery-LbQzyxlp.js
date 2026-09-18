import{p as h,P as x,r as b,s as y,v as i,h as w,c as W,D as S,q as f,m as D,S as q,L as I,R as H}from"./runtime-BaMoeUMO.js";import{b as R,R as N,r as m,P as T}from"./effects-sMK-JssO.js";import{C as M}from"./widgets-BJEltdMZ.js";import{a as O}from"./source-panel-CSqvtNlY.js";import{w as A}from"./widgets-DQsqbtq9.js";const X=`// ============================================================================\r
// Example: juice gallery — a grid of common controls, each wearing a different\r
// "juicy" effect. The point is breadth: nine buttons and sliders, nine kinds of\r
// delight, and NONE of them needs a line of animation code — every effect is a\r
// channel (spring / impulse / chase) or a one-shot particle Fx.\r
//\r
//   Buttons                          Sliders\r
//   • Squash   — jelly squash/stretch, springs past on release\r
//   • Pop      — scale pop + particle burst + ripple ring\r
//   • Wobble   — a kicked impulse channel drives a decaying gelatin wobble\r
//   • Magnet   — the face leans toward your cursor and springs back\r
//   • Confetti — a shower of colorful particles on every press\r
//   • Spring   — the knob overshoots its target and settles (a real spring)\r
//   • Comet    — the knob leaves a fading trail as you drag it\r
//   • Elastic  — the fill blob stretches elastically and rebounds\r
//   • Rainbow  — a hue ramp under the knob, sparks flying as you drag\r
//\r
// Each cell is the shared \`Card\` composite; the control is a standalone,\r
// token-free part sized by layout and dropped into the card's slot.\r
// ============================================================================\r
\r
import {\r
  burst, calpha, Channels, clamp, Color, Drag1D, Element, GNode, hsl, Label, mount,\r
  Painter, Particles, part, Press, rand, rect, Rect, Ring, Row, Stack, surface,\r
  Tokens, v,\r
} from "gratify";\r
import { Card } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
const TAU = Math.PI * 2;\r
const CW = 150, CH = 56;   // control content size; the Card pads around it\r
\r
// ── One-shot effects (built on the public Particles engine) ───────────────────\r
\r
/** A single dot that fades in place — dropped repeatedly to form a comet trail. */\r
const trail = (at: { x: number; y: number }, color: Color): Particles =>\r
  new Particles(color, () => ({ p: { ...at }, vel: v(0, 0), life: 0.45, max: 0.45, size: 5.5 }),\r
    1, { gravity: 0, drag: 2 });\r
\r
/** A tight spray of sparks — flung off a slider knob as it's dragged. */\r
const sparkle = (at: { x: number; y: number }, color: Color): Particles =>\r
  new Particles(color, () => {\r
    const a = rand(0, TAU), sp = rand(30, 95);\r
    return { p: { ...at }, vel: v(Math.cos(a) * sp, Math.sin(a) * sp - 30), life: rand(0.25, 0.5), max: 0.5, size: rand(1.2, 2.6) };\r
  }, 5, { gravity: 80 });\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
interface Doc {\r
  clicks: Record<string, number>;\r
  sliders: Record<string, number>;   // 0..1\r
  lastInteract: number;              // GNode.time of the last input (drives ambient)\r
}\r
\r
type Intent =\r
  | { kind: "press"; id: string; time: number }\r
  | { kind: "slide"; id: string; value: number; time: number };\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "press":\r
      return { ...doc, clicks: { ...doc.clicks, [intent.id]: (doc.clicks[intent.id] ?? 0) + 1 }, lastInteract: intent.time };\r
    case "slide":\r
      return { ...doc, sliders: { ...doc.sliders, [intent.id]: intent.value }, lastInteract: intent.time };\r
  }\r
}\r
\r
// ── Button props + the interactors they share ─────────────────────────────────\r
interface BtnProps { id: string; label: string; }\r
const pressIntent = (node: GNode<BtnProps>): Intent => ({ kind: "press", id: node.props.id, time: node.time ?? 0 });\r
\r
// ── 1. Squash — jelly squash/stretch (a spring channel past the press) ────────\r
const SquashButton = part<BtnProps>()("juice-squash", {\r
  size: () => v(CW, CH),\r
  channels: { pop: { target: (n) => n.ch.press || 0, spring: { stiffness: 300, damping: 10 } } },\r
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent }), corner: 12 }),\r
  render: (node, p, s) => {\r
    const pop = node.ch.pop || 0, r = node.rect, c = r.center;\r
    // wider + shorter as it presses; the spring overshoots to tall + thin on release\r
    const w = r.w * (1 + 0.24 * pop), h = r.h * (1 - 0.24 * pop);\r
    p.box(rect(c.x - w / 2, c.y - h / 2, w, h), s.corner, s.fill, s.edge, 1.5);\r
    p.label(node.props.label, c, s.text, { weight: 600, size: 13 });\r
  },\r
  on: [Press(pressIntent)],\r
});\r
\r
// ── 2. Pop — scale pop + particle burst + ripple ring ─────────────────────────\r
const POP_HUE = 265;\r
const PopButton = part<BtnProps>()("juice-pop", {\r
  size: () => v(CW, CH),\r
  channels: { pop: { target: (n) => n.ch.press || 0, spring: { stiffness: 340, damping: 9 } } },\r
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent2 }), corner: 12 }),\r
  render: (node, p, s) => {\r
    const pop = node.ch.pop || 0, r = node.rect, c = r.center;\r
    p.push();\r
    p.scaleAt(c.x, c.y, 1 + 0.16 * pop);\r
    p.glow(s.edge, 6 + 24 * pop, () => p.box(r, s.corner, s.fill, s.edge, 1.5));\r
    p.label(node.props.label, c, s.text, { weight: 600, size: 13 });\r
    p.pop();\r
  },\r
  on: [Press((node) => {\r
    const o = node.pointer ?? node.rect.center;\r
    node.spawn?.(burst(o, hsl(POP_HUE, 0.8, 0.62)));\r
    node.spawn?.(new Ring(o, hsl(POP_HUE, 0.9, 0.65), 34, 0.5));\r
    return pressIntent(node);\r
  })],\r
});\r
\r
// ── 3. Wobble — a kicked impulse channel drives a decaying gelatin wobble ──────\r
const WobbleButton = part<BtnProps>()("juice-wobble", {\r
  size: () => v(CW, CH),\r
  channels: { wob: { decay: 2.2 } },\r
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.danger }), corner: 12 }),\r
  render: (node, p, s) => {\r
    const wob = node.ch.wob || 0, t = node.time ?? 0, r = node.rect, c = r.center;\r
    const osc = Math.sin(t * 20) * wob;\r
    const w = r.w * (1 + 0.16 * osc), h = r.h * (1 - 0.16 * osc);\r
    const cx = c.x + Math.sin(t * 27) * 5 * wob;\r
    p.box(rect(cx - w / 2, c.y - h / 2, w, h), s.corner, s.fill, s.edge, 1.5);\r
    p.label(node.props.label, v(cx, c.y), s.text, { weight: 600, size: 13 });\r
  },\r
  on: [Press((node) => { node.kick?.("wob", 1); return pressIntent(node); })],\r
});\r
\r
// ── 4. Magnet — the face leans toward the cursor and springs back ─────────────\r
const lean = (axis: "x" | "y") => (n: GNode<BtnProps>): number => {\r
  const p = n.pointer; if (!p) return 0;\r
  const half = axis === "x" ? n.rect.w / 2 : n.rect.h / 2;\r
  const d = (axis === "x" ? p.x - n.rect.center.x : p.y - n.rect.center.y) / half;\r
  return clamp(d, -1, 1) * (n.ch.hover || 0);\r
};\r
const MagnetButton = part<BtnProps>()("juice-magnet", {\r
  size: () => v(CW, CH),\r
  channels: {\r
    lx: { target: lean("x"), spring: { stiffness: 190, damping: 15 } },\r
    ly: { target: lean("y"), spring: { stiffness: 190, damping: 15 } },\r
  },\r
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent }), corner: 12 }),\r
  render: (node, p, s) => {\r
    const r = node.rect, hover = node.ch.hover || 0;\r
    const lx = node.ch.lx || 0, ly = node.ch.ly || 0;\r
    const w = r.w * (1 + 0.05 * hover), h = r.h * (1 + 0.05 * hover);\r
    const cx = r.center.x + lx * 10, cy = r.center.y + ly * 7;\r
    p.glow(s.edge, 12 * hover, () => p.box(rect(cx - w / 2, cy - h / 2, w, h), s.corner, s.fill, s.edge, 1.5));\r
    p.label(node.props.label, v(cx, cy), s.text, { weight: 600, size: 13 });\r
    p.dot(v(cx + lx * w * 0.34, cy + ly * h * 0.34), 2 + 3 * hover, calpha(s.text, 0.5 * hover));\r
  },\r
  on: [Press(pressIntent)],\r
});\r
\r
// ── 5. Confetti — a shower of colorful particles on every press ───────────────\r
const ConfettiButton = part<BtnProps>()("juice-confetti", {\r
  size: () => v(CW, CH),\r
  channels: { pop: { target: (n) => n.ch.press || 0, spring: { stiffness: 360, damping: 11 } } },\r
  style: (t, ch) => ({ ...surface(t, ch, { tint: t.accent2 }), corner: 12 }),\r
  render: (node, p, s) => {\r
    const pop = node.ch.pop || 0, r = node.rect, c = r.center;\r
    p.push();\r
    p.scaleAt(c.x, c.y, 1 + 0.1 * pop);\r
    p.box(r, s.corner, s.fill, s.edge, 1.5);\r
    p.label(node.props.label, c, s.text, { weight: 600, size: 13 });\r
    p.pop();\r
  },\r
  on: [Press((node) => {\r
    const o = node.pointer ?? node.rect.center;\r
    for (let i = 0; i < 6; i++) node.spawn?.(burst(o, hsl(rand(0, 360), 0.85, 0.62)));\r
    return pressIntent(node);\r
  })],\r
});\r
\r
// ── Slider drawing base (shared by all four slider effects) ────────────────────\r
interface SliderProps { id: string; value: number; }\r
interface SliderStyle { track: Color; fill: Color; knob: Color; glow: number; }\r
const sliderStyle = (t: Tokens, ch: Channels): SliderStyle => ({\r
  track: t.muted,\r
  fill: t.accent,\r
  knob: t.mix(t.textBright, t.accent, 0.3 * (ch.hover || 0)),\r
  glow: 12 * (ch.hover || 0),\r
});\r
/** Track + fill to \`shown\`; returns the knob's screen geometry. */\r
const sliderBase = (p: Painter, r: Rect, shown: number, s: SliderStyle) => {\r
  const x = r.x + 10, w = r.w - 20, y = r.center.y;\r
  p.box(rect(x, y - 3, w, 6), 3, s.track);\r
  p.box(rect(x, y - 3, w * clamp(shown, 0, 1), 6), 3, s.fill);\r
  return { x, w, y, knobX: x + w * clamp(shown, 0, 1) };\r
};\r
const slideIntent = (node: GNode<SliderProps>, f: number): Intent =>\r
  ({ kind: "slide", id: node.props.id, value: f, time: node.time ?? 0 });\r
\r
// ── 6. Spring — the knob overshoots its target and settles ────────────────────\r
const SpringSlider = part<SliderProps>()("juice-spring", {\r
  size: () => v(CW, CH),\r
  channels: { shown: { target: (n: GNode<SliderProps>) => n.props.value, spring: { stiffness: 240, damping: 12 } } },\r
  style: sliderStyle,\r
  render: (node, p, s) => {\r
    const g = sliderBase(p, node.rect, node.ch.shown ?? node.props.value, s);\r
    p.glow(s.fill, s.glow, () => p.dot(v(g.knobX, g.y), 8 + 2 * node.ch.hover, s.knob));\r
  },\r
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => slideIntent(node, f) })],\r
});\r
\r
// ── 7. Comet — the knob leaves a fading trail as you drag ─────────────────────\r
const COMET = hsl(190, 0.85, 0.6);\r
const CometSlider = part<SliderProps>()("juice-comet", {\r
  size: () => v(CW, CH),\r
  style: sliderStyle,\r
  render: (node, p, s) => {\r
    const g = sliderBase(p, node.rect, node.props.value, s);\r
    p.glow(COMET, 10 + s.glow, () => p.dot(v(g.knobX, g.y), 8, COMET));\r
  },\r
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => {\r
    const r = node.rect, x = r.x + 10 + (r.w - 20) * clamp(f, 0, 1);\r
    node.spawn?.(trail(v(x, r.center.y), COMET));\r
    return slideIntent(node, f);\r
  } })],\r
});\r
\r
// ── 8. Elastic — the fill blob stretches elastically and rebounds ─────────────\r
const ElasticSlider = part<SliderProps>()("juice-elastic", {\r
  size: () => v(CW, CH),\r
  channels: { shown: { target: (n: GNode<SliderProps>) => n.props.value, spring: { stiffness: 210, damping: 9 } } },\r
  style: sliderStyle,\r
  render: (node, p, s) => {\r
    const shown = node.ch.shown ?? node.props.value;\r
    const over = shown - node.props.value;                 // how far the spring is past target\r
    const g = sliderBase(p, node.rect, shown, s);\r
    // a blob at the fill's leading edge that squashes with the overshoot\r
    const rx = 9 + 26 * Math.abs(over), ry = 9 - 22 * Math.abs(over);\r
    p.box(rect(g.knobX - rx, g.y - ry, rx * 2, ry * 2), ry, s.fill);\r
  },\r
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => slideIntent(node, f) })],\r
});\r
\r
// ── 9. Rainbow — a hue ramp under the knob, sparks as you drag ────────────────\r
const RainbowSlider = part<SliderProps>()("juice-rainbow", {\r
  size: () => v(CW, CH),\r
  style: sliderStyle,\r
  render: (node, p, s) => {\r
    const r = node.rect, x = r.x + 10, w = r.w - 20, y = r.center.y;\r
    const val = clamp(node.props.value, 0, 1);\r
    const slices = 40;\r
    for (let i = 0; i < slices; i++) {                     // a hue ramp filled to the value\r
      const f = i / slices;\r
      if (f > val) { p.box(rect(x + w * f, y - 3, w / slices + 1, 6), 0, s.track); continue; }\r
      p.box(rect(x + w * f, y - 3, w / slices + 1, 6), 0, hsl(f * 320, 0.8, 0.56));\r
    }\r
    const knob = hsl(val * 320, 0.85, 0.6);\r
    p.glow(knob, 8 + s.glow, () => p.dot(v(x + w * val, y), 8 + 2 * node.ch.hover, knob));\r
  },\r
  on: [Drag1D({ axis: "x", pad: 10, to: (node, f) => {\r
    const r = node.rect, x = r.x + 10 + (r.w - 20) * clamp(f, 0, 1);\r
    node.spawn?.(sparkle(v(x, r.center.y), hsl(clamp(f, 0, 1) * 320, 0.85, 0.62)));\r
    return slideIntent(node, f);\r
  } })],\r
});\r
\r
// ── View: a 3×3 grid of Card composites ───────────────────────────────────────\r
const chunk = <T,>(xs: T[], n: number): T[][] =>\r
  xs.reduce<T[][]>((rows, x, i) => (i % n ? rows[rows.length - 1].push(x) : rows.push([x]), rows), []);\r
\r
function view(doc: Doc): Element {\r
  const btn = (id: string, title: string, label: string, Ctl: typeof SquashButton) =>\r
    Card(id, { title, value: \`×\${doc.clicks[id] ?? 0}\` }, [Ctl("c", { id, label })]);\r
  const sld = (id: string, title: string, Ctl: typeof SpringSlider) =>\r
    Card(id, { title, value: \`\${Math.round((doc.sliders[id] ?? 0) * 100)}%\` }, [Ctl("c", { id, value: doc.sliders[id] ?? 0 })]);\r
\r
  const cells: Element[] = [\r
    btn("squash", "Squash", "press", SquashButton),\r
    btn("pop", "Pop", "press", PopButton),\r
    btn("wobble", "Wobble", "press", WobbleButton),\r
    btn("magnet", "Magnet", "hover me", MagnetButton),\r
    btn("confetti", "Confetti", "press", ConfettiButton),\r
    sld("spring", "Spring", SpringSlider),\r
    sld("comet", "Comet", CometSlider),\r
    sld("elastic", "Elastic", ElasticSlider),\r
    sld("rainbow", "Rainbow", RainbowSlider),\r
  ];\r
\r
  return Stack("root", { gap: 16, pad: 32, align: "center" }, [\r
    Label("title", { text: "Juice gallery", size: 22, weight: 700, bright: true }),\r
    Label("sub", { text: "Nine controls, nine effects — every one a channel or a particle, zero animation code.", dim: true, size: 12 }),\r
    ...chunk(cells, 3).map((row, i) => Row(\`row\${i}\`, { gap: 16 }, row)),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: {\r
    clicks: {},\r
    sliders: { spring: 0.4, comet: 0.5, elastic: 0.35, rainbow: 0.6 },\r
    lastInteract: -999,\r
  },\r
  update,\r
  view,\r
  // The impulse/time effects (wobble) settle a beat after you let go; keep the\r
  // loop awake briefly so their tails play out. Spring/particle effects wake it\r
  // on their own (channels move; particles live).\r
  ambient: (doc, time) => time - doc.lastInteract < 2.5,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,G=Math.PI*2,g=150,u=56,U=(e,r)=>new T(r,()=>({p:{...e},vel:i(0,0),life:.45,max:.45,size:5.5}),1,{gravity:0,drag:2}),L=(e,r)=>new T(r,()=>{const n=m(0,G),t=m(30,95);return{p:{...e},vel:i(Math.cos(n)*t,Math.sin(n)*t-30),life:m(.25,.5),max:.5,size:m(1.2,2.6)}},5,{gravity:80});function $(e,r){switch(r.kind){case"press":return{...e,clicks:{...e.clicks,[r.id]:(e.clicks[r.id]??0)+1},lastInteract:r.time};case"slide":return{...e,sliders:{...e.sliders,[r.id]:r.value},lastInteract:r.time}}}const v=e=>({kind:"press",id:e.props.id,time:e.time??0}),_=h()("juice-squash",{size:()=>i(g,u),channels:{pop:{target:e=>e.ch.press||0,spring:{stiffness:300,damping:10}}},style:(e,r)=>({...y(e,r,{tint:e.accent}),corner:12}),render:(e,r,n)=>{const t=e.ch.pop||0,s=e.rect,o=s.center,c=s.w*(1+.24*t),a=s.h*(1-.24*t);r.box(b(o.x-c/2,o.y-a/2,c,a),n.corner,n.fill,n.edge,1.5),r.label(e.props.label,o,n.text,{weight:600,size:13})},on:[x(v)]}),E=265,J=h()("juice-pop",{size:()=>i(g,u),channels:{pop:{target:e=>e.ch.press||0,spring:{stiffness:340,damping:9}}},style:(e,r)=>({...y(e,r,{tint:e.accent2}),corner:12}),render:(e,r,n)=>{const t=e.ch.pop||0,s=e.rect,o=s.center;r.push(),r.scaleAt(o.x,o.y,1+.16*t),r.glow(n.edge,6+24*t,()=>r.box(s,n.corner,n.fill,n.edge,1.5)),r.label(e.props.label,o,n.text,{weight:600,size:13}),r.pop()},on:[x(e=>{var n,t;const r=e.pointer??e.rect.center;return(n=e.spawn)==null||n.call(e,R(r,w(E,.8,.62))),(t=e.spawn)==null||t.call(e,new N(r,w(E,.9,.65),34,.5)),v(e)})]}),F=h()("juice-wobble",{size:()=>i(g,u),channels:{wob:{decay:2.2}},style:(e,r)=>({...y(e,r,{tint:e.danger}),corner:12}),render:(e,r,n)=>{const t=e.ch.wob||0,s=e.time??0,o=e.rect,c=o.center,a=Math.sin(s*20)*t,l=o.w*(1+.16*a),d=o.h*(1-.16*a),p=c.x+Math.sin(s*27)*5*t;r.box(b(p-l/2,c.y-d/2,l,d),n.corner,n.fill,n.edge,1.5),r.label(e.props.label,i(p,c.y),n.text,{weight:600,size:13})},on:[x(e=>{var r;return(r=e.kick)==null||r.call(e,"wob",1),v(e)})]}),j=e=>r=>{const n=r.pointer;if(!n)return 0;const t=e==="x"?r.rect.w/2:r.rect.h/2,s=(e==="x"?n.x-r.rect.center.x:n.y-r.rect.center.y)/t;return f(s,-1,1)*(r.ch.hover||0)},V=h()("juice-magnet",{size:()=>i(g,u),channels:{lx:{target:j("x"),spring:{stiffness:190,damping:15}},ly:{target:j("y"),spring:{stiffness:190,damping:15}}},style:(e,r)=>({...y(e,r,{tint:e.accent}),corner:12}),render:(e,r,n)=>{const t=e.rect,s=e.ch.hover||0,o=e.ch.lx||0,c=e.ch.ly||0,a=t.w*(1+.05*s),l=t.h*(1+.05*s),d=t.center.x+o*10,p=t.center.y+c*7;r.glow(n.edge,12*s,()=>r.box(b(d-a/2,p-l/2,a,l),n.corner,n.fill,n.edge,1.5)),r.label(e.props.label,i(d,p),n.text,{weight:600,size:13}),r.dot(i(d+o*a*.34,p+c*l*.34),2+3*s,W(n.text,.5*s))},on:[x(v)]}),K=h()("juice-confetti",{size:()=>i(g,u),channels:{pop:{target:e=>e.ch.press||0,spring:{stiffness:360,damping:11}}},style:(e,r)=>({...y(e,r,{tint:e.accent2}),corner:12}),render:(e,r,n)=>{const t=e.ch.pop||0,s=e.rect,o=s.center;r.push(),r.scaleAt(o.x,o.y,1+.1*t),r.box(s,n.corner,n.fill,n.edge,1.5),r.label(e.props.label,o,n.text,{weight:600,size:13}),r.pop()},on:[x(e=>{var n;const r=e.pointer??e.rect.center;for(let t=0;t<6;t++)(n=e.spawn)==null||n.call(e,R(r,w(m(0,360),.85,.62)));return v(e)})]}),C=(e,r)=>({track:e.muted,fill:e.accent,knob:e.mix(e.textBright,e.accent,.3*(r.hover||0)),glow:12*(r.hover||0)}),B=(e,r,n,t)=>{const s=r.x+10,o=r.w-20,c=r.center.y;return e.box(b(s,c-3,o,6),3,t.track),e.box(b(s,c-3,o*f(n,0,1),6),3,t.fill),{x:s,w:o,y:c,knobX:s+o*f(n,0,1)}},P=(e,r)=>({kind:"slide",id:e.props.id,value:r,time:e.time??0}),Q=h()("juice-spring",{size:()=>i(g,u),channels:{shown:{target:e=>e.props.value,spring:{stiffness:240,damping:12}}},style:C,render:(e,r,n)=>{const t=B(r,e.rect,e.ch.shown??e.props.value,n);r.glow(n.fill,n.glow,()=>r.dot(i(t.knobX,t.y),8+2*e.ch.hover,n.knob))},on:[S({axis:"x",pad:10,to:(e,r)=>P(e,r)})]}),z=w(190,.85,.6),Y=h()("juice-comet",{size:()=>i(g,u),style:C,render:(e,r,n)=>{const t=B(r,e.rect,e.props.value,n);r.glow(z,10+n.glow,()=>r.dot(i(t.knobX,t.y),8,z))},on:[S({axis:"x",pad:10,to:(e,r)=>{var s;const n=e.rect,t=n.x+10+(n.w-20)*f(r,0,1);return(s=e.spawn)==null||s.call(e,U(i(t,n.center.y),z)),P(e,r)}})]}),Z=h()("juice-elastic",{size:()=>i(g,u),channels:{shown:{target:e=>e.props.value,spring:{stiffness:210,damping:9}}},style:C,render:(e,r,n)=>{const t=e.ch.shown??e.props.value,s=t-e.props.value,o=B(r,e.rect,t,n),c=9+26*Math.abs(s),a=9-22*Math.abs(s);r.box(b(o.knobX-c,o.y-a,c*2,a*2),a,n.fill)},on:[S({axis:"x",pad:10,to:(e,r)=>P(e,r)})]}),ee=h()("juice-rainbow",{size:()=>i(g,u),style:C,render:(e,r,n)=>{const t=e.rect,s=t.x+10,o=t.w-20,c=t.center.y,a=f(e.props.value,0,1),l=40;for(let p=0;p<l;p++){const k=p/l;if(k>a){r.box(b(s+o*k,c-3,o/l+1,6),0,n.track);continue}r.box(b(s+o*k,c-3,o/l+1,6),0,w(k*320,.8,.56))}const d=w(a*320,.85,.6);r.glow(d,8+n.glow,()=>r.dot(i(s+o*a,c),8+2*e.ch.hover,d))},on:[S({axis:"x",pad:10,to:(e,r)=>{var s;const n=e.rect,t=n.x+10+(n.w-20)*f(r,0,1);return(s=e.spawn)==null||s.call(e,L(i(t,n.center.y),w(f(r,0,1)*320,.85,.62))),P(e,r)}})]}),re=(e,r)=>e.reduce((n,t,s)=>(s%r?n[n.length-1].push(t):n.push([t]),n),[]);function ne(e){const r=(s,o,c,a)=>M(s,{title:o,value:`×${e.clicks[s]??0}`},[a("c",{id:s,label:c})]),n=(s,o,c)=>M(s,{title:o,value:`${Math.round((e.sliders[s]??0)*100)}%`},[c("c",{id:s,value:e.sliders[s]??0})]),t=[r("squash","Squash","press",_),r("pop","Pop","press",J),r("wobble","Wobble","press",F),r("magnet","Magnet","hover me",V),r("confetti","Confetti","press",K),n("spring","Spring",Q),n("comet","Comet",Y),n("elastic","Elastic",Z),n("rainbow","Rainbow",ee)];return q("root",{gap:16,pad:32,align:"center"},[I("title",{text:"Juice gallery",size:22,weight:700,bright:!0}),I("sub",{text:"Nine controls, nine effects — every one a channel or a particle, zero animation code.",dim:!0,size:12}),...re(t,3).map((s,o)=>H(`row${o}`,{gap:16},s))])}const te=document.getElementById("c");D(te,{init:{clicks:{},sliders:{spring:.4,comet:.5,elastic:.35,rainbow:.6},lastInteract:-999},update:$,view:ne,ambient:(e,r)=>r-e.lastInteract<2.5});O([{name:"main.ts",code:X},{name:"widgets.ts (shared)",code:A}]);
