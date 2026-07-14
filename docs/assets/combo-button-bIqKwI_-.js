import{p as w,m as g,d as f,S as C,L as l,P as y,h,v as u,r as O,c as M,a as T}from"./source-panel-cwX9nwkb.js";import{b as x,R as S}from"./effects-BGArodll.js";const v=`// ============================================================================
// Example: combo button — the faster you click, the juicier it gets.
//
// Click it a few times quickly and watch the "heat" build: the button swells,
// shakes, glows, throws more particles, cycles through hotter colors, and the
// combo counter climbs. Stop clicking and it all cools back down.
//
// What makes each layer of juice work:
//   • COMBO (state)   — kept in the Doc. A click within 0.6s of the last one
//                       increments the combo; a slow click resets it.
//   • HEAT (channel)  — a chase channel toward the combo level that also melts
//                       back to 0 about 1.5s after you stop. Everything visual
//                       reads this one number.
//   • PUNCH (impulse) — kicked to 1 on every click and decaying fast; drives
//                       the per-click "pop".
//   • SHAKE           — a function of GNode.time (an ever-rising clock) times
//                       heat, so a hot button vibrates continuously.
//   • PARTICLES       — spawned on each click, more of them as the combo grows.
// ============================================================================

import {
  burst, calpha, Color, GNode, hsl, mount, part, Press, rect, rgb, Ring,
  Stack, Label, v,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface ComboDocument {
  clicks: number;
  combo: number;
  best: number;
  lastClickTime: number;   // in GNode.time seconds (see the intent below)
}

// The intent carries the click's timestamp so update() stays a pure function
// of its inputs. We use GNode.time (seconds since start), read from the button.
type ComboIntent = { kind: "click"; time: number };

const COMBO_WINDOW_SECONDS = 0.6;

function update(document: ComboDocument, intent: ComboIntent): ComboDocument {
  const gap = intent.time - document.lastClickTime;
  const withinWindow = gap < COMBO_WINDOW_SECONDS;
  const combo = withinWindow ? document.combo + 1 : 1;
  return {
    clicks: document.clicks + 1,
    combo,
    best: Math.max(document.best, combo),
    lastClickTime: intent.time,
  };
}

// ── Ranks — a label that appears at combo milestones ──────────────────────────

function rankFor(combo: number): string {
  if (combo >= 20) return "UNSTOPPABLE!";
  if (combo >= 12) return "ON FIRE";
  if (combo >= 7) return "COMBO!";
  if (combo >= 3) return "Nice!";
  return "";
}

// ── The button ────────────────────────────────────────────────────────────────

interface ComboButtonProps {
  combo: number;
  lastClickTime: number;
}

interface ComboButtonStyle {
  fill: Color;
  edge: Color;
  glow: Color;
  glowAmount: number;
  heat: number;      // 0..1, the master juice level
  pop: number;       // per-click punch, 0..1
}

const HOT_MAX_COMBO = 12;   // combo at which heat reaches 1

const ComboButton = part<ComboButtonProps, ComboButtonStyle>("combo-button", {

  size: () => v(220, 80),

  channels: {
    // HEAT chases the combo level, but also melts back down ~1.5s after the
    // last click — so it reflects how hot you are RIGHT NOW, not your history.
    heat: {
      target: (node: GNode<ComboButtonProps>) => {
        const secondsSinceClick = (node.time ?? 0) - node.props.lastClickTime;
        const coolness = Math.max(0, 1 - secondsSinceClick / 1.5);
        return Math.min(1, node.props.combo / HOT_MAX_COMBO) * coolness;
      },
      rate: 6,
    },
    // PUNCH: an impulse. kick() sets it to 1 on each click; it decays fast.
    punch: { decay: 7 },
  },

  style(tokens, channels): ComboButtonStyle {
    const heat = channels.heat;
    // Warm from accent → orange → red as heat climbs.
    const warm = tokens.mix(tokens.accent, tokens.danger, heat);
    return {
      fill: tokens.mix(tokens.surfaceHi, warm, 0.35 + 0.55 * heat + 0.2 * channels.press),
      edge: tokens.mix(tokens.muted, warm, Math.max(channels.hover, heat)),
      glow: warm,
      glowAmount: 6 + 46 * heat + 26 * channels.punch,
      heat,
      pop: channels.punch,
    };
  },

  render(node, paint, style) {
    const time = node.time ?? 0;
    const heat = style.heat;

    // SHAKE: a continuous vibration whose amplitude grows with heat, plus an
    // extra jolt on each click (pop). Two different frequencies for x and y so
    // it looks chaotic rather than diagonal.
    const amplitude = (1.5 + 9 * heat) * (0.35 + style.pop);
    const shakeX = Math.sin(time * 43) * amplitude;
    const shakeY = Math.cos(time * 37) * amplitude;

    const r = node.rect;
    const center = v(r.center.x + shakeX, r.center.y + shakeY);
    // The face, shifted by the shake so its center lands on \`center\`.
    const face = rect(center.x - r.w / 2, center.y - r.h / 2, r.w, r.h);

    // A hot button gets a rainbow rim on top of its warm fill.
    const rimHue = (time * 90) % 360;
    const edge = heat > 0.5 ? calpha(hsl(rimHue, 0.9, 0.6), heat) : style.edge;

    // POP: scale everything around the (shaken) center for this one click.
    const scale = 1 + 0.16 * style.pop + 0.05 * heat;
    paint.push();
    paint.scaleAt(center.x, center.y, scale);
    paint.glow(style.glow, style.glowAmount, () =>
      paint.box(face, 14, style.fill, edge, 2 + 2 * heat));
    paint.label("CLICK ME!", center, rgb(255, 255, 255), { weight: 700, size: 20 });
    paint.pop();
  },

  on: [
    Press((node) => {
      const combo = node.props.combo + 1;   // about to become this after update

      // PUNCH — the per-click pop.
      node.kick?.("punch", 1);

      // PARTICLES — more, and more colorful, as the combo grows.
      const origin = node.pointer ?? node.rect.center;
      const bursts = 1 + Math.min(4, Math.floor(combo / 3));
      for (let i = 0; i < bursts; i++) {
        const hue = (combo * 40 + i * 60) % 360;
        node.spawn?.(burst(origin, hsl(hue, 0.85, 0.6)));
      }
      node.spawn?.(new Ring(origin, hsl((combo * 40) % 360, 0.9, 0.62), 30 + combo * 3, 0.5));

      return { kind: "click", time: node.time ?? 0 };
    }),
  ],
});

// ── View ──────────────────────────────────────────────────────────────────────

function view(document: ComboDocument) {
  const rank = rankFor(document.combo);
  return Stack("root", { gap: 18, pad: 56, align: "center" }, [

    Label("title", { text: "Click fast!", size: 22, weight: 700, bright: true }),

    Label("combo", {
      text: document.combo > 1 ? \`COMBO ×\${document.combo}\` : " ",
      size: 18,
      weight: 700,
      bright: document.combo > 1,
    }),

    Label("rank", { text: rank || " ", size: 15, weight: 600, dim: true }),

    ComboButton("button", { combo: document.combo, lastClickTime: document.lastClickTime }),

    Label("stats", {
      text: \`clicks \${document.clicks}   ·   best combo ×\${document.best}\`,
      size: 12, dim: true,
    }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { clicks: 0, combo: 0, best: 0, lastClickTime: -999 },
  update,
  view,
  // The shake and glow pulse are functions of the clock, so keep the loop
  // awake while the button is still cooling down after your last click.
  ambient: (document, time) => time - document.lastClickTime < 2.5,
});

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`,B=.6;function N(n,t){const o=t.time-n.lastClickTime<B?n.combo+1:1;return{clicks:n.clicks+1,combo:o,best:Math.max(n.best,o),lastClickTime:t.time}}function P(n){return n>=20?"UNSTOPPABLE!":n>=12?"ON FIRE":n>=7?"COMBO!":n>=3?"Nice!":""}const A=12,E=w("combo-button",{size:()=>u(220,80),channels:{heat:{target:n=>{const t=(n.time??0)-n.props.lastClickTime,e=Math.max(0,1-t/1.5);return Math.min(1,n.props.combo/A)*e},rate:6},punch:{decay:7}},style(n,t){const e=t.heat,c=n.mix(n.accent,n.danger,e);return{fill:n.mix(n.surfaceHi,c,.35+.55*e+.2*t.press),edge:n.mix(n.muted,c,Math.max(t.hover,e)),glow:c,glowAmount:6+46*e+26*t.punch,heat:e,pop:t.punch}},render(n,t,e){const c=n.time??0,o=e.heat,a=(1.5+9*o)*(.35+e.pop),m=Math.sin(c*43)*a,i=Math.cos(c*37)*a,s=n.rect,r=u(s.center.x+m,s.center.y+i),b=O(r.x-s.w/2,r.y-s.h/2,s.w,s.h),p=c*90%360,k=o>.5?M(h(p,.9,.6),o):e.edge,d=1+.16*e.pop+.05*o;t.push(),t.scaleAt(r.x,r.y,d),t.glow(e.glow,e.glowAmount,()=>t.box(b,14,e.fill,k,2+2*o)),t.label("CLICK ME!",r,T(255,255,255),{weight:700,size:20}),t.pop()},on:[y(n=>{var o,a,m;const t=n.props.combo+1;(o=n.kick)==null||o.call(n,"punch",1);const e=n.pointer??n.rect.center,c=1+Math.min(4,Math.floor(t/3));for(let i=0;i<c;i++){const s=(t*40+i*60)%360;(a=n.spawn)==null||a.call(n,x(e,h(s,.85,.6)))}return(m=n.spawn)==null||m.call(n,new S(e,h(t*40%360,.9,.62),30+t*3,.5)),{kind:"click",time:n.time??0}})]});function H(n){const t=P(n.combo);return C("root",{gap:18,pad:56,align:"center"},[l("title",{text:"Click fast!",size:22,weight:700,bright:!0}),l("combo",{text:n.combo>1?`COMBO ×${n.combo}`:" ",size:18,weight:700,bright:n.combo>1}),l("rank",{text:t||" ",size:15,weight:600,dim:!0}),E("button",{combo:n.combo,lastClickTime:n.lastClickTime}),l("stats",{text:`clicks ${n.clicks}   ·   best combo ×${n.best}`,size:12,dim:!0})])}const I=document.getElementById("c");g(I,{init:{clicks:0,combo:0,best:0,lastClickTime:-999},update:N,view:H,ambient:(n,t)=>t-n.lastClickTime<2.5});f([{name:"main.ts",code:v}]);
