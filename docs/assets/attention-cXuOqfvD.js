import{p as u,v as i,s as B,c as l,r as z,d as H,h as I,m as O,R as C,S as T,L as y,K as E}from"./runtime-BaMoeUMO.js";import{C as m,T as P,w as U,b as L}from"./widgets-BJEltdMZ.js";import{b as K,R as V}from"./effects-sMK-JssO.js";import{h as _,s as A,p as W,n as F,d as Z,b as q,a as R,c as G,e as $}from"./paint-DLsGtfYH.js";import{a as Y}from"./source-panel-CSqvtNlY.js";const x=150,g=56,v=e=>({kind:"ack",id:e.props.id,time:e.time??0}),b={target:e=>e.props.live?1:0,rate:4},Q=u("cue-pulse").props().size(()=>i(x,g)).channels({live:b}).style((e,n)=>({...B(e,n,{tint:e.accent}),halo:e.accent,corner:12})).render((e,n,t)=>{const a=e.time??0,r=e.ch.live,o=e.rect,c=_(a,1.6)*r*(1-.6*e.ch.hover);n.push(),n.scaleAt(o.center.x,o.center.y,1+.035*c),n.box(o.inset(-4-6*c),t.corner+4,l(t.halo,0),l(t.halo,.55*c),2),n.glow(t.halo,8+28*c+14*e.ch.hover,()=>n.box(o,t.corner,t.fill,t.edge,1.5)),n.label("Start",o.center,t.text,{weight:600,size:14}),n.pop()}).press(v),j=u("cue-sheen").props().size(()=>i(x,g)).channels({live:b}).style((e,n)=>({...B(e,n,{tint:e.accent2}),band:e.textBright,corner:12})).render((e,n,t)=>{const a=e.time??0,r=e.rect;n.box(r,t.corner,t.fill,t.edge,1.5);const o=R(a,3.2,.9);o!==null&&e.ch.live>.01&&A(n,r,o,l(t.band,.28*e.ch.live)),n.label("Upgrade",r.center,t.text,{weight:600,size:14})}).press(v),J=u("cue-sonar").props().size(()=>i(x,g)).channels({live:b,badge:{target:e=>e.props.unread>0?1:0,spring:{stiffness:320,damping:11}}}).style((e,n)=>({...B(e,n),ping:e.accent,badge:e.danger,badgeText:e.textBright,icon:e.mix(e.text,e.textBright,n.hover),corner:12})).render((e,n,t)=>{const a=e.time??0,r=e.rect,o=r.center,c=e.ch.live;n.box(r,t.corner,t.fill,t.edge,1.5);for(const f of W(a,2.4,2)){const S=(1-f)*(1-f)*.7*c;S>.01&&n.ring(o,14+34*f,l(t.ping,S),2-f)}const s=22,d=15,h=o.x-s/2,p=o.y-d/2;n.box(z(h,p,s,d),3,l(t.icon,0),t.icon,1.6),n.line(i(h,p+1),i(o.x,p+d*.6),t.icon,1.6),n.line(i(o.x,p+d*.6),i(h+s,p+1),t.icon,1.6);const w=Math.max(0,e.ch.badge);if(w>.02){const f=i(h+s+2,p-2),S=8*w;n.glow(t.badge,8*w,()=>n.dot(f,S,t.badge)),w>.5&&n.label(String(e.props.unread),f,l(t.badgeText,w),{size:10,weight:700})}}).press(v),X=u("cue-nudge").props().size(()=>i(x,g)).channels({live:b}).style((e,n)=>({...B(e,n,{tint:e.accent}),corner:12})).render((e,n,t)=>{const a=e.time??0,r=e.rect,o=F(a,e.props.lastInput,2,2.6,.55)*e.ch.live,c=9*o,s=i(r.center.x,r.center.y-c),d=r.w*(1+.05*o),h=r.h*(1-.05*o);n.glow(t.edge,16*o,()=>n.box(z(s.x-d/2,s.y-h/2,d,h),t.corner,t.fill,t.edge,1.5)),n.label("Continue",i(s.x-10,s.y),t.text,{weight:600,size:14});const p=s.x+38+7*o;n.line(i(p-8,s.y),i(p,s.y),t.text,2),n.line(i(p-4,s.y-4),i(p,s.y),t.text,2),n.line(i(p-4,s.y+4),i(p,s.y),t.text,2)}).press(v),ee=u("cue-zone").props().size(()=>i(96,g)).channels({live:b}).style((e,n)=>({fill:e.mix(e.surface,e.accent,.08+.1*n.hover),dash:e.accent,solid:e.mix(e.accent,e.textBright,.3),text:e.textDim,done:e.accent})).render((e,n,t)=>{const a=e.time??0,r=e.rect.inset(1),o=e.ch.live,c=.5+.5*G(a,2.2);n.box(r,10,l(t.fill,1),l(t.solid,1-o),2);for(const[s,d]of Z(r,10,12,.55,a*.06))n.line(s,d,l(t.dash,o*(.45+.55*c)),2);if(o>.5)n.label("drop here",r.center,l(t.text,o),{size:11});else{const s=r.center,d=1-o;n.line(i(s.x-7,s.y),i(s.x-2,s.y+5),l(t.done,d),2.5),n.line(i(s.x-2,s.y+5),i(s.x+8,s.y-6),l(t.done,d),2.5)}}).anchors(e=>[{id:"drop-zone",pos:e.rect.center,meta:e.rect}]),ne=u("cue-chip-face").props().size(()=>i(44,30)).style((e,n,t)=>({fill:e.mix(e.accent2,e.accent,t.near),text:e.textBright,scale:1+.12*t.near})).render((e,n,t)=>{n.push(),n.scaleAt(e.rect.center.x,e.rect.center.y,t.scale),n.glow(t.fill,14,()=>n.box(e.rect,8,t.fill)),n.label("file",e.rect.center,t.text,{size:11,weight:600}),n.pop()}),M=(e,n)=>!!n&&e.x>=n.x&&e.x<=n.right&&e.y>=n.y&&e.y<=n.bottom,te=u("cue-chip").props().size(()=>i(44,30)).style((e,n)=>({fill:l(e.mix(e.accent2,e.textBright,.2*n.hover),1-.7*n.press),text:l(e.textBright,1-.7*n.press),lift:2*n.hover})).render((e,n,t)=>{const a=e.rect.raise(t.lift);n.box(a,8,t.fill),n.label("file",a.center,t.text,{size:11,weight:600})}).gesture({begin:(e,n)=>({pos:n,near:0}),move:(e,n,t,a)=>{var r;return{...e,pos:t,near:M(t,(r=a.anchor("drop-zone"))==null?void 0:r.meta)?1:0}},up:(e,n,t,a)=>{var r,o,c;return M(t,(r=a.anchor("drop-zone"))==null?void 0:r.meta)?((o=n.spawn)==null||o.call(n,K(t,I(200,.9,.65))),(c=n.spawn)==null||c.call(n,new V(t,I(200,.9,.65),40,.5)),n.props.drop(n.time??0)):void 0},view:e=>[H(ne("ghost",{near:e.near}),i(e.pos.x-22,e.pos.y-15))]}),re=u("cue-key").props().size(()=>i(x,g)).channels({live:b}).style((e,n)=>({fill:e.mix(e.bg,e.surface,.6+.2*n.hover),edge:e.mix(e.muted,e.accent,.4*n.hover),key:e.textBright,keyFace:e.surfaceHi,text:e.text,ready:e.accent})).render((e,n,t)=>{const a=e.time??0,r=e.rect,o=e.ch.live;if(n.box(r,10,t.fill,t.edge,1),o>.01){const c=.35+.65*$(a,1.3,.55),s=z(r.x+14,r.center.y-11,52,22);n.box(s.raise(1),5,l(t.keyFace,o),l(t.key,.6*o),1),n.label("Space",s.center,l(t.key,c*o),{size:11,weight:700,mono:!0}),n.label("to begin",i(r.x+104,r.center.y),l(t.text,c*o),{size:12})}o<.99&&n.label("Ready.",r.center,l(t.ready,1-o),{size:14,weight:700})}).press(v),oe=u("cue-skeleton").props().size(()=>i(x,g)).channels({live:b}).style(e=>({bar:e.mix(e.surface,e.muted,.5),band:e.textBright})).render((e,n,t)=>{const a=e.time??0,r=e.rect,o=e.ch.live;if(o<.01)return;const c=[[0,.7],[1,1],[2,.5]];for(const[d,h]of c)n.box(z(r.x,r.y+4+d*18,r.w*h,10),5,l(t.bar,o));const s=R(a,1.5,1.5);n.push(),n.clip(r);for(const[d,h]of c){const p=z(r.x,r.y+4+d*18,r.w*h,10);n.push(),n.clip(p),s!==null&&A(n,r,s,l(t.band,.16*o)),n.pop()}n.pop()}),se=u("cue-spotlight").props().size(()=>i(x,g)).channels({live:b}).style((e,n)=>({fill:e.mix(e.surface,e.surfaceHi,.5+.3*n.hover),edge:e.mix(e.muted,e.accent,.3+.7*n.hover),light:e.accent,text:e.mix(e.text,e.textBright,n.hover),lift:3*n.hover-2*n.press})).render((e,n,t)=>{const a=e.time??0,r=e.rect.raise(t.lift),o=e.ch.hover;n.glow(t.light,18*o,()=>n.box(r,12,t.fill,t.edge,1.5));const c=.5+.5*Math.sin(a*1.1),s=r.y+r.h*(.3+.4*(.5+.5*Math.cos(a*.7))),d=i(r.x+r.w*c,s),h=e.pointer&&o>.02?e.pointer:d,p=Math.max(o,.45*e.ch.live*(1-o));n.push(),n.clip(r.inset(1)),q(n,h,70,t.light,.5*p),n.pop(),n.label("Hover me",r.center,t.text,{weight:600,size:14})}).press(v),ae=`// ============================================================================
// Example: attention — cues that ask to be interacted with, and stop asking
// once you do. Eight idle signals from game and product UI:
//
//   Pulse      a heartbeat glow ring on the primary action
//   Sheen      a light band sweeping the face every few seconds
//   Sonar      an inbox whose badge springs in and rings expand while unread
//   Nudge      a button that hops after two idle seconds
//   Drop zone  marching dashes until the chip is dragged in
//   Key        "press Space" blinking until a key answers (keys route to the root)
//   Shimmer    loading placeholders with a moving highlight
//   Spotlight  a pointer-following light; a slow drift hints while idle
//
// The Doc holds only facts (what was answered, when input last happened). Each
// cue reads \`node.time\` through the pure curves in shared/motion.ts and eases
// out through a \`live\` channel when its fact flips. \`ambient\` keeps the loop
// awake while any cue is still live — answer them all and the scene sleeps.
// ============================================================================

import { addOn, Element, Keys, Label, mount, Row, Stack, withExt } from "gratify";
import { Card, TimedButton } from "../shared/widgets";
import {
  CueIntent, DragChip, DropZone, KeyPrompt, NudgeButton, PulseButton, SheenButton, Skeleton,
  SonarInbox, SpotlightTile,
} from "./cues";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import cuesSource from "./cues.ts?raw";
import motionSource from "../shared/motion.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  acked: Record<string, boolean>;
  unread: number;
  dropped: boolean;
  loaded: boolean;
  lastInput: number;               // GNode.time of the last input (drives the nudge)
}

type Intent =
  | CueIntent
  | { kind: "message"; time: number }
  | { kind: "drop"; time: number }
  | { kind: "load"; time: number }
  | { kind: "reset"; time: number };

const INIT: Doc = { acked: {}, unread: 3, dropped: false, loaded: false, lastInput: 0 };

function update(doc: Doc, intent: Intent): Doc {
  const touched = { ...doc, lastInput: intent.time };
  switch (intent.kind) {
    case "ack": return intent.id === "sonar"
      ? { ...touched, unread: 0, acked: { ...doc.acked, sonar: true } }
      : { ...touched, acked: { ...doc.acked, [intent.id]: true } };
    case "message": return { ...touched, unread: doc.unread + 1, acked: { ...doc.acked, sonar: false } };
    case "drop": return { ...touched, dropped: true };
    case "load": return { ...touched, loaded: true };
    case "reset": return { ...INIT, lastInput: intent.time };
  }
}

const liveCount = (doc: Doc) =>
  ["pulse", "sheen", "nudge", "key", "spot"].filter((id) => !doc.acked[id]).length
  + (doc.unread > 0 ? 1 : 0) + (doc.dropped ? 0 : 1) + (doc.loaded ? 0 : 1);

// ── View ──────────────────────────────────────────────────────────────────────
const stamp = (doc: Doc, id: string) => (doc.acked[id] ? "answered" : "waiting");

function view(doc: Doc): Element {
  const cells: Element[] = [
    Card("pulse", { title: "Pulse", value: stamp(doc, "pulse") }, [PulseButton("c", { id: "pulse", live: !doc.acked.pulse })]),
    Card("sheen", { title: "Sheen", value: stamp(doc, "sheen") }, [SheenButton("c", { id: "sheen", live: !doc.acked.sheen })]),
    Card("sonar", { title: "Sonar", value: doc.unread ? \`\${doc.unread} unread\` : "read" }, [
      SonarInbox("c", { id: "sonar", live: doc.unread > 0, unread: doc.unread }),
    ]),
    Card("nudge", { title: "Nudge", value: stamp(doc, "nudge") }, [
      NudgeButton("c", { id: "nudge", live: !doc.acked.nudge, lastInput: doc.lastInput }),
    ]),
    Card("zone", { title: "Drop zone", value: doc.dropped ? "dropped" : "waiting" }, [
      Row("r", { gap: 10, align: "center" }, [
        ...(doc.dropped ? [] : [DragChip("chip", { drop: (time) => ({ kind: "drop", time }) })]),
        DropZone("zone", { live: !doc.dropped }),
      ]),
    ]),
    Card("key", { title: "Key prompt", value: stamp(doc, "key") }, [KeyPrompt("c", { id: "key", live: !doc.acked.key })]),
    Card("shimmer", { title: "Shimmer", value: doc.loaded ? "loaded" : "loading" }, [
      doc.loaded
        ? Stack("rows", { gap: 4 }, [
            Label("r0", { text: "Quarterly report.pdf", size: 12, bright: true }),
            Label("r1", { text: "2.4 MB · shared with 3 people", size: 11, dim: true }),
            Label("r2", { text: "edited 4 min ago", size: 11, dim: true }),
          ])
        : Skeleton("sk", { live: true }),
    ]),
    Card("spot", { title: "Spotlight", value: stamp(doc, "spot") }, [SpotlightTile("c", { id: "spot", live: !doc.acked.spot })]),
  ];

  const root = Stack("root", { gap: 16, pad: 32, align: "center" }, [
    Label("title", { text: "Attention", size: 22, weight: 700, bright: true }),
    Label("sub", { text: \`\${liveCount(doc)} cues still asking — each one stops the moment you answer it\`, dim: true, size: 12 }),
    Row("row0", { gap: 16 }, cells.slice(0, 4)),
    Row("row1", { gap: 16 }, cells.slice(4)),
    Row("tools", { gap: 10 }, [
      TimedButton("msg", { label: "New message", to: (time) => ({ kind: "message", time }) }),
      TimedButton("load", { label: doc.loaded ? "Loaded" : "Load content", to: (time) => ({ kind: "load", time }), accent: !doc.loaded }),
      TimedButton("reset", { label: "Reset all", to: (time) => ({ kind: "reset", time }) }),
    ]),
  ]);
  // Space answers the key prompt from anywhere: keys fall through to the root.
  return withExt(root, addOn(Keys({ " ": (n) => ({ kind: "ack", id: "key", time: n.time ?? 0 }) })));
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: INIT,
  update,
  view,
  ambient: (doc) => liveCount(doc) > 0,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "cues.ts", code: cuesSource },
  { name: "motion.ts (shared)", code: motionSource },
]);
`,ie=`// The eight attention cues of the \`attention\` example — each a part that keeps
// signalling "act on me" until the app says it has been answered. Every cue
// takes a \`live\` flag; a \`live\` channel eases it to 0 so the signal fades out
// instead of snapping off. All motion is \`node.time\` through motion.ts curves,
// plus the automatic hover/press channels.

import { at, burst, calpha, GNode, hsl, part, rect, Rect, Ring, surface, v, Vec } from "gratify";
import { blink, breathe, dashes, heartbeat, nudge, pings, sweep } from "../shared/motion";
import { bloom, sheenBand } from "../shared/paint";

export const CW = 150, CH = 56;      // every cue's content box, the Card pads around it

export interface CueProps { id: string; live: boolean; }
export interface CueIntent { kind: "ack"; id: string; time: number }

const ack = (n: GNode<CueProps>): CueIntent => ({ kind: "ack", id: n.props.id, time: n.time ?? 0 });
const liveOf = { target: (n: GNode<{ live: boolean }>) => (n.props.live ? 1 : 0), rate: 4 };

// ── 1. Pulse — a heartbeat glow ring around the primary action ───────────────
export const PulseButton = part("cue-pulse")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({ ...surface(t, ch, { tint: t.accent }), halo: t.accent, corner: 12 }))
  .render((n, p, s) => {
    const t = n.time ?? 0, live = n.ch.live, r = n.rect;
    const beat = heartbeat(t, 1.6) * live * (1 - 0.6 * n.ch.hover);
    p.push();
    p.scaleAt(r.center.x, r.center.y, 1 + 0.035 * beat);
    p.box(r.inset(-4 - 6 * beat), s.corner + 4, calpha(s.halo, 0), calpha(s.halo, 0.55 * beat), 2);
    p.glow(s.halo, 8 + 28 * beat + 14 * n.ch.hover, () => p.box(r, s.corner, s.fill, s.edge, 1.5));
    p.label("Start", r.center, s.text, { weight: 600, size: 14 });
    p.pop();
  })
  .press(ack);

// ── 2. Sheen — a light band sweeps the face every few seconds ────────────────
export const SheenButton = part("cue-sheen")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({ ...surface(t, ch, { tint: t.accent2 }), band: t.textBright, corner: 12 }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    p.box(r, s.corner, s.fill, s.edge, 1.5);
    const x = sweep(t, 3.2, 0.9);
    if (x !== null && n.ch.live > 0.01) sheenBand(p, r, x, calpha(s.band, 0.28 * n.ch.live));
    p.label("Upgrade", r.center, s.text, { weight: 600, size: 14 });
  })
  .press(ack);

// ── 3. Sonar — an inbox with a springing badge and expanding rings ───────────
export interface SonarProps extends CueProps { unread: number; }
export const SonarInbox = part("cue-sonar")
  .props<SonarProps>()
  .size(() => v(CW, CH))
  .channels({
    live: liveOf,
    badge: { target: (n) => (n.props.unread > 0 ? 1 : 0), spring: { stiffness: 320, damping: 11 } },
  })
  .style((t, ch) => ({
    ...surface(t, ch),
    ping: t.accent,
    badge: t.danger,
    badgeText: t.textBright,
    icon: t.mix(t.text, t.textBright, ch.hover),
    corner: 12,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = r.center, live = n.ch.live;
    p.box(r, s.corner, s.fill, s.edge, 1.5);
    for (const k of pings(t, 2.4, 2)) {
      const a = (1 - k) * (1 - k) * 0.7 * live;
      if (a > 0.01) p.ring(c, 14 + 34 * k, calpha(s.ping, a), 2 - k);
    }
    // an envelope: body plus the flap
    const w = 22, h = 15, x = c.x - w / 2, y = c.y - h / 2;
    p.box(rect(x, y, w, h), 3, calpha(s.icon, 0), s.icon, 1.6);
    p.line(v(x, y + 1), v(c.x, y + h * 0.6), s.icon, 1.6);
    p.line(v(c.x, y + h * 0.6), v(x + w, y + 1), s.icon, 1.6);
    const k = Math.max(0, n.ch.badge);
    if (k > 0.02) {
      const bc = v(x + w + 2, y - 2), br = 8 * k;
      p.glow(s.badge, 8 * k, () => p.dot(bc, br, s.badge));
      if (k > 0.5) p.label(String(n.props.unread), bc, calpha(s.badgeText, k), { size: 10, weight: 700 });
    }
  })
  .press(ack);

// ── 4. Nudge — hops after a few idle seconds; the arrow leads ────────────────
export interface NudgeProps extends CueProps { lastInput: number; }
export const NudgeButton = part("cue-nudge")
  .props<NudgeProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({ ...surface(t, ch, { tint: t.accent }), corner: 12 }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    const hop = nudge(t, n.props.lastInput, 2, 2.6, 0.55) * n.ch.live;
    const lift = 9 * hop, c = v(r.center.x, r.center.y - lift);
    const w = r.w * (1 + 0.05 * hop), h = r.h * (1 - 0.05 * hop);
    p.glow(s.edge, 16 * hop, () => p.box(rect(c.x - w / 2, c.y - h / 2, w, h), s.corner, s.fill, s.edge, 1.5));
    p.label("Continue", v(c.x - 10, c.y), s.text, { weight: 600, size: 14 });
    const ax = c.x + 38 + 7 * hop;
    p.line(v(ax - 8, c.y), v(ax, c.y), s.text, 2);
    p.line(v(ax - 4, c.y - 4), v(ax, c.y), s.text, 2);
    p.line(v(ax - 4, c.y + 4), v(ax, c.y), s.text, 2);
  })
  .press(ack);

// ── 5. Drop zone — marching dashes until the chip lands ──────────────────────
export interface ZoneProps { live: boolean; }
export const DropZone = part("cue-zone")
  .props<ZoneProps>()
  .size(() => v(96, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({
    fill: t.mix(t.surface, t.accent, 0.08 + 0.1 * ch.hover),
    dash: t.accent,
    solid: t.mix(t.accent, t.textBright, 0.3),
    text: t.textDim,
    done: t.accent,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect.inset(1), live = n.ch.live;
    const breath = 0.5 + 0.5 * breathe(t, 2.2);
    p.box(r, 10, calpha(s.fill, 1), calpha(s.solid, 1 - live), 2);
    for (const [a, b] of dashes(r, 10, 12, 0.55, t * 0.06))
      p.line(a, b, calpha(s.dash, live * (0.45 + 0.55 * breath)), 2);
    if (live > 0.5) p.label("drop here", r.center, calpha(s.text, live), { size: 11 });
    else {
      const c = r.center, k = 1 - live;
      p.line(v(c.x - 7, c.y), v(c.x - 2, c.y + 5), calpha(s.done, k), 2.5);
      p.line(v(c.x - 2, c.y + 5), v(c.x + 8, c.y - 6), calpha(s.done, k), 2.5);
    }
  })
  .anchors((n) => [{ id: "drop-zone", pos: n.rect.center, meta: n.rect }]);

export interface ChipProps { drop: (time: number) => unknown; }
const ChipFace = part("cue-chip-face")
  .props<{ near: number }>()
  .size(() => v(44, 30))
  .style((t, _ch, p) => ({
    fill: t.mix(t.accent2, t.accent, p.near),
    text: t.textBright,
    scale: 1 + 0.12 * p.near,
  }))
  .render((n, p, s) => {
    p.push(); p.scaleAt(n.rect.center.x, n.rect.center.y, s.scale);
    p.glow(s.fill, 14, () => p.box(n.rect, 8, s.fill));
    p.label("file", n.rect.center, s.text, { size: 11, weight: 600 });
    p.pop();
  });

const insideRect = (p: Vec, r: Rect | undefined) =>
  !!r && p.x >= r.x && p.x <= r.right && p.y >= r.y && p.y <= r.bottom;

export const DragChip = part("cue-chip")
  .props<ChipProps>()
  .size(() => v(44, 30))
  .style((t, ch) => ({
    fill: calpha(t.mix(t.accent2, t.textBright, 0.2 * ch.hover), 1 - 0.7 * ch.press),
    text: calpha(t.textBright, 1 - 0.7 * ch.press),
    lift: 2 * ch.hover,
  }))
  .render((n, p, s) => {
    const r = n.rect.raise(s.lift);
    p.box(r, 8, s.fill);
    p.label("file", r.center, s.text, { size: 11, weight: 600 });
  })
  .gesture({
    begin: (_n, p) => ({ pos: p, near: 0 }),
    move: (st, _n, p, q) => ({ ...st, pos: p, near: insideRect(p, q.anchor("drop-zone")?.meta as Rect | undefined) ? 1 : 0 }),
    up: (st, n, p, q) => insideRect(p, q.anchor("drop-zone")?.meta as Rect | undefined)
      ? (n.spawn?.(burst(p, hsl(200, 0.9, 0.65))), n.spawn?.(new Ring(p, hsl(200, 0.9, 0.65), 40, 0.5)), n.props.drop(n.time ?? 0))
      : undefined,
    view: (st) => [at(ChipFace("ghost", { near: st.near }), v(st.pos.x - 22, st.pos.y - 15))],
  });

// ── 6. Key prompt — "press Space" blinks until a key answers ─────────────────
export const KeyPrompt = part("cue-key")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({
    fill: t.mix(t.bg, t.surface, 0.6 + 0.2 * ch.hover),
    edge: t.mix(t.muted, t.accent, 0.4 * ch.hover),
    key: t.textBright,
    keyFace: t.surfaceHi,
    text: t.text,
    ready: t.accent,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, live = n.ch.live;
    p.box(r, 10, s.fill, s.edge, 1);
    if (live > 0.01) {
      const on = 0.35 + 0.65 * blink(t, 1.3, 0.55);
      const kr = rect(r.x + 14, r.center.y - 11, 52, 22);
      p.box(kr.raise(1), 5, calpha(s.keyFace, live), calpha(s.key, 0.6 * live), 1);
      p.label("Space", kr.center, calpha(s.key, on * live), { size: 11, weight: 700, mono: true });
      p.label("to begin", v(r.x + 104, r.center.y), calpha(s.text, on * live), { size: 12 });
    }
    if (live < 0.99) p.label("Ready.", r.center, calpha(s.ready, 1 - live), { size: 14, weight: 700 });
  })
  .press(ack);

// ── 7. Shimmer — loading placeholders with a moving highlight ────────────────
export const Skeleton = part("cue-skeleton")
  .props<{ live: boolean }>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t) => ({ bar: t.mix(t.surface, t.muted, 0.5), band: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, live = n.ch.live;
    if (live < 0.01) return;
    const rows = [[0, 0.7], [1, 1], [2, 0.5]] as const;
    for (const [i, w] of rows) p.box(rect(r.x, r.y + 4 + i * 18, r.w * w, 10), 5, calpha(s.bar, live));
    const x = sweep(t, 1.5, 1.5);
    p.push(); p.clip(r);
    for (const [i, w] of rows) {
      const br = rect(r.x, r.y + 4 + i * 18, r.w * w, 10);
      p.push(); p.clip(br);
      if (x !== null) sheenBand(p, r, x, calpha(s.band, 0.16 * live));
      p.pop();
    }
    p.pop();
  });

// ── 8. Spotlight — a pointer-following highlight; a slow drift while idle ────
export const SpotlightTile = part("cue-spotlight")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.5 + 0.3 * ch.hover),
    edge: t.mix(t.muted, t.accent, 0.3 + 0.7 * ch.hover),
    light: t.accent,
    text: t.mix(t.text, t.textBright, ch.hover),
    lift: 3 * ch.hover - 2 * ch.press,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect.raise(s.lift), hover = n.ch.hover;
    p.glow(s.light, 18 * hover, () => p.box(r, 12, s.fill, s.edge, 1.5));
    // the light: under the pointer when hovered, otherwise drifting along the face
    const drift = 0.5 + 0.5 * Math.sin(t * 1.1), idleY = r.y + r.h * (0.3 + 0.4 * (0.5 + 0.5 * Math.cos(t * 0.7)));
    const idle = v(r.x + r.w * drift, idleY);
    const at_ = n.pointer && hover > 0.02 ? n.pointer : idle;
    const strength = Math.max(hover, 0.45 * n.ch.live * (1 - hover));
    p.push(); p.clip(r.inset(1));
    bloom(p, at_, 70, s.light, 0.5 * strength);
    p.pop();
    p.label("Hover me", r.center, s.text, { weight: 600, size: 14 });
  })
  .press(ack);
`,ce=`// Pure motion math for time-driven cues — the attention signals, HUD gauges
// and title-screen effects read \`node.time\` and pass it through these. Nothing
// here touches the runtime, so every curve is unit-tested in tests/motion.test.ts.
// Times are seconds, phases are fractions of a period, outputs are 0..1 unless
// documented otherwise.

import { clamp, Rect, v, Vec } from "gratify";

export const TAU = Math.PI * 2;

/** Positive modulo (JS \`%\` keeps the sign of the dividend). */
export const mod = (x: number, m: number) => ((x % m) + m) % m;

/** Hermite step: 0 below \`e0\`, 1 above \`e1\`, smooth in between. */
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Overshooting, oscillating settle — a "boing" for pop-ins. */
export const easeOutElastic = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;

/** Sine breathing: 0 at the start of each period, 1 halfway through. */
export const breathe = (time: number, period: number, phase = 0) =>
  0.5 - 0.5 * Math.cos(TAU * (time / period + phase));

/** Two quick thumps at the start of each period, then rest — the CTA pulse. */
export function heartbeat(time: number, period: number): number {
  const u = mod(time, period) / period;
  const thump = (c: number, w: number) => Math.exp(-((u - c) * (u - c)) / (2 * w * w));
  return Math.min(1, thump(0.08, 0.035) + 0.7 * thump(0.24, 0.04));
}

/** A band that crosses once per period: its 0..1 position while it is moving
 *  (the first \`travel\` seconds), null while it rests. */
export const sweep = (time: number, period: number, travel: number): number | null => {
  const u = mod(time, period);
  return u < travel ? u / travel : null;
};

/** Sonar rings: \`count\` rings launched evenly through each period; each value
 *  is that ring's 0..1 progress through its expansion. */
export const pings = (time: number, period: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => mod(time / period - i / count, 1));

/** Idle nudge: once \`idle\` seconds have passed since \`lastInput\`, a raised-
 *  cosine bump of \`dur\` seconds plays every \`every\` seconds. */
export function nudge(time: number, lastInput: number, idle: number, every: number, dur: number): number {
  const since = time - lastInput - idle;
  if (since < 0) return 0;
  const u = mod(since, every);
  return u < dur ? 0.5 - 0.5 * Math.cos(TAU * u / dur) : 0;
}

/** Soft-edged blink: on for \`duty\` of each period, fading over \`soft\`. */
export function blink(time: number, period: number, duty = 0.6, soft = 0.12): number {
  const u = mod(time, period) / period;
  return smoothstep(0, soft, u) * (1 - smoothstep(duty - soft, duty, u));
}

/** Cascade reveal: item \`i\`'s own 0..1 progress when the cascade started at
 *  \`startedAt\`, items begin \`gap\` seconds apart and each takes \`dur\`. */
export const cascade = (time: number, startedAt: number, i: number, gap: number, dur: number) =>
  clamp((time - startedAt - i * gap) / dur, 0, 1);

/** Odometer columns, least significant first: the digit showing and its 0..1
 *  roll toward the next one. A column rolls only while every lower column is
 *  completing a 9→0 turn, so 129→130 rolls the 2 and the 9 together. */
export function digitRolls(x: number, columns: number): { digit: number; roll: number }[] {
  const n = Math.max(0, x);
  return Array.from({ length: columns }, (_, i) => {
    const p = 10 ** i;
    return { digit: Math.floor(n / p) % 10, roll: clamp(mod(n, p) - (p - 1), 0, 1) };
  });
}

/** Seconds elapsed since an impulse channel was kicked to 1, recovered from its
 *  current value (it decays as e^(-decay·t)). Lets a render read "how long has
 *  the pointer been down" without any timer state. */
export const impulseAge = (value: number, decay: number) =>
  value <= 0 ? Infinity : Math.max(0, -Math.log(Math.min(1, value)) / decay);

/** Cooldown remaining as 0..1 (1 right after use, 0 once \`dur\` has passed). */
export const cooldown = (time: number, usedAt: number, dur: number) =>
  clamp(1 - (time - usedAt) / dur, 0, 1);

/** A flash that starts at \`at\` and fades over \`dur\`; 0 before \`at\`. */
export const flash = (time: number, at: number, dur: number) =>
  time < at ? 0 : clamp(1 - (time - at) / dur, 0, 1);

/** Perimeter length of a rounded rect. */
export const perimeter = (r: Rect, corner: number) => {
  const c = Math.min(corner, r.w / 2, r.h / 2);
  return 2 * (r.w - 2 * c) + 2 * (r.h - 2 * c) + TAU * c;
};

const cornerPoint = (cx: number, cy: number, c: number, from: number, k: number): Vec =>
  v(cx + c * Math.cos(from + k * TAU / 4), cy + c * Math.sin(from + k * TAU / 4));

/** The point a fraction \`s\` of the way around a rounded rect, clockwise from
 *  the top edge's left end (just after the top-left corner). */
export function perimeterPoint(r: Rect, corner: number, s: number): Vec {
  const c = Math.min(corner, r.w / 2, r.h / 2);
  const ew = r.w - 2 * c, eh = r.h - 2 * c, arc = (TAU / 4) * c, safe = Math.max(arc, 1e-9);
  let d = mod(s, 1) * perimeter(r, corner);
  const edges: [number, (t: number) => Vec][] = [
    [ew, (t) => v(r.x + c + t, r.y)],
    [arc, (t) => cornerPoint(r.right - c, r.y + c, c, -TAU / 4, t / safe)],
    [eh, (t) => v(r.right, r.y + c + t)],
    [arc, (t) => cornerPoint(r.right - c, r.bottom - c, c, 0, t / safe)],
    [ew, (t) => v(r.right - c - t, r.bottom)],
    [arc, (t) => cornerPoint(r.x + c, r.bottom - c, c, TAU / 4, t / safe)],
    [eh, (t) => v(r.x, r.bottom - c - t)],
    [arc, (t) => cornerPoint(r.x + c, r.y + c, c, TAU / 2, t / safe)],
  ];
  for (const [len, f] of edges) {
    if (d <= len) return f(d);
    d -= len;
  }
  return v(r.x + c, r.y);
}

/** Marching dashes around a rounded rect: \`count\` dashes each covering \`fill\`
 *  of their slot, shifted by \`offset\` (fractions of the perimeter). Each dash
 *  is two short segments so it bends around corners. */
export function dashes(r: Rect, corner: number, count: number, fill: number, offset: number): [Vec, Vec][] {
  const out: [Vec, Vec][] = [];
  for (let k = 0; k < count; k++) {
    const s0 = k / count + offset, s1 = s0 + fill / count, sm = (s0 + s1) / 2;
    out.push([perimeterPoint(r, corner, s0), perimeterPoint(r, corner, sm)]);
    out.push([perimeterPoint(r, corner, sm), perimeterPoint(r, corner, s1)]);
  }
  return out;
}

/** Deterministic hash → 0..1, for "random" placement that must be stable
 *  across frames (drifting motes, star fields) without stored state. */
export const hash01 = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
`,D={acked:{},unread:3,dropped:!1,loaded:!1,lastInput:0};function le(e,n){const t={...e,lastInput:n.time};switch(n.kind){case"ack":return n.id==="sonar"?{...t,unread:0,acked:{...e.acked,sonar:!0}}:{...t,acked:{...e.acked,[n.id]:!0}};case"message":return{...t,unread:e.unread+1,acked:{...e.acked,sonar:!1}};case"drop":return{...t,dropped:!0};case"load":return{...t,loaded:!0};case"reset":return{...D,lastInput:n.time}}}const N=e=>["pulse","sheen","nudge","key","spot"].filter(n=>!e.acked[n]).length+(e.unread>0?1:0)+(e.dropped?0:1)+(e.loaded?0:1),k=(e,n)=>e.acked[n]?"answered":"waiting";function de(e){const n=[m("pulse",{title:"Pulse",value:k(e,"pulse")},[Q("c",{id:"pulse",live:!e.acked.pulse})]),m("sheen",{title:"Sheen",value:k(e,"sheen")},[j("c",{id:"sheen",live:!e.acked.sheen})]),m("sonar",{title:"Sonar",value:e.unread?`${e.unread} unread`:"read"},[J("c",{id:"sonar",live:e.unread>0,unread:e.unread})]),m("nudge",{title:"Nudge",value:k(e,"nudge")},[X("c",{id:"nudge",live:!e.acked.nudge,lastInput:e.lastInput})]),m("zone",{title:"Drop zone",value:e.dropped?"dropped":"waiting"},[C("r",{gap:10,align:"center"},[...e.dropped?[]:[te("chip",{drop:a=>({kind:"drop",time:a})})],ee("zone",{live:!e.dropped})])]),m("key",{title:"Key prompt",value:k(e,"key")},[re("c",{id:"key",live:!e.acked.key})]),m("shimmer",{title:"Shimmer",value:e.loaded?"loaded":"loading"},[e.loaded?T("rows",{gap:4},[y("r0",{text:"Quarterly report.pdf",size:12,bright:!0}),y("r1",{text:"2.4 MB · shared with 3 people",size:11,dim:!0}),y("r2",{text:"edited 4 min ago",size:11,dim:!0})]):oe("sk",{live:!0})]),m("spot",{title:"Spotlight",value:k(e,"spot")},[se("c",{id:"spot",live:!e.acked.spot})])],t=T("root",{gap:16,pad:32,align:"center"},[y("title",{text:"Attention",size:22,weight:700,bright:!0}),y("sub",{text:`${N(e)} cues still asking — each one stops the moment you answer it`,dim:!0,size:12}),C("row0",{gap:16},n.slice(0,4)),C("row1",{gap:16},n.slice(4)),C("tools",{gap:10},[P("msg",{label:"New message",to:a=>({kind:"message",time:a})}),P("load",{label:e.loaded?"Loaded":"Load content",to:a=>({kind:"load",time:a}),accent:!e.loaded}),P("reset",{label:"Reset all",to:a=>({kind:"reset",time:a})})])]);return U(t,L(E({" ":a=>({kind:"ack",id:"key",time:a.time??0})})))}const pe=document.getElementById("c");O(pe,{init:D,update:le,view:de,ambient:e=>N(e)>0});Y([{name:"main.ts",code:ae},{name:"cues.ts",code:ie},{name:"motion.ts (shared)",code:ce}]);
