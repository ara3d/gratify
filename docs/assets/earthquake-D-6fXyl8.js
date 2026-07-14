import{p as B,P as D,h as p,v as i,c as m,r as d,d as w,m as P,a as L,e as H}from"./source-panel-CCgHUfrE.js";import{b as Y}from"./effects-BPrdJU6w.js";const M=`// ============================================================================
// Example: earthquake — click anywhere to shake the world apart.
//
// A skyline of brick towers sits on the ground. Click (repeatedly!) to trigger
// tremors: the taller a brick, the more it sways — like a real building whipping
// at the top — dust flies off the ground, and the Richter readout climbs.
//
// This demo is entirely TIME-BASED, which is worth studying:
//   • The tremor is a pure function of GNode.time. Its intensity decays as
//     \`magnitude * exp(-elapsed * DECAY)\`, and its oscillation is \`sin(time*…)\`.
//     Nothing is stored frame-to-frame; render just reads the clock.
//   • Because that motion never changes any channel, the runtime's rest
//     detector can't see it — so the app opts into \`ambient\`, returning true
//     while a quake is still settling and false once it's calm. That is what
//     keeps the loop awake during a purely time-driven animation.
//   • The intent carries the click's timestamp (node.time), keeping update a
//     pure function; repeated clicks ADD to the magnitude that was left.
// ============================================================================

import {
  burst, calpha, clamp, hsl, mount, part, Press, rect, rgb, v, Vec,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── Tuning ──────────────────────────────────────────────────────────────────

const TOWER_COUNT = 7;
const BRICKS_PER_TOWER = 6;
const BRICK_WIDTH = 48;
const BRICK_HEIGHT = 22;
const BRICK_GAP = 3;
const CLICK_KICK = 0.5;         // how much intensity each click adds (0..1)
const DECAY = 0.5;              // how fast a quake calms, per second
const SETTLE_SECONDS = 8;       // keep the loop awake this long after a click

// ── State ─────────────────────────────────────────────────────────────────────
//
// We store the intensity at the moment of the last click and when that was, in
// GNode.time seconds. The live intensity is derived from those + the clock.

interface QuakeDocument {
  intensityAtLastShake: number;   // 0..1
  lastShakeTime: number;          // seconds (GNode.time)
  quakes: number;
}

type QuakeIntent = { kind: "shake"; time: number };

/** Intensity right now, decayed from the last shake. */
function intensityAt(document: QuakeDocument, time: number): number {
  const elapsed = time - document.lastShakeTime;
  if (elapsed < 0) return 0;
  return document.intensityAtLastShake * Math.exp(-elapsed * DECAY);
}

function update(document: QuakeDocument, intent: QuakeIntent): QuakeDocument {
  // Add the kick to whatever intensity is LEFT over from earlier — so rapid
  // clicks stack into a bigger quake.
  const leftover = intensityAt(document, intent.time);
  return {
    intensityAtLastShake: clamp(leftover + CLICK_KICK, 0, 1),
    lastShakeTime: intent.time,
    quakes: document.quakes + 1,
  };
}

// ── The stage ─────────────────────────────────────────────────────────────────

interface StageProps {
  intensityAtLastShake: number;
  lastShakeTime: number;
  quakes: number;
}

const EarthquakeStage = part<StageProps>("earthquake-stage", {

  size: () => v(0, 0),   // fill the canvas
  hit: () => true,       // the whole stage is clickable

  render(node, paint) {
    const area = node.rect;
    const time = node.time ?? 0;

    const elapsed = time - node.props.lastShakeTime;
    const intensity = elapsed < 0 ? 0
      : node.props.intensityAtLastShake * Math.exp(-elapsed * DECAY);

    // A whole-scene jitter that everything inherits.
    const globalShake = v(
      Math.sin(time * 31) * intensity * 7,
      Math.cos(time * 27) * intensity * 4,
    );

    const groundY = area.bottom - 70;
    const towerSpacing = area.w / (TOWER_COUNT + 1);

    // The towers.
    for (let towerIndex = 0; towerIndex < TOWER_COUNT; towerIndex++) {
      const baseX = area.x + towerSpacing * (towerIndex + 1);
      const towerPhase = towerIndex * 1.7;
      const hue = (towerIndex * 40 + 200) % 360;

      for (let brickIndex = 0; brickIndex < BRICKS_PER_TOWER; brickIndex++) {
        // Taller bricks sway further (heightFraction 0 at ground → 1 at top).
        const heightFraction = brickIndex / (BRICKS_PER_TOWER - 1);
        const swayAmplitude = intensity * 26 * heightFraction;
        const sway = Math.sin(time * 9 + towerPhase + heightFraction * 2.5) * swayAmplitude;

        const brickCenterX = baseX + sway + globalShake.x;
        const brickBottom = groundY - brickIndex * (BRICK_HEIGHT + BRICK_GAP) + globalShake.y;
        const brickRect = rect(
          brickCenterX - BRICK_WIDTH / 2,
          brickBottom - BRICK_HEIGHT,
          BRICK_WIDTH, BRICK_HEIGHT);

        const light = 0.5 - 0.05 * brickIndex;
        paint.box(brickRect, 3, hsl(hue, 0.45, light), calpha(rgb(0, 0, 0), 0.3), 1);
      }
    }

    // The ground.
    paint.box(rect(area.x, groundY, area.w, area.bottom - groundY), 0, hsl(30, 0.25, 0.22));
    paint.line(v(area.x, groundY), v(area.right, groundY), calpha(rgb(0, 0, 0), 0.4), 2);

    // Cracks spread across the ground as the quake intensifies.
    if (intensity > 0.35) {
      const crackAlpha = calpha(rgb(0, 0, 0), (intensity - 0.35) * 0.9);
      let x = area.x + 40;
      const points: Vec[] = [v(x, groundY + 20)];
      while (x < area.right - 40) {
        x += 28;
        points.push(v(x, groundY + 14 + Math.sin(x * 0.3 + time * 6) * 10 * intensity));
      }
      for (let i = 1; i < points.length; i++) paint.line(points[i - 1], points[i], crackAlpha, 1.5);
    }

    // A red danger wash at high intensity.
    if (intensity > 0.5) {
      paint.box(area, 0, calpha(rgb(255, 60, 40), (intensity - 0.5) * 0.18));
    }

    // Readout.
    const magnitude = (intensity * 9).toFixed(1);
    const readoutColor = intensity > 0.05
      ? hsl(20 - 20 * intensity, 0.85, 0.6)
      : calpha(rgb(255, 255, 255), 0.35);
    paint.label(\`RICHTER  M \${magnitude}\`,
      v(area.center.x + globalShake.x, area.y + 60), readoutColor, { size: 30, weight: 700 });
    paint.label(
      intensity > 0.05 ? \`\${node.props.quakes} quakes triggered\` : "click anywhere to shake",
      v(area.center.x, area.y + 95), calpha(rgb(255, 255, 255), 0.5), { size: 13 });
  },

  on: [
    Press((node) => {
      // Kick up dust along the ground near the click.
      const origin = node.pointer ?? node.rect.center;
      const groundY = node.rect.bottom - 70;
      for (let i = 0; i < 3; i++) {
        node.spawn?.(burst(v(origin.x + (i - 1) * 40, groundY), hsl(35, 0.3, 0.55)));
      }
      return { kind: "shake", time: node.time ?? 0 };
    }),
  ],
});

// ── App ────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { intensityAtLastShake: 0, lastShakeTime: -999, quakes: 0 },
  update,
  view: (document) => EarthquakeStage("root", document),
  // Keep the loop awake while a quake is still settling — the shake is a pure
  // function of the clock, invisible to the channel-based rest detector.
  ambient: (document, time) => time - document.lastShakeTime < SETTLE_SECONDS,
});

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`,S=7,I=6,T=48,b=22,O=3,W=.5,x=.5,G=8;function N(e,t){const n=t-e.lastShakeTime;return n<0?0:e.intensityAtLastShake*Math.exp(-n*x)}function F(e,t){const n=N(e,t.time);return{intensityAtLastShake:H(n+W,0,1),lastShakeTime:t.time,quakes:e.quakes+1}}const z=B("earthquake-stage",{size:()=>i(0,0),hit:()=>!0,render(e,t){const n=e.rect,s=e.time??0,h=s-e.props.lastShakeTime,a=h<0?0:e.props.intensityAtLastShake*Math.exp(-h*x),g=i(Math.sin(s*31)*a*7,Math.cos(s*27)*a*4),o=n.bottom-70,f=n.w/(S+1);for(let r=0;r<S;r++){const c=n.x+f*(r+1),l=r*1.7,u=(r*40+200)%360;for(let k=0;k<I;k++){const y=k/(I-1),R=a*26*y,A=Math.sin(s*9+l+y*2.5)*R,_=c+A+g.x,v=o-k*(b+O)+g.y,K=w(_-T/2,v-b,T,b),q=.5-.05*k;t.box(K,3,p(u,.45,q),m(d(0,0,0),.3),1)}}if(t.box(w(n.x,o,n.w,n.bottom-o),0,p(30,.25,.22)),t.line(i(n.x,o),i(n.right,o),m(d(0,0,0),.4),2),a>.35){const r=m(d(0,0,0),(a-.35)*.9);let c=n.x+40;const l=[i(c,o+20)];for(;c<n.right-40;)c+=28,l.push(i(c,o+14+Math.sin(c*.3+s*6)*10*a));for(let u=1;u<l.length;u++)t.line(l[u-1],l[u],r,1.5)}a>.5&&t.box(n,0,m(d(255,60,40),(a-.5)*.18));const C=(a*9).toFixed(1),E=a>.05?p(20-20*a,.85,.6):m(d(255,255,255),.35);t.label(`RICHTER  M ${C}`,i(n.center.x+g.x,n.y+60),E,{size:30,weight:700}),t.label(a>.05?`${e.props.quakes} quakes triggered`:"click anywhere to shake",i(n.center.x,n.y+95),m(d(255,255,255),.5),{size:13})},on:[D(e=>{var s;const t=e.pointer??e.rect.center,n=e.rect.bottom-70;for(let h=0;h<3;h++)(s=e.spawn)==null||s.call(e,Y(i(t.x+(h-1)*40,n),p(35,.3,.55)));return{kind:"shake",time:e.time??0}})]}),Q=document.getElementById("c");P(Q,{init:{intensityAtLastShake:0,lastShakeTime:-999,quakes:0},update:F,view:e=>z("root",e),ambient:(e,t)=>t-e.lastShakeTime<G});L([{name:"main.ts",code:M}]);
