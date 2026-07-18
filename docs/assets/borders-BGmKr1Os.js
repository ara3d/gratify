import{c as h,a,m as E,d as R,S,L as p,R as g,f as T,g as L,b as w,v as o}from"./source-panel-CwjQB28X.js";import{d as B,w as s,B as l,C as v,T as A,S as I,m as y}from"./widgets-CaJ4_Cu6.js";import{w as P}from"./widgets-BJYGvrkn.js";const C=`// ============================================================================
// Example: borders — a border is a DECORATION you layer onto any widget, not a
// feature a widget builds in. Proves README §3 ("wrap, don't edit") with paint:
// \`border(kind)\` is a \`PartExt\` built on \`mapRender\` — it paints its bevel over
// the widget's own render and reads the widget's \`press\` channel, so a raised
// button visibly sinks when you push it. The stock Button / Slider / Checkbox /
// Toggle from examples/shared/widgets.ts know nothing about borders.
//
// Acceptance test — you should see, and be able to do:
//   · every control below wears a border it was never written to expect;
//   · pressing a "raised" control flips its bevel to "sunken" (press channel);
//   · the same \`border(...)\` value applied three ways — use site, a derived
//     part, and a live theme toggle — with no edit to the widgets;
//   · one control stacked with TWO decorations (border + accent ring), drawn
//     inside-out in application order — the composition-order check.
// ============================================================================

import {
  calpha, clearThemeExt, cmix, derivePart, extendTheme, mount, Painter,
  PartExt, mapRender, Rect, rgb, v, withExt, Stack, Row, Label,
} from "gratify";
import { Button, Checkbox, Slider, Toggle } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── The border kinds, as paint ─────────────────────────────────────────────────
//
// A light pair of edges plus a dark pair is what tricks the eye into depth;
// swapping which pair is which flips raised ↔ sunken. Fixed rgba (not tokens),
// because a bevel is drawn light over whatever surface it sits on.

type BorderKind = "single" | "double" | "sunken" | "raised";

const LIGHT = calpha(rgb(255, 255, 255), 0.55);
const DARK = calpha(rgb(0, 0, 0), 0.5);
const CLEAR = rgb(0, 0, 0, 0);
const OUTLINE = calpha(rgb(255, 255, 255), 0.3);

/** Paint one border into rect \`r\`. \`flip\` (0..1) only affects bevels:
 *  0 = raised look, 1 = sunken look. Animate it and a raised frame depresses. */
function drawBorder(paint: Painter, r: Rect, kind: BorderKind, flip: number) {
  switch (kind) {
    case "single":
      paint.box(r, 0, CLEAR, OUTLINE, 1);
      return;

    case "double":
      paint.box(r, 0, CLEAR, OUTLINE, 1);
      paint.box(r.inset(3), 0, CLEAR, OUTLINE, 1);
      return;

    case "raised":
    case "sunken": {
      const t = Math.max(kind === "sunken" ? 1 : 0, flip);
      const topLeft = cmix(LIGHT, DARK, t);
      const bottomRight = cmix(DARK, LIGHT, t);
      paint.line(v(r.x, r.y + 1), v(r.right, r.y + 1), topLeft, 2);                 // top
      paint.line(v(r.x + 1, r.y), v(r.x + 1, r.bottom), topLeft, 2);                // left
      paint.line(v(r.x, r.bottom - 1), v(r.right, r.bottom - 1), bottomRight, 2);   // bottom
      paint.line(v(r.right - 1, r.y), v(r.right - 1, r.bottom), bottomRight, 2);    // right
      return;
    }
  }
}

// ── The extension: a border on ANY widget ──────────────────────────────────────
//
// \`mapRender\` hands us the widget's own paint call as \`base\`; we call it first
// (the widget, untouched) and then draw the border on top. A "raised" border
// reads the host's \`press\` channel, so it flips as the control is pressed —
// the widget never needed to know.

export const border = (kind: BorderKind): PartExt =>
  mapRender((node, paint, _style, base) => {
    base();
    drawBorder(paint, node.rect, kind, kind === "raised" ? (node.ch.press ?? 0) : 0);
  });

/** A second, different decoration — an accent ring that brightens on hover —
 *  used only to demonstrate stacking order against \`border(...)\`. */
const accentRing: PartExt = mapRender((node, paint, _style, base) => {
  base();
  const glow = calpha(rgb(96, 180, 255), 0.35 + 0.5 * (node.ch.hover ?? 0));
  paint.box(node.rect.inset(-3), 8, CLEAR, glow, 1.5);
});

// ── Scope 1 — DEFINITION: a new named part with a border baked in ──────────────

const SunkenButton = derivePart("sunken-button", Button, border("sunken"));

// ── App ─────────────────────────────────────────────────────────────────────────

interface Doc { volume: number; check: boolean; power: boolean; themed: boolean; }

type Intent =
  | { kind: "volume"; value: number }
  | { kind: "check" }
  | { kind: "power" }
  | { kind: "toggle-theme" }
  | { kind: "noop" };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "volume": return { ...doc, volume: intent.value };
    case "check": return { ...doc, check: !doc.check };
    case "power": return { ...doc, power: !doc.power };
    case "toggle-theme": {
      const themed = !doc.themed;
      // Scope 2 — THEME: while active, every part named "slider" wears a single
      // outline. Nothing about Slider changes; the theme reaches into it.
      if (themed) extendTheme("dark", "slider", border("single") as (d: unknown) => unknown);
      else clearThemeExt("dark", "slider");
      return { ...doc, themed };
    }
    case "noop": return doc;
  }
}

const row = (key: string, label: string, el: ReturnType<typeof Button>) =>
  Row(key, { gap: 14, align: "center" }, [
    Label(\`\${key}/l\`, { text: label, dim: true, size: 12 }),
    el,
  ]);

function view(doc: Doc) {
  return Stack("root", { gap: 14, pad: 40 }, [

    Label("title", { text: "Borders are decorations, not features", size: 20, weight: 600, bright: true }),
    Label("subtitle", { text: "Press the raised button — its bevel flips to sunken.", dim: true }),

    // Scope 3 — USE SITE: border on one element only.
    row("raised", "use site · raised",
      withExt(Button("raised-btn", { label: "Press me", press: { kind: "noop" } }), border("raised"))),

    // Scope 1 — the derived part carries the border in its definition.
    row("sunken", "definition · derived",
      SunkenButton("sunken-btn", { label: "Sunken button", press: { kind: "noop" } })),

    row("double", "use site · double",
      withExt(Button("double-btn", { label: "Double outline", press: { kind: "noop" } }), border("double"))),

    // Stacking: TWO decorations on one widget. \`border\` is applied first, so it
    // draws closest to the widget; \`accentRing\` is applied last, so it draws
    // outermost — inside-out, in application order. Swap the two args and the
    // ring would tuck under the bevel instead.
    row("stacked", "stacked · border + ring",
      withExt(Button("stacked-btn", { label: "Two decorations", press: { kind: "noop" } }),
        border("raised"), accentRing)),

    // Borders decorate NON-button widgets identically.
    Row("misc", { gap: 20, align: "center" }, [
      withExt(Checkbox("chk", { on: doc.check, toggle: { kind: "check" }, label: "sunken checkbox" }), border("sunken")),
      withExt(Toggle("tog", { on: doc.power, flip: { kind: "power" } }), border("single")),
    ]),

    Slider("vol", { value: doc.volume, set: (value) => ({ kind: "volume", value }), width: 220 }),

    // Scope 2 — flip the theme extension live. Watch the slider gain/lose its
    // outline with nothing in the slider's definition touched.
    Row("theme", { gap: 10, align: "center" }, [
      Checkbox("theme-chk", { on: doc.themed, toggle: { kind: "toggle-theme" }, label: "theme scope · outline every slider" }),
    ]),
  ]);
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, { init: { volume: 0.4, check: true, power: false, themed: false }, update, view });

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
`,x=h(a(255,255,255),.55),f=h(a(0,0,0),.5),u=a(0,0,0,0),b=h(a(255,255,255),.3);function D(n,e,t,d){switch(t){case"single":n.box(e,0,u,b,1);return;case"double":n.box(e,0,u,b,1),n.box(e.inset(3),0,u,b,1);return;case"raised":case"sunken":{const i=Math.max(t==="sunken"?1:0,d),m=w(x,f,i),k=w(f,x,i);n.line(o(e.x,e.y+1),o(e.right,e.y+1),m,2),n.line(o(e.x+1,e.y),o(e.x+1,e.bottom),m,2),n.line(o(e.x,e.bottom-1),o(e.right,e.bottom-1),k,2),n.line(o(e.right-1,e.y),o(e.right-1,e.bottom),k,2);return}}}const r=n=>y((e,t,d,i)=>{i(),D(t,e.rect,n,n==="raised"?e.ch.press??0:0)}),N=y((n,e,t,d)=>{d();const i=h(a(96,180,255),.35+.5*(n.ch.hover??0));e.box(n.rect.inset(-3),8,u,i,1.5)}),O=B("sunken-button",l,r("sunken"));function K(n,e){switch(e.kind){case"volume":return{...n,volume:e.value};case"check":return{...n,check:!n.check};case"power":return{...n,power:!n.power};case"toggle-theme":{const t=!n.themed;return t?T("dark","slider",r("single")):L("dark","slider"),{...n,themed:t}}case"noop":return n}}const c=(n,e,t)=>g(n,{gap:14,align:"center"},[p(`${n}/l`,{text:e,dim:!0,size:12}),t]);function H(n){return S("root",{gap:14,pad:40},[p("title",{text:"Borders are decorations, not features",size:20,weight:600,bright:!0}),p("subtitle",{text:"Press the raised button — its bevel flips to sunken.",dim:!0}),c("raised","use site · raised",s(l("raised-btn",{label:"Press me",press:{kind:"noop"}}),r("raised"))),c("sunken","definition · derived",O("sunken-btn",{label:"Sunken button",press:{kind:"noop"}})),c("double","use site · double",s(l("double-btn",{label:"Double outline",press:{kind:"noop"}}),r("double"))),c("stacked","stacked · border + ring",s(l("stacked-btn",{label:"Two decorations",press:{kind:"noop"}}),r("raised"),N)),g("misc",{gap:20,align:"center"},[s(v("chk",{on:n.check,toggle:{kind:"check"},label:"sunken checkbox"}),r("sunken")),s(A("tog",{on:n.power,flip:{kind:"power"}}),r("single"))]),I("vol",{value:n.volume,set:e=>({kind:"volume",value:e}),width:220}),g("theme",{gap:10,align:"center"},[v("theme-chk",{on:n.themed,toggle:{kind:"toggle-theme"},label:"theme scope · outline every slider"})])])}const U=document.getElementById("c");E(U,{init:{volume:.4,check:!0,power:!1,themed:!1},update:K,view:H});R([{name:"main.ts",code:C},{name:"widgets.ts (shared)",code:P}]);
