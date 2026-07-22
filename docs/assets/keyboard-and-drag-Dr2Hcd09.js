import{p as l,m,S as u,L as h,l as p,F as g,K as f,G as x,v as i,h as w,c as b}from"./runtime-BQ2Zsp_3.js";import{a as v}from"./source-panel-CSqvtNlY.js";const y=`// ============================================================================
// Example: keyboard-and-drag — three interactors composed on ONE part.
//
// Each row in the list carries:
//   • Focusable()  — clicking the row gives it keyboard focus, and the
//                    automatic \`focus\` channel eases its ring in.
//   • Keys({...})  — ArrowUp / ArrowDown move the focused row.
//   • Gesture(...) — dragging the row reorders it live.
//
// What to look for when you run it:
//   • However a row moves — keyboard or drag — the OTHER rows glide around
//     it. That is not drag code: order is state, the view lays rows out from
//     that state, and every row's position spring chases its new target.
//   • While dragging, the row lifts (the automatic \`drag\` channel).
// ============================================================================

import {
  calpha, clamp, Color,
  Focusable,       // interactor: click to take keyboard focus
  Gesture,         // interactor: a full drag gesture with private state
  GNode,
  hsl,
  Keys,            // interactor: keyboard mapping, routed focus-first
  mount,
  part,
  Stack, Label,
  v,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface ListItem {
  id: string;
  label: string;
  hue: number;
}

interface ListDocument {
  items: ListItem[];      // array order IS the display order
}

type ListIntent = { kind: "move-to-index"; id: string; index: number };

// Row geometry: height 38 + stack gap 8. The drag gesture uses this to map
// "how far has the pointer moved" onto "how many slots should I shift".
const ROW_HEIGHT = 38;
const ROW_GAP = 8;
const ROW_STEP = ROW_HEIGHT + ROW_GAP;

function update(document: ListDocument, intent: ListIntent): ListDocument {
  const fromIndex = document.items.findIndex((item) => item.id === intent.id);
  const toIndex = clamp(intent.index, 0, document.items.length - 1);
  if (fromIndex < 0 || fromIndex === toIndex) return document;

  const items = [...document.items];
  const [movedItem] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, movedItem);
  return { items };
}

// ── The row widget ────────────────────────────────────────────────────────────

interface RowProps {
  id: string;
  label: string;
  hue: number;
  index: number;          // the row's current position, supplied by the view
}

interface RowStyle {
  fill: Color;
  edge: Color;
  text: Color;
  focusRing: number;      // 0..1 — the eased focus channel
  lift: number;           // pixels of hover-style lift while dragging
}

const ReorderableRow = part<RowProps, RowStyle>("reorderable-row", {

  size: () => v(260, ROW_HEIGHT),

  // All the state-dependent looks live here, computed from channels the
  // runtime maintains automatically: hover, drag, focus.
  style(tokens, channels): RowStyle {
    return {
      fill: tokens.mix(tokens.surface, tokens.surfaceHi, channels.hover + channels.drag),
      edge: tokens.mix(tokens.muted, tokens.accent, Math.max(channels.focus, channels.drag)),
      text: tokens.mix(tokens.text, tokens.textBright, channels.hover),
      focusRing: channels.focus,
      lift: 3 * channels.drag,
    };
  },

  render(node, painter, style) {
    const r = node.rect.raise(style.lift);
    painter.box(r, 9, style.fill, style.edge, 1 + style.focusRing);
    painter.dot(v(r.x + 20, r.center.y), 6, hsl(node.props.hue, 0.75, 0.6));
    painter.label(node.props.label, v(r.x + 36, r.center.y), style.text, { align: "left" });

    // A small affordance that fades in with focus: "you can move me".
    if (style.focusRing > 0.02) {
      painter.label("↕", v(r.right - 16, r.center.y),
        calpha(style.edge, style.focusRing), { size: 12 });
    }
  },

  on: [
    // 1. Click to focus (the runtime then eases channels.focus toward 1).
    Focusable(),

    // 2. Keyboard: move the focused row up or down one slot.
    Keys({
      ArrowUp: (node: GNode<RowProps>) =>
        ({ kind: "move-to-index", id: node.props.id, index: node.props.index - 1 }),
      ArrowDown: (node: GNode<RowProps>) =>
        ({ kind: "move-to-index", id: node.props.id, index: node.props.index + 1 }),
    }),

    // 3. Drag to reorder. The gesture's private state remembers where the
    //    drag started; \`during\` fires on every pointer move and dispatches a
    //    move intent whenever the pointer has crossed into a new slot.
    Gesture<RowProps, { startPointerY: number; startIndex: number }>({

      begin: (node, pointer) => ({
        startPointerY: pointer.y,
        startIndex: node.props.index,
      }),

      during(state, node, pointer) {
        const slotsMoved = Math.round((pointer.y - state.startPointerY) / ROW_STEP);
        const targetIndex = state.startIndex + slotsMoved;
        if (targetIndex !== node.props.index) {
          return { kind: "move-to-index", id: node.props.id, index: targetIndex };
        }
        return undefined;   // pointer still inside the current slot — no intent
      },
    }),
  ],
});

// ── View ──────────────────────────────────────────────────────────────────────

function view(document: ListDocument) {
  return Stack("root", { gap: ROW_GAP, pad: 48 }, [

    Label("title", {
      text: "Reorder: click to focus, arrows or drag to move",
      size: 16, weight: 600, bright: true,
    }),

    ...document.items.map((item, index) =>
      ReorderableRow(item.id, {
        id: item.id,
        label: item.label,
        hue: item.hue,
        index,
      })),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    items: [
      { id: "item-a", label: "Springs", hue: 200 },
      { id: "item-b", label: "Channels", hue: 260 },
      { id: "item-c", label: "Reconcile", hue: 140 },
      { id: "item-d", label: "Interactors", hue: 30 },
      { id: "item-e", label: "Extensions", hue: 330 },
    ],
  },
  update,
  view,
});

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`,s=38,a=8,R=s+a;function I(e,n){const t=e.items.findIndex(c=>c.id===n.id),o=p(n.index,0,e.items.length-1);if(t<0||t===o)return e;const r=[...e.items],[d]=r.splice(t,1);return r.splice(o,0,d),{items:r}}const k=l("reorderable-row",{size:()=>i(260,s),style(e,n){return{fill:e.mix(e.surface,e.surfaceHi,n.hover+n.drag),edge:e.mix(e.muted,e.accent,Math.max(n.focus,n.drag)),text:e.mix(e.text,e.textBright,n.hover),focusRing:n.focus,lift:3*n.drag}},render(e,n,t){const o=e.rect.raise(t.lift);n.box(o,9,t.fill,t.edge,1+t.focusRing),n.dot(i(o.x+20,o.center.y),6,w(e.props.hue,.75,.6)),n.label(e.props.label,i(o.x+36,o.center.y),t.text,{align:"left"}),t.focusRing>.02&&n.label("↕",i(o.right-16,o.center.y),b(t.edge,t.focusRing),{size:12})},on:[g(),f({ArrowUp:e=>({kind:"move-to-index",id:e.props.id,index:e.props.index-1}),ArrowDown:e=>({kind:"move-to-index",id:e.props.id,index:e.props.index+1})}),x({begin:(e,n)=>({startPointerY:n.y,startIndex:e.props.index}),during(e,n,t){const o=Math.round((t.y-e.startPointerY)/R),r=e.startIndex+o;if(r!==n.props.index)return{kind:"move-to-index",id:n.props.id,index:r}}})]});function P(e){return u("root",{gap:a,pad:48},[h("title",{text:"Reorder: click to focus, arrows or drag to move",size:16,weight:600,bright:!0}),...e.items.map((n,t)=>k(n.id,{id:n.id,label:n.label,hue:n.hue,index:t}))])}const S=document.getElementById("c");m(S,{init:{items:[{id:"item-a",label:"Springs",hue:200},{id:"item-b",label:"Channels",hue:260},{id:"item-c",label:"Reconcile",hue:140},{id:"item-d",label:"Interactors",hue:30},{id:"item-e",label:"Extensions",hue:330}]},update:I,view:P});v([{name:"main.ts",code:y}]);
