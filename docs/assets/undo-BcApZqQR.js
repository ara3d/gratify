import{p as i,m as h,d as c,h as s,v as l,S as p,L as u,R as d}from"./source-panel-D7B0FxD0.js";import{B as r}from"./widgets-DAP5Pepg.js";const m=n=>{const t=n==null?void 0:n.kind;return t==="undo"||t==="redo"};function f(n,t=200){return{init:{past:[],present:n.init,future:[]},update(e,o){if(m(o))return o.kind==="undo"&&e.past.length?{past:e.past.slice(0,-1),present:e.past[e.past.length-1],future:[e.present,...e.future]}:o.kind==="redo"&&e.future.length?{past:[...e.past,e.present],present:e.future[0],future:e.future.slice(1)}:e;const a=n.update(e.present,o);return a===e.present?e:{past:[...e.past,e.present].slice(-t),present:a,future:[]}},view:e=>n.view(e.present)}}const b=`// ============================================================================
// Example: undo — app-wide policies as update middleware.
//
// What to look for when you run it:
//   • This app knows NOTHING about history. Its update function below handles
//     add / remove / shuffle, nothing else. The single call \`withUndo(app)\` at
//     the bottom wraps it, adding {kind:"undo"} / {kind:"redo"} handling and
//     the past/present/future bookkeeping.
//   • Delete a dot, then press Undo: the dot pops back in through its ENTER
//     animation. To Gratify, undo is just another state change — so it
//     animates like every other state change.
//   • Press Shuffle: the hues cross-fade rather than snapping, because each
//     dot declares a \`hue\` CHANNEL that chases its prop.
// ============================================================================

import {
  mount,
  part,
  withUndo,       // the middleware: AppSpec → undoable AppSpec
  hsl,            // hue/saturation/lightness → Color
  Stack, Row, Label,
  v,
  GNode,
} from "gratify";
import { Button } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface ColoredDot {
  id: string;
  hue: number;    // 0..360
}

interface DotsDocument {
  dots: ColoredDot[];
  nextIdNumber: number;
}

type DotsIntent =
  | { kind: "add" }
  | { kind: "remove-last" }
  | { kind: "shuffle" };
// Note: "undo" and "redo" are NOT here — withUndo adds them.

function update(document: DotsDocument, intent: DotsIntent): DotsDocument {
  switch (intent.kind) {

    case "add": {
      const newDot: ColoredDot = {
        id: \`dot-\${document.nextIdNumber}\`,
        hue: (document.nextIdNumber * 47) % 360,   // spread hues around the wheel
      };
      return {
        nextIdNumber: document.nextIdNumber + 1,
        dots: [...document.dots, newDot],
      };
    }

    case "remove-last":
      return { ...document, dots: document.dots.slice(0, -1) };

    case "shuffle":
      return {
        ...document,
        dots: document.dots.map((dot) => ({ ...dot, hue: (dot.hue + 120) % 360 })),
      };
  }
}

// ── A dot widget with a declared channel ──────────────────────────────────────
//
// The \`hue\` channel chases the prop at a gentle rate, so when shuffle (or
// un-shuffle, via undo!) changes the prop, the drawn color eases over.

interface DotProps {
  hue: number;
}

const ColorDot = part<DotProps>("color-dot", {

  size: () => v(26, 26),

  channels: {
    hue: {
      target: (node: GNode<DotProps>) => node.props.hue,
      rate: 8,                       // exponential ease — no overshoot for color
    },
  },

  render(node, painter) {
    const animatedHue = node.ch.hue;
    const glowAmount = 6 + 6 * node.ch.hover;
    const radius = 11 + 2 * node.ch.hover;

    painter.glow(hsl(animatedHue, 0.8, 0.6), glowAmount, () =>
      painter.dot(node.rect.center, radius, hsl(animatedHue, 0.8, 0.62)));
  },
});

// ── View ──────────────────────────────────────────────────────────────────────

function view(document: DotsDocument) {
  return Stack("root", { gap: 16, pad: 48 }, [

    Label("title", { text: "Undoable dots", size: 20, weight: 600, bright: true }),

    Row("toolbar", { gap: 8 }, [
      Button("add", { label: "+ Dot", press: { kind: "add" }, accent: true }),
      Button("remove", { label: "Remove", press: { kind: "remove-last" }, danger: true }),
      Button("shuffle", { label: "Shuffle hues", press: { kind: "shuffle" } }),
    ]),

    // The dots themselves — keyed by id, so enter/exit animations work.
    Row("dots", { gap: 8 },
      document.dots.map((dot) => ColorDot(dot.id, { hue: dot.hue }))),

    // These buttons dispatch intents the app's update never sees:
    // withUndo intercepts them and walks the history instead.
    Row("history", { gap: 8 }, [
      Button("undo", { label: "⟲ Undo", press: { kind: "undo" } }),
      Button("redo", { label: "⟳ Redo", press: { kind: "redo" } }),
    ]),

    Label("hint", {
      text: "Delete a dot, then undo — it pops back in through its enter animation.",
      dim: true,
    }),
  ]);
}

// ── Mount — note the one-word difference: withUndo( … ) ──────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, withUndo({
  init: {
    dots: [
      { id: "dot-a", hue: 10 },
      { id: "dot-b", hue: 130 },
      { id: "dot-c", hue: 250 },
    ],
    nextIdNumber: 0,
  },
  update,
  view,
}));

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`;function w(n,t){switch(t.kind){case"add":{const e={id:`dot-${n.nextIdNumber}`,hue:n.nextIdNumber*47%360};return{nextIdNumber:n.nextIdNumber+1,dots:[...n.dots,e]}}case"remove-last":return{...n,dots:n.dots.slice(0,-1)};case"shuffle":return{...n,dots:n.dots.map(e=>({...e,hue:(e.hue+120)%360}))}}}const g=i("color-dot",{size:()=>l(26,26),channels:{hue:{target:n=>n.props.hue,rate:8}},render(n,t){const e=n.ch.hue,o=6+6*n.ch.hover,a=11+2*n.ch.hover;t.glow(s(e,.8,.6),o,()=>t.dot(n.rect.center,a,s(e,.8,.62)))}});function k(n){return p("root",{gap:16,pad:48},[u("title",{text:"Undoable dots",size:20,weight:600,bright:!0}),d("toolbar",{gap:8},[r("add",{label:"+ Dot",press:{kind:"add"},accent:!0}),r("remove",{label:"Remove",press:{kind:"remove-last"},danger:!0}),r("shuffle",{label:"Shuffle hues",press:{kind:"shuffle"}})]),d("dots",{gap:8},n.dots.map(t=>g(t.id,{hue:t.hue}))),d("history",{gap:8},[r("undo",{label:"⟲ Undo",press:{kind:"undo"}}),r("redo",{label:"⟳ Redo",press:{kind:"redo"}})]),u("hint",{text:"Delete a dot, then undo — it pops back in through its enter animation.",dim:!0})])}const v=document.getElementById("c");h(v,f({init:{dots:[{id:"dot-a",hue:10},{id:"dot-b",hue:130},{id:"dot-c",hue:250}],nextIdNumber:0},update:w,view:k}));c([{name:"main.ts",code:b}]);
