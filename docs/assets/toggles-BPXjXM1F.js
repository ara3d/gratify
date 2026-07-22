import{P as m,y as w,m as f,S as v,L as d,s as S,t as b,c as x,v as y,R as T}from"./runtime-BQ2Zsp_3.js";import{h as u,w as l,T as p,S as h,C as c,m as E}from"./widgets-xXDkx298.js";import{b as G}from"./effects-Cqw43Sha.js";import{a as P}from"./source-panel-CSqvtNlY.js";import{w as R}from"./widgets-BJYGvrkn.js";const L=`// ============================================================================\r
// Example: toggles — custom widgets, springs, and a live theme cross-fade.\r
//\r
// What to look for when you run it:\r
//   • The toggle knob OVERSHOOTS when it lands: its travel is a spring\r
//     channel (see Toggle in widgets.ts), so it has momentum.\r
//   • The slider knob glides to wherever the model says the value is — even\r
//     when the change didn't come from the mouse.\r
//   • Flip "Light theme": every color on screen cross-fades. That is not a\r
//     feature of this file — token values ease like every other channel.\r
//   • "Sparks" demonstrates a USE-SITE EXTENSION (composition scope 3): an\r
//     effects-only press behavior appended to stock widgets that never\r
//     planned for it.\r
// ============================================================================\r
\r
import {\r
  addOn,                    // extension helper: append interactors to a part\r
  burst,                    // stock particle effect\r
  calpha,\r
  Element,\r
  mapRender,                // extension helper: wrap a part's render\r
  mount,\r
  PartExt,                  // the extension type: PartDef → PartDef\r
  Press,\r
  setTheme, themeName,      // live theme switching\r
  tokens,\r
  Stack, Row, Label,\r
  v,\r
  withExt,                  // apply an extension to ONE element (use site)\r
} from "gratify";\r
import { Slider, Toggle, Checkbox } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
// ── A use-site extension ──────────────────────────────────────────────────────\r
//\r
// \`sparks\` appends a Press behavior that spawns a particle burst and returns\r
// null (meaning: no intent — effects only). ALL appended press behaviors run,\r
// so the widget's own click handling is untouched.\r
\r
const sparks: PartExt = addOn(\r
  Press((node) => {\r
    node.spawn?.(burst(node.pointer ?? node.rect.center, tokens.accent));\r
    return null;\r
  }),\r
);\r
\r
// \`gridBackdrop\` wraps the root's render: a dot grid drawn UNDER the content.\r
// The root carries \`states: { grid }\`, and a state tag automatically becomes an\r
// animated channel — so flipping "Grid" cross-fades the dots in and out.\r
const gridBackdrop: PartExt = mapRender((node, paint, _style, base) => {\r
  const amount = node.ch.grid ?? 0;\r
  if (amount > 0.01) {\r
    const G = 28, r = node.rect;\r
    const dot = calpha(tokens.muted, 0.35 * Math.min(1, amount));\r
    for (let x = r.x + G / 2; x < r.right; x += G)\r
      for (let y = r.y + G / 2; y < r.bottom; y += G) paint.dot(v(x, y), 1, dot);\r
  }\r
  base();\r
});\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface SettingsDocument {\r
  power: boolean;\r
  volume: number;           // 0..1\r
  glow: number;             // 0..1\r
  options: { sparks: boolean; grid: boolean };\r
  lightTheme: boolean;\r
}\r
\r
type SettingsIntent =\r
  | { kind: "toggle-power" }\r
  | { kind: "set-volume"; value: number }\r
  | { kind: "set-glow"; value: number }\r
  | { kind: "toggle-option"; which: "sparks" | "grid" }\r
  | { kind: "toggle-theme" };\r
\r
function update(document: SettingsDocument, intent: SettingsIntent): SettingsDocument {\r
  switch (intent.kind) {\r
\r
    case "toggle-power":\r
      return { ...document, power: !document.power };\r
\r
    case "set-volume":\r
      return { ...document, volume: intent.value };\r
\r
    case "set-glow":\r
      return { ...document, glow: intent.value };\r
\r
    case "toggle-option":\r
      return {\r
        ...document,\r
        options: { ...document.options, [intent.which]: !document.options[intent.which] },\r
      };\r
\r
    case "toggle-theme": {\r
      // setTheme retargets the live tokens; every style function reads tokens\r
      // every frame, so the whole UI cross-fades to the new palette.\r
      setTheme(themeName === "dark" ? "light" : "dark");\r
      return { ...document, lightTheme: !document.lightTheme };\r
    }\r
  }\r
}\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
/** A labeled settings row: caption on the left, widget on the right. Pass\r
 *  \`press\` to make the caption clickable (clicking "Grid" should toggle Grid) —\r
 *  the same use-site extension mechanism this example demonstrates. */\r
function settingsRow(key: string, caption: string, widget: Element, press?: unknown): Element {\r
  const caption_ = Label(\`\${key}/caption\`, { text: caption, dim: true });\r
  return Row(key, { gap: 14 }, [\r
    press === undefined ? caption_ : withExt(caption_, addOn(Press(() => press))),\r
    widget,\r
  ]);\r
}\r
\r
function view(document: SettingsDocument) {\r
\r
  // When Sparks is enabled, wrap each clickable widget with the extension —\r
  // at its use site, per element, without touching the widget definitions.\r
  const withSparks = (element: Element): Element =>\r
    document.options.sparks ? withExt(element, sparks) : element;\r
\r
  // The root carries the grid state tag and the backdrop extension: flipping\r
  // "Grid" eases \`ch.grid\`, and the wrapped render fades the dots.\r
  return withExt(Stack("root", { gap: 14, pad: 48, states: { grid: document.options.grid } }, [\r
\r
    Label("title", { text: "Widgets", size: 20, weight: 600, bright: true }),\r
\r
    settingsRow("power", "Power",\r
      withSparks(Toggle("widget", { on: document.power, flip: { kind: "toggle-power" } })),\r
      { kind: "toggle-power" }),\r
\r
    settingsRow("volume", "Volume",\r
      Slider("widget", { value: document.volume, set: (value) => ({ kind: "set-volume", value }) })),\r
\r
    settingsRow("glow", "Glow",\r
      Slider("widget", { value: document.glow, set: (value) => ({ kind: "set-glow", value }) })),\r
\r
    settingsRow("sparks", "Sparks",\r
      withSparks(Checkbox("widget", { on: document.options.sparks, toggle: { kind: "toggle-option", which: "sparks" } })),\r
      { kind: "toggle-option", which: "sparks" }),\r
\r
    settingsRow("grid", "Grid",\r
      withSparks(Checkbox("widget", { on: document.options.grid, toggle: { kind: "toggle-option", which: "grid" } })),\r
      { kind: "toggle-option", which: "grid" }),\r
\r
    settingsRow("theme", "Light theme",\r
      withSparks(Toggle("widget", { on: document.lightTheme, flip: { kind: "toggle-theme" } })),\r
      { kind: "toggle-theme" }),\r
\r
    Label("hint", {\r
      text: "Sparks = a press extension appended to stock widgets · Grid = a render extension wrapped on the root.",\r
      dim: true,\r
    }),\r
  ]), gridBackdrop);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: {\r
    power: true,\r
    volume: 0.6,\r
    glow: 0.25,\r
    options: { sparks: true, grid: false },\r
    lightTheme: false,\r
  },\r
  update,\r
  view,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,O=u(m(e=>{var t;return(t=e.spawn)==null||t.call(e,G(e.pointer??e.rect.center,w.accent)),null})),D=E((e,t,n,s)=>{const o=e.ch.grid??0;if(o>.01){const i=e.rect,k=x(w.muted,.35*Math.min(1,o));for(let a=i.x+28/2;a<i.right;a+=28)for(let g=i.y+28/2;g<i.bottom;g+=28)t.dot(y(a,g),1,k)}s()});function I(e,t){switch(t.kind){case"toggle-power":return{...e,power:!e.power};case"set-volume":return{...e,volume:t.value};case"set-glow":return{...e,glow:t.value};case"toggle-option":return{...e,options:{...e.options,[t.which]:!e.options[t.which]}};case"toggle-theme":return S(b==="dark"?"light":"dark"),{...e,lightTheme:!e.lightTheme}}}function r(e,t,n,s){const o=d(`${e}/caption`,{text:t,dim:!0});return T(e,{gap:14},[s===void 0?o:l(o,u(m(()=>s))),n])}function N(e){const t=n=>e.options.sparks?l(n,O):n;return l(v("root",{gap:14,pad:48,states:{grid:e.options.grid}},[d("title",{text:"Widgets",size:20,weight:600,bright:!0}),r("power","Power",t(p("widget",{on:e.power,flip:{kind:"toggle-power"}})),{kind:"toggle-power"}),r("volume","Volume",h("widget",{value:e.volume,set:n=>({kind:"set-volume",value:n})})),r("glow","Glow",h("widget",{value:e.glow,set:n=>({kind:"set-glow",value:n})})),r("sparks","Sparks",t(c("widget",{on:e.options.sparks,toggle:{kind:"toggle-option",which:"sparks"}})),{kind:"toggle-option",which:"sparks"}),r("grid","Grid",t(c("widget",{on:e.options.grid,toggle:{kind:"toggle-option",which:"grid"}})),{kind:"toggle-option",which:"grid"}),r("theme","Light theme",t(p("widget",{on:e.lightTheme,flip:{kind:"toggle-theme"}})),{kind:"toggle-theme"}),d("hint",{text:"Sparks = a press extension appended to stock widgets · Grid = a render extension wrapped on the root.",dim:!0})]),D)}const B=document.getElementById("c");f(B,{init:{power:!0,volume:.6,glow:.25,options:{sparks:!0,grid:!1},lightTheme:!1},update:I,view:N});P([{name:"main.ts",code:L},{name:"widgets.ts (shared)",code:R}]);
