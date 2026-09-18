var U=Object.defineProperty;var V=(e,t,n)=>t in e?U(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var B=(e,t,n)=>V(e,typeof t!="symbol"?t+"":t,n);import{p as m,v as i,c,h as A,q as g,r as x,s as _,u as j,m as q,S as u,L as z,R as w,w as W,K as J}from"./runtime-BaMoeUMO.js";import{T,w as Q,b as Y}from"./widgets-BJEltdMZ.js";import{D as R}from"./minimap-4fwdaaVu.js";import{f as Z,g as y,i as H,c as I,j as ee,k as te,l as O,T as b,m as ne,s as re,b as N}from"./paint-DLsGtfYH.js";import{R as $,b as se}from"./effects-sMK-JssO.js";import{a as ie}from"./source-panel-CSqvtNlY.js";const v=A(140,.7,.5),ae=m("hud-health").props().size(()=>i(260,22)).channels({fast:{target:e=>e.props.hp/e.props.max,spring:{stiffness:420,damping:26}},slow:{target:e=>e.props.hp/e.props.max,rate:1.6}}).style((e,t)=>({track:e.mix(e.bg,e.surface,.8),edge:e.muted,fill:e.mix(e.danger,v,Z(.25,.7,g(t.fast,0,1))),ghost:c(e.textBright,.5),heal:A(140,.8,.7),text:e.textBright,tick:c(e.bg,.5)})).render((e,t,n)=>{const s=e.time??0,r=y(s,e.props.hitAt,.35),a=y(s,e.props.healAt,.5),l=e.rect.raise(-4*r*Math.sin(s*60)),o=l.inset(2),p=g(e.ch.fast,0,1),d=g(e.ch.slow,0,1);t.box(l,6,n.track,n.edge,1),d>p&&t.box(x(o.x,o.y,o.w*d,o.h),4,c(n.ghost,.5+.5*r)),t.glow(n.fill,6+14*a,()=>t.box(x(o.x,o.y,o.w*p,o.h),4,n.fill)),d<p&&t.box(x(o.x+o.w*d,o.y,o.w*(p-d),o.h),4,c(n.heal,.6)),r>0&&t.box(o,4,c(n.text,.6*r));for(let h=1;h<10;h++){const f=o.x+o.w*h/10;t.line(i(f,o.y),i(f,o.bottom),n.tick,1)}t.label(`${Math.round(e.props.hp)} / ${e.props.max}`,l.center,n.text,{size:11,weight:700})}),oe=m("hud-xp").props().size(()=>i(260,12)).channels({shown:{target:e=>e.props.xp/e.props.need,spring:{stiffness:160,damping:16}}}).style(e=>({track:e.mix(e.bg,e.surface,.8),edge:e.muted,fill:e.accent2,tip:e.textBright})).render((e,t,n)=>{const s=e.time??0,r=e.rect,a=r.inset(2),l=g(e.ch.shown,0,1),o=y(s,e.props.leveledAt,.7);t.box(r,5,n.track,n.edge,1),t.glow(n.fill,6+20*o,()=>t.box(x(a.x,a.y,a.w*l,a.h),3,n.fill)),l>.01&&t.dot(i(a.x+a.w*l,a.center.y),2.5+1.5*I(s,1.2),c(n.tip,.85)),o>0&&t.box(a,3,c(n.tip,.7*o))}),le=m("hud-level").props().size(()=>i(46,46)).style(e=>({fill:e.mix(e.surface,e.accent2,.6),edge:e.mix(e.accent2,e.textBright,.4),text:e.textBright})).render((e,t,n)=>{const s=e.time??0,r=e.rect.center,a=y(s,e.props.leveledAt,.6);t.push(),t.scaleAt(r.x,r.y,1+.5*a*a),t.glow(n.edge,6+24*a,()=>t.poly(H(r,20,6,a*b/6),n.fill,n.edge,2)),t.label(String(e.props.level),r,n.text,{size:16,weight:800}),t.pop(),a>0&&t.ring(r,24+26*(1-a),c(n.edge,a),2)}),ce=m("hud-odometer").props().defaults({digits:6}).size(e=>i(e.digits*22+12,36)).channels({shown:{target:e=>e.props.value,spring:{stiffness:90,damping:16}}}).style(e=>({fill:e.mix(e.bg,e.surface,.7),edge:e.muted,text:e.textBright,dim:c(e.textDim,.4),split:c(e.bg,.6)})).render((e,t,n)=>{const s=e.rect,r=ee(e.ch.shown,e.props.digits),a=22,l=s.h-6,o=s.y+3;t.box(s,6,n.fill,n.edge,1),t.push(),t.clip(s.inset(3)),r.forEach((p,d)=>{const h=s.right-6-a*d-a/2,f=p.roll*l,P=d>0&&r.slice(d).every(D=>D.digit===0&&D.roll===0)?n.dim:n.text;t.label(String(p.digit),i(h,o+l/2-f),P,{size:20,weight:700,mono:!0}),p.roll>0&&t.label(String((p.digit+1)%10),i(h,o+l/2-f+l),P,{size:20,weight:700,mono:!0}),d>0&&t.line(i(h+a/2,o),i(h+a/2,o+l),n.split,1)}),t.pop()}),M=1.1,pe=m("hud-hold").props().size(()=>i(210,56)).channels({hold:{decay:1}}).style((e,t)=>({..._(e,t,{tint:e.accent}),ring:e.accent,track:e.muted,ready:v,corner:14})).render((e,t,n)=>{const s=e.time??0,r=e.rect,a=g(e.ch.press,0,1),l=a>.02?g(O(e.ch.hold,1)/M,0,1):0,o=l*a,p=l>=1?a:0,d=i(r.x+30,r.center.y),h=p>0?n.ready:n.ring;t.glow(h,10*o+16*p*I(s,.6),()=>t.box(r,n.corner,n.fill,n.edge,1.5)),t.ring(d,15,n.track,3),o>0&&t.glow(h,8,()=>t.arc(d,15,-b/4,-b/4+b*o,h,3.5)),p>0&&t.dot(d,6+2*I(s,.6),c(n.ready,p)),t.label(p>.5?"Release!":e.props.label,i(r.x+122,r.center.y),n.text,{weight:700,size:14})}).gesture({begin:e=>{var t;return(t=e.kick)==null||t.call(e,"hold",1),{}},up:(e,t,n)=>{var s,r;if(!(O(t.ch.hold,1)<M))return(s=t.spawn)==null||s.call(t,se(n,v)),(r=t.spawn)==null||r.call(t,new $(i(t.rect.x+30,t.rect.center.y),v,60,.6)),t.props.to(t.time??0)}});function de(e,t,n){switch(e){case"bolt":return[i(t.x+3,t.y-n),i(t.x-6,t.y+2),i(t.x-1,t.y+2),i(t.x-3,t.y+n),i(t.x+6,t.y-2),i(t.x+1,t.y-2)];case"shield":return[i(t.x,t.y-n),i(t.x+n*.85,t.y-n*.55),i(t.x+n*.7,t.y+n*.3),i(t.x,t.y+n),i(t.x-n*.7,t.y+n*.3),i(t.x-n*.85,t.y-n*.55)];case"flame":return[i(t.x,t.y-n),i(t.x+n*.5,t.y-n*.2),i(t.x+n*.7,t.y+n*.5),i(t.x,t.y+n),i(t.x-n*.7,t.y+n*.5),i(t.x-n*.4,t.y),i(t.x-n*.1,t.y-n*.4)];case"star":return H(t,n,10).map((s,r)=>r%2?i(t.x+(s.x-t.x)*.45,t.y+(s.y-t.y)*.45):s)}}const C=e=>ne(e.time??0,e.props.usedAt,e.props.cd),he=m("hud-ability").props().size(()=>i(56,56)).style((e,t)=>({..._(e,t,{tint:e.accent}),icon:e.textBright,shade:c(e.bg,.74),ready:e.accent,key:e.textDim,corner:12})).render((e,t,n)=>{const s=e.time??0,r=e.rect,a=r.center,l=C(e),o=y(s,e.props.usedAt+e.props.cd,.5);t.push(),t.scaleAt(a.x,a.y,1+.12*o-.05*e.ch.press),t.glow(n.ready,22*o+(l>0?0:10*e.ch.hover),()=>t.box(r,n.corner,n.fill,n.edge,1.5)),t.poly(de(e.props.glyph,a,13),c(n.icon,l>0?.45:1)),l>0&&(t.push(),t.clip(r.inset(1)),t.poly(te(a,r.w,-b/4,b*l),n.shade),t.pop(),t.label(Math.ceil(l*e.props.cd).toString(),a,n.icon,{size:16,weight:800})),o>0&&t.ring(a,28+18*(1-o),c(n.ready,o),2),t.pop(),t.label(e.props.hotkey,i(r.right-8,r.y+8),n.key,{size:9,weight:700,mono:!0})}).press(e=>{var t;if(!(C(e)>0))return(t=e.spawn)==null||t.call(e,new $(e.rect.center,A(200,.9,.65),40,.4)),e.props.cast(e.props.id,e.time??0)}),me=m("hud-toast").props().size((e,t)=>i(Math.max(220,t.text(e.data.text,12).x+40),40)).style((e,t,n)=>({fill:e.mix(e.surface,e.surfaceHi,.5+.3*t.hover),edge:e.mix(e.muted,e.textDim,t.hover),stripe:n.data.kind==="good"?e.accent:n.data.kind==="bad"?e.danger:e.accent2,text:e.textBright})).render((e,t,n)=>{const s=e.time??0,r=e.rect;t.push(),t.translate((1-g(e.ch.enter,0,1))*70,0),t.box(r,8,n.fill,n.edge,1),t.push(),t.clip(x(r.x,r.y,5,r.h)),t.box(r,8,n.stripe),t.pop(),t.label(e.props.data.text,i(r.x+16,r.center.y-3),n.text,{align:"left",size:12,weight:500});const a=g(1-(s-e.props.data.at)/e.props.life,0,1);t.box(x(r.x+12,r.bottom-6,(r.w-24)*a,2),1,c(n.stripe,.8)),t.pop()}).press(e=>e.props.dismiss(e.props.data.id)),ge=m("hud-banner").props().size(()=>i(340,64)).style(e=>({fill:e.mix(e.surface,e.accent2,.35),edge:e.mix(e.accent2,e.textBright,.3),badge:e.accent2,text:e.textBright,sub:e.text,band:e.textBright})).render((e,t,n)=>{const s=e.time??0,r=e.rect;t.push(),t.translate(0,-(1-g(e.ch.enter,0,1))*40),t.glow(n.badge,18,()=>t.box(r,12,n.fill,n.edge,1.5));const a=i(r.x+34,r.center.y);t.glow(n.badge,10,()=>t.poly(H(a,20,6),n.badge,n.text,1.5)),t.label(String(e.props.level),a,n.text,{size:15,weight:800}),t.label(e.props.title,i(r.x+70,r.center.y-9),n.text,{align:"left",size:16,weight:800}),t.label(e.props.sub,i(r.x+70,r.center.y+11),n.sub,{align:"left",size:11});const l=(s-e.props.at-.25)/.7;l>0&&l<1&&re(t,r,l,c(n.band,.3),.2),t.pop()});class ue{constructor(t,n,s,r=.9){B(this,"t",0);B(this,"done",!1);this.at=t,this.text=n,this.color=s,this.dur=r}update(t){this.t+=t,this.t>=this.dur&&(this.done=!0)}draw(t){const n=this.t/this.dur;t.label(this.text,i(this.at.x,this.at.y-44*j(n)),c(this.color,1-n*n),{size:15+5*(1-n),weight:800})}}const xe=`// ============================================================================
// Example: hud — a game heads-up display with the motion players expect.
//
//   Health    drops at once, a pale ghost trails down; heals glow; hits shake
//   XP        springs toward the next level, flashes white and rolls over
//   Level     a hexagon badge that punches and rings on level-up; a banner
//             drops from the top with a one-time sheen
//   Score     an odometer whose columns roll, with "+120" floaters
//   Launch    hold to fill the ring, release to fire (no timer: impulseAge)
//   Abilities four buttons with radial cooldown wipes and a ready flash,
//             castable by click or the 1–4 keys
//   Toasts    slide in from the right with a draining timer bar
//
// The Doc records WHEN things happened (hitAt, usedAt, toast.at) and the
// parts turn those stamps into motion through \`node.time\`. Toasts and the
// banner expire through \`onCommit\`: the host observes a new toast and
// schedules its dismissal — the only timer in the file.
// ============================================================================

import {
  addOn, calpha, Element, hsl, Keys, Label, Layers, mount, part, Row, Stack, v, withExt,
} from "gratify";
import { TimedButton } from "../shared/widgets";
import { Dock } from "../shared/minimap";
import { bloom } from "../shared/paint";
import {
  AbilityButton, Glyph, HealthBar, HoldButton, LevelBadge, Odometer, XpBar,
} from "./gauges";
import { Banner, Floater, Toast, ToastData, ToastKind } from "./feed";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import gaugesSource from "./gauges.ts?raw";
import feedSource from "./feed.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  hp: number; hitAt: number; healAt: number;
  xp: number; level: number; leveledAt: number;
  score: number;
  usedAt: Record<string, number>;
  toasts: ToastData[];
  banner: { title: string; sub: string; at: number } | null;
  nextId: number;
}

type Intent =
  | { kind: "damage"; time: number }
  | { kind: "heal"; time: number }
  | { kind: "xp"; time: number }
  | { kind: "collect"; time: number }
  | { kind: "cast"; id: string; time: number }
  | { kind: "launch"; time: number }
  | { kind: "dismiss"; id: number }
  | { kind: "closeBanner" };

const HP_MAX = 100, TOAST_LIFE = 4, BANNER_LIFE = 3.5;
const needFor = (level: number) => 100 + 25 * level;

const ABILITIES: { id: string; glyph: Glyph; cd: number; hotkey: string }[] = [
  { id: "bolt", glyph: "bolt", cd: 3, hotkey: "1" },
  { id: "shield", glyph: "shield", cd: 6, hotkey: "2" },
  { id: "flame", glyph: "flame", cd: 4.5, hotkey: "3" },
  { id: "star", glyph: "star", cd: 8, hotkey: "4" },
];

const INIT: Doc = {
  hp: 78, hitAt: -9, healAt: -9, xp: 40, level: 3, leveledAt: -9, score: 1180,
  usedAt: {}, toasts: [], banner: null, nextId: 1,
};

const toast = (doc: Doc, kind: ToastKind, text: string, at: number): Doc => ({
  ...doc,
  nextId: doc.nextId + 1,
  toasts: [...doc.toasts, { id: doc.nextId, kind, text, at }].slice(-4),
});

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "damage": return toast({ ...doc, hp: Math.max(0, doc.hp - 28), hitAt: i.time }, "bad", "Hit for 28", i.time);
    case "heal": return { ...doc, hp: Math.min(HP_MAX, doc.hp + 24), healAt: i.time };
    case "xp": {
      const xp = doc.xp + 45, need = needFor(doc.level);
      if (xp < need) return { ...doc, xp };
      const level = doc.level + 1;
      return toast({ ...doc, xp: xp - need, level, leveledAt: i.time,
        banner: { title: \`Level \${level}\`, sub: "New ability slot unlocked", at: i.time } }, "good", \`Reached level \${level}\`, i.time);
    }
    case "collect": return { ...doc, score: doc.score + 120 };
    case "cast": {
      const spec = ABILITIES.find((a) => a.id === i.id);
      if (!spec || i.time - (doc.usedAt[i.id] ?? -99) < spec.cd) return doc;   // still cooling
      return { ...doc, usedAt: { ...doc.usedAt, [i.id]: i.time }, score: doc.score + 40 };
    }
    case "launch": return toast({ ...doc, score: doc.score + 500 }, "good", "Launch confirmed  +500", i.time);
    case "dismiss": return { ...doc, toasts: doc.toasts.filter((t) => t.id !== i.id) };
    case "closeBanner": return { ...doc, banner: null };
  }
}

// ── Backdrop — a vignette, two blooms, a faint grid ───────────────────────────
const Backdrop = part("hud-backdrop")
  .props<Record<string, never>>()
  .fill()
  .style((t) => ({ a: t.accent, b: t.accent2, grid: calpha(t.textDim, 0.12) }))
  .render((n, p, s) => {
    const r = n.rect;
    bloom(p, v(r.w * 0.15, r.h * 0.2), r.h * 0.6, s.a, 0.14);
    bloom(p, v(r.w * 0.85, r.h * 0.85), r.h * 0.6, s.b, 0.12);
    for (let x = 0; x < r.w; x += 40) p.line(v(x, 0), v(x, r.h), s.grid, 1);
    for (let y = 0; y < r.h; y += 40) p.line(v(0, y), v(r.w, y), s.grid, 1);
  });

// ── View ──────────────────────────────────────────────────────────────────────
const caption = (key: string, text: string) => Label(key, { text, size: 10, weight: 700, dim: true });
const cast = (id: string) => (time: number): Intent => ({ kind: "cast", id, time });

/** Collect spawns its floater from the button so the text rises from the click. */
const CollectButton = part("hud-collect")
  .props<{ label: string }>()
  .size((p, m) => v(m.text(p.label).x + 28, 32))
  .style((t, ch) => ({ fill: t.mix(t.surface, t.accent2, 0.3 + 0.4 * ch.hover + 0.3 * ch.press), edge: t.mix(t.muted, t.accent2, ch.hover), text: t.textBright, lift: 2 * ch.hover - 2 * ch.press }))
  .render((n, p, s) => { const r = n.rect.raise(s.lift); p.box(r, 8, s.fill, s.edge, 1); p.label(n.props.label, r.center, s.text, { weight: 500 }); })
  .press((n) => {
    n.spawn?.(new Floater(v(n.rect.center.x, n.rect.y), "+120", hsl(270, 0.8, 0.75)));
    return { kind: "collect", time: n.time ?? 0 } as Intent;
  });

function view(doc: Doc): Element {
  const panel = Stack("panel", { gap: 22, pad: 40, align: "center" }, [
    Label("title", { text: "Mission control", size: 22, weight: 700, bright: true }),
    Row("gauges", { gap: 28, align: "start" }, [
      Stack("hp", { gap: 6 }, [caption("c", "HEALTH"), HealthBar("bar", { hp: doc.hp, max: HP_MAX, hitAt: doc.hitAt, healAt: doc.healAt })]),
      Row("lvl", { gap: 10, align: "center" }, [
        LevelBadge("badge", { level: doc.level, leveledAt: doc.leveledAt }),
        Stack("xp", { gap: 6 }, [
          caption("c", \`LEVEL \${doc.level}  ·  \${doc.xp} / \${needFor(doc.level)} XP\`),
          XpBar("bar", { xp: doc.xp, need: needFor(doc.level), leveledAt: doc.leveledAt }),
        ]),
      ]),
      Stack("score", { gap: 6, align: "end" }, [caption("c", "SCORE"), Odometer("odo", { value: doc.score })]),
    ]),
    Row("abilities", { gap: 12 }, ABILITIES.map((a) =>
      AbilityButton(a.id, { ...a, usedAt: doc.usedAt[a.id] ?? -99, cast: (id, time) => cast(id)(time) }))),
    HoldButton("launch", { label: "Hold to launch", to: (time) => ({ kind: "launch", time }) }),
    Row("actions", { gap: 10 }, [
      TimedButton("dmg", { label: "Take damage", to: (time) => ({ kind: "damage", time }), danger: true }),
      TimedButton("heal", { label: "Heal", to: (time) => ({ kind: "heal", time }) }),
      TimedButton("xp", { label: "Gain XP", to: (time) => ({ kind: "xp", time }), accent: true }),
      CollectButton("collect", { label: "Collect +120" }),
    ]),
    Label("hint", { text: "Keys 1–4 cast abilities · click a toast to dismiss it", size: 11, dim: true }),
  ]);

  const root = Layers("root", {}, [
    Backdrop("bg", {}),
    Stack("center", { pad: 0, align: "center" }, [panel]),
    Dock("toasts", { corner: "top-right", margin: 16 }, [
      Stack("list", { gap: 8, align: "end" }, doc.toasts.map((t) =>
        Toast(\`t\${t.id}\`, { data: t, life: TOAST_LIFE, dismiss: (id) => ({ kind: "dismiss", id }) }))),
    ]),
    Dock("banner", { corner: "top", margin: 18 }, doc.banner
      ? [Banner("b", { title: doc.banner.title, sub: doc.banner.sub, level: doc.level, at: doc.banner.at })]
      : []),
  ]);
  const hotkeys = Object.fromEntries(ABILITIES.map((a) => [a.hotkey, (n: { time?: number }) => cast(a.id)(n.time ?? 0)]));
  return withExt(root, addOn(Keys(hotkeys)));
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

const rt = mount(canvas, {
  init: INIT,
  update,
  view,
  // Time-based motion runs while a cooldown counts, a flash fades, or the
  // feed shows anything with a timer bar.
  ambient: (doc, time) =>
    doc.toasts.length > 0 || doc.banner !== null
    || time - Math.max(doc.hitAt, doc.healAt, doc.leveledAt) < 1
    || ABILITIES.some((a) => time - (doc.usedAt[a.id] ?? -99) < a.cd + 0.6),
  // The host's one timer: whatever the doc just added to the feed, expire it.
  onCommit: (doc, prev) => {
    for (const t of doc.toasts) if (!prev.toasts.includes(t))
      setTimeout(() => rt.dispatch({ kind: "dismiss", id: t.id }), TOAST_LIFE * 1000);
    if (doc.banner && doc.banner !== prev.banner)
      setTimeout(() => rt.dispatch({ kind: "closeBanner" }), BANNER_LIFE * 1000);
  },
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "gauges.ts", code: gaugesSource },
  { name: "feed.ts", code: feedSource },
]);
`,be=`// The \`hud\` example's gauges and controls: a health bar with a damage ghost,
// an XP bar and level badge that flash on level-up, a rolling odometer, a
// hold-to-confirm button, and ability buttons with radial cooldown wipes.
// Every motion is a channel or a \`node.time\` curve from shared/motion.ts.

import {
  burst, calpha, clamp, GNode, hsl, part, rect, Ring, surface, v, Vec,
} from "gratify";
import { breathe, cooldown, digitRolls, flash, impulseAge, smoothstep, TAU } from "../shared/motion";
import { polygon, sectorPoints } from "../shared/paint";

const GREEN = hsl(140, 0.7, 0.5);

// ── Health — the fast bar drops at once; a pale ghost trails down after it ────
export interface HealthProps { hp: number; max: number; hitAt: number; healAt: number; }
export const HealthBar = part("hud-health")
  .props<HealthProps>()
  .size(() => v(260, 22))
  .channels({
    fast: { target: (n) => n.props.hp / n.props.max, spring: { stiffness: 420, damping: 26 } },
    slow: { target: (n) => n.props.hp / n.props.max, rate: 1.6 },
  })
  .style((t, ch) => ({
    track: t.mix(t.bg, t.surface, 0.8),
    edge: t.muted,
    fill: t.mix(t.danger, GREEN, smoothstep(0.25, 0.7, clamp(ch.fast, 0, 1))),
    ghost: calpha(t.textBright, 0.5),
    heal: hsl(140, 0.8, 0.7),
    text: t.textBright,
    tick: calpha(t.bg, 0.5),
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, hit = flash(t, n.props.hitAt, 0.35), heal = flash(t, n.props.healAt, 0.5);
    const r = n.rect.raise(-4 * hit * Math.sin(t * 60)), inner = r.inset(2);
    const fast = clamp(n.ch.fast, 0, 1), slow = clamp(n.ch.slow, 0, 1);
    p.box(r, 6, s.track, s.edge, 1);
    if (slow > fast) p.box(rect(inner.x, inner.y, inner.w * slow, inner.h), 4, calpha(s.ghost, 0.5 + 0.5 * hit));
    p.glow(s.fill, 6 + 14 * heal, () => p.box(rect(inner.x, inner.y, inner.w * fast, inner.h), 4, s.fill));
    if (slow < fast) p.box(rect(inner.x + inner.w * slow, inner.y, inner.w * (fast - slow), inner.h), 4, calpha(s.heal, 0.6));
    if (hit > 0) p.box(inner, 4, calpha(s.text, 0.6 * hit));
    for (let i = 1; i < 10; i++) {
      const x = inner.x + inner.w * i / 10;
      p.line(v(x, inner.y), v(x, inner.bottom), s.tick, 1);
    }
    p.label(\`\${Math.round(n.props.hp)} / \${n.props.max}\`, r.center, s.text, { size: 11, weight: 700 });
  });

// ── XP — a springing fill with a breathing tip; a white flash on level-up ────
export interface XpProps { xp: number; need: number; leveledAt: number; }
export const XpBar = part("hud-xp")
  .props<XpProps>()
  .size(() => v(260, 12))
  .channels({ shown: { target: (n) => n.props.xp / n.props.need, spring: { stiffness: 160, damping: 16 } } })
  .style((t) => ({ track: t.mix(t.bg, t.surface, 0.8), edge: t.muted, fill: t.accent2, tip: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, inner = r.inset(2);
    const k = clamp(n.ch.shown, 0, 1), fl = flash(t, n.props.leveledAt, 0.7);
    p.box(r, 5, s.track, s.edge, 1);
    p.glow(s.fill, 6 + 20 * fl, () => p.box(rect(inner.x, inner.y, inner.w * k, inner.h), 3, s.fill));
    if (k > 0.01) p.dot(v(inner.x + inner.w * k, inner.center.y), 2.5 + 1.5 * breathe(t, 1.2), calpha(s.tip, 0.85));
    if (fl > 0) p.box(inner, 3, calpha(s.tip, 0.7 * fl));
  });

export const LevelBadge = part("hud-level")
  .props<{ level: number; leveledAt: number }>()
  .size(() => v(46, 46))
  .style((t) => ({ fill: t.mix(t.surface, t.accent2, 0.6), edge: t.mix(t.accent2, t.textBright, 0.4), text: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, c = n.rect.center, fl = flash(t, n.props.leveledAt, 0.6);
    p.push();
    p.scaleAt(c.x, c.y, 1 + 0.5 * fl * fl);
    p.glow(s.edge, 6 + 24 * fl, () => p.poly(polygon(c, 20, 6, fl * TAU / 6), s.fill, s.edge, 2));
    p.label(String(n.props.level), c, s.text, { size: 16, weight: 800 });
    p.pop();
    if (fl > 0) p.ring(c, 24 + 26 * (1 - fl), calpha(s.edge, fl), 2);
  });

// ── Odometer — each column rolls to its next digit; leading zeros dimmed ─────
export const Odometer = part("hud-odometer")
  .props<{ value: number; digits?: number }>()
  .defaults({ digits: 6 })
  .size((p) => v(p.digits * 22 + 12, 36))
  .channels({ shown: { target: (n) => n.props.value, spring: { stiffness: 90, damping: 16 } } })
  .style((t) => ({ fill: t.mix(t.bg, t.surface, 0.7), edge: t.muted, text: t.textBright, dim: calpha(t.textDim, 0.4), split: calpha(t.bg, 0.6) }))
  .render((n, p, s) => {
    const r = n.rect, cols = digitRolls(n.ch.shown, n.props.digits);
    const w = 22, h = r.h - 6, y0 = r.y + 3;
    p.box(r, 6, s.fill, s.edge, 1);
    p.push(); p.clip(r.inset(3));
    cols.forEach((c, i) => {
      const x = r.right - 6 - w * i - w / 2, dy = c.roll * h;
      const leading = i > 0 && cols.slice(i).every((k) => k.digit === 0 && k.roll === 0);
      const color = leading ? s.dim : s.text;
      p.label(String(c.digit), v(x, y0 + h / 2 - dy), color, { size: 20, weight: 700, mono: true });
      if (c.roll > 0) p.label(String((c.digit + 1) % 10), v(x, y0 + h / 2 - dy + h), color, { size: 20, weight: 700, mono: true });
      if (i > 0) p.line(v(x + w / 2, y0), v(x + w / 2, y0 + h), s.split, 1);
    });
    p.pop();
  });

// ── Hold to confirm — a ring fills while the pointer is down; release fires ──
// The elapsed hold time is recovered from an impulse channel kicked at press
// (impulseAge), so the part needs no timer and no local state.
const HOLD_SECONDS = 1.1;
export interface HoldProps { label: string; to(time: number): unknown; }
export const HoldButton = part("hud-hold")
  .props<HoldProps>()
  .size(() => v(210, 56))
  .channels({ hold: { decay: 1 } })
  .style((t, ch) => ({
    ...surface(t, ch, { tint: t.accent }),
    ring: t.accent,
    track: t.muted,
    ready: GREEN,
    corner: 14,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, press = clamp(n.ch.press, 0, 1);
    const held = press > 0.02 ? clamp(impulseAge(n.ch.hold, 1) / HOLD_SECONDS, 0, 1) : 0;
    const k = held * press, ready = held >= 1 ? press : 0;
    const c = v(r.x + 30, r.center.y), tint = ready > 0 ? s.ready : s.ring;
    p.glow(tint, 10 * k + 16 * ready * breathe(t, 0.6), () => p.box(r, s.corner, s.fill, s.edge, 1.5));
    p.ring(c, 15, s.track, 3);
    if (k > 0) p.glow(tint, 8, () => p.arc(c, 15, -TAU / 4, -TAU / 4 + TAU * k, tint, 3.5));
    if (ready > 0) p.dot(c, 6 + 2 * breathe(t, 0.6), calpha(s.ready, ready));
    p.label(ready > 0.5 ? "Release!" : n.props.label, v(r.x + 122, r.center.y), s.text, { weight: 700, size: 14 });
  })
  .gesture({
    begin: (n) => { n.kick?.("hold", 1); return {}; },
    up: (_s, n, pt) => {
      if (impulseAge(n.ch.hold, 1) < HOLD_SECONDS) return;
      n.spawn?.(burst(pt, GREEN));
      n.spawn?.(new Ring(v(n.rect.x + 30, n.rect.center.y), GREEN, 60, 0.6));
      return n.props.to(n.time ?? 0);
    },
  });

// ── Abilities — a radial wipe counts the cooldown down; a flash says ready ───
export type Glyph = "bolt" | "shield" | "flame" | "star";
export interface AbilityProps {
  id: string; glyph: Glyph; usedAt: number; cd: number; hotkey: string;
  cast(id: string, time: number): unknown;
}

function glyphPoints(g: Glyph, c: Vec, r: number): Vec[] {
  switch (g) {
    case "bolt": return [v(c.x + 3, c.y - r), v(c.x - 6, c.y + 2), v(c.x - 1, c.y + 2), v(c.x - 3, c.y + r), v(c.x + 6, c.y - 2), v(c.x + 1, c.y - 2)];
    case "shield": return [v(c.x, c.y - r), v(c.x + r * 0.85, c.y - r * 0.55), v(c.x + r * 0.7, c.y + r * 0.3), v(c.x, c.y + r), v(c.x - r * 0.7, c.y + r * 0.3), v(c.x - r * 0.85, c.y - r * 0.55)];
    case "flame": return [v(c.x, c.y - r), v(c.x + r * 0.5, c.y - r * 0.2), v(c.x + r * 0.7, c.y + r * 0.5), v(c.x, c.y + r), v(c.x - r * 0.7, c.y + r * 0.5), v(c.x - r * 0.4, c.y), v(c.x - r * 0.1, c.y - r * 0.4)];
    case "star": return polygon(c, r, 10).map((pt, i) => (i % 2 ? v(c.x + (pt.x - c.x) * 0.45, c.y + (pt.y - c.y) * 0.45) : pt));
  }
}

const remaining = (n: GNode<AbilityProps>) => cooldown(n.time ?? 0, n.props.usedAt, n.props.cd);

export const AbilityButton = part("hud-ability")
  .props<AbilityProps>()
  .size(() => v(56, 56))
  .style((t, ch) => ({
    ...surface(t, ch, { tint: t.accent }),
    icon: t.textBright,
    shade: calpha(t.bg, 0.74),
    ready: t.accent,
    key: t.textDim,
    corner: 12,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = r.center;
    const rem = remaining(n), fl = flash(t, n.props.usedAt + n.props.cd, 0.5);
    p.push();
    p.scaleAt(c.x, c.y, 1 + 0.12 * fl - 0.05 * n.ch.press);
    p.glow(s.ready, 22 * fl + (rem > 0 ? 0 : 10 * n.ch.hover), () => p.box(r, s.corner, s.fill, s.edge, 1.5));
    p.poly(glyphPoints(n.props.glyph, c, 13), calpha(s.icon, rem > 0 ? 0.45 : 1));
    if (rem > 0) {
      p.push(); p.clip(r.inset(1));
      p.poly(sectorPoints(c, r.w, -TAU / 4, TAU * rem), s.shade);
      p.pop();
      p.label(Math.ceil(rem * n.props.cd).toString(), c, s.icon, { size: 16, weight: 800 });
    }
    if (fl > 0) p.ring(c, 28 + 18 * (1 - fl), calpha(s.ready, fl), 2);
    p.pop();
    p.label(n.props.hotkey, v(r.right - 8, r.y + 8), s.key, { size: 9, weight: 700, mono: true });
  })
  .press((n) => {
    if (remaining(n) > 0) return;
    n.spawn?.(new Ring(n.rect.center, hsl(200, 0.9, 0.65), 40, 0.4));
    return n.props.cast(n.props.id, n.time ?? 0);
  });
`,fe=`// The \`hud\` example's feed: toasts that slide in from the right with a timer
// bar, a level-up banner that drops from the top with a one-time sheen, and
// the floating "+120" text effect. Toast and banner are ordinary keyed
// elements — enter/exit are the automatic channels; the app owns their life.

import { calpha, clamp, Color, easeOutCubic, Fx, Painter, part, rect, v, Vec } from "gratify";
import { polygon, sheenBand } from "../shared/paint";

export type ToastKind = "info" | "good" | "bad";
export interface ToastData { id: number; text: string; kind: ToastKind; at: number; }

export interface ToastProps { data: ToastData; life: number; dismiss(id: number): unknown; }
export const Toast = part("hud-toast")
  .props<ToastProps>()
  .size((p, m) => v(Math.max(220, m.text(p.data.text, 12).x + 40), 40))
  .style((t, ch, p) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.5 + 0.3 * ch.hover),
    edge: t.mix(t.muted, t.textDim, ch.hover),
    stripe: p.data.kind === "good" ? t.accent : p.data.kind === "bad" ? t.danger : t.accent2,
    text: t.textBright,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    p.push();
    p.translate((1 - clamp(n.ch.enter, 0, 1)) * 70, 0);       // slide in from the right
    p.box(r, 8, s.fill, s.edge, 1);
    p.push(); p.clip(rect(r.x, r.y, 5, r.h)); p.box(r, 8, s.stripe); p.pop();
    p.label(n.props.data.text, v(r.x + 16, r.center.y - 3), s.text, { align: "left", size: 12, weight: 500 });
    const left = clamp(1 - (t - n.props.data.at) / n.props.life, 0, 1);
    p.box(rect(r.x + 12, r.bottom - 6, (r.w - 24) * left, 2), 1, calpha(s.stripe, 0.8));
    p.pop();
  })
  .press((n) => n.props.dismiss(n.props.data.id));

export interface BannerProps { title: string; sub: string; level: number; at: number; }
export const Banner = part("hud-banner")
  .props<BannerProps>()
  .size(() => v(340, 64))
  .style((t) => ({
    fill: t.mix(t.surface, t.accent2, 0.35),
    edge: t.mix(t.accent2, t.textBright, 0.3),
    badge: t.accent2,
    text: t.textBright,
    sub: t.text,
    band: t.textBright,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    p.push();
    p.translate(0, -(1 - clamp(n.ch.enter, 0, 1)) * 40);      // drop in from above
    p.glow(s.badge, 18, () => p.box(r, 12, s.fill, s.edge, 1.5));
    const c = v(r.x + 34, r.center.y);
    p.glow(s.badge, 10, () => p.poly(polygon(c, 20, 6), s.badge, s.text, 1.5));
    p.label(String(n.props.level), c, s.text, { size: 15, weight: 800 });
    p.label(n.props.title, v(r.x + 70, r.center.y - 9), s.text, { align: "left", size: 16, weight: 800 });
    p.label(n.props.sub, v(r.x + 70, r.center.y + 11), s.sub, { align: "left", size: 11 });
    const x = (t - n.props.at - 0.25) / 0.7;                 // one sheen pass after landing
    if (x > 0 && x < 1) sheenBand(p, r, x, calpha(s.band, 0.3), 0.2);
    p.pop();
  });

/** Rising, fading text — "+120" over a score, "MISS" over a target. */
export class Floater implements Fx {
  t = 0; done = false;
  constructor(public at: Vec, public text: string, public color: Color, public dur = 0.9) {}
  update(dt: number) { this.t += dt; if (this.t >= this.dur) this.done = true; }
  draw(p: Painter) {
    const k = this.t / this.dur;
    p.label(this.text, v(this.at.x, this.at.y - 44 * easeOutCubic(k)), calpha(this.color, 1 - k * k), { size: 15 + 5 * (1 - k), weight: 800 });
  }
}
`,G=100,K=4,ye=3.5,L=e=>100+25*e,k=[{id:"bolt",glyph:"bolt",cd:3,hotkey:"1"},{id:"shield",glyph:"shield",cd:6,hotkey:"2"},{id:"flame",glyph:"flame",cd:4.5,hotkey:"3"},{id:"star",glyph:"star",cd:8,hotkey:"4"}],we={hp:78,hitAt:-9,healAt:-9,xp:40,level:3,leveledAt:-9,score:1180,usedAt:{},toasts:[],banner:null,nextId:1},E=(e,t,n,s)=>({...e,nextId:e.nextId+1,toasts:[...e.toasts,{id:e.nextId,kind:t,text:n,at:s}].slice(-4)});function ve(e,t){switch(t.kind){case"damage":return E({...e,hp:Math.max(0,e.hp-28),hitAt:t.time},"bad","Hit for 28",t.time);case"heal":return{...e,hp:Math.min(G,e.hp+24),healAt:t.time};case"xp":{const n=e.xp+45,s=L(e.level);if(n<s)return{...e,xp:n};const r=e.level+1;return E({...e,xp:n-s,level:r,leveledAt:t.time,banner:{title:`Level ${r}`,sub:"New ability slot unlocked",at:t.time}},"good",`Reached level ${r}`,t.time)}case"collect":return{...e,score:e.score+120};case"cast":{const n=k.find(s=>s.id===t.id);return!n||t.time-(e.usedAt[t.id]??-99)<n.cd?e:{...e,usedAt:{...e.usedAt,[t.id]:t.time},score:e.score+40}}case"launch":return E({...e,score:e.score+500},"good","Launch confirmed  +500",t.time);case"dismiss":return{...e,toasts:e.toasts.filter(n=>n.id!==t.id)};case"closeBanner":return{...e,banner:null}}}const ke=m("hud-backdrop").props().fill().style(e=>({a:e.accent,b:e.accent2,grid:c(e.textDim,.12)})).render((e,t,n)=>{const s=e.rect;N(t,i(s.w*.15,s.h*.2),s.h*.6,n.a,.14),N(t,i(s.w*.85,s.h*.85),s.h*.6,n.b,.12);for(let r=0;r<s.w;r+=40)t.line(i(r,0),i(r,s.h),n.grid,1);for(let r=0;r<s.h;r+=40)t.line(i(0,r),i(s.w,r),n.grid,1)}),S=(e,t)=>z(e,{text:t,size:10,weight:700,dim:!0}),F=e=>t=>({kind:"cast",id:e,time:t}),Ae=m("hud-collect").props().size((e,t)=>i(t.text(e.label).x+28,32)).style((e,t)=>({fill:e.mix(e.surface,e.accent2,.3+.4*t.hover+.3*t.press),edge:e.mix(e.muted,e.accent2,t.hover),text:e.textBright,lift:2*t.hover-2*t.press})).render((e,t,n)=>{const s=e.rect.raise(n.lift);t.box(s,8,n.fill,n.edge,1),t.label(e.props.label,s.center,n.text,{weight:500})}).press(e=>{var t;return(t=e.spawn)==null||t.call(e,new ue(i(e.rect.center.x,e.rect.y),"+120",A(270,.8,.75))),{kind:"collect",time:e.time??0}});function Be(e){const t=u("panel",{gap:22,pad:40,align:"center"},[z("title",{text:"Mission control",size:22,weight:700,bright:!0}),w("gauges",{gap:28,align:"start"},[u("hp",{gap:6},[S("c","HEALTH"),ae("bar",{hp:e.hp,max:G,hitAt:e.hitAt,healAt:e.healAt})]),w("lvl",{gap:10,align:"center"},[le("badge",{level:e.level,leveledAt:e.leveledAt}),u("xp",{gap:6},[S("c",`LEVEL ${e.level}  ·  ${e.xp} / ${L(e.level)} XP`),oe("bar",{xp:e.xp,need:L(e.level),leveledAt:e.leveledAt})])]),u("score",{gap:6,align:"end"},[S("c","SCORE"),ce("odo",{value:e.score})])]),w("abilities",{gap:12},k.map(r=>he(r.id,{...r,usedAt:e.usedAt[r.id]??-99,cast:(a,l)=>F(a)(l)}))),pe("launch",{label:"Hold to launch",to:r=>({kind:"launch",time:r})}),w("actions",{gap:10},[T("dmg",{label:"Take damage",to:r=>({kind:"damage",time:r}),danger:!0}),T("heal",{label:"Heal",to:r=>({kind:"heal",time:r})}),T("xp",{label:"Gain XP",to:r=>({kind:"xp",time:r}),accent:!0}),Ae("collect",{label:"Collect +120"})]),z("hint",{text:"Keys 1–4 cast abilities · click a toast to dismiss it",size:11,dim:!0})]),n=W("root",{},[ke("bg",{}),u("center",{pad:0,align:"center"},[t]),R("toasts",{corner:"top-right",margin:16},[u("list",{gap:8,align:"end"},e.toasts.map(r=>me(`t${r.id}`,{data:r,life:K,dismiss:a=>({kind:"dismiss",id:a})})))]),R("banner",{corner:"top",margin:18},e.banner?[ge("b",{title:e.banner.title,sub:e.banner.sub,level:e.level,at:e.banner.at})]:[])]),s=Object.fromEntries(k.map(r=>[r.hotkey,a=>F(r.id)(a.time??0)]));return Q(n,Y(J(s)))}const Te=document.getElementById("c"),X=q(Te,{init:we,update:ve,view:Be,ambient:(e,t)=>e.toasts.length>0||e.banner!==null||t-Math.max(e.hitAt,e.healAt,e.leveledAt)<1||k.some(n=>t-(e.usedAt[n.id]??-99)<n.cd+.6),onCommit:(e,t)=>{for(const n of e.toasts)t.toasts.includes(n)||setTimeout(()=>X.dispatch({kind:"dismiss",id:n.id}),K*1e3);e.banner&&e.banner!==t.banner&&setTimeout(()=>X.dispatch({kind:"closeBanner"}),ye*1e3)}});ie([{name:"main.ts",code:xe},{name:"gauges.ts",code:be},{name:"feed.ts",code:fe}]);
