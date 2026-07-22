import{P as f,m as y,S as b,L as l,R as h}from"./runtime-BQ2Zsp_3.js";import{h as k,T as g,S as v,C as x,w as c,B as p,m as w}from"./widgets-xXDkx298.js";import{a as E}from"./source-panel-CSqvtNlY.js";import{w as S}from"./widgets-BJYGvrkn.js";const L=`// ============================================================================\r
// Example: global effects — ordinary controls, one effect over all of them.\r
//\r
// The controls here (Button, Toggle, Slider, Checkbox) are the STOCK shared\r
// widgets, written the normal way — none of them knows anything about the\r
// effects below. The juice is layered on GLOBALLY by wrapping every control\r
// with two extensions ("wrap, don't edit"):\r
//\r
//   • quake   — press any BUTTON and the whole panel shudders, then the tremor\r
//               decays away to nothing. The shake is a mapRender that translates\r
//               each control by a jitter whose amplitude is exp(-t) since the\r
//               last press; a button just appends a behavior that stamps the\r
//               press time.\r
//   • magnify — mapRender scales a control up as the cursor nears its center,\r
//               a fisheye that follows the pointer. A toggle turns it on.\r
//\r
// Both effects read only public capabilities (node.time, node.pointer, the\r
// painter transform), so the same wrapper works on any widget — including the\r
// magnify toggle itself. That's the whole point: the effect is a function of a\r
// part definition, applied to all of them.\r
// ============================================================================\r
\r
import {\r
  addOn, Element, mapRender, mount, PartExt, Press, Row, Stack, Label, withExt,\r
} from "gratify";\r
import { Button, Checkbox, Slider, Toggle } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
const PEAK = 6;        // px — the shake amplitude at the instant of a press\r
const DECAY = 3.5;     // per second — how fast the tremor dies away\r
\r
// ── The two global effects (each an ordinary PartExt) ─────────────────────────\r
\r
/** A stable per-node phase so controls shake out of sync (not in lockstep). */\r
const phase = (key: string) => {\r
  let h = 0;\r
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000;\r
  return h;\r
};\r
\r
/** Trembles a control after a press, decaying to nothing. \`lastQuake\` is the\r
 *  GNode.time of the last button press; amplitude is PEAK·e^(−DECAY·elapsed),\r
 *  so once it fades below a pixel this is a plain passthrough. */\r
const quake = (lastQuake: number): PartExt =>\r
  mapRender((node, paint, _style, base) => {\r
    const t = node.time ?? 0;\r
    const amp = PEAK * Math.exp(-DECAY * (t - lastQuake));\r
    if (amp < 0.05) { base(); return; }\r
    const ph = phase(node.key);\r
    const dx = Math.sin(t * 40 + ph) * amp;\r
    const dy = Math.cos(t * 34 + ph * 1.7) * amp;\r
    paint.push();\r
    paint.translate(dx, dy);\r
    base();\r
    paint.pop();\r
  });\r
\r
/** Scales a control up as the cursor nears its center — a pointer-following\r
 *  fisheye. \`on\` (0..1) fades the whole effect in and out. */\r
const magnify = (on: number): PartExt =>\r
  mapRender((node, paint, _style, base) => {\r
    const ptr = node.pointer;\r
    if (!ptr || on < 0.02) { base(); return; }\r
    const c = node.rect.center;\r
    const d = Math.hypot(ptr.x - c.x, ptr.y - c.y);\r
    const near = Math.max(0, 1 - d / 150);              // 1 at the center, 0 past 150px\r
    const s = 1 + 0.4 * near * near * on;\r
    paint.push();\r
    paint.scaleAt(c.x, c.y, s);\r
    base();\r
    paint.pop();\r
  });\r
\r
/** Appended to the buttons only: stamps the press time so the panel quakes.\r
 *  All appended press behaviors run, so the button's own click still fires. */\r
const triggersQuake = addOn(Press((node) => ({ kind: "quake", time: node.time ?? 0 })));\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
interface Doc {\r
  lastQuake: number;   // GNode.time of the last button press\r
  magnify: boolean;\r
  // a few ordinary controls, present just to be affected by the effects\r
  power: boolean;\r
  volume: number;\r
  agree: boolean;\r
  clicks: number;\r
}\r
\r
type Intent =\r
  | { kind: "quake"; time: number }\r
  | { kind: "magnify" }\r
  | { kind: "power" }\r
  | { kind: "volume"; value: number }\r
  | { kind: "agree" }\r
  | { kind: "click" };\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "quake": return { ...doc, lastQuake: intent.time };\r
    case "magnify": return { ...doc, magnify: !doc.magnify };\r
    case "power": return { ...doc, power: !doc.power };\r
    case "volume": return { ...doc, volume: intent.value };\r
    case "agree": return { ...doc, agree: !doc.agree };\r
    case "click": return { ...doc, clicks: doc.clicks + 1 };\r
  }\r
}\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
function view(doc: Doc): Element {\r
  // The global effects, resolved for this frame. Every control gets both — the\r
  // effect is decided ONCE here, not per widget.\r
  const magOn = doc.magnify ? 1 : 0;\r
  const fx = (el: Element): Element => withExt(el, magnify(magOn), quake(doc.lastQuake));\r
\r
  // \`press\` makes the caption clickable (clicking "Power" flips Power).\r
  const rowLabel = (key: string, text: string, control: Element, press?: Intent): Element =>\r
    Row(key, { gap: 16, align: "center" }, [\r
      press === undefined\r
        ? Label(\`\${key}/l\`, { text, dim: true, size: 12 })\r
        : withExt(Label(\`\${key}/l\`, { text, dim: true, size: 12 }), addOn(Press(() => press))),\r
      fx(control),\r
    ]);\r
\r
  return Stack("root", { gap: 16, pad: 44 }, [\r
    Label("title", { text: "Global effects", size: 22, weight: 700, bright: true }),\r
    Label("sub", { text: "Stock controls, written normally. Two effects wrapped over ALL of them — nothing was edited.", dim: true, size: 12 }),\r
\r
    rowLabel("mag", "Magnify (hover the controls)",\r
      Toggle("mag/t", { on: doc.magnify, flip: { kind: "magnify" } }), { kind: "magnify" }),\r
\r
    Label("divider", { text: "— ordinary controls —", dim: true, size: 11 }),\r
\r
    rowLabel("power", "Power",\r
      Toggle("power/t", { on: doc.power, flip: { kind: "power" } }), { kind: "power" }),\r
    rowLabel("volume", "Volume",\r
      Slider("volume/s", { value: doc.volume, set: (value) => ({ kind: "volume", value }) })),\r
    rowLabel("agree", "Agree",\r
      Checkbox("agree/c", { on: doc.agree, toggle: { kind: "agree" } }), { kind: "agree" }),\r
\r
    // Press a button → the whole panel quakes, then settles. The stock Button is\r
    // untouched; a \`triggersQuake\` behavior is appended at its use site.\r
    Row("buttons", { gap: 12 }, [\r
      fx(withExt(Button("save", { label: "Save", accent: true, press: { kind: "click" } }), triggersQuake)),\r
      fx(withExt(Button("cancel", { label: "Cancel", press: { kind: "click" } }), triggersQuake)),\r
      fx(withExt(Button("delete", { label: "Delete", danger: true, press: { kind: "click" } }), triggersQuake)),\r
    ]),\r
\r
    Label("hint", {\r
      text: \`Press a button to shake the panel · toggle Magnify and move the mouse · clicks \${doc.clicks}\`,\r
      dim: true, size: 11,\r
    }),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: { lastQuake: -999, magnify: true, power: true, volume: 0.6, agree: false, clicks: 0 },\r
  update,\r
  view,\r
  // The quake is a function of the clock, which the rest-detector can't see;\r
  // keep the loop awake while the tremor is still perceptible, then let it sleep.\r
  ambient: (doc, time) => time - doc.lastQuake < 1.6,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,P=6,T=e=>{let n=0;for(let t=0;t<e.length;t++)n=(n*31+e.charCodeAt(t))%1e3;return n},A=e=>w((n,t,i,r)=>{const a=n.time??0,o=P*Math.exp(-3.5*(a-e));if(o<.05){r();return}const s=T(n.key),u=Math.sin(a*40+s)*o,d=Math.cos(a*34+s*1.7)*o;t.push(),t.translate(u,d),r(),t.pop()}),Q=e=>w((n,t,i,r)=>{const a=n.pointer;if(!a||e<.02){r();return}const o=n.rect.center,s=Math.hypot(a.x-o.x,a.y-o.y),u=Math.max(0,1-s/150),d=1+.4*u*u*e;t.push(),t.scaleAt(o.x,o.y,d),r(),t.pop()}),m=k(f(e=>({kind:"quake",time:e.time??0})));function M(e,n){switch(n.kind){case"quake":return{...e,lastQuake:n.time};case"magnify":return{...e,magnify:!e.magnify};case"power":return{...e,power:!e.power};case"volume":return{...e,volume:n.value};case"agree":return{...e,agree:!e.agree};case"click":return{...e,clicks:e.clicks+1}}}function C(e){const n=e.magnify?1:0,t=r=>c(r,Q(n),A(e.lastQuake)),i=(r,a,o,s)=>h(r,{gap:16,align:"center"},[s===void 0?l(`${r}/l`,{text:a,dim:!0,size:12}):c(l(`${r}/l`,{text:a,dim:!0,size:12}),k(f(()=>s))),t(o)]);return b("root",{gap:16,pad:44},[l("title",{text:"Global effects",size:22,weight:700,bright:!0}),l("sub",{text:"Stock controls, written normally. Two effects wrapped over ALL of them — nothing was edited.",dim:!0,size:12}),i("mag","Magnify (hover the controls)",g("mag/t",{on:e.magnify,flip:{kind:"magnify"}}),{kind:"magnify"}),l("divider",{text:"— ordinary controls —",dim:!0,size:11}),i("power","Power",g("power/t",{on:e.power,flip:{kind:"power"}}),{kind:"power"}),i("volume","Volume",v("volume/s",{value:e.volume,set:r=>({kind:"volume",value:r})})),i("agree","Agree",x("agree/c",{on:e.agree,toggle:{kind:"agree"}}),{kind:"agree"}),h("buttons",{gap:12},[t(c(p("save",{label:"Save",accent:!0,press:{kind:"click"}}),m)),t(c(p("cancel",{label:"Cancel",press:{kind:"click"}}),m)),t(c(p("delete",{label:"Delete",danger:!0,press:{kind:"click"}}),m))]),l("hint",{text:`Press a button to shake the panel · toggle Magnify and move the mouse · clicks ${e.clicks}`,dim:!0,size:11})])}const B=document.getElementById("c");y(B,{init:{lastQuake:-999,magnify:!0,power:!0,volume:.6,agree:!1,clicks:0},update:M,view:C,ambient:(e,n)=>n-e.lastQuake<1.6});E([{name:"main.ts",code:L},{name:"widgets.ts (shared)",code:S}]);
