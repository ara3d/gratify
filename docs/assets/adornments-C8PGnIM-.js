import{p as a,r as m,a as p,v as r,c as i,b as g,m as x,P as u,S as v,L as h,d as c}from"./runtime-BQ2Zsp_3.js";import{w as y,B as w,a as d}from"./widgets-xXDkx298.js";import{a as k}from"./source-panel-CSqvtNlY.js";const f=`// ============================================================================
// Example: adornments — decoration by composition.
//
// An adornment is an overlay element anchored to a host widget: a tooltip, a
// badge, a resize grip, a close button. The \`adorn\` facet produces them, and
// \`addAdorn(...)\` APPENDS them to any widget — so you decorate a control that
// was never written to expect it.
//
// The \`Card\` part below knows nothing about tooltips, badges, or close buttons.
// Every decoration is layered on at the use site:
//
//   withExt(Card(id, props), tip("…"), badge(n), closable(intent))
//
// Adornments are ordinary keyed elements: they play enter/exit, they're
// themeable, they can carry their own interactors (the close button is a real
// button you click), and they draw on the overlay layer so they escape the
// host's bounds. Hover a card for a tooltip; click a card to bump its badge;
// click the × to remove it; Reset brings them all back.
// ============================================================================

import {
  addAdorn, at, calpha, cmix, Color, GNode, mount, PartExt, part, Press, rect,
  rgb, v, Vec, withExt, Stack, Label,
} from "gratify";
import { Button } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface Item { id: string; title: string; sub: string; tip: string; count: number; }
interface Doc { items: Item[]; }

type Intent =
  | { kind: "remove"; id: string }
  | { kind: "bump"; id: string }
  | { kind: "reset" };

const INITIAL: Item[] = [
  { id: "layers", title: "Layers", sub: "3 visible", tip: "The world / overlay / screen stack", count: 0 },
  { id: "springs", title: "Springs", sub: "stiff 240", tip: "Momentum and overshoot", count: 0 },
  { id: "channels", title: "Channels", sub: "hover · press", tip: "Numbers that chase targets", count: 2 },
  { id: "reconcile", title: "Reconcile", sub: "keyed", tip: "Identity survives rebuilds", count: 0 },
];

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "remove": return { items: doc.items.filter((i) => i.id !== intent.id) };
    case "bump": return { items: doc.items.map((i) => (i.id === intent.id ? { ...i, count: i.count + 1 } : i)) };
    case "reset": return { items: INITIAL };
  }
}

// ── The host widget — a plain card. It has NO idea it will be decorated. ──────

interface CardProps { title: string; sub: string; press: Intent; }

const Card = part<CardProps, { fill: Color; edge: Color; text: Color }>("card", {
  size: () => v(200, 62),
  style: (t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.4 * ch.hover + 0.6 * ch.press),
    edge: t.mix(t.muted, t.accent, ch.hover),
    text: t.mix(t.text, t.textBright, ch.hover),
  }),
  render(node, paint, s) {
    const r = node.rect;
    paint.box(r, 10, s.fill, s.edge, 1);
    paint.label(node.props.title, v(r.x + 14, r.center.y - 8), s.text, { align: "left", weight: 600 });
    paint.label(node.props.sub, v(r.x + 14, r.center.y + 10), calpha(s.text, 0.6), { align: "left", size: 11 });
  },
  on: [Press((node) => node.props.press)],   // clicking the body bumps the badge
});

// ── The adornment parts — small widgets that live on the overlay layer. ───────

// A tooltip bubble that self-centers above an anchor point (so it can overflow
// the host). Decorative — no interactors — so it stays transparent to clicks.
const Tooltip = part<{ text: string; anchor: Vec }>()("tooltip", {
  size: (props, measure) => v(measure.text(props.text).x + 20, 28),
  style: (t) => ({ bubble: cmix(t.bg, rgb(0, 0, 0), 0.45), edge: calpha(t.accent, 0.5), text: t.textBright, pointer: calpha(t.accent, 0.7) }),
  render(node, paint, s) {
    const a = node.props.anchor;
    const w = paint.measure.text(node.props.text).x + 20;
    const box = rect(a.x - w / 2, a.y - 34, w, 26);
    paint.glow(rgb(0, 0, 0), 12, () => paint.box(box, 7, s.bubble, s.edge, 1));
    paint.label(node.props.text, box.center, s.text, { size: 12 });
    paint.dot(v(a.x, a.y - 6), 2.5, s.pointer);   // a little pointer
  },
});

// A count badge at a corner. Decorative.
const Badge = part<{ count: number }>()("badge", {
  size: () => v(22, 22),
  style: (t) => ({ accent: t.accent, text: t.textBright }),
  render(node, paint, s) {
    const c = node.rect.center;
    paint.glow(s.accent, 8 * (0.5 + 0.5 * node.ch.enter), () => paint.dot(c, 10, s.accent));
    paint.label(String(node.props.count), c, s.text, { size: 11, weight: 700 });
  },
});

// A close button. INTERACTIVE — it carries its own Press, so clicking it emits
// the host's remove intent. It captures hover and clicks; the host does not.
const CloseButton = part<{ press: Intent }, { bg: Color; x: Color; pop: number }>("close-button", {
  size: () => v(22, 22),
  style: (t, ch) => ({
    bg: calpha(t.danger, 0.18 + 0.6 * ch.hover),
    x: t.mix(t.textDim, t.textBright, ch.hover),
    pop: ch.press,
  }),
  render(node, paint, s) {
    const c = node.rect.center, k = 4 * (1 - 0.3 * s.pop);
    paint.dot(c, 11, s.bg);
    paint.line(v(c.x - k, c.y - k), v(c.x + k, c.y + k), s.x, 2);
    paint.line(v(c.x - k, c.y + k), v(c.x + k, c.y - k), s.x, 2);
  },
  on: [Press((node) => node.props.press)],
});

// ── The adornment EXTENSIONS — the composable API. Each appends to \`adorn\`. ───
//
// These are the whole point: \`tip\`, \`badge\`, and \`closable\` decorate ANY
// widget, at its use site, with zero changes to the widget.

/** Show a tooltip above the host while it is hovered. */
const tip = (text: string): PartExt =>
  addAdorn((node: GNode<unknown>) => {
    if ((node.ch.hover ?? 0) < 0.5) return [];   // gated on the host's hover channel
    const anchor = v(node.rect.center.x, node.rect.y);
    return [at(Tooltip("tip", { text, anchor }), anchor)];
  });

/** Pin a count badge to the host's top-right corner (only when count > 0). */
const badge = (count: number): PartExt =>
  addAdorn((node: GNode<unknown>) =>
    count > 0 ? [at(Badge("badge", { count }), v(node.rect.right - 14, node.rect.y - 8))] : []);

/** Attach a close button that overhangs the host's top-left corner. */
const closable = (press: Intent): PartExt =>
  addAdorn((node: GNode<unknown>) =>
    [at(CloseButton("x", { press }), v(node.rect.x - 8, node.rect.y - 8))]);

// ── View ──────────────────────────────────────────────────────────────────────

function view(doc: Doc) {
  return Stack("root", { gap: 16, pad: 40 }, [

    Label("title", { text: "Adornments — decoration by composition", size: 18, weight: 600, bright: true }),
    Label("sub", { text: "hover a card for a tooltip · click a card to bump its badge · click × to remove", dim: true }),

    ...doc.items.map((item) =>
      // The card is decorated purely by layering extensions onto it. Every card
      // gets a tooltip + a close button; ones with a count also get a badge.
      withExt(
        Card(item.id, { title: item.title, sub: item.sub, press: { kind: "bump", id: item.id } }),
        tip(item.tip),
        closable({ kind: "remove", id: item.id }),
        ...(item.count > 0 ? [badge(item.count)] : []),
      )),

    Button("reset", { label: "Reset", press: { kind: "reset" }, accent: true }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, { init: { items: INITIAL }, update, view });

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`,b=[{id:"layers",title:"Layers",sub:"3 visible",tip:"The world / overlay / screen stack",count:0},{id:"springs",title:"Springs",sub:"stiff 240",tip:"Momentum and overshoot",count:0},{id:"channels",title:"Channels",sub:"hover · press",tip:"Numbers that chase targets",count:2},{id:"reconcile",title:"Reconcile",sub:"keyed",tip:"Identity survives rebuilds",count:0}];function I(t,e){switch(e.kind){case"remove":return{items:t.items.filter(n=>n.id!==e.id)};case"bump":return{items:t.items.map(n=>n.id===e.id?{...n,count:n.count+1}:n)};case"reset":return{items:b}}}const A=a("card",{size:()=>r(200,62),style:(t,e)=>({fill:t.mix(t.surface,t.surfaceHi,.4*e.hover+.6*e.press),edge:t.mix(t.muted,t.accent,e.hover),text:t.mix(t.text,t.textBright,e.hover)}),render(t,e,n){const o=t.rect;e.box(o,10,n.fill,n.edge,1),e.label(t.props.title,r(o.x+14,o.center.y-8),n.text,{align:"left",weight:600}),e.label(t.props.sub,r(o.x+14,o.center.y+10),i(n.text,.6),{align:"left",size:11})},on:[u(t=>t.props.press)]}),B=a()("tooltip",{size:(t,e)=>r(e.text(t.text).x+20,28),style:t=>({bubble:g(t.bg,p(0,0,0),.45),edge:i(t.accent,.5),text:t.textBright,pointer:i(t.accent,.7)}),render(t,e,n){const o=t.props.anchor,s=e.measure.text(t.props.text).x+20,l=m(o.x-s/2,o.y-34,s,26);e.glow(p(0,0,0),12,()=>e.box(l,7,n.bubble,n.edge,1)),e.label(t.props.text,l.center,n.text,{size:12}),e.dot(r(o.x,o.y-6),2.5,n.pointer)}}),C=a()("badge",{size:()=>r(22,22),style:t=>({accent:t.accent,text:t.textBright}),render(t,e,n){const o=t.rect.center;e.glow(n.accent,8*(.5+.5*t.ch.enter),()=>e.dot(o,10,n.accent)),e.label(String(t.props.count),o,n.text,{size:11,weight:700})}}),E=a("close-button",{size:()=>r(22,22),style:(t,e)=>({bg:i(t.danger,.18+.6*e.hover),x:t.mix(t.textDim,t.textBright,e.hover),pop:e.press}),render(t,e,n){const o=t.rect.center,s=4*(1-.3*n.pop);e.dot(o,11,n.bg),e.line(r(o.x-s,o.y-s),r(o.x+s,o.y+s),n.x,2),e.line(r(o.x-s,o.y+s),r(o.x+s,o.y-s),n.x,2)},on:[u(t=>t.props.press)]}),T=t=>d(e=>{if((e.ch.hover??0)<.5)return[];const n=r(e.rect.center.x,e.rect.y);return[c(B("tip",{text:t,anchor:n}),n)]}),P=t=>d(e=>t>0?[c(C("badge",{count:t}),r(e.rect.right-14,e.rect.y-8))]:[]),S=t=>d(e=>[c(E("x",{press:t}),r(e.rect.x-8,e.rect.y-8))]);function z(t){return v("root",{gap:16,pad:40},[h("title",{text:"Adornments — decoration by composition",size:18,weight:600,bright:!0}),h("sub",{text:"hover a card for a tooltip · click a card to bump its badge · click × to remove",dim:!0}),...t.items.map(e=>y(A(e.id,{title:e.title,sub:e.sub,press:{kind:"bump",id:e.id}}),T(e.tip),S({kind:"remove",id:e.id}),...e.count>0?[P(e.count)]:[])),w("reset",{label:"Reset",press:{kind:"reset"},accent:!0})])}const N=document.getElementById("c");x(N,{init:{items:b},update:I,view:z});k([{name:"main.ts",code:f}]);
