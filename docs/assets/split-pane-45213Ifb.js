import{p as u,i as f,r as h,v as l,G as x,c as b,P as y,o as k,m as I,d as z,S as M,L as c}from"./source-panel-D7B0FxD0.js";import{S}from"./widgets-DAP5Pepg.js";import{w as D}from"./widgets-deNE_SuD.js";const P=`// ============================================================================
// Example: split-pane — custom layout parts, reflow, and live resize.
//
// Three brand-new layout containers, each ONE part() with measure/place — no
// framework changes, exactly as "a custom layout is a part" promises:
//
//   • SplitPane — fills the viewport and hands its two panes a rect split by a
//     fraction; a draggable vertical Divider between them drives the fraction.
//   • Flow      — a wrapping row: fixed-size children pack left-to-right and
//     wrap to the next line to fill whatever width the pane gives it.
//   • Pane      — a well that stretches its single child to fill it.
//
// The left pane is a Flow of fixed-size buttons. The right pane holds an
// EXTERNAL slider that sets every button's width. Drag the divider → both panes
// re-lay-out; drag the slider → every button resizes and the Flow re-wraps;
// resize the window → everything reflows. All of it glides for free: layout
// results feed position springs and size eases, so nothing is animated by hand.
// ============================================================================

import {
  calpha, clamp, Gesture, Intentish, Label, mount, part, Press, rect, Stack,
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
// measure returns (0,0) so layoutScene places it at the full viewport, exactly
// like a Pan surface. Its place() carves that rect into left | divider | right.
const SplitPane = part<{ split: number }>()("split-pane", {
  measure: () => v(0, 0),
  place: (props, r) => {
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
const Pane = part<Record<string, never>>()("pane", {
  measure: () => v(0, 0),
  place: (_p, r, kids) => kids.map(() => r),   // one child, full rect
  style: (t) => ({ well: calpha(t.bg, 0.4), edge: t.muted }),
  render: (node, paint, s) => paint.box(node.rect, 10, s.well, s.edge, 1),
});

// ── Flow — a wrapping row: pack left-to-right, wrap to fill the given width ────
// The height of a wrap layout depends on the WIDTH it is given — which only
// exists at place() time — so measure() can't compute it. That is fine here:
// SplitPane hands Flow a fixed pane rect, and place() does all the work.
const Flow = part<{ gap?: number; pad?: number }>()("flow", {
  measure: () => v(0, 0),
  place: (props, r, kids) => {
    const gap = props.gap ?? 8, pad = props.pad ?? 12;
    let x = r.x + pad, y = r.y + pad, rowH = 0;
    return kids.map(({ size }) => {
      if (x + size.x > r.right - pad && x > r.x + pad) { x = r.x + pad; y += rowH + gap; rowH = 0; }
      const out = rect(x, y, size.x, size.y);
      x += size.x + gap;
      rowH = Math.max(rowH, size.y);
      return out;
    });
  },
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
`,o=16,p=12,m=52,A=176;function N(e,t){switch(t.kind){case"split":return{...e,split:t.value};case"width":return{...e,width01:t.value};case"click":return{...e,lastClicked:t.label}}}const W=e=>m+e*(A-m),G=u()("split-pane",{measure:()=>l(0,0),place:(e,t)=>{const n=t.x+o,i=t.y+o,r=t.w-2*o,a=t.h-2*o,s=f(e.split,.12,.88)*r-p/2;return[h(n,i,s,a),h(n+s,i,p,a),h(n+s+p,i,r-s-p,a)]}}),_=u()("divider",{size:()=>l(p,0),style:(e,t)=>({bar:e.mix(e.muted,e.accent,.25+.6*t.hover+.3*(t.press||0)),grip:e.mix(e.textDim,e.textBright,t.hover)}),render:(e,t,n)=>{const i=e.rect;t.box(h(i.center.x-1.5,i.y+6,3,i.h-12),1.5,n.bar);for(const r of[-7,0,7])t.dot(l(i.center.x,i.center.y+r),1.6,n.grip)},on:[x({begin:()=>({}),during:(e,t,n)=>{var r;const i=((r=t.view)==null?void 0:r.w)??1;return{kind:"split",value:f((n.x-o)/(i-2*o),.12,.88)}}})]}),g=u()("pane",{measure:()=>l(0,0),place:(e,t,n)=>n.map(()=>t),style:e=>({well:b(e.bg,.4),edge:e.muted}),render:(e,t,n)=>t.box(e.rect,10,n.well,n.edge,1)}),R=u()("flow",{measure:()=>l(0,0),place:(e,t,n)=>{const i=e.gap??8,r=e.pad??12;let a=t.x+r,w=t.y+r,s=0;return n.map(({size:d})=>{a+d.x>t.right-r&&a>t.x+r&&(a=t.x+r,w+=s+i,s=0);const v=h(a,w,d.x,d.y);return a+=d.x+i,s=Math.max(s,d.y),v})}}),B=u()("fixed-button",{size:e=>l(e.w,34),style:(e,t)=>({...k(e,t,{}),corner:7}),render:(e,t,n)=>{t.box(e.rect,n.corner,n.fill,n.edge,1),t.label(e.props.label,e.rect.center,n.text,{weight:500,size:12})},on:[y(e=>e.props.press)]});function C(e){const t=W(e.width01),n=e.labels.map((i,r)=>B(`b${r}`,{label:i,w:t,press:{kind:"click",label:i}}));return G("root",{split:e.split},[g("left",{},[R("flow",{gap:10,pad:14},n)]),_("divider",{}),g("right",{},[M("controls",{gap:14,pad:20,align:"stretch"},[c("h",{text:"Controls",weight:600,size:15,bright:!0}),c("cap",{text:"Button width (drives every button in the left pane)",dim:!0,size:11}),S("width",{value:e.width01,set:i=>({kind:"width",value:i})}),c("readout",{text:`width ${Math.round(t)}px  ·  split ${Math.round(e.split*100)}%`,dim:!0,size:11}),c("last",{text:e.lastClicked?`last clicked: ${e.lastClicked}`:"click a button →",dim:!0,size:11}),c("hint",{text:"Drag the divider · drag the slider · resize the window — it all reflows.",dim:!0,size:11})])])])}const F=document.getElementById("c");I(F,{init:{split:.62,width01:.3,lastClicked:null,labels:Array.from({length:14},(e,t)=>`Button ${t+1}`)},update:N,view:C});z([{name:"main.ts",code:P},{name:"widgets.ts (shared)",code:D}]);
