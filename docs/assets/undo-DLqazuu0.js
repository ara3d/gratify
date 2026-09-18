import{p as u,m as h,S as l,L as a,R as o,h as d,v as c}from"./runtime-DNEt0yeT.js";import{w as p}from"./middleware-DnFxgLOc.js";import{B as t}from"./widgets-BUxxEPAc.js";import{a as m}from"./source-panel-CSqvtNlY.js";const f=`// ============================================================================\r
// Example: undo — app-wide policies as update middleware.\r
//\r
// What to look for when you run it:\r
//   • This app knows NOTHING about history. Its update function below handles\r
//     add / remove / shuffle, nothing else. The single call \`withUndo(app)\` at\r
//     the bottom wraps it, adding {kind:"undo"} / {kind:"redo"} handling and\r
//     the past/present/future bookkeeping.\r
//   • Delete a dot, then press Undo: the dot pops back in through its ENTER\r
//     animation. To Gratify, undo is just another state change — so it\r
//     animates like every other state change.\r
//   • Press Shuffle: the hues cross-fade rather than snapping, because each\r
//     dot declares a \`hue\` CHANNEL that chases its prop.\r
// ============================================================================\r
\r
import {\r
  mount,\r
  part,\r
  withUndo,       // the middleware: AppSpec → undoable AppSpec\r
  hsl,            // hue/saturation/lightness → Color\r
  Stack, Row, Label,\r
  v,\r
  GNode,\r
} from "gratify";\r
import { Button } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface ColoredDot {\r
  id: string;\r
  hue: number;    // 0..360\r
}\r
\r
interface DotsDocument {\r
  dots: ColoredDot[];\r
  nextIdNumber: number;\r
}\r
\r
type DotsIntent =\r
  | { kind: "add" }\r
  | { kind: "remove-last" }\r
  | { kind: "shuffle" };\r
// Note: "undo" and "redo" are NOT here — withUndo adds them.\r
\r
function update(document: DotsDocument, intent: DotsIntent): DotsDocument {\r
  switch (intent.kind) {\r
\r
    case "add": {\r
      const newDot: ColoredDot = {\r
        id: \`dot-\${document.nextIdNumber}\`,\r
        hue: (document.nextIdNumber * 47) % 360,   // spread hues around the wheel\r
      };\r
      return {\r
        nextIdNumber: document.nextIdNumber + 1,\r
        dots: [...document.dots, newDot],\r
      };\r
    }\r
\r
    case "remove-last":\r
      return { ...document, dots: document.dots.slice(0, -1) };\r
\r
    case "shuffle":\r
      return {\r
        ...document,\r
        dots: document.dots.map((dot) => ({ ...dot, hue: (dot.hue + 120) % 360 })),\r
      };\r
  }\r
}\r
\r
// ── A dot widget with a declared channel ──────────────────────────────────────\r
//\r
// The \`hue\` channel chases the prop at a gentle rate, so when shuffle (or\r
// un-shuffle, via undo!) changes the prop, the drawn color eases over.\r
\r
interface DotProps {\r
  hue: number;\r
}\r
\r
const ColorDot = part<DotProps>("color-dot", {\r
\r
  size: () => v(26, 26),\r
\r
  channels: {\r
    hue: {\r
      target: (node: GNode<DotProps>) => node.props.hue,\r
      rate: 8,                       // exponential ease — no overshoot for color\r
    },\r
  },\r
\r
  render(node, painter) {\r
    const animatedHue = node.ch.hue;\r
    const glowAmount = 6 + 6 * node.ch.hover;\r
    const radius = 11 + 2 * node.ch.hover;\r
\r
    painter.glow(hsl(animatedHue, 0.8, 0.6), glowAmount, () =>\r
      painter.dot(node.rect.center, radius, hsl(animatedHue, 0.8, 0.62)));\r
  },\r
});\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
function view(document: DotsDocument) {\r
  return Stack("root", { gap: 16, pad: 48 }, [\r
\r
    Label("title", { text: "Undoable dots", size: 20, weight: 600, bright: true }),\r
\r
    Row("toolbar", { gap: 8 }, [\r
      Button("add", { label: "+ Dot", press: { kind: "add" }, accent: true }),\r
      Button("remove", { label: "Remove", press: { kind: "remove-last" }, danger: true }),\r
      Button("shuffle", { label: "Shuffle hues", press: { kind: "shuffle" } }),\r
    ]),\r
\r
    // The dots themselves — keyed by id, so enter/exit animations work.\r
    Row("dots", { gap: 8 },\r
      document.dots.map((dot) => ColorDot(dot.id, { hue: dot.hue }))),\r
\r
    // These buttons dispatch intents the app's update never sees:\r
    // withUndo intercepts them and walks the history instead.\r
    Row("history", { gap: 8 }, [\r
      Button("undo", { label: "⟲ Undo", press: { kind: "undo" } }),\r
      Button("redo", { label: "⟳ Redo", press: { kind: "redo" } }),\r
    ]),\r
\r
    Label("hint", {\r
      text: "Delete a dot, then undo — it pops back in through its enter animation.",\r
      dim: true,\r
    }),\r
  ]);\r
}\r
\r
// ── Mount — note the one-word difference: withUndo( … ) ──────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, withUndo({\r
  init: {\r
    dots: [\r
      { id: "dot-a", hue: 10 },\r
      { id: "dot-b", hue: 130 },\r
      { id: "dot-c", hue: 250 },\r
    ],\r
    nextIdNumber: 0,\r
  },\r
  update,\r
  view,\r
}));\r
\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`;function b(e,n){switch(n.kind){case"add":{const r={id:`dot-${e.nextIdNumber}`,hue:e.nextIdNumber*47%360};return{nextIdNumber:e.nextIdNumber+1,dots:[...e.dots,r]}}case"remove-last":return{...e,dots:e.dots.slice(0,-1)};case"shuffle":return{...e,dots:e.dots.map(r=>({...r,hue:(r.hue+120)%360}))}}}const w=u("color-dot",{size:()=>c(26,26),channels:{hue:{target:e=>e.props.hue,rate:8}},render(e,n){const r=e.ch.hue,s=6+6*e.ch.hover,i=11+2*e.ch.hover;n.glow(d(r,.8,.6),s,()=>n.dot(e.rect.center,i,d(r,.8,.62)))}});function g(e){return l("root",{gap:16,pad:48},[a("title",{text:"Undoable dots",size:20,weight:600,bright:!0}),o("toolbar",{gap:8},[t("add",{label:"+ Dot",press:{kind:"add"},accent:!0}),t("remove",{label:"Remove",press:{kind:"remove-last"},danger:!0}),t("shuffle",{label:"Shuffle hues",press:{kind:"shuffle"}})]),o("dots",{gap:8},e.dots.map(n=>w(n.id,{hue:n.hue}))),o("history",{gap:8},[t("undo",{label:"⟲ Undo",press:{kind:"undo"}}),t("redo",{label:"⟳ Redo",press:{kind:"redo"}})]),a("hint",{text:"Delete a dot, then undo — it pops back in through its enter animation.",dim:!0})])}const k=document.getElementById("c");h(k,p({init:{dots:[{id:"dot-a",hue:10},{id:"dot-b",hue:130},{id:"dot-c",hue:250}],nextIdNumber:0},update:b,view:g}));m([{name:"main.ts",code:f}]);
