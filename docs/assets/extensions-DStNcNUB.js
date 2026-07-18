import{m as u,d as m,r as k,c as g,a as l,S as f,L as a,R as c,f as x,g as b}from"./source-panel-CwjQB28X.js";import{d as y,B as o,e as w,m as h,w as d,T as v,b as S,C as E,f as C,g as A}from"./widgets-CaJ4_Cu6.js";import{w as T}from"./widgets-BJYGvrkn.js";const B=`// ============================================================================\r
// Example: extensions — "wrap, don't edit", at all three scopes.\r
//\r
// An extension is an ordinary function from part definition to part\r
// definition. Function facets (size / style / render) extend by WRAPPING —\r
// your function receives the base result and states only its delta. List\r
// facets (channels / interactors) extend by APPENDING.\r
//\r
// The same extension value can be applied at three scopes:\r
//\r
//   scope 1 — DEFINITION: bake it into a new named part.\r
//             FancyButton = derivePart("fancy-button", Button, sheen)\r
//\r
//   scope 2 — THEME: apply it to every matching part in the app while a\r
//             theme is active — including parts inside code you don't own.\r
//             The "Neon all buttons" switch below does this live, and it\r
//             reaches FancyButton too (derived parts remember their ancestry).\r
//\r
//   scope 3 — USE SITE: apply it to one element only, with withExt(...).\r
//\r
// The stock Button never planned for any of this.\r
// ============================================================================\r
\r
import {\r
  addChannels,        // append animated channels to a part\r
  calpha, Channels,\r
  derivePart,         // scope 1: bake extensions into a new named part\r
  extendTheme,        // scope 2: extend a part app-wide while a theme is active\r
  clearThemeExt,      //          …and remove that again\r
  GNode,\r
  mapRender,          // wrap the render facet (paint under/over the base)\r
  mapSize,            // wrap the size facet\r
  mapStyle,           // wrap the style facet (receive the base style record)\r
  mount,\r
  PartExt,\r
  rect, rgb,\r
  Stack, Row, Label,\r
  SurfaceStyle,       // the shared { fill, edge, text } restyle protocol\r
  Tokens,\r
  withExt,            // scope 3: apply to one element at its use site\r
} from "gratify";\r
import { Button, Card, Checkbox, Toggle } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
// ── Three reusable extensions (each is just a function) ───────────────────────\r
\r
// 1. A red debug outline over ANY part: wrap render, call the base first,\r
//    then paint on top of it.\r
const outlined: PartExt = mapRender((node, painter, _style, drawBase) => {\r
  drawBase();\r
  painter.box(node.rect, 8, rgb(0, 0, 0, 0), rgb(255, 92, 108, 0.9), 1.5);\r
});\r
\r
// 2. A hover sheen. This one needs its OWN animated value, so it appends a\r
//    channel ("fx/sheen" — namespaced, since channels share the node) and\r
//    wraps render to draw a light bar whose width follows the channel.\r
const sheen: PartExt = (definition) => {\r
  const withChannel = addChannels({\r
    "fx/sheen": {\r
      target: (node: GNode<unknown>) => node.ch.hover || 0,\r
      rate: 6,\r
    },\r
  })(definition);\r
\r
  return mapRender((node, painter, _style, drawBase) => {\r
    drawBase();\r
    const sheenAmount = node.ch["fx/sheen"] || 0;\r
    if (sheenAmount > 0.02) {\r
      const r = node.rect;\r
      painter.box(\r
        rect(r.x, r.y, r.w * sheenAmount, 3), 1.5,\r
        calpha(rgb(255, 255, 255), 0.35 * sheenAmount));\r
    }\r
  })(withChannel);\r
};\r
\r
// 3. Touch-target density: wrap size, enforce a 44px minimum height.\r
const chunky: PartExt = mapSize((_props, _measure, baseSize) =>\r
  ({ x: baseSize.x + 16, y: Math.max(baseSize.y, 44) }));\r
\r
// 4. "Neon": a THEME-scope restyle written against the SHARED SurfaceStyle\r
//    protocol — { fill, edge, text }. Because Button, Checkbox and Card all\r
//    expose those fields, this ONE definition restyles all three part kinds.\r
//    mapStyle receives the base record, so we state only what we change.\r
const neon: PartExt = mapStyle<SurfaceStyle>(\r
  (tokens: Tokens, channels: Channels, _props, baseStyle) => ({\r
    ...baseStyle,\r
    fill: tokens.mix(baseStyle.fill, tokens.accent2, 0.35 + 0.3 * channels.hover),\r
    edge: tokens.mix(tokens.accent2, tokens.textBright, channels.hover * 0.5),\r
    text: tokens.textBright,\r
  }),\r
);\r
\r
/** The parts the neon theme restyle reaches — one extension, three kinds. */\r
const NEON_PARTS = ["button", "checkbox", "card"];\r
\r
// ── Scope 1: a new named part with the sheen baked in ─────────────────────────\r
\r
const FancyButton = derivePart("fancy-button", Button, sheen);\r
\r
// ── The application ───────────────────────────────────────────────────────────\r
\r
interface ExtensionsDocument {\r
  clickCount: number;\r
  neonActive: boolean;\r
}\r
\r
type ExtensionsIntent = { kind: "clicked" } | { kind: "toggle-neon" };\r
\r
function update(document: ExtensionsDocument, intent: ExtensionsIntent): ExtensionsDocument {\r
  switch (intent.kind) {\r
\r
    case "clicked":\r
      return { ...document, clickCount: document.clickCount + 1 };\r
\r
    case "toggle-neon": {\r
      const neonActive = !document.neonActive;\r
      // Scope 2: while the dark theme is active, every button (incl. DERIVED\r
      // parts like FancyButton), checkbox and card gets the neon restyle — one\r
      // extension reaching three different part kinds via the shared protocol.\r
      for (const name of NEON_PARTS) {\r
        if (neonActive) extendTheme("dark", name, neon as (definition: unknown) => unknown);\r
        else clearThemeExt("dark", name);\r
      }\r
      return { ...document, neonActive };\r
    }\r
  }\r
}\r
\r
function view(document: ExtensionsDocument) {\r
  return Stack("root", { gap: 16, pad: 48 }, [\r
\r
    Label("title", { text: "Wrap, don't edit", size: 20, weight: 600, bright: true }),\r
    Label("subtitle", { text: \`Clicks: \${document.clickCount}\`, dim: true }),\r
\r
    Row("buttons", { gap: 8 }, [\r
\r
      // A completely stock button, for comparison.\r
      Button("stock", { label: "Stock", press: { kind: "clicked" } }),\r
\r
      // Scope 1: the sheen is part of this part's definition now.\r
      FancyButton("fancy", { label: "Fancy (baked sheen)", press: { kind: "clicked" } }),\r
\r
      // Scope 3: outlined — but ONLY this element.\r
      withExt(\r
        Button("outlined-one", { label: "Outlined (this one only)", press: { kind: "clicked" } }),\r
        outlined),\r
\r
      // Scope 3 again: a bigger touch target for just this element.\r
      withExt(\r
        Button("chunky-one", { label: "Chunky", press: { kind: "clicked" } }),\r
        chunky),\r
    ]),\r
\r
    Row("theme-row", { gap: 14 }, [\r
      Label("theme-caption", { text: "Neon (theme scope — one restyle, three part kinds)", dim: true }),\r
      Toggle("neon-toggle", { on: document.neonActive, flip: { kind: "toggle-neon" } }),\r
    ]),\r
\r
    // A card and a checkbox, so the neon toggle demonstrably reaches part kinds\r
    // it was never written for — the SurfaceStyle protocol is what they share.\r
    Card("neon-card", { title: "Card", value: "surface" }, [\r
      Row("card-row", { gap: 10 }, [\r
        Checkbox("cb", { on: document.neonActive, label: "same protocol", toggle: { kind: "toggle-neon" } }),\r
      ]),\r
    ]),\r
\r
    Label("hint", {\r
      text: "Hover the fancy button — its sheen channel is an appended facet.",\r
      dim: true,\r
    }),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: { clickCount: 0, neonActive: false },\r
  update,\r
  view,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,N=h((e,n,t,r)=>{r(),n.box(e.rect,8,l(0,0,0,0),l(255,92,108,.9),1.5)}),P=e=>{const n=w({"fx/sheen":{target:t=>t.ch.hover||0,rate:6}})(e);return h((t,r,O,p)=>{p();const s=t.ch["fx/sheen"]||0;if(s>.02){const i=t.rect;r.box(k(i.x,i.y,i.w*s,3),1.5,g(l(255,255,255),.35*s))}})(n)},R=C((e,n,t)=>({x:t.x+16,y:Math.max(t.y,44)})),_=A((e,n,t,r)=>({...r,fill:e.mix(r.fill,e.accent2,.35+.3*n.hover),edge:e.mix(e.accent2,e.textBright,n.hover*.5),text:e.textBright})),I=["button","checkbox","card"],z=y("fancy-button",o,P);function F(e,n){switch(n.kind){case"clicked":return{...e,clickCount:e.clickCount+1};case"toggle-neon":{const t=!e.neonActive;for(const r of I)t?x("dark",r,_):b("dark",r);return{...e,neonActive:t}}}}function L(e){return f("root",{gap:16,pad:48},[a("title",{text:"Wrap, don't edit",size:20,weight:600,bright:!0}),a("subtitle",{text:`Clicks: ${e.clickCount}`,dim:!0}),c("buttons",{gap:8},[o("stock",{label:"Stock",press:{kind:"clicked"}}),z("fancy",{label:"Fancy (baked sheen)",press:{kind:"clicked"}}),d(o("outlined-one",{label:"Outlined (this one only)",press:{kind:"clicked"}}),N),d(o("chunky-one",{label:"Chunky",press:{kind:"clicked"}}),R)]),c("theme-row",{gap:14},[a("theme-caption",{text:"Neon (theme scope — one restyle, three part kinds)",dim:!0}),v("neon-toggle",{on:e.neonActive,flip:{kind:"toggle-neon"}})]),S("neon-card",{title:"Card",value:"surface"},[c("card-row",{gap:10},[E("cb",{on:e.neonActive,label:"same protocol",toggle:{kind:"toggle-neon"}})])]),a("hint",{text:"Hover the fancy button — its sheen channel is an appended facet.",dim:!0})])}const D=document.getElementById("c");u(D,{init:{clickCount:0,neonActive:!1},update:F,view:L});m([{name:"main.ts",code:B},{name:"widgets.ts (shared)",code:T}]);
