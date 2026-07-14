import{m as u,d as m,S as k,L as o,R as c,f,g,a as l,r as b,c as x}from"./source-panel-D7B0FxD0.js";import{d as y,w as d,b as h,c as w,e as v,f as S}from"./extend-Di4YXm0t.js";import{B as s,T as E,C,a as A}from"./widgets-DAP5Pepg.js";import{w as T}from"./widgets-deNE_SuD.js";const B=`// ============================================================================
// Example: extensions — "wrap, don't edit", at all three scopes.
//
// An extension is an ordinary function from part definition to part
// definition. Function facets (size / style / render) extend by WRAPPING —
// your function receives the base result and states only its delta. List
// facets (channels / interactors) extend by APPENDING.
//
// The same extension value can be applied at three scopes:
//
//   scope 1 — DEFINITION: bake it into a new named part.
//             FancyButton = derivePart("fancy-button", Button, sheen)
//
//   scope 2 — THEME: apply it to every matching part in the app while a
//             theme is active — including parts inside code you don't own.
//             The "Neon all buttons" switch below does this live, and it
//             reaches FancyButton too (derived parts remember their ancestry).
//
//   scope 3 — USE SITE: apply it to one element only, with withExt(...).
//
// The stock Button never planned for any of this.
// ============================================================================

import {
  addChannels,        // append animated channels to a part
  calpha, Channels,
  derivePart,         // scope 1: bake extensions into a new named part
  extendTheme,        // scope 2: extend a part app-wide while a theme is active
  clearThemeExt,      //          …and remove that again
  GNode,
  mapRender,          // wrap the render facet (paint under/over the base)
  mapSize,            // wrap the size facet
  mapStyle,           // wrap the style facet (receive the base style record)
  mount,
  PartExt,
  rect, rgb,
  Stack, Row, Label,
  SurfaceStyle,       // the shared { fill, edge, text } restyle protocol
  Tokens,
  withExt,            // scope 3: apply to one element at its use site
} from "gratify";
import { Button, Card, Checkbox, Toggle } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── Three reusable extensions (each is just a function) ───────────────────────

// 1. A red debug outline over ANY part: wrap render, call the base first,
//    then paint on top of it.
const outlined: PartExt = mapRender((node, painter, _style, drawBase) => {
  drawBase();
  painter.box(node.rect, 8, rgb(0, 0, 0, 0), rgb(255, 92, 108, 0.9), 1.5);
});

// 2. A hover sheen. This one needs its OWN animated value, so it appends a
//    channel ("fx/sheen" — namespaced, since channels share the node) and
//    wraps render to draw a light bar whose width follows the channel.
const sheen: PartExt = (definition) => {
  const withChannel = addChannels({
    "fx/sheen": {
      target: (node: GNode<unknown>) => node.ch.hover || 0,
      rate: 6,
    },
  })(definition);

  return mapRender((node, painter, _style, drawBase) => {
    drawBase();
    const sheenAmount = node.ch["fx/sheen"] || 0;
    if (sheenAmount > 0.02) {
      const r = node.rect;
      painter.box(
        rect(r.x, r.y, r.w * sheenAmount, 3), 1.5,
        calpha(rgb(255, 255, 255), 0.35 * sheenAmount));
    }
  })(withChannel);
};

// 3. Touch-target density: wrap size, enforce a 44px minimum height.
const chunky: PartExt = mapSize((_props, _measure, baseSize) =>
  ({ x: baseSize.x + 16, y: Math.max(baseSize.y, 44) }));

// 4. "Neon": a THEME-scope restyle written against the SHARED SurfaceStyle
//    protocol — { fill, edge, text }. Because Button, Checkbox and Card all
//    expose those fields, this ONE definition restyles all three part kinds.
//    mapStyle receives the base record, so we state only what we change.
const neon: PartExt = mapStyle<SurfaceStyle>(
  (tokens: Tokens, channels: Channels, _props, baseStyle) => ({
    ...baseStyle,
    fill: tokens.mix(baseStyle.fill, tokens.accent2, 0.35 + 0.3 * channels.hover),
    edge: tokens.mix(tokens.accent2, tokens.textBright, channels.hover * 0.5),
    text: tokens.textBright,
  }),
);

/** The parts the neon theme restyle reaches — one extension, three kinds. */
const NEON_PARTS = ["button", "checkbox", "card"];

// ── Scope 1: a new named part with the sheen baked in ─────────────────────────

const FancyButton = derivePart("fancy-button", Button, sheen);

// ── The application ───────────────────────────────────────────────────────────

interface ExtensionsDocument {
  clickCount: number;
  neonActive: boolean;
}

type ExtensionsIntent = { kind: "clicked" } | { kind: "toggle-neon" };

function update(document: ExtensionsDocument, intent: ExtensionsIntent): ExtensionsDocument {
  switch (intent.kind) {

    case "clicked":
      return { ...document, clickCount: document.clickCount + 1 };

    case "toggle-neon": {
      const neonActive = !document.neonActive;
      // Scope 2: while the dark theme is active, every button (incl. DERIVED
      // parts like FancyButton), checkbox and card gets the neon restyle — one
      // extension reaching three different part kinds via the shared protocol.
      for (const name of NEON_PARTS) {
        if (neonActive) extendTheme("dark", name, neon as (definition: unknown) => unknown);
        else clearThemeExt("dark", name);
      }
      return { ...document, neonActive };
    }
  }
}

function view(document: ExtensionsDocument) {
  return Stack("root", { gap: 16, pad: 48 }, [

    Label("title", { text: "Wrap, don't edit", size: 20, weight: 600, bright: true }),
    Label("subtitle", { text: \`Clicks: \${document.clickCount}\`, dim: true }),

    Row("buttons", { gap: 8 }, [

      // A completely stock button, for comparison.
      Button("stock", { label: "Stock", press: { kind: "clicked" } }),

      // Scope 1: the sheen is part of this part's definition now.
      FancyButton("fancy", { label: "Fancy (baked sheen)", press: { kind: "clicked" } }),

      // Scope 3: outlined — but ONLY this element.
      withExt(
        Button("outlined-one", { label: "Outlined (this one only)", press: { kind: "clicked" } }),
        outlined),

      // Scope 3 again: a bigger touch target for just this element.
      withExt(
        Button("chunky-one", { label: "Chunky", press: { kind: "clicked" } }),
        chunky),
    ]),

    Row("theme-row", { gap: 14 }, [
      Label("theme-caption", { text: "Neon (theme scope — one restyle, three part kinds)", dim: true }),
      Toggle("neon-toggle", { on: document.neonActive, flip: { kind: "toggle-neon" } }),
    ]),

    // A card and a checkbox, so the neon toggle demonstrably reaches part kinds
    // it was never written for — the SurfaceStyle protocol is what they share.
    Card("neon-card", { title: "Card", value: "surface" }, [
      Row("card-row", { gap: 10 }, [
        Checkbox("cb", { on: document.neonActive, toggle: { kind: "toggle-neon" } }),
        Label("cb-label", { text: "same protocol", dim: true }),
      ]),
    ]),

    Label("hint", {
      text: "Hover the fancy button — its sheen channel is an appended facet.",
      dim: true,
    }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { clickCount: 0, neonActive: false },
  update,
  view,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
`,N=h((e,n,t,a)=>{a(),n.box(e.rect,8,l(0,0,0,0),l(255,92,108,.9),1.5)}),P=e=>{const n=S({"fx/sheen":{target:t=>t.ch.hover||0,rate:6}})(e);return h((t,a,O,p)=>{p();const i=t.ch["fx/sheen"]||0;if(i>.02){const r=t.rect;a.box(b(r.x,r.y,r.w*i,3),1.5,x(l(255,255,255),.35*i))}})(n)},R=w((e,n,t)=>({x:t.x+16,y:Math.max(t.y,44)})),_=v((e,n,t,a)=>({...a,fill:e.mix(a.fill,e.accent2,.35+.3*n.hover),edge:e.mix(e.accent2,e.textBright,n.hover*.5),text:e.textBright})),I=["button","checkbox","card"],L=y("fancy-button",s,P);function z(e,n){switch(n.kind){case"clicked":return{...e,clickCount:e.clickCount+1};case"toggle-neon":{const t=!e.neonActive;for(const a of I)t?f("dark",a,_):g("dark",a);return{...e,neonActive:t}}}}function F(e){return k("root",{gap:16,pad:48},[o("title",{text:"Wrap, don't edit",size:20,weight:600,bright:!0}),o("subtitle",{text:`Clicks: ${e.clickCount}`,dim:!0}),c("buttons",{gap:8},[s("stock",{label:"Stock",press:{kind:"clicked"}}),L("fancy",{label:"Fancy (baked sheen)",press:{kind:"clicked"}}),d(s("outlined-one",{label:"Outlined (this one only)",press:{kind:"clicked"}}),N),d(s("chunky-one",{label:"Chunky",press:{kind:"clicked"}}),R)]),c("theme-row",{gap:14},[o("theme-caption",{text:"Neon (theme scope — one restyle, three part kinds)",dim:!0}),E("neon-toggle",{on:e.neonActive,flip:{kind:"toggle-neon"}})]),C("neon-card",{title:"Card",value:"surface"},[c("card-row",{gap:10},[A("cb",{on:e.neonActive,toggle:{kind:"toggle-neon"}}),o("cb-label",{text:"same protocol",dim:!0})])]),o("hint",{text:"Hover the fancy button — its sheen channel is an appended facet.",dim:!0})])}const D=document.getElementById("c");u(D,{init:{clickCount:0,neonActive:!1},update:z,view:F});m([{name:"main.ts",code:B},{name:"widgets.ts (shared)",code:T}]);
