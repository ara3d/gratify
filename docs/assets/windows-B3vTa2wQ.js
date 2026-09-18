import{v as r,I as z,q as x,p as m,R as T,i as O,c as d,a as F,n as N,S as b,r as f,m as $,w as R,y as P,d as C,L as p,g as H,t as K,F as U}from"./runtime-BaMoeUMO.js";import{B as h,L as y,S as L,e as _,c as A}from"./widgets-BJEltdMZ.js";import{a as V}from"./source-panel-CSqvtNlY.js";const Z={order:[],byId:{}},S=e=>new z(e.pos.x,e.pos.y,e.size.x,e.size.y);function B(e,n,t){if(n.x<e.x-t||n.x>e.right+t||n.y<e.y-t||n.y>e.bottom+t)return null;const o=n.y<=e.y+t,i=n.y>=e.bottom-t,a=n.x<=e.x+t,s=n.x>=e.right-t,I=(o?"n":i?"s":"")+(s?"e":a?"w":"");return I===""?null:I}function G(e,n,t,o){let{x:i,y:a}=e.pos,{x:s,y:c}=e.size;if(n.includes("e")&&(s=Math.max(o.x,s+t.x)),n.includes("s")&&(c=Math.max(o.y,c+t.y)),n.includes("w")){const l=Math.max(o.x,s-t.x);i+=s-l,s=l}if(n.includes("n")){const l=Math.max(o.y,c-t.y);a+=c-l,c=l}return{pos:r(i,a),size:r(s,c)}}function j(e,n,t){const o=S(e),i=(c,l)=>Math.abs(c-l)<=t,a=i(o.x,n.x)?n.x:i(o.right,n.right)?n.right-o.w:o.x,s=i(o.y,n.y)?n.y:i(o.bottom,n.bottom)?n.bottom-o.h:o.y;return{...e,pos:r(a,s)}}function J(e,n,t){const o=x(e.pos.x,n.x-e.size.x+t,n.right-t),i=x(e.pos.y,n.y,Math.max(n.y,n.bottom-t));return{...e,pos:r(o,i)}}function Q(e,n,t,o=28,i=8){const a=e%i;return{pos:r(t.x+a*o,t.y+a*o),size:n}}function X(e,n,t,o=8){return new z(e.x+n*(t.x+o),e.bottom-t.y,t.x,t.y)}function Y(e,n,t,o){switch(e.mode){case"normal":return S(e.frame);case"maximized":return n;case"minimized":return X(n,t,o)}}function q(e){for(let n=e.order.length-1;n>=0;n--){const t=e.byId[e.order[n]];if(t&&t.mode!=="minimized")return t.id}}const ee=e=>e.order.map(n=>e.byId[n]).filter(n=>n!==void 0);function u(e,n){return!e.byId[n]||e.order[e.order.length-1]===n?e:{...e,order:[...e.order.filter(t=>t!==n),n]}}function ne(e,n){return u({order:e.order.includes(n.id)?e.order:[...e.order,n.id],byId:{...e.byId,[n.id]:n}},n.id)}function te(e,n){if(!e.byId[n])return e;const t={...e.byId};return delete t[n],{order:e.order.filter(o=>o!==n),byId:t}}const w=(e,n,t)=>e.byId[n]?{...e,byId:{...e.byId,[n]:t(e.byId[n])}}:e;function oe(e,n){switch(n.kind){case"focus":return u(e,n.id);case"close":return te(e,n.id);case"minimize":return w(e,n.id,t=>({...t,mode:"minimized"}));case"restore":return u(w(e,n.id,t=>({...t,mode:"normal"})),n.id);case"toggle-max":return u(w(e,n.id,t=>({...t,mode:t.mode==="maximized"?"normal":"maximized"})),n.id);case"frame":return u(w(e,n.id,t=>({...t,frame:n.frame})),n.id)}}const W=36,M=r(176,W),ie=14,k=7,re=10,se=56,E=22,v=(e,n)=>Number.isFinite(e)?e:n,ae=m("window-control").props().intrinsic(E,E).style((e,n,t)=>{const o=t.kind==="close"?e.danger:t.kind==="minimize"?e.accent2:e.accent;return{fill:e.mix(d(e.textBright,.16),o,n.hover),glyph:d(e.textBright,.45+.55*n.hover),halo:o,blur:12*n.hover,r:6.5+1.5*n.hover-1.5*n.press}}).render((e,n,t)=>{const o=e.rect.center,i=t.r*.42;switch(n.glow(t.halo,t.blur,()=>n.dot(o,t.r,t.fill)),e.props.kind){case"close":n.line(r(o.x-i,o.y-i),r(o.x+i,o.y+i),t.glyph,1.6),n.line(r(o.x-i,o.y+i),r(o.x+i,o.y-i),t.glyph,1.6);break;case"minimize":n.line(r(o.x-i,o.y),r(o.x+i,o.y),t.glyph,1.6);break;case"maximize":n.box(f(o.x-i,o.y-i,2*i,2*i),1.5,d(t.glyph,0),t.glyph,1.4);break;case"restore":n.box(f(o.x-i,o.y-i*.3,1.3*i,1.3*i),1,d(t.glyph,0),t.glyph,1.3),n.box(f(o.x-i*.3,o.y-i,1.3*i,1.3*i),1,d(t.glyph,0),t.glyph,1.3);break}}).press(e=>e.props.to).semantics(e=>({role:"button",label:e.props.kind})),de=m("window-title").props().measure((e,n)=>r(v(n.x,240),W)).arrange((e,n,t)=>t.map(o=>new z(n.right-10-o.size.x,n.y+(n.h-o.size.y)/2,o.size.x,o.size.y))).channels({active:{target:e=>e.props.active?1:0,rate:12}}).style((e,n)=>({band:d(e.textBright,.035),rule:d(e.textBright,.07),text:e.mix(e.textDim,e.textBright,n.active)})).render((e,n,t)=>{const o=e.rect;n.box(o,0,t.band),n.line(r(o.x,o.bottom-.5),r(o.right,o.bottom-.5),t.rule,1),n.label(e.props.title,r(o.x+14,o.center.y),t.text,{align:"left",weight:600,size:13})}),ce=m("window-chrome").props().defaults({pad:0,gap:0,align:"stretch"}).measure((e,n,t)=>{const o=e.mode==="maximized"?r(v(n.x,e.size.x),v(n.y,e.size.y)):e.mode==="minimized"?M:e.size;return t.children(r(o.x,1/0)),o}).arrange(b.def.arrange).clip(),le=m("window-content").props().defaults({pad:14,gap:10,align:"stretch"}).measure(b.def.measure).arrange(b.def.arrange),me=e=>e?f(0,0,e.w,e.h):void 0,pe=m("window").props().defaults({mode:"normal",active:!1,minSize:r(180,120)}).body((e,n)=>{const t=e.mode==="minimized",o=(a,s)=>ae(a,{kind:a,to:e.to(s)}),i=t?[o("close",{kind:"close",id:e.id})]:[o("minimize",{kind:"minimize",id:e.id}),o(e.mode==="maximized"?"restore":"maximize",{kind:"toggle-max",id:e.id}),o("close",{kind:"close",id:e.id})];return[ce("chrome",{mode:e.mode,size:e.frame.size},[de("title",{title:e.title,active:e.active},[T("controls",{gap:4},i)]),...t?[]:[O(le("content",{},n))]])]}).channels({active:{target:e=>e.props.active?1:0,rate:12},max:{target:e=>e.props.mode==="maximized"?1:0,rate:14},mini:{target:e=>e.props.mode==="minimized"?1:0,rate:14},edge:{target:e=>e.ch.hover>.5&&e.pointer&&B(e.rect,e.pointer,k)?1:0,rate:16}}).style((e,n)=>{const t=x(n.active,0,1),o=x(n.drag,0,1),i=Math.max(t,.6*n.focus);return{fill:d(e.mix(e.bg,e.surface,.78),.94),edge:e.mix(d(e.textBright,.14),d(e.accent,.8),Math.max(i,n.edge)),edgeW:1+.6*n.edge,sheen:d(e.textBright,.1+.08*i),shadow:d(F(0,0,0),.32+.28*i+.2*o),blur:12+20*i+16*o,corner:(ie+6*n.mini)*(1-n.max),lift:5*o,scale:1+.012*o,grip:d(e.mix(e.textDim,e.accent,n.edge),(.35+.65*n.edge)*(1-n.max)*(1-n.mini))}}).render((e,n,t)=>{const o=e.rect;n.translate(0,-t.lift),n.scaleAt(o.center.x,o.center.y,t.scale),n.glow(t.shadow,t.blur,()=>n.box(o,t.corner,t.fill)),n.box(o,t.corner,d(t.fill,0),t.edge,t.edgeW),n.line(r(o.x+t.corner,o.y+1.5),r(o.right-t.corner,o.y+1.5),t.sheen,1);for(const i of[4,8,12])n.line(r(o.right-4,o.bottom-i),r(o.right-i,o.bottom-4),t.grip,1.2)}).hit((e,n)=>e.rect.inset(-k).contains(n)).on(N()).press(e=>e.props.to(e.props.mode==="minimized"?{kind:"restore",id:e.props.id}:{kind:"focus",id:e.props.id})).gesture({begin:(e,n)=>{if(e.props.mode!=="normal")return null;const t=B(e.rect,n,k);return t?{kind:"resize",edge:t,start:e.props.frame,p0:n}:n.y<e.rect.y+W?{kind:"move",grab:r(n.x-e.rect.x,n.y-e.rect.y),size:e.props.frame.size}:null},during:(e,n,t)=>{const o=me(n.view);if(e.kind==="resize")return n.props.to({kind:"frame",id:n.props.id,frame:G(e.start,e.edge,r(t.x-e.p0.x,t.y-e.p0.y),n.props.minSize)});let i={pos:r(t.x-e.grab.x,t.y-e.grab.y),size:e.size};return o&&(i=J(j(i,o,re),o,se)),n.props.to({kind:"frame",id:n.props.id,frame:i})}}).semantics(e=>({role:"window",label:e.props.title,value:e.props.mode})),ue=m("desktop").props().defaults({inset:0}).measure((e,n,t)=>(t.children(r(n.x-2*e.inset,n.y-2*e.inset)),n)).arrange((e,n,t)=>{const o=n.inset(e.inset);let i=0;return t.map(a=>{const s=a.props,c=s.mode??"normal";return c==="normal"?S(s.frame):Y({id:s.id,frame:s.frame,mode:c},o,c==="minimized"?i++:0,M)})}),he=`// ============================================================================
// Example: windows — floating glass windows on a desktop.
//
// The app Doc holds a \`WindowSet\` (window-math.ts) next to its own settings.
// The view lays a \`Desktop\` of \`Window\`s over an aurora backdrop, with a HUD
// bar on top. Every window emits \`WindowEvent\`s through one \`to\` prop, and
// \`update\` hands them to \`reduceWindows\` — the app never touches z-order or
// frames by hand.
//
// Try: drag a title bar (the window lifts, edges snap to the screen) · drag
// any edge or corner · hover the dots · minimize (it glides into the dock;
// click the pill to bring it back) · maximize (corners square off) · close
// (it shrinks away) · New window · Theme.
// ============================================================================

import {
  activeWindowId, at, calpha, cascadeFrame, Desktop, Element, emptyWindowSet, Flow, Free, Label, Layers, mount,
  openWindow, part, reduceWindows, Row, setTheme, Stack, themeName, v, Window, WindowEvent, windowsOf,
  WindowSet,
} from "gratify";
import { Button, Checkbox, Labeled, Slider, Toggle } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

type Kind = "inspector" | "palette" | "notes";

interface Doc {
  windows: WindowSet;
  kinds: Record<string, Kind>;
  next: number;
  volume: number;
  bass: number;
  shuffle: boolean;
  loop: boolean;
  swatch: string | null;
}

type Intent =
  | { kind: "window"; ev: WindowEvent }
  | { kind: "open"; what: Kind }
  | { kind: "theme" }
  | { kind: "volume"; value: number }
  | { kind: "bass"; value: number }
  | { kind: "shuffle" }
  | { kind: "loop" }
  | { kind: "swatch"; name: string };

const SIZES: Record<Kind, { x: number; y: number }> = {
  inspector: v(300, 250),
  palette: v(340, 210),
  notes: v(320, 180),
};

function open(doc: Doc, what: Kind): Doc {
  const id = \`\${what}-\${doc.next}\`;
  return {
    ...doc,
    next: doc.next + 1,
    kinds: { ...doc.kinds, [id]: what },
    windows: openWindow(doc.windows, { id, frame: cascadeFrame(doc.next, SIZES[what], v(80, 72)), mode: "normal" }),
  };
}

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "window": return { ...doc, windows: reduceWindows(doc.windows, intent.ev) };
    case "open": return open(doc, intent.what);
    case "theme": setTheme(themeName === "dark" ? "light" : "dark"); return doc;
    case "volume": return { ...doc, volume: intent.value };
    case "bass": return { ...doc, bass: intent.value };
    case "shuffle": return { ...doc, shuffle: !doc.shuffle };
    case "loop": return { ...doc, loop: !doc.loop };
    case "swatch": return { ...doc, swatch: intent.name };
  }
}

// ── Backdrop — an aurora of soft glows and a dot grid, under everything ───────

const Backdrop = part("backdrop")
  .props<Record<string, never>>()
  .fill()
  .style((t) => ({
    a: calpha(t.accent, 0.16),
    b: calpha(t.accent2, 0.14),
    dots: calpha(t.textDim, 0.18),
  }))
  .render((n, p, s) => {
    const r = n.rect;
    // no gradients in the painter: stacked translucent discs fake a soft falloff
    const bloom = (c: { x: number; y: number }, radius: number, color: typeof s.a) => {
      for (let i = 1; i <= 24; i++) p.dot(c, radius * (i / 24), calpha(color, 1 / 24));
    };
    bloom(v(r.w * 0.22, r.h * 0.3), r.h * 0.5, s.a);
    bloom(v(r.w * 0.78, r.h * 0.72), r.h * 0.55, s.b);
    for (let x = 24; x < r.w; x += 24) for (let y = 24; y < r.h; y += 24) p.dot(v(x, y), 0.8, s.dots);
  });

// ── Window contents — plain elements dropped into each window's slot ──────────

const Swatch = part("swatch")
  .props<{ name: string; hue: number; picked: boolean }>()
  .intrinsic(44, 44)
  .style((t, ch, p) => ({
    fill: { r: 128 + 110 * Math.cos(p.hue), g: 128 + 110 * Math.cos(p.hue + 2.1), b: 128 + 110 * Math.cos(p.hue + 4.2), a: 1 },
    ring: t.mix(calpha(t.textBright, 0), t.textBright, p.picked ? 1 : 0.5 * ch.hover),
    lift: 2 * ch.hover - 2 * ch.press,
  }))
  .render((n, p, s) => {
    const r = n.rect.raise(s.lift);
    p.glow(s.fill, 10, () => p.box(r, 10, s.fill, s.ring, 2));
  })
  .press((n) => ({ kind: "swatch", name: n.props.name }));

const HUES = ["coral", "amber", "lime", "mint", "sky", "iris", "plum", "rose"];

function contentOf(doc: Doc, id: string): Element[] {
  switch (doc.kinds[id]) {
    case "inspector": return [
      Labeled("vol", "Volume", Slider("vol/s", { value: doc.volume, set: (value) => ({ kind: "volume", value }) })),
      Labeled("bass", "Bass", Slider("bass/s", { value: doc.bass, set: (value) => ({ kind: "bass", value }) })),
      Labeled("shuffle", "Shuffle", Toggle("shuffle/t", { on: doc.shuffle, flip: { kind: "shuffle" } }), { kind: "shuffle" }),
      Checkbox("loop", { on: doc.loop, toggle: { kind: "loop" }, label: "Loop the playlist" }),
      Label("readout", { text: \`volume \${Math.round(doc.volume * 100)}  ·  bass \${Math.round(doc.bass * 100)}\`, dim: true, size: 11 }),
    ];
    case "palette": return [
      Flow("chips", { gap: 8, pad: 0 }, HUES.map((name, i) => Swatch(name, { name, hue: (i / HUES.length) * Math.PI * 2, picked: doc.swatch === name }))),
      Label("picked", { text: doc.swatch ? \`picked: \${doc.swatch}\` : "pick a swatch", dim: true, size: 11 }),
    ];
    case "notes": return [
      Label("l1", { text: "Windows are ordinary keyed elements.", size: 12 }),
      Label("l2", { text: "Open pops in, close shrinks away, minimize glides", dim: true, size: 11 }),
      Label("l3", { text: "into the dock — none of it is animation code.", dim: true, size: 11 }),
      Label("l4", { text: "Drag any edge. Corners resize diagonally.", dim: true, size: 11 }),
    ];
    default: return [];
  }
}

const TITLES: Record<Kind, string> = { inspector: "Inspector", palette: "Palette", notes: "Notes" };

// ── View ──────────────────────────────────────────────────────────────────────

function view(doc: Doc): Element {
  const active = activeWindowId(doc.windows);
  const to = (ev: WindowEvent): Intent => ({ kind: "window", ev });
  return Layers("root", {}, [
    Backdrop("bg", {}),
    Desktop("desk", { inset: 12 }, windowsOf(doc.windows).map((rec) =>
      Window(rec.id, { ...rec, title: \`\${TITLES[doc.kinds[rec.id]]} \${rec.id.split("-")[1]}\`, active: rec.id === active, to },
        contentOf(doc, rec.id)))),
    // the HUD sits below the page's "← gallery" link
    Free("hud", {}, [
      at(Stack("bar", { gap: 6 }, [
        Row("buttons", { gap: 8 }, [
          Button("inspector", { label: "+ Inspector", press: { kind: "open", what: "inspector" }, accent: true }),
          Button("palette", { label: "+ Palette", press: { kind: "open", what: "palette" } }),
          Button("notes", { label: "+ Notes", press: { kind: "open", what: "notes" } }),
          Button("theme", { label: "Theme", press: { kind: "theme" } }),
        ]),
        Label("hint", { text: "drag titles and edges · hover the dots · minimize to the dock", dim: true, size: 11 }),
      ]), v(16, 36)),
    ]),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

const seed: Doc = { windows: emptyWindowSet, kinds: {}, next: 1, volume: 0.62, bass: 0.35, shuffle: true, loop: false, swatch: null };
const init = open(open(open(seed, "notes"), "palette"), "inspector");

mount(canvas, { init, update, view });

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`,we={inspector:r(300,250),palette:r(340,210),notes:r(320,180)};function g(e,n){const t=`${n}-${e.next}`;return{...e,next:e.next+1,kinds:{...e.kinds,[t]:n},windows:ne(e.windows,{id:t,frame:Q(e.next,we[n],r(80,72)),mode:"normal"})}}function fe(e,n){switch(n.kind){case"window":return{...e,windows:oe(e.windows,n.ev)};case"open":return g(e,n.what);case"theme":return H(K==="dark"?"light":"dark"),e;case"volume":return{...e,volume:n.value};case"bass":return{...e,bass:n.value};case"shuffle":return{...e,shuffle:!e.shuffle};case"loop":return{...e,loop:!e.loop};case"swatch":return{...e,swatch:n.name}}}const ge=m("backdrop").props().fill().style(e=>({a:d(e.accent,.16),b:d(e.accent2,.14),dots:d(e.textDim,.18)})).render((e,n,t)=>{const o=e.rect,i=(a,s,c)=>{for(let l=1;l<=24;l++)n.dot(a,s*(l/24),d(c,1/24))};i(r(o.w*.22,o.h*.3),o.h*.5,t.a),i(r(o.w*.78,o.h*.72),o.h*.55,t.b);for(let a=24;a<o.w;a+=24)for(let s=24;s<o.h;s+=24)n.dot(r(a,s),.8,t.dots)}),xe=m("swatch").props().intrinsic(44,44).style((e,n,t)=>({fill:{r:128+110*Math.cos(t.hue),g:128+110*Math.cos(t.hue+2.1),b:128+110*Math.cos(t.hue+4.2),a:1},ring:e.mix(d(e.textBright,0),e.textBright,t.picked?1:.5*n.hover),lift:2*n.hover-2*n.press})).render((e,n,t)=>{const o=e.rect.raise(t.lift);n.glow(t.fill,10,()=>n.box(o,10,t.fill,t.ring,2))}).press(e=>({kind:"swatch",name:e.props.name})),D=["coral","amber","lime","mint","sky","iris","plum","rose"];function be(e,n){switch(e.kinds[n]){case"inspector":return[y("vol","Volume",L("vol/s",{value:e.volume,set:t=>({kind:"volume",value:t})})),y("bass","Bass",L("bass/s",{value:e.bass,set:t=>({kind:"bass",value:t})})),y("shuffle","Shuffle",_("shuffle/t",{on:e.shuffle,flip:{kind:"shuffle"}}),{kind:"shuffle"}),A("loop",{on:e.loop,toggle:{kind:"loop"},label:"Loop the playlist"}),p("readout",{text:`volume ${Math.round(e.volume*100)}  ·  bass ${Math.round(e.bass*100)}`,dim:!0,size:11})];case"palette":return[U("chips",{gap:8,pad:0},D.map((t,o)=>xe(t,{name:t,hue:o/D.length*Math.PI*2,picked:e.swatch===t}))),p("picked",{text:e.swatch?`picked: ${e.swatch}`:"pick a swatch",dim:!0,size:11})];case"notes":return[p("l1",{text:"Windows are ordinary keyed elements.",size:12}),p("l2",{text:"Open pops in, close shrinks away, minimize glides",dim:!0,size:11}),p("l3",{text:"into the dock — none of it is animation code.",dim:!0,size:11}),p("l4",{text:"Drag any edge. Corners resize diagonally.",dim:!0,size:11})];default:return[]}}const ye={inspector:"Inspector",palette:"Palette",notes:"Notes"};function ke(e){const n=q(e.windows),t=o=>({kind:"window",ev:o});return R("root",{},[ge("bg",{}),ue("desk",{inset:12},ee(e.windows).map(o=>pe(o.id,{...o,title:`${ye[e.kinds[o.id]]} ${o.id.split("-")[1]}`,active:o.id===n,to:t},be(e,o.id)))),P("hud",{},[C(b("bar",{gap:6},[T("buttons",{gap:8},[h("inspector",{label:"+ Inspector",press:{kind:"open",what:"inspector"},accent:!0}),h("palette",{label:"+ Palette",press:{kind:"open",what:"palette"}}),h("notes",{label:"+ Notes",press:{kind:"open",what:"notes"}}),h("theme",{label:"Theme",press:{kind:"theme"}})]),p("hint",{text:"drag titles and edges · hover the dots · minimize to the dock",dim:!0,size:11})]),r(16,36))])])}const ve=document.getElementById("c"),ze={windows:Z,kinds:{},next:1,volume:.62,bass:.35,shuffle:!0,loop:!1,swatch:null},Se=g(g(g(ze,"notes"),"palette"),"inspector");$(ve,{init:Se,update:fe,view:ke});V([{name:"main.ts",code:he}]);
