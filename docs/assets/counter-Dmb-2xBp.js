import{p as s,m as o,S as a,L as i,P as c,v as l}from"./runtime-BaMoeUMO.js";import{a as u}from"./source-panel-CSqvtNlY.js";const h=`// ============================================================================\r
// Example: counter — the "Hello, Gratify" application.\r
//\r
// What to look for when you run it:\r
//   • The button brightens and lifts when you hover it, and sinks when you\r
//     press it — yet this file contains NO animation code. The style function\r
//     below reads \`channels.hover\` and \`channels.press\`, which are numbers the\r
//     runtime continuously eases between 0 and 1. Everything computed from\r
//     them animates automatically.\r
//   • There is no event-listener plumbing. The Press interactor declares WHAT\r
//     intent a click means; the runtime does the rest.\r
// ============================================================================\r
\r
import {\r
  mount,          // starts an application on a canvas\r
  part,           // defines a widget: size + style + render + behavior in one place\r
  Press,          // an interactor: "when clicked, emit this intent"\r
  Stack, Label,   // built-in layout container and text widget\r
  v,              // 2D vector constructor: v(x, y)\r
  Tokens,         // the theme's named design values (colors)\r
  Channels,       // the animated channel values on a widget (hover, press, …)\r
  Color,\r
} from "gratify";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── Step 1. Application state ────────────────────────────────────────────────\r
//\r
// The "Doc" is plain immutable data that you own entirely. It knows nothing\r
// about pixels, hover states, or widgets.\r
\r
interface CounterDocument {\r
  clickCount: number;\r
}\r
\r
// An Intent is a small typed message describing a change the UI would like to\r
// make. Intents are the ONLY way state changes.\r
\r
type CounterIntent = { kind: "increment" };\r
\r
// The update function is the single place where state changes. It is a pure\r
// function: given the old document and an intent, it returns the new document.\r
\r
function update(document: CounterDocument, intent: CounterIntent): CounterDocument {\r
  if (intent.kind === "increment") {\r
    return { clickCount: document.clickCount + 1 };\r
  }\r
  return document;\r
}\r
\r
// ── Step 2. A custom widget (a "part") ───────────────────────────────────────\r
//\r
// A part bundles everything about button-ness into one definition:\r
// how big it is, what it looks like, how it draws, and how it behaves.\r
\r
interface ButtonProps {\r
  label: string;\r
  press: CounterIntent;   // the intent to emit when the button is clicked\r
}\r
\r
// The style function computes a flat record of resolved visual values.\r
// Declaring its shape keeps the render function honest: render may read\r
// only what style produced.\r
\r
interface ButtonStyle {\r
  fill: Color;\r
  cornerRadius: number;\r
  lift: number;           // vertical offset in pixels (hover raises, press sinks)\r
  text: Color;\r
}\r
\r
const Button = part<ButtonProps, ButtonStyle>("button", {\r
\r
  // SIZE — how big the button wants to be: wide enough for its label.\r
  size(props, measure) {\r
    const labelWidth = measure.text(props.label).x;\r
    return v(labelWidth + 28, 34);\r
  },\r
\r
  // STYLE — tokens (theme colors) + channels (animated 0..1 values) → visuals.\r
  //\r
  // \`channels.hover\` eases toward 1 while the pointer is over the button and\r
  // back toward 0 when it leaves. Because \`emphasis\` is computed from it,\r
  // the fill color fades smoothly in both directions — for free.\r
  style(tokens: Tokens, channels: Channels): ButtonStyle {\r
    const emphasis = 0.2 + 0.3 * channels.hover + 0.4 * channels.press;\r
    return {\r
      fill: tokens.mix(tokens.surface, tokens.accent, emphasis),\r
      cornerRadius: 8,\r
      lift: 2 * channels.hover - 2 * channels.press,\r
      text: tokens.text,\r
    };\r
  },\r
\r
  // RENDER — a dumb painter. It reads only the rect and the resolved style.\r
  render(node, painter, style) {\r
    const raisedRect = node.rect.raise(style.lift);\r
    painter.box(raisedRect, style.cornerRadius, style.fill);\r
    painter.label(node.props.label, raisedRect.center, style.text, { weight: 500 });\r
  },\r
\r
  // BEHAVIOR — interactors as values. Press emits the caller's intent.\r
  on: [\r
    Press((node) => node.props.press),\r
  ],\r
});\r
\r
// ── Step 3. The view: a pure function from Doc to an Element tree ────────────\r
//\r
// Called only when state changes. Elements are cheap descriptions; the runtime\r
// matches them to its retained scene BY KEY, which is how animation state\r
// survives across rebuilds.\r
\r
function view(document: CounterDocument) {\r
  return Stack("root", { gap: 12, pad: 48 }, [\r
\r
    Label("message", {\r
      text: \`Clicked \${document.clickCount} times\`,\r
      size: 15,\r
    }),\r
\r
    Button("increment-button", {\r
      label: "Click me",\r
      press: { kind: "increment" },\r
    }),\r
  ]);\r
}\r
\r
// ── Step 4. Mount ─────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: { clickCount: 0 },\r
  update,\r
  view,\r
});\r
\r
// (This last line just feeds the source viewer on the right.)\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`;function d(e,n){return n.kind==="increment"?{clickCount:e.clickCount+1}:e}const m=s("button",{size(e,n){const t=n.text(e.label).x;return l(t+28,34)},style(e,n){const t=.2+.3*n.hover+.4*n.press;return{fill:e.mix(e.surface,e.accent,t),cornerRadius:8,lift:2*n.hover-2*n.press,text:e.text}},render(e,n,t){const r=e.rect.raise(t.lift);n.box(r,t.cornerRadius,t.fill),n.label(e.props.label,r.center,t.text,{weight:500})},on:[c(e=>e.props.press)]});function p(e){return a("root",{gap:12,pad:48},[i("message",{text:`Clicked ${e.clickCount} times`,size:15}),m("increment-button",{label:"Click me",press:{kind:"increment"}})])}const f=document.getElementById("c");o(f,{init:{clickCount:0},update:d,view:p});u([{name:"main.ts",code:h}]);
