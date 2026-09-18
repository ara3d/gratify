import{p as d,v as c,c as p,r as h,q as g,u as z,s as L,m as D,S as u,R,w as C,K as N,L as k}from"./runtime-BaMoeUMO.js";import{w as O,b as F,L as M,S as H,e as V,B as $}from"./widgets-BJEltdMZ.js";import{i as B,c as P,o as S,g as _,b as T,q as I,r as y,a as K,e as G}from"./paint-DLsGtfYH.js";import{a as q}from"./source-panel-CSqvtNlY.js";const U=d("ts-backdrop").props().fill().style(e=>({a:e.accent,b:e.accent2,mote:e.textBright,line:p(e.textDim,.08)})).render((e,t,n)=>{const r=e.time??0,s=e.rect,o=s.center,i=e.pointer?(e.pointer.x-o.x)/s.w:0,l=e.pointer?(e.pointer.y-o.y)/s.h:0;T(t,c(s.w*.25+40*Math.sin(r*.13)-i*20,s.h*.35-l*20),s.h*.7,n.a,.16),T(t,c(s.w*.8+30*Math.cos(r*.1)-i*30,s.h*.75-l*30),s.h*.6,n.b,.14);for(let a=0;a<s.h;a+=48)t.line(c(0,a),c(s.w,a),n.line,1);for(let a=0;a<70;a++){const m=.3+.7*y(a,3),x=8+18*m,b=I(y(a,1)*s.w+Math.sin(r*.3+a)*12-i*40*m,s.w),f=I(y(a,2)*s.h-r*x-l*40*m,s.h),w=.5+.5*Math.sin(r*(1+y(a,4))+a);t.dot(c(b,f),.6+1.6*m,p(n.mote,.12+.35*m*w))}}).press(e=>e.props.attract?e.props.begin(e.time??0):void 0),W=d("ts-title").props().size((e,t)=>c(Math.max(t.text(e.text,46).x+20,320),90)).style(e=>({text:e.textBright,glow:e.accent,sheen:e.textBright,sub:e.textDim})).render((e,t,n)=>{const r=e.time??0,s=e.rect,o=c(s.x+s.w/2,s.y+34),i={size:46,weight:800};t.glow(n.glow,14+12*P(r,3),()=>t.label(e.props.text,o,n.text,i));const l=K(r,4.5,1.2);if(l!==null){const a=s.x-40+(s.w+80)*l;for(const[m,x]of[[26,.25],[12,.45],[4,.9]])t.push(),t.clip(h(a-m/2,s.y,m,70)),t.label(e.props.text,o,p(n.sheen,x),i),t.pop()}t.label(e.props.sub,c(o.x,s.y+74),n.sub,{size:12,weight:600})}),Y=d("ts-prompt").props().size((e,t)=>c(t.text(e.text,13).x+40,30)).style(e=>({text:e.textBright,edge:e.accent})).render((e,t,n)=>{const r=e.time??0,s=e.rect,o=.3+.7*G(r,1.6,.6,.25);t.box(s,15,p(n.edge,.08*o),p(n.edge,.5*o),1),t.label(e.props.text,s.center,p(n.text,o),{size:13,weight:700})}),j=d("ts-menu-item").props().size(()=>c(250,42)).channels({sel:{target:e=>e.props.selected?1:0,spring:{stiffness:260,damping:18}},dim:{target:e=>e.props.dimmed?1:0,rate:8}}).style((e,t)=>{const n=Math.max(g(t.sel,0,1),t.hover);return{text:e.mix(e.text,e.textBright,n),bar:e.accent,fill:p(e.accent,.12*n),glow:14*n,shift:14*t.sel+4*t.hover,tick:e.textBright}}).render((e,t,n)=>{const r=e.time??0,s=e.rect,o=S(r,e.props.enteredAt,e.props.index,.07,.45),i=z(o),l=e.props.selected?_(r,e.props.selectedAt,.25):0;t.push(),t.alpha(i*(1-.7*e.ch.dim)),t.translate(-40*(1-i)-24*e.ch.dim,0),t.box(s,8,n.fill);const a=g(e.ch.sel,0,1);a>.01&&t.glow(n.bar,n.glow,()=>t.box(h(s.x,s.center.y-12*a,4,24*a),2,n.bar)),t.label(e.props.label,c(s.x+22+n.shift,s.center.y),n.text,{align:"left",size:17,weight:600}),l>0&&t.box(h(s.x+14,s.y+4,s.w-28,s.h-8),6,p(n.tick,.18*l)),t.pop()}).press(e=>e.props.open(e.props.index,e.time??0)),J=d("ts-panel-slot").props().measure(e=>c(e.w,e.h)).arrange((e,t,n)=>n.map(r=>h(t.x+24,t.y+68,r.size.x,r.size.y))),Q=d("ts-panel").props().defaults({w:380,h:330}).style(e=>({fill:p(e.surface,.72),edge:e.mix(e.muted,e.accent,.4),title:e.textBright,rule:p(e.accent,.5)})).render((e,t,n)=>{const r=e.rect,s=g(e.ch.enter,0,1);t.push(),t.translate(60*(1-z(s)),0),t.glow(n.edge,16,()=>t.box(r,14,n.fill,n.edge,1)),t.label(e.props.title,c(r.x+24,r.y+30),n.title,{align:"left",size:18,weight:800}),t.box(h(r.x+24,r.y+48,60,2),1,n.rule),t.pop()}).body((e,t)=>[J("slot",{w:e.w,h:e.h},t)]),X=d("ts-segmented").props().size(e=>c(e.options.length*96,36)).channels({pos:{target:e=>e.props.index,spring:{stiffness:300,damping:20}}}).style((e,t)=>({track:p(e.bg,.5),edge:e.muted,pill:e.accent,on:e.textBright,off:e.mix(e.textDim,e.text,t.hover)})).render((e,t,n)=>{const r=e.rect,s=r.w/e.props.options.length,o=e.ch.pos;t.box(r,18,n.track,n.edge,1);const i=1+.25*Math.min(1,Math.abs(o-e.props.index));t.glow(n.pill,10,()=>t.box(h(r.x+3+s*o-(s-6)*(i-1)/2,r.y+3,(s-6)*i,r.h-6),15,n.pill)),e.props.options.forEach((l,a)=>{const m=1-g(Math.abs(o-a),0,1);t.label(l,c(r.x+s*(a+.5),r.center.y),p(m>.5?n.on:n.off,1),{size:12,weight:700})})}).press(e=>{const t=e.rect.w/e.props.options.length,n=e.pointer?g(Math.floor((e.pointer.x-e.rect.x)/t),0,e.props.options.length-1):e.props.index;return e.props.pick(n)}),Z=d("ts-slot").props().size(()=>c(330,56)).channels({fill:{target:e=>e.props.progress*S(e.time??0,e.props.enteredAt,e.props.index,.1,.6),spring:{stiffness:120,damping:14}}}).style((e,t,n)=>({...L(e,t,{tint:n.picked?e.accent:void 0}),bar:e.accent,track:e.muted,name:e.textBright,where:e.textDim,corner:10})).render((e,t,n)=>{const r=e.time??0,s=e.rect,o=z(S(r,e.props.enteredAt,e.props.index,.1,.5));t.push(),t.alpha(o),t.translate(0,16*(1-o)),t.box(s,n.corner,n.fill,n.edge,1),t.label(e.props.name,c(s.x+14,s.y+18),n.name,{align:"left",size:13,weight:700}),t.label(e.props.where,c(s.right-14,s.y+18),n.where,{align:"right",size:11});const i=h(s.x+14,s.bottom-16,s.w-28,6);t.box(i,3,n.track),t.box(h(i.x,i.y,i.w*g(e.ch.fill,0,1),i.h),3,n.bar),t.pop()}).press(e=>e.props.pick(e.props.index)),ee=d("ts-hints").props().size((e,t)=>c(e.hints.reduce((n,[r,s])=>n+t.text(r,10).x+t.text(s,11).x+44,0),24)).channels({on:{target:e=>e.props.shown?1:0,rate:5}}).style(e=>({key:e.textBright,keyFace:e.surfaceHi,text:e.textDim})).render((e,t,n)=>{const r=e.rect,s=e.ch.on;if(s<.01)return;let o=r.x;for(const[i,l]of e.props.hints){const a=t.measure.text(i,10).x+12;t.box(h(o,r.y+3,a,18),4,p(n.keyFace,s),p(n.key,.4*s),1),t.label(i,c(o+a/2,r.center.y),p(n.key,s),{size:10,weight:700,mono:!0}),o+=a+8,t.label(l,c(o,r.center.y),p(n.text,s),{align:"left",size:11}),o+=t.measure.text(l,11).x+24}}),te=d("ts-emblem").props().size(()=>c(64,64)).style(e=>({a:e.accent,b:e.accent2,core:e.textBright})).render((e,t,n)=>{const r=e.time??0,s=e.rect.center;t.glow(n.a,12,()=>t.poly(B(s,26,6,r*.25),p(n.a,0),n.a,1.5)),t.poly(B(s,18,6,-r*.4),p(n.b,.25),n.b,1.5),t.dot(s,4+2*P(r,2),n.core)}),ne=d("ts-version").props().size((e,t)=>c(t.text(e.text,10).x+4,14)).style(e=>({text:p(e.textDim,.7)})).render((e,t,n)=>t.label(e.props.text,c(e.rect.x,e.rect.center.y),n.text,{align:"left",size:10,mono:!0})),se=d("ts-screen").props().fill().arrange((e,t,n)=>{var l,a,m;const r=t.x+Math.max(56,t.w*.08),s=r+(((l=n[0])==null?void 0:l.size.x)??0),o=((a=n[1])==null?void 0:a.size.x)??0,i=[c(r,t.y+t.h*.18),c(Math.max(s+40,Math.min(t.x+t.w*.55,t.right-o-24)),t.y+t.h*.2),c(t.x+(t.w-(((m=n[2])==null?void 0:m.size.x)??0))/2,t.bottom-44),c(t.x+16,t.bottom-26)];return n.map((x,b)=>{var f,w;return h(((f=i[b])==null?void 0:f.x)??t.x,((w=i[b])==null?void 0:w.y)??t.y,x.size.x,x.size.y)})}),re=`// ============================================================================
// Example: title-screen — a game's main menu, alive the way players expect.
//
//   Attract   the title breathes and a light sweeps its letters; motes drift
//             and the whole backdrop parallaxes with the pointer; "press
//             Enter" pulses until any input answers it
//   Menu      items cascade in left-to-right, a selector bar springs between
//             them (arrows or hover), a tick flashes the newly selected row,
//             Enter or a click opens it
//   Panels    a glass sheet slides in from the right — save slots whose bars
//             fill as they land, a segmented difficulty pill that springs and
//             stretches, volume/music options, credits — Escape slides back
//
// Doc: the phase, the selection and when it changed, which panel is open, the
// option values. The backdrop and title are continuous motion, so \`ambient\`
// keeps the loop awake for as long as the screen is up — a title screen is
// never asleep.
// ============================================================================

import { addOn, Element, Keys, Label, Layers, mount, Row, Stack, withExt } from "gratify";
import { Button, Labeled, Slider, Toggle } from "../shared/widgets";
import {
  Backdrop, Emblem, HintBar, MenuItem, Panel, Prompt, Screen, Segmented, SlotCard, Title, Version,
} from "./parts";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import partsSource from "./parts.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────
type Phase = "attract" | "menu";
const ITEMS = ["Continue", "New game", "Options", "Credits"] as const;
type PanelId = "continue" | "new" | "options" | "credits";
const PANEL_OF: PanelId[] = ["continue", "new", "options", "credits"];

interface Doc {
  phase: Phase;
  enteredAt: number;       // when the menu cascade started
  selected: number;
  selectedAt: number;
  panel: PanelId | null;
  panelAt: number;
  slot: number;
  difficulty: number;
  volume: number;
  music: boolean;
}

type Intent =
  | { kind: "begin"; time: number }
  | { kind: "confirm"; time: number }           // Enter: begin, or open the selected item
  | { kind: "move"; by: number; time: number }
  | { kind: "open"; index: number; time: number }
  | { kind: "back"; time: number }
  | { kind: "slot"; index: number }
  | { kind: "difficulty"; index: number }
  | { kind: "volume"; value: number }
  | { kind: "music" };

const INIT: Doc = {
  phase: "attract", enteredAt: 0, selected: 0, selectedAt: -9, panel: null, panelAt: -9,
  slot: 0, difficulty: 1, volume: 0.7, music: true,
};

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "begin": return doc.phase === "attract" ? { ...doc, phase: "menu", enteredAt: i.time, selectedAt: i.time + 0.3 } : doc;
    case "move": {
      if (doc.phase !== "menu" || doc.panel) return doc;
      const selected = (doc.selected + i.by + ITEMS.length) % ITEMS.length;
      return { ...doc, selected, selectedAt: i.time };
    }
    case "confirm": return doc.phase === "attract" ? update(doc, { kind: "begin", time: i.time })
      : doc.panel ? doc : update(doc, { kind: "open", index: doc.selected, time: i.time });
    case "open": return doc.phase === "menu"
      ? { ...doc, selected: i.index, selectedAt: i.time, panel: PANEL_OF[i.index], panelAt: i.time }
      : doc;
    case "back": return doc.panel ? { ...doc, panel: null } : doc;
    case "slot": return { ...doc, slot: i.index };
    case "difficulty": return { ...doc, difficulty: i.index };
    case "volume": return { ...doc, volume: i.value };
    case "music": return { ...doc, music: !doc.music };
  }
}

// ── Panels ────────────────────────────────────────────────────────────────────
const SLOTS = [
  { name: "Slot 1 — Kestrel", where: "Outer Reach · 14h 02m", progress: 0.72 },
  { name: "Slot 2 — Nadir", where: "Ice Belt · 3h 41m", progress: 0.28 },
  { name: "Slot 3 — Halcyon", where: "Core · 41h 15m", progress: 0.95 },
];
const CREDITS = ["Direction — A. Vale", "Systems — R. Okafor", "Art — M. Lindqvist", "Music — The Low Orbit", "Made with Gratify"];

function panelBody(doc: Doc): Element[] {
  switch (doc.panel) {
    case "continue": return [Stack("slots", { gap: 10 }, SLOTS.map((s, index) =>
      SlotCard(\`s\${index}\`, { ...s, index, enteredAt: doc.panelAt, picked: doc.slot === index, pick: (i) => ({ kind: "slot", index: i }) })))];
    case "new": return [Stack("new", { gap: 14 }, [
      Label("l", { text: "Difficulty", size: 12, dim: true }),
      Segmented("d", { options: ["Story", "Normal", "Hard", "Nightmare"], index: doc.difficulty, pick: (index) => ({ kind: "difficulty", index }) }),
      Label("desc", { text: ["A gentle drift through the story.", "The intended experience.", "Fuel is scarce; mistakes cost.", "One life. No map."][doc.difficulty], size: 12 }),
      Button("go", { label: "Begin voyage", press: { kind: "back", time: 0 }, accent: true }),
    ])];
    case "options": return [Stack("opts", { gap: 14 }, [
      Labeled("vol", "Volume", Slider("vol/s", { value: doc.volume, set: (value) => ({ kind: "volume", value }), width: 220 })),
      Labeled("music", "Music", Toggle("music/t", { on: doc.music, flip: { kind: "music" } }), { kind: "music" }),
      Label("readout", { text: \`volume \${Math.round(doc.volume * 100)}%  ·  music \${doc.music ? "on" : "off"}\`, size: 11, dim: true }),
    ])];
    case "credits": return [Stack("credits", { gap: 8 }, CREDITS.map((line, i) =>
      Label(\`c\${i}\`, { text: line, size: i === CREDITS.length - 1 ? 11 : 13, dim: i === CREDITS.length - 1 })))];
    default: return [];
  }
}
const PANEL_TITLE: Record<PanelId, string> = { continue: "Continue", new: "New game", options: "Options", credits: "Credits" };

// ── View ──────────────────────────────────────────────────────────────────────
function view(doc: Doc): Element {
  const inMenu = doc.phase === "menu";
  const column = Stack("column", { gap: 26 }, [
    Row("head", { gap: 18, align: "center" }, [Emblem("emblem", {}), Title("title", { text: "NEBULA DRIFT", sub: "A  D R I F T I N G   S T R A T E G Y" })]),
    inMenu
      ? Stack("menu", { gap: 2 }, ITEMS.map((label, index) =>
          MenuItem(\`m\${index}\`, {
            label, index, selected: doc.selected === index, selectedAt: doc.selectedAt,
            enteredAt: doc.enteredAt, dimmed: doc.panel !== null,
            open: (i, time) => ({ kind: "open", index: i, time }),
          })))
      : Stack("attract", { pad: 8 }, [Prompt("prompt", { text: "PRESS ENTER  ·  OR CLICK" })]),
  ]);

  const hints: [string, string][] = doc.panel
    ? [["Esc", "Back"], ["Enter", "Confirm"]]
    : [["↑↓", "Navigate"], ["Enter", "Select"]];

  const root = Layers("root", {}, [
    Backdrop("bg", { attract: !inMenu, begin: (time) => ({ kind: "begin", time }) }),
    Screen("screen", {}, [
      column,
      doc.panel ? Panel(\`panel-\${doc.panel}\`, { title: PANEL_TITLE[doc.panel] }, panelBody(doc)) : Stack("nopanel", {}, []),
      HintBar("hints", { hints, shown: inMenu }),
      Version("ver", { text: "v0.9.2 · build 2261" }),
    ]),
  ]);

  // Key intents are RELATIVE (confirm, move by) — the view closure is a frame
  // old, so several keys in one frame must resolve against the live doc.
  const time = (n: { time?: number }) => n.time ?? 0;
  return withExt(root, addOn(Keys({
    Enter: (n) => ({ kind: "confirm", time: time(n) }),
    " ": (n) => ({ kind: "confirm", time: time(n) }),
    ArrowUp: (n) => ({ kind: "move", by: -1, time: time(n) }),
    ArrowDown: (n) => ({ kind: "move", by: 1, time: time(n) }),
    Escape: (n) => ({ kind: "back", time: time(n) }),
    Backspace: (n) => ({ kind: "back", time: time(n) }),
  })));
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: INIT,
  update,
  view,
  ambient: () => true,     // the backdrop and title never rest
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "parts.ts", code: partsSource },
]);
`,ie=`// Parts of the \`title-screen\` example: a live backdrop, the sheened title, the
// blinking prompt, cascading menu items with a springing selector, the
// sliding sub-panel, a segmented control whose pill springs between options,
// save-slot cards whose bars fill as they arrive, and the key-hint bar.

import { calpha, clamp, easeOutCubic, part, rect, surface, v, Vec } from "gratify";
import { blink, breathe, cascade, flash, hash01, mod, sweep } from "../shared/motion";
import { bloom, polygon } from "../shared/paint";

// ── Backdrop — a slow aurora, drifting motes, a little pointer parallax ──────
export const Backdrop = part("ts-backdrop")
  .props<{ attract: boolean; begin(time: number): unknown }>()
  .fill()
  .style((t) => ({ a: t.accent, b: t.accent2, mote: t.textBright, line: calpha(t.textDim, 0.08) }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = r.center;
    const px = n.pointer ? (n.pointer.x - c.x) / r.w : 0, py = n.pointer ? (n.pointer.y - c.y) / r.h : 0;
    bloom(p, v(r.w * 0.25 + 40 * Math.sin(t * 0.13) - px * 20, r.h * 0.35 - py * 20), r.h * 0.7, s.a, 0.16);
    bloom(p, v(r.w * 0.8 + 30 * Math.cos(t * 0.1) - px * 30, r.h * 0.75 - py * 30), r.h * 0.6, s.b, 0.14);
    for (let y = 0; y < r.h; y += 48) p.line(v(0, y), v(r.w, y), s.line, 1);
    for (let i = 0; i < 70; i++) {
      const depth = 0.3 + 0.7 * hash01(i, 3), speed = 8 + 18 * depth;
      const x = mod(hash01(i, 1) * r.w + Math.sin(t * 0.3 + i) * 12 - px * 40 * depth, r.w);
      const y = mod(hash01(i, 2) * r.h - t * speed - py * 40 * depth, r.h);
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash01(i, 4)) + i);
      p.dot(v(x, y), 0.6 + 1.6 * depth, calpha(s.mote, 0.12 + 0.35 * depth * tw));
    }
  })
  .press((n) => (n.props.attract ? n.props.begin(n.time ?? 0) : undefined));

// ── Title — big type with a breathing glow and a light sweeping the letters ──
export const Title = part("ts-title")
  .props<{ text: string; sub: string }>()
  .size((p, m) => v(Math.max(m.text(p.text, 46).x + 20, 320), 90))
  .style((t) => ({ text: t.textBright, glow: t.accent, sheen: t.textBright, sub: t.textDim }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = v(r.x + r.w / 2, r.y + 34);
    const o = { size: 46, weight: 800 };
    p.glow(s.glow, 14 + 12 * breathe(t, 3), () => p.label(n.props.text, c, s.text, o));
    const x = sweep(t, 4.5, 1.2);
    if (x !== null) {
      const bx = r.x - 40 + (r.w + 80) * x;
      for (const [w, a] of [[26, 0.25], [12, 0.45], [4, 0.9]] as const) {
        p.push(); p.clip(rect(bx - w / 2, r.y, w, 70));
        p.label(n.props.text, c, calpha(s.sheen, a), o);
        p.pop();
      }
    }
    p.label(n.props.sub, v(c.x, r.y + 74), s.sub, { size: 12, weight: 600 });
  });

// ── Prompt — "press Enter" breathing until the game starts ───────────────────
export const Prompt = part("ts-prompt")
  .props<{ text: string }>()
  .size((p, m) => v(m.text(p.text, 13).x + 40, 30))
  .style((t) => ({ text: t.textBright, edge: t.accent }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, k = 0.3 + 0.7 * blink(t, 1.6, 0.6, 0.25);
    p.box(r, 15, calpha(s.edge, 0.08 * k), calpha(s.edge, 0.5 * k), 1);
    p.label(n.props.text, r.center, calpha(s.text, k), { size: 13, weight: 700 });
  });

// ── Menu item — cascades in, the selector bar springs to it, ticks on select ─
export interface MenuItemProps {
  label: string; index: number; selected: boolean; selectedAt: number;
  enteredAt: number; dimmed: boolean; open(index: number, time: number): unknown;
}
export const MenuItem = part("ts-menu-item")
  .props<MenuItemProps>()
  .size(() => v(250, 42))
  .channels({
    sel: { target: (n) => (n.props.selected ? 1 : 0), spring: { stiffness: 260, damping: 18 } },
    dim: { target: (n) => (n.props.dimmed ? 1 : 0), rate: 8 },
  })
  .style((t, ch) => {
    const k = Math.max(clamp(ch.sel, 0, 1), ch.hover);
    return {
      text: t.mix(t.text, t.textBright, k),
      bar: t.accent,
      fill: calpha(t.accent, 0.12 * k),
      glow: 14 * k,
      shift: 14 * ch.sel + 4 * ch.hover,
      tick: t.textBright,
    };
  })
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    const k = cascade(t, n.props.enteredAt, n.props.index, 0.07, 0.45), e = easeOutCubic(k);
    const tick = n.props.selected ? flash(t, n.props.selectedAt, 0.25) : 0;
    p.push();
    p.alpha(e * (1 - 0.7 * n.ch.dim));
    p.translate(-40 * (1 - e) - 24 * n.ch.dim, 0);
    p.box(r, 8, s.fill);
    const sel = clamp(n.ch.sel, 0, 1);
    if (sel > 0.01) p.glow(s.bar, s.glow, () => p.box(rect(r.x, r.center.y - 12 * sel, 4, 24 * sel), 2, s.bar));
    p.label(n.props.label, v(r.x + 22 + s.shift, r.center.y), s.text, { align: "left", size: 17, weight: 600 });
    if (tick > 0) p.box(rect(r.x + 14, r.y + 4, r.w - 28, r.h - 8), 6, calpha(s.tick, 0.18 * tick));
    p.pop();
  })
  .press((n) => n.props.open(n.props.index, n.time ?? 0));

// ── Panel — a glass sheet that slides in from the right; body is the slot ────
// The slot places the use-site children below the header, inside the padding.
const PanelSlot = part("ts-panel-slot")
  .props<{ w: number; h: number }>()
  .measure((p) => v(p.w, p.h))
  .arrange((_p, r, kids) => kids.map((k) => rect(r.x + 24, r.y + 68, k.size.x, k.size.y)));

export const Panel = part("ts-panel")
  .props<{ title: string; w?: number; h?: number }>()
  .defaults({ w: 380, h: 330 })
  .style((t) => ({ fill: calpha(t.surface, 0.72), edge: t.mix(t.muted, t.accent, 0.4), title: t.textBright, rule: calpha(t.accent, 0.5) }))
  .render((n, p, s) => {
    const r = n.rect, e = clamp(n.ch.enter, 0, 1);
    p.push();
    p.translate(60 * (1 - easeOutCubic(e)), 0);
    p.glow(s.edge, 16, () => p.box(r, 14, s.fill, s.edge, 1));
    p.label(n.props.title, v(r.x + 24, r.y + 30), s.title, { align: "left", size: 18, weight: 800 });
    p.box(rect(r.x + 24, r.y + 48, 60, 2), 1, s.rule);
    p.pop();
  })
  .body((props, children) => [PanelSlot("slot", { w: props.w, h: props.h }, children)]);

// ── Segmented — a pill that springs between options ──────────────────────────
export interface SegmentedProps { options: string[]; index: number; pick(index: number): unknown; }
export const Segmented = part("ts-segmented")
  .props<SegmentedProps>()
  .size((p) => v(p.options.length * 96, 36))
  .channels({ pos: { target: (n) => n.props.index, spring: { stiffness: 300, damping: 20 } } })
  .style((t, ch) => ({ track: calpha(t.bg, 0.5), edge: t.muted, pill: t.accent, on: t.textBright, off: t.mix(t.textDim, t.text, ch.hover) }))
  .render((n, p, s) => {
    const r = n.rect, w = r.w / n.props.options.length, pos = n.ch.pos;
    p.box(r, 18, s.track, s.edge, 1);
    const stretch = 1 + 0.25 * Math.min(1, Math.abs(pos - n.props.index));   // the pill leans into its move
    p.glow(s.pill, 10, () => p.box(rect(r.x + 3 + w * pos - (w - 6) * (stretch - 1) / 2, r.y + 3, (w - 6) * stretch, r.h - 6), 15, s.pill));
    n.props.options.forEach((o, i) => {
      const near = 1 - clamp(Math.abs(pos - i), 0, 1);
      p.label(o, v(r.x + w * (i + 0.5), r.center.y), calpha(near > 0.5 ? s.on : s.off, 1), { size: 12, weight: 700 });
    });
  })
  .press((n) => {
    const w = n.rect.w / n.props.options.length;
    const i = n.pointer ? clamp(Math.floor((n.pointer.x - n.rect.x) / w), 0, n.props.options.length - 1) : n.props.index;
    return n.props.pick(i);
  });

// ── Slot card — arrives in cascade; its progress bar fills as it lands ──────
export interface SlotProps { name: string; where: string; progress: number; index: number; enteredAt: number; picked: boolean; pick(index: number): unknown; }
export const SlotCard = part("ts-slot")
  .props<SlotProps>()
  .size(() => v(330, 56))
  .channels({
    // the target rises with the cascade, so the bar fills on arrival instead of snapping
    fill: { target: (n) => n.props.progress * cascade(n.time ?? 0, n.props.enteredAt, n.props.index, 0.1, 0.6), spring: { stiffness: 120, damping: 14 } },
  })
  .style((t, ch, p) => ({
    ...surface(t, ch, { tint: p.picked ? t.accent : undefined }),
    bar: t.accent,
    track: t.muted,
    name: t.textBright,
    where: t.textDim,
    corner: 10,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, k = easeOutCubic(cascade(t, n.props.enteredAt, n.props.index, 0.1, 0.5));
    p.push();
    p.alpha(k); p.translate(0, 16 * (1 - k));
    p.box(r, s.corner, s.fill, s.edge, 1);
    p.label(n.props.name, v(r.x + 14, r.y + 18), s.name, { align: "left", size: 13, weight: 700 });
    p.label(n.props.where, v(r.right - 14, r.y + 18), s.where, { align: "right", size: 11 });
    const bar = rect(r.x + 14, r.bottom - 16, r.w - 28, 6);
    p.box(bar, 3, s.track);
    p.box(rect(bar.x, bar.y, bar.w * clamp(n.ch.fill, 0, 1), bar.h), 3, s.bar);
    p.pop();
  })
  .press((n) => n.props.pick(n.props.index));

// ── Hint bar — key glyphs along the bottom, fading in with the menu ──────────
export const HintBar = part("ts-hints")
  .props<{ hints: [string, string][]; shown: boolean }>()
  .size((p, m) => v(p.hints.reduce((w, [k, l]) => w + m.text(k, 10).x + m.text(l, 11).x + 44, 0), 24))
  .channels({ on: { target: (n) => (n.props.shown ? 1 : 0), rate: 5 } })
  .style((t) => ({ key: t.textBright, keyFace: t.surfaceHi, text: t.textDim }))
  .render((n, p, s) => {
    const r = n.rect, a = n.ch.on;
    if (a < 0.01) return;
    let x = r.x;
    for (const [k, label] of n.props.hints) {
      const kw = p.measure.text(k, 10).x + 12;
      p.box(rect(x, r.y + 3, kw, 18), 4, calpha(s.keyFace, a), calpha(s.key, 0.4 * a), 1);
      p.label(k, v(x + kw / 2, r.center.y), calpha(s.key, a), { size: 10, weight: 700, mono: true });
      x += kw + 8;
      p.label(label, v(x, r.center.y), calpha(s.text, a), { align: "left", size: 11 });
      x += p.measure.text(label, 11).x + 24;
    }
  });

// ── Emblem — a slowly turning hexagon pair beside the title ──────────────────
export const Emblem = part("ts-emblem")
  .props<Record<string, never>>()
  .size(() => v(64, 64))
  .style((t) => ({ a: t.accent, b: t.accent2, core: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, c = n.rect.center;
    p.glow(s.a, 12, () => p.poly(polygon(c, 26, 6, t * 0.25), calpha(s.a, 0), s.a, 1.5));
    p.poly(polygon(c, 18, 6, -t * 0.4), calpha(s.b, 0.25), s.b, 1.5);
    p.dot(c, 4 + 2 * breathe(t, 2), s.core);
  });

/** The tiny version stamp in the corner. */
export const Version = part("ts-version")
  .props<{ text: string }>()
  .size((p, m) => v(m.text(p.text, 10).x + 4, 14))
  .style((t) => ({ text: calpha(t.textDim, 0.7) }))
  .render((n, p, s) => p.label(n.props.text, v(n.rect.x, n.rect.center.y), s.text, { align: "left", size: 10, mono: true }));

/** Screen layout: menu column left, panel right, hints bottom-center, version
 *  bottom-left — proportional to the viewport. */
export const Screen = part("ts-screen")
  .props<Record<string, never>>()
  .fill()
  .arrange((_p, r, kids) => {
    const left = r.x + Math.max(56, r.w * 0.08);
    const columnRight = left + (kids[0]?.size.x ?? 0);
    const panelW = kids[1]?.size.x ?? 0;
    const spots: Vec[] = [
      v(left, r.y + r.h * 0.18),
      // never over the title column; on a narrow viewport it overflows the right edge instead
      v(Math.max(columnRight + 40, Math.min(r.x + r.w * 0.55, r.right - panelW - 24)), r.y + r.h * 0.2),
      v(r.x + (r.w - (kids[2]?.size.x ?? 0)) / 2, r.bottom - 44),
      v(r.x + 16, r.bottom - 26),
    ];
    return kids.map((k, i) => rect(spots[i]?.x ?? r.x, spots[i]?.y ?? r.y, k.size.x, k.size.y));
  });
`,A=["Continue","New game","Options","Credits"],oe=["continue","new","options","credits"],ae={phase:"attract",enteredAt:0,selected:0,selectedAt:-9,panel:null,panelAt:-9,slot:0,difficulty:1,volume:.7,music:!0};function E(e,t){switch(t.kind){case"begin":return e.phase==="attract"?{...e,phase:"menu",enteredAt:t.time,selectedAt:t.time+.3}:e;case"move":{if(e.phase!=="menu"||e.panel)return e;const n=(e.selected+t.by+A.length)%A.length;return{...e,selected:n,selectedAt:t.time}}case"confirm":return e.phase==="attract"?E(e,{kind:"begin",time:t.time}):e.panel?e:E(e,{kind:"open",index:e.selected,time:t.time});case"open":return e.phase==="menu"?{...e,selected:t.index,selectedAt:t.time,panel:oe[t.index],panelAt:t.time}:e;case"back":return e.panel?{...e,panel:null}:e;case"slot":return{...e,slot:t.index};case"difficulty":return{...e,difficulty:t.index};case"volume":return{...e,volume:t.value};case"music":return{...e,music:!e.music}}}const ce=[{name:"Slot 1 — Kestrel",where:"Outer Reach · 14h 02m",progress:.72},{name:"Slot 2 — Nadir",where:"Ice Belt · 3h 41m",progress:.28},{name:"Slot 3 — Halcyon",where:"Core · 41h 15m",progress:.95}],v=["Direction — A. Vale","Systems — R. Okafor","Art — M. Lindqvist","Music — The Low Orbit","Made with Gratify"];function le(e){switch(e.panel){case"continue":return[u("slots",{gap:10},ce.map((t,n)=>Z(`s${n}`,{...t,index:n,enteredAt:e.panelAt,picked:e.slot===n,pick:r=>({kind:"slot",index:r})})))];case"new":return[u("new",{gap:14},[k("l",{text:"Difficulty",size:12,dim:!0}),X("d",{options:["Story","Normal","Hard","Nightmare"],index:e.difficulty,pick:t=>({kind:"difficulty",index:t})}),k("desc",{text:["A gentle drift through the story.","The intended experience.","Fuel is scarce; mistakes cost.","One life. No map."][e.difficulty],size:12}),$("go",{label:"Begin voyage",press:{kind:"back",time:0},accent:!0})])];case"options":return[u("opts",{gap:14},[M("vol","Volume",H("vol/s",{value:e.volume,set:t=>({kind:"volume",value:t}),width:220})),M("music","Music",V("music/t",{on:e.music,flip:{kind:"music"}}),{kind:"music"}),k("readout",{text:`volume ${Math.round(e.volume*100)}%  ·  music ${e.music?"on":"off"}`,size:11,dim:!0})])];case"credits":return[u("credits",{gap:8},v.map((t,n)=>k(`c${n}`,{text:t,size:n===v.length-1?11:13,dim:n===v.length-1})))];default:return[]}}const pe={continue:"Continue",new:"New game",options:"Options",credits:"Credits"};function me(e){const t=e.phase==="menu",n=u("column",{gap:26},[R("head",{gap:18,align:"center"},[te("emblem",{}),W("title",{text:"NEBULA DRIFT",sub:"A  D R I F T I N G   S T R A T E G Y"})]),t?u("menu",{gap:2},A.map((i,l)=>j(`m${l}`,{label:i,index:l,selected:e.selected===l,selectedAt:e.selectedAt,enteredAt:e.enteredAt,dimmed:e.panel!==null,open:(a,m)=>({kind:"open",index:a,time:m})}))):u("attract",{pad:8},[Y("prompt",{text:"PRESS ENTER  ·  OR CLICK"})])]),r=e.panel?[["Esc","Back"],["Enter","Confirm"]]:[["↑↓","Navigate"],["Enter","Select"]],s=C("root",{},[U("bg",{attract:!t,begin:i=>({kind:"begin",time:i})}),se("screen",{},[n,e.panel?Q(`panel-${e.panel}`,{title:pe[e.panel]},le(e)):u("nopanel",{},[]),ee("hints",{hints:r,shown:t}),ne("ver",{text:"v0.9.2 · build 2261"})])]),o=i=>i.time??0;return O(s,F(N({Enter:i=>({kind:"confirm",time:o(i)})," ":i=>({kind:"confirm",time:o(i)}),ArrowUp:i=>({kind:"move",by:-1,time:o(i)}),ArrowDown:i=>({kind:"move",by:1,time:o(i)}),Escape:i=>({kind:"back",time:o(i)}),Backspace:i=>({kind:"back",time:o(i)})})))}const de=document.getElementById("c");D(de,{init:ae,update:E,view:me,ambient:()=>!0});q([{name:"main.ts",code:re},{name:"parts.ts",code:ie}]);
