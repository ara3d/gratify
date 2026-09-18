import{p as w,m as g,S as f,L as l,P as C,h,v as u,r as y,c as O,a as M}from"./runtime-DNEt0yeT.js";import{b as T,R as x}from"./effects-BhoHrEqA.js";import{a as S}from"./source-panel-CSqvtNlY.js";const v=`// ============================================================================\r
// Example: combo button — the faster you click, the juicier it gets.\r
//\r
// Click it a few times quickly and watch the "heat" build: the button swells,\r
// shakes, glows, throws more particles, cycles through hotter colors, and the\r
// combo counter climbs. Stop clicking and it all cools back down.\r
//\r
// What makes each layer of juice work:\r
//   • COMBO (state)   — kept in the Doc. A click within 0.6s of the last one\r
//                       increments the combo; a slow click resets it.\r
//   • HEAT (channel)  — a chase channel toward the combo level that also melts\r
//                       back to 0 about 1.5s after you stop. Everything visual\r
//                       reads this one number.\r
//   • PUNCH (impulse) — kicked to 1 on every click and decaying fast; drives\r
//                       the per-click "pop".\r
//   • SHAKE           — a function of GNode.time (an ever-rising clock) times\r
//                       heat, so a hot button vibrates continuously.\r
//   • PARTICLES       — spawned on each click, more of them as the combo grows.\r
// ============================================================================\r
\r
import {\r
  burst, calpha, Color, GNode, hsl, mount, part, Press, rect, rgb, Ring,\r
  Stack, Label, v,\r
} from "gratify";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface ComboDocument {\r
  clicks: number;\r
  combo: number;\r
  best: number;\r
  lastClickTime: number;   // in GNode.time seconds (see the intent below)\r
}\r
\r
// The intent carries the click's timestamp so update() stays a pure function\r
// of its inputs. We use GNode.time (seconds since start), read from the button.\r
type ComboIntent = { kind: "click"; time: number };\r
\r
const COMBO_WINDOW_SECONDS = 0.6;\r
\r
function update(document: ComboDocument, intent: ComboIntent): ComboDocument {\r
  const gap = intent.time - document.lastClickTime;\r
  const withinWindow = gap < COMBO_WINDOW_SECONDS;\r
  const combo = withinWindow ? document.combo + 1 : 1;\r
  return {\r
    clicks: document.clicks + 1,\r
    combo,\r
    best: Math.max(document.best, combo),\r
    lastClickTime: intent.time,\r
  };\r
}\r
\r
// ── Ranks — a label that appears at combo milestones ──────────────────────────\r
\r
function rankFor(combo: number): string {\r
  if (combo >= 20) return "UNSTOPPABLE!";\r
  if (combo >= 12) return "ON FIRE";\r
  if (combo >= 7) return "COMBO!";\r
  if (combo >= 3) return "Nice!";\r
  return "";\r
}\r
\r
// ── The button ────────────────────────────────────────────────────────────────\r
\r
interface ComboButtonProps {\r
  combo: number;\r
  lastClickTime: number;\r
}\r
\r
interface ComboButtonStyle {\r
  fill: Color;\r
  edge: Color;\r
  glow: Color;\r
  glowAmount: number;\r
  heat: number;      // 0..1, the master juice level\r
  pop: number;       // per-click punch, 0..1\r
}\r
\r
const HOT_MAX_COMBO = 12;   // combo at which heat reaches 1\r
\r
const ComboButton = part<ComboButtonProps, ComboButtonStyle>("combo-button", {\r
\r
  size: () => v(220, 80),\r
\r
  channels: {\r
    // HEAT chases the combo level, but also melts back down ~1.5s after the\r
    // last click — so it reflects how hot you are RIGHT NOW, not your history.\r
    heat: {\r
      target: (node: GNode<ComboButtonProps>) => {\r
        const secondsSinceClick = (node.time ?? 0) - node.props.lastClickTime;\r
        const coolness = Math.max(0, 1 - secondsSinceClick / 1.5);\r
        return Math.min(1, node.props.combo / HOT_MAX_COMBO) * coolness;\r
      },\r
      rate: 6,\r
    },\r
    // PUNCH: an impulse. kick() sets it to 1 on each click; it decays fast.\r
    punch: { decay: 7 },\r
  },\r
\r
  style(tokens, channels): ComboButtonStyle {\r
    const heat = channels.heat;\r
    // Warm from accent → orange → red as heat climbs.\r
    const warm = tokens.mix(tokens.accent, tokens.danger, heat);\r
    return {\r
      fill: tokens.mix(tokens.surfaceHi, warm, 0.35 + 0.55 * heat + 0.2 * channels.press),\r
      edge: tokens.mix(tokens.muted, warm, Math.max(channels.hover, heat)),\r
      glow: warm,\r
      glowAmount: 6 + 46 * heat + 26 * channels.punch,\r
      heat,\r
      pop: channels.punch,\r
    };\r
  },\r
\r
  render(node, paint, style) {\r
    const time = node.time ?? 0;\r
    const heat = style.heat;\r
\r
    // SHAKE: a continuous vibration whose amplitude grows with heat, plus an\r
    // extra jolt on each click (pop). Two different frequencies for x and y so\r
    // it looks chaotic rather than diagonal.\r
    const amplitude = (1.5 + 9 * heat) * (0.35 + style.pop);\r
    const shakeX = Math.sin(time * 43) * amplitude;\r
    const shakeY = Math.cos(time * 37) * amplitude;\r
\r
    const r = node.rect;\r
    const center = v(r.center.x + shakeX, r.center.y + shakeY);\r
    // The face, shifted by the shake so its center lands on \`center\`.\r
    const face = rect(center.x - r.w / 2, center.y - r.h / 2, r.w, r.h);\r
\r
    // A hot button gets a rainbow rim on top of its warm fill.\r
    const rimHue = (time * 90) % 360;\r
    const edge = heat > 0.5 ? calpha(hsl(rimHue, 0.9, 0.6), heat) : style.edge;\r
\r
    // POP: scale everything around the (shaken) center for this one click.\r
    const scale = 1 + 0.16 * style.pop + 0.05 * heat;\r
    paint.push();\r
    paint.scaleAt(center.x, center.y, scale);\r
    paint.glow(style.glow, style.glowAmount, () =>\r
      paint.box(face, 14, style.fill, edge, 2 + 2 * heat));\r
    paint.label("CLICK ME!", center, rgb(255, 255, 255), { weight: 700, size: 20 });\r
    paint.pop();\r
  },\r
\r
  on: [\r
    Press((node) => {\r
      const combo = node.props.combo + 1;   // about to become this after update\r
\r
      // PUNCH — the per-click pop.\r
      node.kick?.("punch", 1);\r
\r
      // PARTICLES — more, and more colorful, as the combo grows.\r
      const origin = node.pointer ?? node.rect.center;\r
      const bursts = 1 + Math.min(4, Math.floor(combo / 3));\r
      for (let i = 0; i < bursts; i++) {\r
        const hue = (combo * 40 + i * 60) % 360;\r
        node.spawn?.(burst(origin, hsl(hue, 0.85, 0.6)));\r
      }\r
      node.spawn?.(new Ring(origin, hsl((combo * 40) % 360, 0.9, 0.62), 30 + combo * 3, 0.5));\r
\r
      return { kind: "click", time: node.time ?? 0 };\r
    }),\r
  ],\r
});\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
function view(document: ComboDocument) {\r
  const rank = rankFor(document.combo);\r
  return Stack("root", { gap: 18, pad: 56, align: "center" }, [\r
\r
    Label("title", { text: "Click fast!", size: 22, weight: 700, bright: true }),\r
\r
    Label("combo", {\r
      text: document.combo > 1 ? \`COMBO ×\${document.combo}\` : " ",\r
      size: 18,\r
      weight: 700,\r
      bright: document.combo > 1,\r
    }),\r
\r
    Label("rank", { text: rank || " ", size: 15, weight: 600, dim: true }),\r
\r
    ComboButton("button", { combo: document.combo, lastClickTime: document.lastClickTime }),\r
\r
    Label("stats", {\r
      text: \`clicks \${document.clicks}   ·   best combo ×\${document.best}\`,\r
      size: 12, dim: true,\r
    }),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: { clicks: 0, combo: 0, best: 0, lastClickTime: -999 },\r
  update,\r
  view,\r
  // The shake and glow pulse are functions of the clock, so keep the loop\r
  // awake while the button is still cooling down after your last click.\r
  ambient: (document, time) => time - document.lastClickTime < 2.5,\r
});\r
\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`,B=.6;function N(n,t){const r=t.time-n.lastClickTime<B?n.combo+1:1;return{clicks:n.clicks+1,combo:r,best:Math.max(n.best,r),lastClickTime:t.time}}function P(n){return n>=20?"UNSTOPPABLE!":n>=12?"ON FIRE":n>=7?"COMBO!":n>=3?"Nice!":""}const A=12,E=w("combo-button",{size:()=>u(220,80),channels:{heat:{target:n=>{const t=(n.time??0)-n.props.lastClickTime,e=Math.max(0,1-t/1.5);return Math.min(1,n.props.combo/A)*e},rate:6},punch:{decay:7}},style(n,t){const e=t.heat,o=n.mix(n.accent,n.danger,e);return{fill:n.mix(n.surfaceHi,o,.35+.55*e+.2*t.press),edge:n.mix(n.muted,o,Math.max(t.hover,e)),glow:o,glowAmount:6+46*e+26*t.punch,heat:e,pop:t.punch}},render(n,t,e){const o=n.time??0,r=e.heat,s=(1.5+9*r)*(.35+e.pop),m=Math.sin(o*43)*s,a=Math.cos(o*37)*s,c=n.rect,i=u(c.center.x+m,c.center.y+a),b=y(i.x-c.w/2,i.y-c.h/2,c.w,c.h),p=o*90%360,k=r>.5?O(h(p,.9,.6),r):e.edge,d=1+.16*e.pop+.05*r;t.push(),t.scaleAt(i.x,i.y,d),t.glow(e.glow,e.glowAmount,()=>t.box(b,14,e.fill,k,2+2*r)),t.label("CLICK ME!",i,M(255,255,255),{weight:700,size:20}),t.pop()},on:[C(n=>{var r,s,m;const t=n.props.combo+1;(r=n.kick)==null||r.call(n,"punch",1);const e=n.pointer??n.rect.center,o=1+Math.min(4,Math.floor(t/3));for(let a=0;a<o;a++){const c=(t*40+a*60)%360;(s=n.spawn)==null||s.call(n,T(e,h(c,.85,.6)))}return(m=n.spawn)==null||m.call(n,new x(e,h(t*40%360,.9,.62),30+t*3,.5)),{kind:"click",time:n.time??0}})]});function H(n){const t=P(n.combo);return f("root",{gap:18,pad:56,align:"center"},[l("title",{text:"Click fast!",size:22,weight:700,bright:!0}),l("combo",{text:n.combo>1?`COMBO ×${n.combo}`:" ",size:18,weight:700,bright:n.combo>1}),l("rank",{text:t||" ",size:15,weight:600,dim:!0}),E("button",{combo:n.combo,lastClickTime:n.lastClickTime}),l("stats",{text:`clicks ${n.clicks}   ·   best combo ×${n.best}`,size:12,dim:!0})])}const I=document.getElementById("c");g(I,{init:{clicks:0,combo:0,best:0,lastClickTime:-999},update:N,view:H,ambient:(n,t)=>t-n.lastClickTime<2.5});S([{name:"main.ts",code:v}]);
