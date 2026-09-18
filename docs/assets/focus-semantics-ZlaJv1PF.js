import{p as s,v as n,n as p,d as a,o as u,m as d,S as m,L as i,R as h}from"./runtime-DNEt0yeT.js";import{a as v}from"./source-panel-CSqvtNlY.js";const b=`// ============================================================================\r
// Example: focus-semantics — the three upstream-B seams on one page.\r
//\r
//   1. Focus model — every control here is Focusable(). Tab / Shift-Tab walk\r
//      them in document order (wrapping); Enter or Space presses the focused\r
//      one; Escape releases focus; clicking focuses what you clicked. The\r
//      ring you see is just the automatic \`focus\` channel driving the style.\r
//\r
//   2. Adorn z-tiers — every card carries an untiered corner badge (tier 0)\r
//      and a hover/focus tooltip lifted to tier 2 with \`tier(el, 2)\`. Hover a\r
//      card in the MIDDLE of the row: without tiers its tooltip would paint\r
//      under the next card's badge; with tiers it reliably sits above all of\r
//      them.\r
//\r
//   3. Semantics slot — each part declares \`.semantics()\` (role/label/value);\r
//      the panel on the right prints \`rt.semanticsTree()\` live. Pure data —\r
//      no DOM mirroring, no ARIA — the slot a future accessibility layer\r
//      builds on.\r
// ============================================================================\r
\r
import {\r
  at, Focusable, Label, mount, part, Row, Stack,\r
  tier, v, type SemanticsNode,\r
} from "gratify";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface Doc {\r
  volume: number;\r
  muted: boolean;\r
  presses: number;\r
}\r
\r
type Intent =\r
  | { kind: "vol"; delta: number }\r
  | { kind: "mute" }\r
  | { kind: "ping" };\r
\r
const update = (d: Doc, i: Intent): Doc =>\r
  i.kind === "vol" ? { ...d, volume: Math.max(0, Math.min(10, d.volume + i.delta)) }\r
  : i.kind === "mute" ? { ...d, muted: !d.muted }\r
  : { ...d, presses: d.presses + 1 };\r
\r
// ── A focusable card with a tiered tooltip + an untiered badge ────────────────\r
\r
const Tooltip = part("fsx-tooltip")\r
  .props<{ text: string }>()\r
  .size((p, m) => v(m.text(p.text, 12).x + 18, 24))\r
  .style((t) => ({ fill: t.surfaceHi, edge: t.accent, text: t.textBright }))\r
  .render((n, p, s) => {\r
    p.box(n.rect, 6, s.fill, s.edge, 1);\r
    p.label(n.props.text, n.rect.center, s.text, { size: 12 });\r
  });\r
\r
const Badge = part("fsx-badge")\r
  .props<{ text: string }>()\r
  .intrinsic(22, 22)\r
  .style((t) => ({ fill: t.accent2, text: t.textBright }))\r
  .render((n, p, s) => {\r
    p.box(n.rect, 11, s.fill);\r
    p.label(n.props.text, n.rect.center, s.text, { size: 11, weight: 600 });\r
  });\r
\r
const Card = part("fsx-card")\r
  .props<{ label: string; value: string; tip: string; to: Intent; role: string }>()\r
  .intrinsic(128, 64)\r
  .style((t, ch) => ({\r
    fill: t.mix(t.surface, t.surfaceHi, ch.hover),\r
    edge: t.mix(t.muted, t.accent, Math.max(ch.focus, ch.press)),\r
    ring: ch.focus,\r
    text: t.mix(t.text, t.textBright, ch.hover + ch.focus),\r
    dim: t.textDim,\r
    show: Math.max(ch.hover, ch.focus),\r
  }))\r
  .render((n, p, s) => {\r
    p.box(n.rect, 10, s.fill, s.edge, 1 + 1.5 * s.ring);\r
    p.label(n.props.label, v(n.rect.center.x, n.rect.y + 22), s.dim, { size: 12 });\r
    p.label(n.props.value, v(n.rect.center.x, n.rect.y + 44), s.text, { size: 15, weight: 600 });\r
  })\r
  .on(Focusable())\r
  .press((n) => n.props.to)\r
  .semantics((n) => ({ role: n.props.role, label: n.props.label, value: n.props.value }))\r
  // tier 0 (default): a corner badge — stays under any sibling's tooltip\r
  .adorn((n) => [at(Badge("badge", { text: "•" }), v(n.rect.right - 11, n.rect.y - 11))])\r
  // tier 2: the tooltip — reliably above EVERY card's badge, whoever owns it\r
  .adorn((n) => n.ch.hover > 0.4 || n.ch.focus > 0.4\r
    ? [tier(at(Tooltip("tip", { text: n.props.tip }), v(n.rect.x + 8, n.rect.y - 30)), 2)]\r
    : []);\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
const Root = part("fsx-root")\r
  .props<Record<string, never>>()\r
  .render(() => {})\r
  .semantics(() => ({ role: "group", label: "mixer" }));\r
\r
const view = (d: Doc) =>\r
  Root("root", {}, [Stack("col", { gap: 18, pad: 48 }, [\r
    Label("title", { text: "Tab / Shift-Tab cycle focus · Enter or Space presses · Escape releases", size: 15, weight: 600, bright: true }),\r
    Label("hint", { text: "Hover or focus a middle card: its tooltip (tier 2) paints above the neighbors' badges (tier 0).", size: 12 }),\r
    Row("cards", { gap: 14 }, [\r
      Card("vol-down", { label: "volume −", value: \`\${d.volume}\`, tip: "Enter: lower volume", to: { kind: "vol", delta: -1 }, role: "button" }),\r
      Card("vol-up", { label: "volume +", value: \`\${d.volume}\`, tip: "Enter: raise volume", to: { kind: "vol", delta: +1 }, role: "button" }),\r
      Card("mute", { label: "mute", value: d.muted ? "ON" : "off", tip: "Enter: toggle mute", to: { kind: "mute" }, role: "switch" }),\r
      Card("ping", { label: "pressed", value: \`\${d.presses}×\`, tip: "Enter: just counts", to: { kind: "ping" }, role: "button" }),\r
    ]),\r
  ])]);\r
\r
// ── Mount + live semantics panel ──────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
const rt = mount(canvas, { init: { volume: 5, muted: false, presses: 0 }, update, view });\r
\r
// The semantics tree, printed live. THIS is the deliverable: a queryable\r
// data structure (role/label/value + key path + rect) a future accessibility\r
// layer can mirror to DOM/ARIA — the example only pretty-prints it.\r
const panel = document.getElementById("sem")!;\r
const fmt = (nodes: SemanticsNode[], depth: number): string =>\r
  nodes.map((n) =>\r
    \`\${"  ".repeat(depth)}<b>\${n.role ?? "?"}</b> \${n.label ?? ""}\` +\r
    (n.value !== undefined ? \` = \${n.value}\` : "") +\r
    \`  <span style="opacity:.55">(\${Math.round(n.rect.x)},\${Math.round(n.rect.y)} \${Math.round(n.rect.w)}×\${Math.round(n.rect.h)})</span>\\n\` +\r
    fmt(n.children, depth + 1),\r
  ).join("");\r
const refresh = () => { panel.innerHTML = \`rt.semanticsTree()\\n\\n\${fmt(rt.semanticsTree(), 0)}\`; };\r
refresh();\r
setInterval(refresh, 250);\r
\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`,x=(e,t)=>t.kind==="vol"?{...e,volume:Math.max(0,Math.min(10,e.volume+t.delta))}:t.kind==="mute"?{...e,muted:!e.muted}:{...e,presses:e.presses+1},g=s("fsx-tooltip").props().size((e,t)=>n(t.text(e.text,12).x+18,24)).style(e=>({fill:e.surfaceHi,edge:e.accent,text:e.textBright})).render((e,t,r)=>{t.box(e.rect,6,r.fill,r.edge,1),t.label(e.props.text,e.rect.center,r.text,{size:12})}),f=s("fsx-badge").props().intrinsic(22,22).style(e=>({fill:e.accent2,text:e.textBright})).render((e,t,r)=>{t.box(e.rect,11,r.fill),t.label(e.props.text,e.rect.center,r.text,{size:11,weight:600})}),o=s("fsx-card").props().intrinsic(128,64).style((e,t)=>({fill:e.mix(e.surface,e.surfaceHi,t.hover),edge:e.mix(e.muted,e.accent,Math.max(t.focus,t.press)),ring:t.focus,text:e.mix(e.text,e.textBright,t.hover+t.focus),dim:e.textDim,show:Math.max(t.hover,t.focus)})).render((e,t,r)=>{t.box(e.rect,10,r.fill,r.edge,1+1.5*r.ring),t.label(e.props.label,n(e.rect.center.x,e.rect.y+22),r.dim,{size:12}),t.label(e.props.value,n(e.rect.center.x,e.rect.y+44),r.text,{size:15,weight:600})}).on(p()).press(e=>e.props.to).semantics(e=>({role:e.props.role,label:e.props.label,value:e.props.value})).adorn(e=>[a(f("badge",{text:"•"}),n(e.rect.right-11,e.rect.y-11))]).adorn(e=>e.ch.hover>.4||e.ch.focus>.4?[u(a(g("tip",{text:e.props.tip}),n(e.rect.x+8,e.rect.y-30)),2)]:[]),y=s("fsx-root").props().render(()=>{}).semantics(()=>({role:"group",label:"mixer"})),w=e=>y("root",{},[m("col",{gap:18,pad:48},[i("title",{text:"Tab / Shift-Tab cycle focus · Enter or Space presses · Escape releases",size:15,weight:600,bright:!0}),i("hint",{text:"Hover or focus a middle card: its tooltip (tier 2) paints above the neighbors' badges (tier 0).",size:12}),h("cards",{gap:14},[o("vol-down",{label:"volume −",value:`${e.volume}`,tip:"Enter: lower volume",to:{kind:"vol",delta:-1},role:"button"}),o("vol-up",{label:"volume +",value:`${e.volume}`,tip:"Enter: raise volume",to:{kind:"vol",delta:1},role:"button"}),o("mute",{label:"mute",value:e.muted?"ON":"off",tip:"Enter: toggle mute",to:{kind:"mute"},role:"switch"}),o("ping",{label:"pressed",value:`${e.presses}×`,tip:"Enter: just counts",to:{kind:"ping"},role:"button"})])])]),$=document.getElementById("c"),E=d($,{init:{volume:5,muted:!1,presses:0},update:x,view:w}),M=document.getElementById("sem"),l=(e,t)=>e.map(r=>`${"  ".repeat(t)}<b>${r.role??"?"}</b> ${r.label??""}`+(r.value!==void 0?` = ${r.value}`:"")+`  <span style="opacity:.55">(${Math.round(r.rect.x)},${Math.round(r.rect.y)} ${Math.round(r.rect.w)}×${Math.round(r.rect.h)})</span>
`+l(r.children,t+1)).join(""),c=()=>{M.innerHTML=`rt.semanticsTree()

${l(E.semanticsTree(),0)}`};c();setInterval(c,250);v([{name:"main.ts",code:b}]);
