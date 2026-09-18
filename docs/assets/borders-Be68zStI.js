import{c as h,a,m as E,S as R,L as p,R as g,e as S,f as T,b as w,v as t}from"./runtime-DNEt0yeT.js";import{d as L,w as s,B as l,C as v,T as B,S as A,m as y}from"./widgets-BUxxEPAc.js";import{a as I}from"./source-panel-CSqvtNlY.js";import{w as P}from"./widgets-EtuMVc6k.js";const C=`// ============================================================================\r
// Example: borders — a border is a DECORATION you layer onto any widget, not a\r
// feature a widget builds in. Proves README §3 ("wrap, don't edit") with paint:\r
// \`border(kind)\` is a \`PartExt\` built on \`mapRender\` — it paints its bevel over\r
// the widget's own render and reads the widget's \`press\` channel, so a raised\r
// button visibly sinks when you push it. The stock Button / Slider / Checkbox /\r
// Toggle from examples/shared/widgets.ts know nothing about borders.\r
//\r
// Acceptance test — you should see, and be able to do:\r
//   · every control below wears a border it was never written to expect;\r
//   · pressing a "raised" control flips its bevel to "sunken" (press channel);\r
//   · the same \`border(...)\` value applied three ways — use site, a derived\r
//     part, and a live theme toggle — with no edit to the widgets;\r
//   · one control stacked with TWO decorations (border + accent ring), drawn\r
//     inside-out in application order — the composition-order check.\r
// ============================================================================\r
\r
import {\r
  calpha, clearThemeExt, cmix, derivePart, extendTheme, mount, Painter,\r
  PartExt, mapRender, Rect, rgb, v, withExt, Stack, Row, Label,\r
} from "gratify";\r
import { Button, Checkbox, Slider, Toggle } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
// ── The border kinds, as paint ─────────────────────────────────────────────────\r
//\r
// A light pair of edges plus a dark pair is what tricks the eye into depth;\r
// swapping which pair is which flips raised ↔ sunken. Fixed rgba (not tokens),\r
// because a bevel is drawn light over whatever surface it sits on.\r
\r
type BorderKind = "single" | "double" | "sunken" | "raised";\r
\r
const LIGHT = calpha(rgb(255, 255, 255), 0.55);\r
const DARK = calpha(rgb(0, 0, 0), 0.5);\r
const CLEAR = rgb(0, 0, 0, 0);\r
const OUTLINE = calpha(rgb(255, 255, 255), 0.3);\r
\r
/** Paint one border into rect \`r\`. \`flip\` (0..1) only affects bevels:\r
 *  0 = raised look, 1 = sunken look. Animate it and a raised frame depresses. */\r
function drawBorder(paint: Painter, r: Rect, kind: BorderKind, flip: number) {\r
  switch (kind) {\r
    case "single":\r
      paint.box(r, 0, CLEAR, OUTLINE, 1);\r
      return;\r
\r
    case "double":\r
      paint.box(r, 0, CLEAR, OUTLINE, 1);\r
      paint.box(r.inset(3), 0, CLEAR, OUTLINE, 1);\r
      return;\r
\r
    case "raised":\r
    case "sunken": {\r
      const t = Math.max(kind === "sunken" ? 1 : 0, flip);\r
      const topLeft = cmix(LIGHT, DARK, t);\r
      const bottomRight = cmix(DARK, LIGHT, t);\r
      paint.line(v(r.x, r.y + 1), v(r.right, r.y + 1), topLeft, 2);                 // top\r
      paint.line(v(r.x + 1, r.y), v(r.x + 1, r.bottom), topLeft, 2);                // left\r
      paint.line(v(r.x, r.bottom - 1), v(r.right, r.bottom - 1), bottomRight, 2);   // bottom\r
      paint.line(v(r.right - 1, r.y), v(r.right - 1, r.bottom), bottomRight, 2);    // right\r
      return;\r
    }\r
  }\r
}\r
\r
// ── The extension: a border on ANY widget ──────────────────────────────────────\r
//\r
// \`mapRender\` hands us the widget's own paint call as \`base\`; we call it first\r
// (the widget, untouched) and then draw the border on top. A "raised" border\r
// reads the host's \`press\` channel, so it flips as the control is pressed —\r
// the widget never needed to know.\r
\r
export const border = (kind: BorderKind): PartExt =>\r
  mapRender((node, paint, _style, base) => {\r
    base();\r
    drawBorder(paint, node.rect, kind, kind === "raised" ? (node.ch.press ?? 0) : 0);\r
  });\r
\r
/** A second, different decoration — an accent ring that brightens on hover —\r
 *  used only to demonstrate stacking order against \`border(...)\`. */\r
const accentRing: PartExt = mapRender((node, paint, _style, base) => {\r
  base();\r
  const glow = calpha(rgb(96, 180, 255), 0.35 + 0.5 * (node.ch.hover ?? 0));\r
  paint.box(node.rect.inset(-3), 8, CLEAR, glow, 1.5);\r
});\r
\r
// ── Scope 1 — DEFINITION: a new named part with a border baked in ──────────────\r
\r
const SunkenButton = derivePart("sunken-button", Button, border("sunken"));\r
\r
// ── App ─────────────────────────────────────────────────────────────────────────\r
\r
interface Doc { volume: number; check: boolean; power: boolean; themed: boolean; }\r
\r
type Intent =\r
  | { kind: "volume"; value: number }\r
  | { kind: "check" }\r
  | { kind: "power" }\r
  | { kind: "toggle-theme" }\r
  | { kind: "noop" };\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "volume": return { ...doc, volume: intent.value };\r
    case "check": return { ...doc, check: !doc.check };\r
    case "power": return { ...doc, power: !doc.power };\r
    case "toggle-theme": {\r
      const themed = !doc.themed;\r
      // Scope 2 — THEME: while active, every part named "slider" wears a single\r
      // outline. Nothing about Slider changes; the theme reaches into it.\r
      if (themed) extendTheme("dark", "slider", border("single") as (d: unknown) => unknown);\r
      else clearThemeExt("dark", "slider");\r
      return { ...doc, themed };\r
    }\r
    case "noop": return doc;\r
  }\r
}\r
\r
const row = (key: string, label: string, el: ReturnType<typeof Button>) =>\r
  Row(key, { gap: 14, align: "center" }, [\r
    Label(\`\${key}/l\`, { text: label, dim: true, size: 12 }),\r
    el,\r
  ]);\r
\r
function view(doc: Doc) {\r
  return Stack("root", { gap: 14, pad: 40 }, [\r
\r
    Label("title", { text: "Borders are decorations, not features", size: 20, weight: 600, bright: true }),\r
    Label("subtitle", { text: "Press the raised button — its bevel flips to sunken.", dim: true }),\r
\r
    // Scope 3 — USE SITE: border on one element only.\r
    row("raised", "use site · raised",\r
      withExt(Button("raised-btn", { label: "Press me", press: { kind: "noop" } }), border("raised"))),\r
\r
    // Scope 1 — the derived part carries the border in its definition.\r
    row("sunken", "definition · derived",\r
      SunkenButton("sunken-btn", { label: "Sunken button", press: { kind: "noop" } })),\r
\r
    row("double", "use site · double",\r
      withExt(Button("double-btn", { label: "Double outline", press: { kind: "noop" } }), border("double"))),\r
\r
    // Stacking: TWO decorations on one widget. \`border\` is applied first, so it\r
    // draws closest to the widget; \`accentRing\` is applied last, so it draws\r
    // outermost — inside-out, in application order. Swap the two args and the\r
    // ring would tuck under the bevel instead.\r
    row("stacked", "stacked · border + ring",\r
      withExt(Button("stacked-btn", { label: "Two decorations", press: { kind: "noop" } }),\r
        border("raised"), accentRing)),\r
\r
    // Borders decorate NON-button widgets identically.\r
    Row("misc", { gap: 20, align: "center" }, [\r
      withExt(Checkbox("chk", { on: doc.check, toggle: { kind: "check" }, label: "sunken checkbox" }), border("sunken")),\r
      withExt(Toggle("tog", { on: doc.power, flip: { kind: "power" } }), border("single")),\r
    ]),\r
\r
    Slider("vol", { value: doc.volume, set: (value) => ({ kind: "volume", value }), width: 220 }),\r
\r
    // Scope 2 — flip the theme extension live. Watch the slider gain/lose its\r
    // outline with nothing in the slider's definition touched.\r
    Row("theme", { gap: 10, align: "center" }, [\r
      Checkbox("theme-chk", { on: doc.themed, toggle: { kind: "toggle-theme" }, label: "theme scope · outline every slider" }),\r
    ]),\r
  ]);\r
}\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
mount(canvas, { init: { volume: 0.4, check: true, power: false, themed: false }, update, view });\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,x=h(a(255,255,255),.55),f=h(a(0,0,0),.5),u=a(0,0,0,0),b=h(a(255,255,255),.3);function D(n,e,r,d){switch(r){case"single":n.box(e,0,u,b,1);return;case"double":n.box(e,0,u,b,1),n.box(e.inset(3),0,u,b,1);return;case"raised":case"sunken":{const i=Math.max(r==="sunken"?1:0,d),m=w(x,f,i),k=w(f,x,i);n.line(t(e.x,e.y+1),t(e.right,e.y+1),m,2),n.line(t(e.x+1,e.y),t(e.x+1,e.bottom),m,2),n.line(t(e.x,e.bottom-1),t(e.right,e.bottom-1),k,2),n.line(t(e.right-1,e.y),t(e.right-1,e.bottom),k,2);return}}}const o=n=>y((e,r,d,i)=>{i(),D(r,e.rect,n,n==="raised"?e.ch.press??0:0)}),N=y((n,e,r,d)=>{d();const i=h(a(96,180,255),.35+.5*(n.ch.hover??0));e.box(n.rect.inset(-3),8,u,i,1.5)}),O=L("sunken-button",l,o("sunken"));function K(n,e){switch(e.kind){case"volume":return{...n,volume:e.value};case"check":return{...n,check:!n.check};case"power":return{...n,power:!n.power};case"toggle-theme":{const r=!n.themed;return r?S("dark","slider",o("single")):T("dark","slider"),{...n,themed:r}}case"noop":return n}}const c=(n,e,r)=>g(n,{gap:14,align:"center"},[p(`${n}/l`,{text:e,dim:!0,size:12}),r]);function H(n){return R("root",{gap:14,pad:40},[p("title",{text:"Borders are decorations, not features",size:20,weight:600,bright:!0}),p("subtitle",{text:"Press the raised button — its bevel flips to sunken.",dim:!0}),c("raised","use site · raised",s(l("raised-btn",{label:"Press me",press:{kind:"noop"}}),o("raised"))),c("sunken","definition · derived",O("sunken-btn",{label:"Sunken button",press:{kind:"noop"}})),c("double","use site · double",s(l("double-btn",{label:"Double outline",press:{kind:"noop"}}),o("double"))),c("stacked","stacked · border + ring",s(l("stacked-btn",{label:"Two decorations",press:{kind:"noop"}}),o("raised"),N)),g("misc",{gap:20,align:"center"},[s(v("chk",{on:n.check,toggle:{kind:"check"},label:"sunken checkbox"}),o("sunken")),s(B("tog",{on:n.power,flip:{kind:"power"}}),o("single"))]),A("vol",{value:n.volume,set:e=>({kind:"volume",value:e}),width:220}),g("theme",{gap:10,align:"center"},[v("theme-chk",{on:n.themed,toggle:{kind:"toggle-theme"},label:"theme scope · outline every slider"})])])}const U=document.getElementById("c");E(U,{init:{volume:.4,check:!0,power:!1,themed:!1},update:K,view:H});I([{name:"main.ts",code:C},{name:"widgets.ts (shared)",code:P}]);
