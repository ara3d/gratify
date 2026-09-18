import{p as a,r as m,a as p,v as o,c as i,b as g,m as x,P as u,S as v,L as h,d as c}from"./runtime-DNEt0yeT.js";import{w as y,B as w,a as d}from"./widgets-BUxxEPAc.js";import{a as k}from"./source-panel-CSqvtNlY.js";const f=`// ============================================================================\r
// Example: adornments — decoration by composition.\r
//\r
// An adornment is an overlay element anchored to a host widget: a tooltip, a\r
// badge, a resize grip, a close button. The \`adorn\` facet produces them, and\r
// \`addAdorn(...)\` APPENDS them to any widget — so you decorate a control that\r
// was never written to expect it.\r
//\r
// The \`Card\` part below knows nothing about tooltips, badges, or close buttons.\r
// Every decoration is layered on at the use site:\r
//\r
//   withExt(Card(id, props), tip("…"), badge(n), closable(intent))\r
//\r
// Adornments are ordinary keyed elements: they play enter/exit, they're\r
// themeable, they can carry their own interactors (the close button is a real\r
// button you click), and they draw on the overlay layer so they escape the\r
// host's bounds. Hover a card for a tooltip; click a card to bump its badge;\r
// click the × to remove it; Reset brings them all back.\r
// ============================================================================\r
\r
import {\r
  addAdorn, at, calpha, cmix, Color, GNode, mount, PartExt, part, Press, rect,\r
  rgb, v, Vec, withExt, Stack, Label,\r
} from "gratify";\r
import { Button } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface Item { id: string; title: string; sub: string; tip: string; count: number; }\r
interface Doc { items: Item[]; }\r
\r
type Intent =\r
  | { kind: "remove"; id: string }\r
  | { kind: "bump"; id: string }\r
  | { kind: "reset" };\r
\r
const INITIAL: Item[] = [\r
  { id: "layers", title: "Layers", sub: "3 visible", tip: "The world / overlay / screen stack", count: 0 },\r
  { id: "springs", title: "Springs", sub: "stiff 240", tip: "Momentum and overshoot", count: 0 },\r
  { id: "channels", title: "Channels", sub: "hover · press", tip: "Numbers that chase targets", count: 2 },\r
  { id: "reconcile", title: "Reconcile", sub: "keyed", tip: "Identity survives rebuilds", count: 0 },\r
];\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "remove": return { items: doc.items.filter((i) => i.id !== intent.id) };\r
    case "bump": return { items: doc.items.map((i) => (i.id === intent.id ? { ...i, count: i.count + 1 } : i)) };\r
    case "reset": return { items: INITIAL };\r
  }\r
}\r
\r
// ── The host widget — a plain card. It has NO idea it will be decorated. ──────\r
\r
interface CardProps { title: string; sub: string; press: Intent; }\r
\r
const Card = part<CardProps, { fill: Color; edge: Color; text: Color }>("card", {\r
  size: () => v(200, 62),\r
  style: (t, ch) => ({\r
    fill: t.mix(t.surface, t.surfaceHi, 0.4 * ch.hover + 0.6 * ch.press),\r
    edge: t.mix(t.muted, t.accent, ch.hover),\r
    text: t.mix(t.text, t.textBright, ch.hover),\r
  }),\r
  render(node, paint, s) {\r
    const r = node.rect;\r
    paint.box(r, 10, s.fill, s.edge, 1);\r
    paint.label(node.props.title, v(r.x + 14, r.center.y - 8), s.text, { align: "left", weight: 600 });\r
    paint.label(node.props.sub, v(r.x + 14, r.center.y + 10), calpha(s.text, 0.6), { align: "left", size: 11 });\r
  },\r
  on: [Press((node) => node.props.press)],   // clicking the body bumps the badge\r
});\r
\r
// ── The adornment parts — small widgets that live on the overlay layer. ───────\r
\r
// A tooltip bubble that self-centers above an anchor point (so it can overflow\r
// the host). Decorative — no interactors — so it stays transparent to clicks.\r
const Tooltip = part<{ text: string; anchor: Vec }>()("tooltip", {\r
  size: (props, measure) => v(measure.text(props.text).x + 20, 28),\r
  style: (t) => ({ bubble: cmix(t.bg, rgb(0, 0, 0), 0.45), edge: calpha(t.accent, 0.5), text: t.textBright, pointer: calpha(t.accent, 0.7) }),\r
  render(node, paint, s) {\r
    const a = node.props.anchor;\r
    const w = paint.measure.text(node.props.text).x + 20;\r
    const box = rect(a.x - w / 2, a.y - 34, w, 26);\r
    paint.glow(rgb(0, 0, 0), 12, () => paint.box(box, 7, s.bubble, s.edge, 1));\r
    paint.label(node.props.text, box.center, s.text, { size: 12 });\r
    paint.dot(v(a.x, a.y - 6), 2.5, s.pointer);   // a little pointer\r
  },\r
});\r
\r
// A count badge at a corner. Decorative.\r
const Badge = part<{ count: number }>()("badge", {\r
  size: () => v(22, 22),\r
  style: (t) => ({ accent: t.accent, text: t.textBright }),\r
  render(node, paint, s) {\r
    const c = node.rect.center;\r
    paint.glow(s.accent, 8 * (0.5 + 0.5 * node.ch.enter), () => paint.dot(c, 10, s.accent));\r
    paint.label(String(node.props.count), c, s.text, { size: 11, weight: 700 });\r
  },\r
});\r
\r
// A close button. INTERACTIVE — it carries its own Press, so clicking it emits\r
// the host's remove intent. It captures hover and clicks; the host does not.\r
const CloseButton = part<{ press: Intent }, { bg: Color; x: Color; pop: number }>("close-button", {\r
  size: () => v(22, 22),\r
  style: (t, ch) => ({\r
    bg: calpha(t.danger, 0.18 + 0.6 * ch.hover),\r
    x: t.mix(t.textDim, t.textBright, ch.hover),\r
    pop: ch.press,\r
  }),\r
  render(node, paint, s) {\r
    const c = node.rect.center, k = 4 * (1 - 0.3 * s.pop);\r
    paint.dot(c, 11, s.bg);\r
    paint.line(v(c.x - k, c.y - k), v(c.x + k, c.y + k), s.x, 2);\r
    paint.line(v(c.x - k, c.y + k), v(c.x + k, c.y - k), s.x, 2);\r
  },\r
  on: [Press((node) => node.props.press)],\r
});\r
\r
// ── The adornment EXTENSIONS — the composable API. Each appends to \`adorn\`. ───\r
//\r
// These are the whole point: \`tip\`, \`badge\`, and \`closable\` decorate ANY\r
// widget, at its use site, with zero changes to the widget.\r
\r
/** Show a tooltip above the host while it is hovered. */\r
const tip = (text: string): PartExt =>\r
  addAdorn((node: GNode<unknown>) => {\r
    if ((node.ch.hover ?? 0) < 0.5) return [];   // gated on the host's hover channel\r
    const anchor = v(node.rect.center.x, node.rect.y);\r
    return [at(Tooltip("tip", { text, anchor }), anchor)];\r
  });\r
\r
/** Pin a count badge to the host's top-right corner (only when count > 0). */\r
const badge = (count: number): PartExt =>\r
  addAdorn((node: GNode<unknown>) =>\r
    count > 0 ? [at(Badge("badge", { count }), v(node.rect.right - 14, node.rect.y - 8))] : []);\r
\r
/** Attach a close button that overhangs the host's top-left corner. */\r
const closable = (press: Intent): PartExt =>\r
  addAdorn((node: GNode<unknown>) =>\r
    [at(CloseButton("x", { press }), v(node.rect.x - 8, node.rect.y - 8))]);\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
function view(doc: Doc) {\r
  return Stack("root", { gap: 16, pad: 40 }, [\r
\r
    Label("title", { text: "Adornments — decoration by composition", size: 18, weight: 600, bright: true }),\r
    Label("sub", { text: "hover a card for a tooltip · click a card to bump its badge · click × to remove", dim: true }),\r
\r
    ...doc.items.map((item) =>\r
      // The card is decorated purely by layering extensions onto it. Every card\r
      // gets a tooltip + a close button; ones with a count also get a badge.\r
      withExt(\r
        Card(item.id, { title: item.title, sub: item.sub, press: { kind: "bump", id: item.id } }),\r
        tip(item.tip),\r
        closable({ kind: "remove", id: item.id }),\r
        ...(item.count > 0 ? [badge(item.count)] : []),\r
      )),\r
\r
    Button("reset", { label: "Reset", press: { kind: "reset" }, accent: true }),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
mount(canvas, { init: { items: INITIAL }, update, view });\r
\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`,b=[{id:"layers",title:"Layers",sub:"3 visible",tip:"The world / overlay / screen stack",count:0},{id:"springs",title:"Springs",sub:"stiff 240",tip:"Momentum and overshoot",count:0},{id:"channels",title:"Channels",sub:"hover · press",tip:"Numbers that chase targets",count:2},{id:"reconcile",title:"Reconcile",sub:"keyed",tip:"Identity survives rebuilds",count:0}];function I(t,e){switch(e.kind){case"remove":return{items:t.items.filter(r=>r.id!==e.id)};case"bump":return{items:t.items.map(r=>r.id===e.id?{...r,count:r.count+1}:r)};case"reset":return{items:b}}}const A=a("card",{size:()=>o(200,62),style:(t,e)=>({fill:t.mix(t.surface,t.surfaceHi,.4*e.hover+.6*e.press),edge:t.mix(t.muted,t.accent,e.hover),text:t.mix(t.text,t.textBright,e.hover)}),render(t,e,r){const n=t.rect;e.box(n,10,r.fill,r.edge,1),e.label(t.props.title,o(n.x+14,n.center.y-8),r.text,{align:"left",weight:600}),e.label(t.props.sub,o(n.x+14,n.center.y+10),i(r.text,.6),{align:"left",size:11})},on:[u(t=>t.props.press)]}),B=a()("tooltip",{size:(t,e)=>o(e.text(t.text).x+20,28),style:t=>({bubble:g(t.bg,p(0,0,0),.45),edge:i(t.accent,.5),text:t.textBright,pointer:i(t.accent,.7)}),render(t,e,r){const n=t.props.anchor,s=e.measure.text(t.props.text).x+20,l=m(n.x-s/2,n.y-34,s,26);e.glow(p(0,0,0),12,()=>e.box(l,7,r.bubble,r.edge,1)),e.label(t.props.text,l.center,r.text,{size:12}),e.dot(o(n.x,n.y-6),2.5,r.pointer)}}),C=a()("badge",{size:()=>o(22,22),style:t=>({accent:t.accent,text:t.textBright}),render(t,e,r){const n=t.rect.center;e.glow(r.accent,8*(.5+.5*t.ch.enter),()=>e.dot(n,10,r.accent)),e.label(String(t.props.count),n,r.text,{size:11,weight:700})}}),E=a("close-button",{size:()=>o(22,22),style:(t,e)=>({bg:i(t.danger,.18+.6*e.hover),x:t.mix(t.textDim,t.textBright,e.hover),pop:e.press}),render(t,e,r){const n=t.rect.center,s=4*(1-.3*r.pop);e.dot(n,11,r.bg),e.line(o(n.x-s,n.y-s),o(n.x+s,n.y+s),r.x,2),e.line(o(n.x-s,n.y+s),o(n.x+s,n.y-s),r.x,2)},on:[u(t=>t.props.press)]}),T=t=>d(e=>{if((e.ch.hover??0)<.5)return[];const r=o(e.rect.center.x,e.rect.y);return[c(B("tip",{text:t,anchor:r}),r)]}),P=t=>d(e=>t>0?[c(C("badge",{count:t}),o(e.rect.right-14,e.rect.y-8))]:[]),S=t=>d(e=>[c(E("x",{press:t}),o(e.rect.x-8,e.rect.y-8))]);function z(t){return v("root",{gap:16,pad:40},[h("title",{text:"Adornments — decoration by composition",size:18,weight:600,bright:!0}),h("sub",{text:"hover a card for a tooltip · click a card to bump its badge · click × to remove",dim:!0}),...t.items.map(e=>y(A(e.id,{title:e.title,sub:e.sub,press:{kind:"bump",id:e.id}}),T(e.tip),S({kind:"remove",id:e.id}),...e.count>0?[P(e.count)]:[])),w("reset",{label:"Reset",press:{kind:"reset"},accent:!0})])}const N=document.getElementById("c");x(N,{init:{items:b},update:I,view:z});k([{name:"main.ts",code:f}]);
