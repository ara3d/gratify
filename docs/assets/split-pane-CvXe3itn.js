import{p as d,P as p,s as c,v as h,m as u,S as s,i as m,F as w,L as r}from"./runtime-BaMoeUMO.js";import{S as f}from"./widgets-BJEltdMZ.js";import{S as b,P as a}from"./split-WwqU7KnC.js";import{a as g}from"./source-panel-CSqvtNlY.js";import{w as x}from"./widgets-DQsqbtq9.js";const v=`// ============================================================================
// Example: split-pane — custom layout parts, reflow, and live resize.
//
// The layout parts are shared (examples/shared/split.ts), each ONE part()
// with measure/arrange — no framework changes, exactly as "a custom layout is
// a part" promises:
//
//   • Split — hands its two panes a rect split by a fraction, with a draggable
//     Divider between them that emits \`set(fraction)\`; the app owns the
//     fraction, so it is undoable state like any other.
//   • Pane  — a well that stretches its single child to fill it.
//
// The wrapping row is \`Flow\`, a Gratify built-in: with real two-phase layout
// it reports an honest height from the width it's given, so it composes
// anywhere.
//
// The left pane is a Flow of fixed-size buttons. The right pane holds an
// EXTERNAL slider that sets every button's width. Drag the divider → both panes
// re-lay-out; drag the slider → every button resizes and the Flow re-wraps;
// resize the window → everything reflows. All of it glides for free: layout
// results feed position springs and size eases, so nothing is animated by hand.
// ============================================================================

import { Flow, grow, Intentish, Label, mount, part, Press, Stack, surface, v, Element } from "gratify";
import { Slider } from "../shared/widgets";
import { Pane, Split } from "../shared/split";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import splitSource from "../shared/split.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── Geometry constants ────────────────────────────────────────────────────────
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
// The root Stack pads the viewport; its one child, the Split, fills the rest
// (a Stack arranged to the viewport stretches its lone child to the slack).
function view(doc: Doc): Element {
  const w = widthOf(doc.width01);
  const buttons = doc.labels.map((label, i) =>
    FixedButton(\`b\${i}\`, { label, w, press: { kind: "click", label } }));

  return Stack("root", { pad: 16, align: "stretch" }, [
    grow(Split("split", { at: doc.split, min: 0.12, set: (value) => ({ kind: "split", value }) }, [
      Pane("left", {}, [Flow("flow", { gap: 10, pad: 14 }, buttons)]),
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
    ])),
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
  { name: "split.ts (shared)", code: splitSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
`,y=`// Split — two panes side by side (or stacked) with a draggable divider, and
// Pane, a well that stretches its one child to fill it. Both are ordinary
// parts with measure/arrange; the divider's drag emits \`set(fraction)\` and the
// app owns the fraction, so a layout is undoable state like any other.
//
//   Split ─ SplitFrame ─┬─ first
//                       ├─ Divider (gesture → set)
//                       └─ second

import { calpha, clamp, Intentish, part, rect, v } from "gratify";

export interface SplitProps {
  /** "x": first | second left to right (default). "y": first over second. */
  axis?: "x" | "y";
  /** The first pane's share, 0..1. */
  at: number;
  /** Smallest share either pane may shrink to. Default 0.1. */
  min?: number;
  set(fraction: number): Intentish;
  /** Fallback size when the container leaves an axis unbounded. */
  width?: number;
  height?: number;
  states?: Record<string, boolean>;
}

export const DIVIDER = 10;
const finiteOr = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

interface FrameProps { axis: "x" | "y"; at: number; min: number; width: number; height: number }

const SplitFrame = part("split-frame")
  .props<FrameProps>()
  .measure((p, avail) => v(finiteOr(avail.x, p.width), finiteOr(avail.y, p.height)))
  .arrange((p, r) => {
    const f = clamp(p.at, p.min, 1 - p.min);
    if (p.axis === "x") {
      const a = f * r.w - DIVIDER / 2;
      return [rect(r.x, r.y, a, r.h), rect(r.x + a, r.y, DIVIDER, r.h), rect(r.x + a + DIVIDER, r.y, r.w - a - DIVIDER, r.h)];
    }
    const a = f * r.h - DIVIDER / 2;
    return [rect(r.x, r.y, r.w, a), rect(r.x, r.y + a, r.w, DIVIDER), rect(r.x, r.y + a + DIVIDER, r.w, r.h - a - DIVIDER)];
  });

interface DividerProps { axis: "x" | "y"; at: number; min: number; extent: number; set(fraction: number): Intentish }

const Divider = part("split-divider")
  .props<DividerProps>()
  .size(() => v(DIVIDER, DIVIDER))
  .style((t, ch) => ({
    bar: t.mix(t.muted, t.accent, 0.25 + 0.6 * ch.hover + 0.3 * ch.press + 0.4 * ch.drag),
    grip: t.mix(t.textDim, t.textBright, ch.hover + ch.drag),
    wide: 1 + 0.6 * ch.hover + 0.6 * ch.drag,
  }))
  .render((n, p, s) => {
    const r = n.rect, c = r.center, x = n.props.axis === "x";
    const w = 2 * s.wide;
    p.box(x ? rect(c.x - w / 2, r.y + 6, w, r.h - 12) : rect(r.x + 6, c.y - w / 2, r.w - 12, w), w / 2, s.bar);
    for (const d of [-7, 0, 7]) p.dot(x ? v(c.x, c.y + d) : v(c.x + d, c.y), 1.5, calpha(s.grip, 0.9));
  })
  .gesture<{ at0: number; p0: number }>({
    begin: (n, pt) => ({ at0: n.props.at, p0: n.props.axis === "x" ? pt.x : pt.y }),
    during: (st, n, pt) => {
      const delta = ((n.props.axis === "x" ? pt.x : pt.y) - st.p0) / Math.max(1, n.props.extent);
      return n.props.set(clamp(st.at0 + delta, n.props.min, 1 - n.props.min));
    },
  })
  .semantics((n) => ({ role: "separator", value: n.props.at }));

/** Two children: the first and second pane. Extra children are ignored. */
export const Split = part("split")
  .props<SplitProps>()
  .defaults({ axis: "x" as const, min: 0.1, width: 480, height: 320 })
  .body((p, kids, _l, size) => [
    SplitFrame("frame", { axis: p.axis, at: p.at, min: p.min, width: size.x || p.width, height: size.y || p.height }, [
      kids[0] ?? Pane("first", {}),
      Divider("divider", { axis: p.axis, at: p.at, min: p.min, extent: p.axis === "x" ? size.x : size.y, set: p.set }),
      kids[1] ?? Pane("second", {}),
    ]),
  ]);

/** A well that fills its room and stretches its single child to fill it. */
export const Pane = part("pane")
  .props<{ states?: Record<string, boolean> }>()
  .fill()
  .arrange((_p, r, kids) => kids.map(() => r))
  .style((t) => ({ well: calpha(t.bg, 0.4), edge: t.muted }))
  .render((n, p, s) => p.box(n.rect, 10, s.well, s.edge, 1));
`,o=52,k=176;function S(t,e){switch(e.kind){case"split":return{...t,split:e.value};case"width":return{...t,width01:e.value};case"click":return{...t,lastClicked:e.label}}}const D=t=>o+t*(k-o),I=d()("fixed-button",{size:t=>h(t.w,34),style:(t,e)=>({...c(t,e,{}),corner:7}),render:(t,e,n)=>{e.box(t.rect,n.corner,n.fill,n.edge,1),e.label(t.props.label,t.rect.center,n.text,{weight:500,size:12})},on:[p(t=>t.props.press)]});function z(t){const e=D(t.width01),n=t.labels.map((i,l)=>I(`b${l}`,{label:i,w:e,press:{kind:"click",label:i}}));return s("root",{pad:16,align:"stretch"},[m(b("split",{at:t.split,min:.12,set:i=>({kind:"split",value:i})},[a("left",{},[w("flow",{gap:10,pad:14},n)]),a("right",{},[s("controls",{gap:14,pad:20,align:"stretch"},[r("h",{text:"Controls",weight:600,size:15,bright:!0}),r("cap",{text:"Button width (drives every button in the left pane)",dim:!0,size:11}),f("width",{value:t.width01,set:i=>({kind:"width",value:i})}),r("readout",{text:`width ${Math.round(e)}px  ·  split ${Math.round(t.split*100)}%`,dim:!0,size:11}),r("last",{text:t.lastClicked?`last clicked: ${t.lastClicked}`:"click a button →",dim:!0,size:11}),r("hint",{text:"Drag the divider · drag the slider · resize the window — it all reflows.",dim:!0,size:11})])])]))])}const P=document.getElementById("c");u(P,{init:{split:.62,width01:.3,lastClicked:null,labels:Array.from({length:14},(t,e)=>`Button ${e+1}`)},update:S,view:z});g([{name:"main.ts",code:v},{name:"split.ts (shared)",code:y},{name:"widgets.ts (shared)",code:x}]);
