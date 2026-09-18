import{p as l,m,S as u,L as h,q as p,n as g,K as f,G as x,v as i,h as w,c as b}from"./runtime-BaMoeUMO.js";import{a as v}from"./source-panel-CSqvtNlY.js";const y=`// ============================================================================\r
// Example: keyboard-and-drag — three interactors composed on ONE part.\r
//\r
// Each row in the list carries:\r
//   • Focusable()  — clicking the row gives it keyboard focus, and the\r
//                    automatic \`focus\` channel eases its ring in.\r
//   • Keys({...})  — ArrowUp / ArrowDown move the focused row.\r
//   • Gesture(...) — dragging the row reorders it live.\r
//\r
// What to look for when you run it:\r
//   • However a row moves — keyboard or drag — the OTHER rows glide around\r
//     it. That is not drag code: order is state, the view lays rows out from\r
//     that state, and every row's position spring chases its new target.\r
//   • While dragging, the row lifts (the automatic \`drag\` channel).\r
// ============================================================================\r
\r
import {\r
  calpha, clamp, Color,\r
  Focusable,       // interactor: click to take keyboard focus\r
  Gesture,         // interactor: a full drag gesture with private state\r
  GNode,\r
  hsl,\r
  Keys,            // interactor: keyboard mapping, routed focus-first\r
  mount,\r
  part,\r
  Stack, Label,\r
  v,\r
} from "gratify";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface ListItem {\r
  id: string;\r
  label: string;\r
  hue: number;\r
}\r
\r
interface ListDocument {\r
  items: ListItem[];      // array order IS the display order\r
}\r
\r
type ListIntent = { kind: "move-to-index"; id: string; index: number };\r
\r
// Row geometry: height 38 + stack gap 8. The drag gesture uses this to map\r
// "how far has the pointer moved" onto "how many slots should I shift".\r
const ROW_HEIGHT = 38;\r
const ROW_GAP = 8;\r
const ROW_STEP = ROW_HEIGHT + ROW_GAP;\r
\r
function update(document: ListDocument, intent: ListIntent): ListDocument {\r
  const fromIndex = document.items.findIndex((item) => item.id === intent.id);\r
  const toIndex = clamp(intent.index, 0, document.items.length - 1);\r
  if (fromIndex < 0 || fromIndex === toIndex) return document;\r
\r
  const items = [...document.items];\r
  const [movedItem] = items.splice(fromIndex, 1);\r
  items.splice(toIndex, 0, movedItem);\r
  return { items };\r
}\r
\r
// ── The row widget ────────────────────────────────────────────────────────────\r
\r
interface RowProps {\r
  id: string;\r
  label: string;\r
  hue: number;\r
  index: number;          // the row's current position, supplied by the view\r
}\r
\r
interface RowStyle {\r
  fill: Color;\r
  edge: Color;\r
  text: Color;\r
  focusRing: number;      // 0..1 — the eased focus channel\r
  lift: number;           // pixels of hover-style lift while dragging\r
}\r
\r
const ReorderableRow = part<RowProps, RowStyle>("reorderable-row", {\r
\r
  size: () => v(260, ROW_HEIGHT),\r
\r
  // All the state-dependent looks live here, computed from channels the\r
  // runtime maintains automatically: hover, drag, focus.\r
  style(tokens, channels): RowStyle {\r
    return {\r
      fill: tokens.mix(tokens.surface, tokens.surfaceHi, channels.hover + channels.drag),\r
      edge: tokens.mix(tokens.muted, tokens.accent, Math.max(channels.focus, channels.drag)),\r
      text: tokens.mix(tokens.text, tokens.textBright, channels.hover),\r
      focusRing: channels.focus,\r
      lift: 3 * channels.drag,\r
    };\r
  },\r
\r
  render(node, painter, style) {\r
    const r = node.rect.raise(style.lift);\r
    painter.box(r, 9, style.fill, style.edge, 1 + style.focusRing);\r
    painter.dot(v(r.x + 20, r.center.y), 6, hsl(node.props.hue, 0.75, 0.6));\r
    painter.label(node.props.label, v(r.x + 36, r.center.y), style.text, { align: "left" });\r
\r
    // A small affordance that fades in with focus: "you can move me".\r
    if (style.focusRing > 0.02) {\r
      painter.label("↕", v(r.right - 16, r.center.y),\r
        calpha(style.edge, style.focusRing), { size: 12 });\r
    }\r
  },\r
\r
  on: [\r
    // 1. Click to focus (the runtime then eases channels.focus toward 1).\r
    Focusable(),\r
\r
    // 2. Keyboard: move the focused row up or down one slot.\r
    Keys({\r
      ArrowUp: (node: GNode<RowProps>) =>\r
        ({ kind: "move-to-index", id: node.props.id, index: node.props.index - 1 }),\r
      ArrowDown: (node: GNode<RowProps>) =>\r
        ({ kind: "move-to-index", id: node.props.id, index: node.props.index + 1 }),\r
    }),\r
\r
    // 3. Drag to reorder. The gesture's private state remembers where the\r
    //    drag started; \`during\` fires on every pointer move and dispatches a\r
    //    move intent whenever the pointer has crossed into a new slot.\r
    Gesture<RowProps, { startPointerY: number; startIndex: number }>({\r
\r
      begin: (node, pointer) => ({\r
        startPointerY: pointer.y,\r
        startIndex: node.props.index,\r
      }),\r
\r
      during(state, node, pointer) {\r
        const slotsMoved = Math.round((pointer.y - state.startPointerY) / ROW_STEP);\r
        const targetIndex = state.startIndex + slotsMoved;\r
        if (targetIndex !== node.props.index) {\r
          return { kind: "move-to-index", id: node.props.id, index: targetIndex };\r
        }\r
        return undefined;   // pointer still inside the current slot — no intent\r
      },\r
    }),\r
  ],\r
});\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
function view(document: ListDocument) {\r
  return Stack("root", { gap: ROW_GAP, pad: 48 }, [\r
\r
    Label("title", {\r
      text: "Reorder: click to focus, arrows or drag to move",\r
      size: 16, weight: 600, bright: true,\r
    }),\r
\r
    ...document.items.map((item, index) =>\r
      ReorderableRow(item.id, {\r
        id: item.id,\r
        label: item.label,\r
        hue: item.hue,\r
        index,\r
      })),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: {\r
    items: [\r
      { id: "item-a", label: "Springs", hue: 200 },\r
      { id: "item-b", label: "Channels", hue: 260 },\r
      { id: "item-c", label: "Reconcile", hue: 140 },\r
      { id: "item-d", label: "Interactors", hue: 30 },\r
      { id: "item-e", label: "Extensions", hue: 330 },\r
    ],\r
  },\r
  update,\r
  view,\r
});\r
\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`,s=38,a=8,R=s+a;function I(e,r){const n=e.items.findIndex(c=>c.id===r.id),t=p(r.index,0,e.items.length-1);if(n<0||n===t)return e;const o=[...e.items],[d]=o.splice(n,1);return o.splice(t,0,d),{items:o}}const k=l("reorderable-row",{size:()=>i(260,s),style(e,r){return{fill:e.mix(e.surface,e.surfaceHi,r.hover+r.drag),edge:e.mix(e.muted,e.accent,Math.max(r.focus,r.drag)),text:e.mix(e.text,e.textBright,r.hover),focusRing:r.focus,lift:3*r.drag}},render(e,r,n){const t=e.rect.raise(n.lift);r.box(t,9,n.fill,n.edge,1+n.focusRing),r.dot(i(t.x+20,t.center.y),6,w(e.props.hue,.75,.6)),r.label(e.props.label,i(t.x+36,t.center.y),n.text,{align:"left"}),n.focusRing>.02&&r.label("↕",i(t.right-16,t.center.y),b(n.edge,n.focusRing),{size:12})},on:[g(),f({ArrowUp:e=>({kind:"move-to-index",id:e.props.id,index:e.props.index-1}),ArrowDown:e=>({kind:"move-to-index",id:e.props.id,index:e.props.index+1})}),x({begin:(e,r)=>({startPointerY:r.y,startIndex:e.props.index}),during(e,r,n){const t=Math.round((n.y-e.startPointerY)/R),o=e.startIndex+t;if(o!==r.props.index)return{kind:"move-to-index",id:r.props.id,index:o}}})]});function P(e){return u("root",{gap:a,pad:48},[h("title",{text:"Reorder: click to focus, arrows or drag to move",size:16,weight:600,bright:!0}),...e.items.map((r,n)=>k(r.id,{id:r.id,label:r.label,hue:r.hue,index:n}))])}const S=document.getElementById("c");m(S,{init:{items:[{id:"item-a",label:"Springs",hue:200},{id:"item-b",label:"Channels",hue:260},{id:"item-c",label:"Reconcile",hue:140},{id:"item-d",label:"Interactors",hue:30},{id:"item-e",label:"Extensions",hue:330}]},update:I,view:P});v([{name:"main.ts",code:y}]);
