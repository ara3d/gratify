import{p as m,v as a,c as h,r as c,h as v,x as f,m as y,y as w,d as l,S as b,L as p}from"./runtime-BaMoeUMO.js";import{a as C}from"./source-panel-CSqvtNlY.js";const S=`// ============================================================================\r
// Example: island — a DOM element glued to a world-space rect (guide §5e).\r
//\r
// Text is the one place a canvas UI should surrender to the browser: caret,\r
// selection, IME, clipboard. The \`island\` facet does the surrendering without\r
// giving up the world: a part reports { el, rect } each frame, and the runtime\r
// pins the element over that rect through every pan and zoom with a single\r
// top-left-origin translate+scale. The element keeps its WORLD size and the\r
// transform scales it, so text wraps identically at every zoom level.\r
//\r
// The card below is an ordinary draggable part; its text field is a real\r
// <input> riding an island. Drag the card, pan the grid, zoom the wheel —\r
// the input tracks like paint, and typing works the whole time (the runtime\r
// ignores window keys aimed at editable DOM). The input dispatches on every\r
// keystroke, and \`AppSpec.onCommit\` — the embedding seam — reports each\r
// committed doc change to the status line at the bottom.\r
// ============================================================================\r
\r
import {\r
  at, calpha, Free, hsl, Label, mount, Pan, part, rect, Stack, v, Vec,\r
} from "gratify";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface Doc { pos: Vec; text: string; }\r
\r
type Intent =\r
  | { kind: "move"; pos: Vec }\r
  | { kind: "text"; text: string };\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "move": return { ...doc, pos: intent.pos };\r
    case "text": return { ...doc, text: intent.text };\r
  }\r
}\r
\r
// ── The island element — created ONCE; identity is stable across frames. ──────\r
\r
const input = document.createElement("input");\r
input.value = "type while the world moves";\r
input.spellcheck = false;\r
input.style.cssText =\r
  "box-sizing:border-box;border:1px solid #4a5268;border-radius:6px;" +\r
  "background:#191c26;color:#e8ecf6;padding:0 9px;font:13px 'Segoe UI',system-ui;" +\r
  "outline:none;";\r
input.addEventListener("focus", () => (input.style.borderColor = "#40baff"));\r
input.addEventListener("blur", () => (input.style.borderColor = "#4a5268"));\r
\r
// ── The card — a draggable part whose text field is the island. ───────────────\r
\r
interface CardProps { pos: Vec; text: string; }\r
\r
const Card = part("card")\r
  .props<CardProps>()\r
  .size(() => v(250, 108))\r
  .style((t, ch) => ({\r
    fill: t.mix(t.surface, t.surfaceHi, 0.35 * ch.hover + 0.5 * ch.drag),\r
    edge: t.mix(t.muted, t.accent, 0.5 * ch.hover + 0.5 * ch.drag),\r
    text: t.text,\r
    dim: calpha(t.text, 0.55),\r
    lift: 3 * ch.drag,\r
  }))\r
  .render((node, paint, s) => {\r
    const r = node.rect.raise(s.lift);\r
    paint.box(r, 10, s.fill, s.edge, 1.2);\r
    paint.box(rect(r.x, r.y, r.w, 6), 3, hsl(203, 0.7, 0.55));   // header stripe\r
    paint.label("island card — drag me", v(r.x + 12, r.y + 22), s.text, { align: "left", weight: 600, size: 13 });\r
    // The canvas reads the SAME doc the input writes — the round trip is live.\r
    paint.label(\`canvas sees: \${node.props.text}\`, v(r.x + 12, r.bottom - 14), s.dim, { align: "left", size: 11 });\r
  })\r
  // The facet: the input lives over this world rect. That's the whole API.\r
  .island((node) => ({\r
    el: input,\r
    rect: rect(node.rect.x + 12, node.rect.y + 34, node.rect.w - 24, 28),\r
  }))\r
  .gesture({\r
    begin: (node, p) => ({ grab: v(p.x - node.props.pos.x, p.y - node.props.pos.y) }),\r
    during: (s, _node, p): Intent => ({ kind: "move", pos: v(p.x - s.grab.x, p.y - s.grab.y) }),\r
  });\r
\r
// ── The surface — pannable, zoomable, dotted. ─────────────────────────────────\r
\r
const Surface = part("surface")\r
  .props<Record<string, never>>()\r
  .fill()\r
  .hit(() => true)\r
  .style((t) => ({ dot: calpha(t.muted, 0.35) }))\r
  .render((node, paint, s) => {\r
    const view = node.view!, SPACING = 28;\r
    const left = Math.floor(-view.pan.x / view.zoom / SPACING) * SPACING;\r
    const top = Math.floor(-view.pan.y / view.zoom / SPACING) * SPACING;\r
    for (let x = left; x <= (view.w - view.pan.x) / view.zoom; x += SPACING)\r
      for (let y = top; y <= (view.h - view.pan.y) / view.zoom; y += SPACING)\r
        paint.dot(v(x, y), 1, s.dot);\r
  })\r
  .on(Pan());\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
function view(doc: Doc) {\r
  return Surface("root", {}, [\r
    Free("world", {}, [\r
      at(Stack("hint", { gap: 4, pad: 0 }, [\r
        Label("l1", { text: "island — DOM glued to the world", size: 17, weight: 600, bright: true }),\r
        Label("l2", { text: "drag the card · drag empty space to pan · wheel to zoom · keep typing", dim: true }),\r
      ]), v(40, 34)),\r
      at(Card("card", { pos: doc.pos, text: doc.text }), doc.pos),\r
    ]),\r
  ]);\r
}\r
\r
// ── Mount — with onCommit, the embedding seam. ────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
const status = document.getElementById("status")!;\r
let commits = 0;\r
\r
const rt = mount(canvas, {\r
  init: { pos: v(140, 120), text: input.value } as Doc,\r
  update,\r
  view,\r
  // Called after every committed update (the doc actually changed) — the hook\r
  // an embedding host uses to persist / re-evaluate, without wrapping dispatch.\r
  onCommit(doc: Doc) {\r
    commits++;\r
    status.textContent = \`onCommit #\${commits} — pos (\${Math.round(doc.pos.x)}, \${Math.round(doc.pos.y)}) · text "\${doc.text}"\`;\r
  },\r
});\r
\r
input.addEventListener("input", () => rt.dispatch({ kind: "text", text: input.value }));\r
\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`;function k(e,t){switch(t.kind){case"move":return{...e,pos:t.pos};case"text":return{...e,text:t.text}}}const n=document.createElement("input");n.value="type while the world moves";n.spellcheck=!1;n.style.cssText="box-sizing:border-box;border:1px solid #4a5268;border-radius:6px;background:#191c26;color:#e8ecf6;padding:0 9px;font:13px 'Segoe UI',system-ui;outline:none;";n.addEventListener("focus",()=>n.style.borderColor="#40baff");n.addEventListener("blur",()=>n.style.borderColor="#4a5268");const z=m("card").props().size(()=>a(250,108)).style((e,t)=>({fill:e.mix(e.surface,e.surfaceHi,.35*t.hover+.5*t.drag),edge:e.mix(e.muted,e.accent,.5*t.hover+.5*t.drag),text:e.text,dim:h(e.text,.55),lift:3*t.drag})).render((e,t,o)=>{const r=e.rect.raise(o.lift);t.box(r,10,o.fill,o.edge,1.2),t.box(c(r.x,r.y,r.w,6),3,v(203,.7,.55)),t.label("island card — drag me",a(r.x+12,r.y+22),o.text,{align:"left",weight:600,size:13}),t.label(`canvas sees: ${e.props.text}`,a(r.x+12,r.bottom-14),o.dim,{align:"left",size:11})}).island(e=>({el:n,rect:c(e.rect.x+12,e.rect.y+34,e.rect.w-24,28)})).gesture({begin:(e,t)=>({grab:a(t.x-e.props.pos.x,t.y-e.props.pos.y)}),during:(e,t,o)=>({kind:"move",pos:a(o.x-e.grab.x,o.y-e.grab.y)})}),I=m("surface").props().fill().hit(()=>!0).style(e=>({dot:h(e.muted,.35)})).render((e,t,o)=>{const r=e.view,s=28,x=Math.floor(-r.pan.x/r.zoom/s)*s,g=Math.floor(-r.pan.y/r.zoom/s)*s;for(let i=x;i<=(r.w-r.pan.x)/r.zoom;i+=s)for(let d=g;d<=(r.h-r.pan.y)/r.zoom;d+=s)t.dot(a(i,d),1,o.dot)}).on(f());function E(e){return I("root",{},[w("world",{},[l(b("hint",{gap:4,pad:0},[p("l1",{text:"island — DOM glued to the world",size:17,weight:600,bright:!0}),p("l2",{text:"drag the card · drag empty space to pan · wheel to zoom · keep typing",dim:!0})]),a(40,34)),l(z("card",{pos:e.pos,text:e.text}),e.pos)])])}const P=document.getElementById("c"),M=document.getElementById("status");let u=0;const T=y(P,{init:{pos:a(140,120),text:n.value},update:k,view:E,onCommit(e){u++,M.textContent=`onCommit #${u} — pos (${Math.round(e.pos.x)}, ${Math.round(e.pos.y)}) · text "${e.text}"`}});n.addEventListener("input",()=>T.dispatch({kind:"text",text:n.value}));C([{name:"main.ts",code:S}]);
