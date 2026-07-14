import{p as c,j as m,r as d,G as g,v as h,c as f,P as v,i as b,m as x,d as y,q as k,S as I,L as a}from"./source-panel-cwX9nwkb.js";import{S as z}from"./widgets-Bo9jPsTR.js";import{w as M}from"./widgets-L_2qlmzG.js";const S=`// ============================================================================
// Example: split-pane — custom layout parts, reflow, and live resize.
//
// Two custom layout containers, each ONE part() with measure/arrange — no
// framework changes, exactly as "a custom layout is a part" promises:
//
//   • SplitPane — fills the viewport and hands its two panes a rect split by a
//     fraction; a draggable vertical Divider between them drives the fraction.
//   • Pane      — a well that stretches its single child to fill it.
//
// The wrapping row is \`Flow\`, now a Gratify built-in: with real two-phase
// layout it reports an honest height from the width it's given, so it composes
// anywhere (no local copy needed).
//
// The left pane is a Flow of fixed-size buttons. The right pane holds an
// EXTERNAL slider that sets every button's width. Drag the divider → both panes
// re-lay-out; drag the slider → every button resizes and the Flow re-wraps;
// resize the window → everything reflows. All of it glides for free: layout
// results feed position springs and size eases, so nothing is animated by hand.
// ============================================================================

import {
  calpha, clamp, Flow, Gesture, Intentish, Label, mount, part, Press, rect, Stack,
  surface, v, Element,
} from "gratify";
import { Slider } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── Geometry constants ────────────────────────────────────────────────────────
const MARGIN = 16;   // gap between the pane group and the viewport edge
const DIV = 12;      // divider thickness
const MIN_W = 52, MAX_W = 176;   // button width range the slider spans

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  split: number;             // 0..1 — divider position
  width01: number;           // 0..1 — button width, mapped to [MIN_W, MAX_W]
  labels: string[];
  lastClicked: string | null;
}

type Intent =
  | { kind: "split"; value: number }
  | { kind: "width"; value: number }
  | { kind: "click"; label: string };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "split": return { ...doc, split: intent.value };
    case "width": return { ...doc, width01: intent.value };
    case "click": return { ...doc, lastClicked: intent.label };
  }
}

const widthOf = (width01: number) => MIN_W + width01 * (MAX_W - MIN_W);

// ── SplitPane — fills the viewport, splits it by a fraction ───────────────────
// measure returns the room it's offered ("I fill whatever I'm given"), so it
// spans the full viewport. Its arrange() carves that rect into left | divider |
// right.
const SplitPane = part<{ split: number }>()("split-pane", {
  measure: (_props, avail) => avail,
  arrange: (props, r) => {
    const x = r.x + MARGIN, y = r.y + MARGIN, w = r.w - 2 * MARGIN, h = r.h - 2 * MARGIN;
    const f = clamp(props.split, 0.12, 0.88);
    const leftW = f * w - DIV / 2;
    return [
      rect(x, y, leftW, h),                       // left pane
      rect(x + leftW, y, DIV, h),                 // divider
      rect(x + leftW + DIV, y, w - leftW - DIV, h),// right pane
    ];
  },
});

// ── Divider — a vertical grab bar; its Gesture writes the split fraction ──────
// It maps the world-space pointer to a fraction of the split area. The area is
// the viewport inset by MARGIN (SplitPane is the root), and node.view.w gives
// the viewport width — so the divider needs nothing passed down to it.
const Divider = part<Record<string, never>>()("divider", {
  size: () => v(DIV, 0),
  style: (t, ch) => ({
    bar: t.mix(t.muted, t.accent, 0.25 + 0.6 * ch.hover + 0.3 * (ch.press || 0)),
    grip: t.mix(t.textDim, t.textBright, ch.hover),
  }),
  render: (node, paint, s) => {
    const r = node.rect;
    paint.box(rect(r.center.x - 1.5, r.y + 6, 3, r.h - 12), 1.5, s.bar);
    for (const dy of [-7, 0, 7]) paint.dot(v(r.center.x, r.center.y + dy), 1.6, s.grip);
  },
  on: [
    Gesture<Record<string, never>, Record<string, never>>({
      begin: () => ({}),
      during: (_st, node, pointer) => {
        const w = node.view?.w ?? 1;
        return { kind: "split", value: clamp((pointer.x - MARGIN) / (w - 2 * MARGIN), 0.12, 0.88) };
      },
    }),
  ],
});

// ── Pane — a well that stretches its single child to fill it ──────────────────
// measure returns what it's offered (fill); arrange gives its one child the
// whole rect. \`Flow\` (now a Gratify built-in) drops straight into it and, given
// a real width, reports an honest wrapped height.
const Pane = part<Record<string, never>>()("pane", {
  measure: (_p, avail) => avail,
  arrange: (_p, r, kids) => kids.map(() => r),   // one child, full rect
  style: (t) => ({ well: calpha(t.bg, 0.4), edge: t.muted }),
  render: (node, paint, s) => paint.box(node.rect, 10, s.well, s.edge, 1),
});

// ── FixedButton — a fixed-size button whose width comes from a prop ───────────
const FixedButton = part<{ label: string; w: number; press: Intentish }>()("fixed-button", {
  size: (props) => v(props.w, 34),
  style: (t, ch) => ({ ...surface(t, ch, {}), corner: 7 }),
  render: (node, paint, s) => {
    paint.box(node.rect, s.corner, s.fill, s.edge, 1);
    paint.label(node.props.label, node.rect.center, s.text, { weight: 500, size: 12 });
  },
  on: [Press((node) => node.props.press)],
});

// ── View ──────────────────────────────────────────────────────────────────────
function view(doc: Doc): Element {
  const w = widthOf(doc.width01);
  const buttons = doc.labels.map((label, i) =>
    FixedButton(\`b\${i}\`, { label, w, press: { kind: "click", label } }));

  return SplitPane("root", { split: doc.split }, [
    Pane("left", {}, [Flow("flow", { gap: 10, pad: 14 }, buttons)]),
    Divider("divider", {}),
    Pane("right", {}, [
      Stack("controls", { gap: 14, pad: 20, align: "stretch" }, [
        Label("h", { text: "Controls", weight: 600, size: 15, bright: true }),
        Label("cap", { text: "Button width (drives every button in the left pane)", dim: true, size: 11 }),
        Slider("width", { value: doc.width01, set: (value) => ({ kind: "width", value }) }),
        Label("readout", { text: \`width \${Math.round(w)}px  ·  split \${Math.round(doc.split * 100)}%\`, dim: true, size: 11 }),
        Label("last", { text: doc.lastClicked ? \`last clicked: \${doc.lastClicked}\` : "click a button →", dim: true, size: 11 }),
        Label("hint", { text: "Drag the divider · drag the slider · resize the window — it all reflows.", dim: true, size: 11 }),
      ]),
    ]),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    split: 0.62,
    width01: 0.3,
    lastClicked: null,
    labels: Array.from({ length: 14 }, (_, i) => \`Button \${i + 1}\`),
  },
  update,
  view,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
`,s=16,o=12,u=52,D=176;function P(e,t){switch(t.kind){case"split":return{...e,split:t.value};case"width":return{...e,width01:t.value};case"click":return{...e,lastClicked:t.label}}}const _=e=>u+e*(D-u),A=c()("split-pane",{measure:(e,t)=>t,arrange:(e,t)=>{const n=t.x+s,i=t.y+s,r=t.w-2*s,p=t.h-2*s,l=m(e.split,.12,.88)*r-o/2;return[d(n,i,l,p),d(n+l,i,o,p),d(n+l+o,i,r-l-o,p)]}}),G=c()("divider",{size:()=>h(o,0),style:(e,t)=>({bar:e.mix(e.muted,e.accent,.25+.6*t.hover+.3*(t.press||0)),grip:e.mix(e.textDim,e.textBright,t.hover)}),render:(e,t,n)=>{const i=e.rect;t.box(d(i.center.x-1.5,i.y+6,3,i.h-12),1.5,n.bar);for(const r of[-7,0,7])t.dot(h(i.center.x,i.center.y+r),1.6,n.grip)},on:[g({begin:()=>({}),during:(e,t,n)=>{var r;const i=((r=t.view)==null?void 0:r.w)??1;return{kind:"split",value:m((n.x-s)/(i-2*s),.12,.88)}}})]}),w=c()("pane",{measure:(e,t)=>t,arrange:(e,t,n)=>n.map(()=>t),style:e=>({well:f(e.bg,.4),edge:e.muted}),render:(e,t,n)=>t.box(e.rect,10,n.well,n.edge,1)}),N=c()("fixed-button",{size:e=>h(e.w,34),style:(e,t)=>({...b(e,t,{}),corner:7}),render:(e,t,n)=>{t.box(e.rect,n.corner,n.fill,n.edge,1),t.label(e.props.label,e.rect.center,n.text,{weight:500,size:12})},on:[v(e=>e.props.press)]});function W(e){const t=_(e.width01),n=e.labels.map((i,r)=>N(`b${r}`,{label:i,w:t,press:{kind:"click",label:i}}));return A("root",{split:e.split},[w("left",{},[k("flow",{gap:10,pad:14},n)]),G("divider",{}),w("right",{},[I("controls",{gap:14,pad:20,align:"stretch"},[a("h",{text:"Controls",weight:600,size:15,bright:!0}),a("cap",{text:"Button width (drives every button in the left pane)",dim:!0,size:11}),z("width",{value:e.width01,set:i=>({kind:"width",value:i})}),a("readout",{text:`width ${Math.round(t)}px  ·  split ${Math.round(e.split*100)}%`,dim:!0,size:11}),a("last",{text:e.lastClicked?`last clicked: ${e.lastClicked}`:"click a button →",dim:!0,size:11}),a("hint",{text:"Drag the divider · drag the slider · resize the window — it all reflows.",dim:!0,size:11})])])])}const R=document.getElementById("c");x(R,{init:{split:.62,width01:.3,lastClicked:null,labels:Array.from({length:14},(e,t)=>`Button ${t+1}`)},update:P,view:W});y([{name:"main.ts",code:S},{name:"widgets.ts (shared)",code:M}]);
