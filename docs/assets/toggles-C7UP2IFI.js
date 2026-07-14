import{m as l,a as g,S as h,L as s,s as p,R as d,P as m,t as u,n as w}from"./source-panel-CCgHUfrE.js";import{e as c,w as k}from"./extend-BzadjIL3.js";import{b as v}from"./effects-BPrdJU6w.js";import{T as i,S as r,C as a}from"./widgets-BYsdxoTv.js";import{w as f}from"./widgets-DdaDB7gn.js";const S=`// ============================================================================
// Example: toggles — custom widgets, springs, and a live theme cross-fade.
//
// What to look for when you run it:
//   • The toggle knob OVERSHOOTS when it lands: its travel is a spring
//     channel (see Toggle in widgets.ts), so it has momentum.
//   • The slider knob glides to wherever the model says the value is — even
//     when the change didn't come from the mouse.
//   • Flip "Light theme": every color on screen cross-fades. That is not a
//     feature of this file — token values ease like every other channel.
//   • "Sparks" demonstrates a USE-SITE EXTENSION (composition scope 3): an
//     effects-only press behavior appended to stock widgets that never
//     planned for it.
// ============================================================================

import {
  addOn,                    // extension helper: append interactors to a part
  burst,                    // stock particle effect
  Element,
  mount,
  PartExt,                  // the extension type: PartDef → PartDef
  Press,
  setTheme, themeName,      // live theme switching
  tokens,
  Stack, Row, Label,
  withExt,                  // apply an extension to ONE element (use site)
} from "gratify";
import { Slider, Toggle, Checkbox } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── A use-site extension ──────────────────────────────────────────────────────
//
// \`sparks\` appends a Press behavior that spawns a particle burst and returns
// null (meaning: no intent — effects only). ALL appended press behaviors run,
// so the widget's own click handling is untouched.

const sparks: PartExt = addOn(
  Press((node) => {
    node.spawn?.(burst(node.pointer ?? node.rect.center, tokens.accent));
    return null;
  }),
);

// ── State ─────────────────────────────────────────────────────────────────────

interface SettingsDocument {
  power: boolean;
  volume: number;           // 0..1
  glow: number;             // 0..1
  options: { sparks: boolean; grid: boolean };
  lightTheme: boolean;
}

type SettingsIntent =
  | { kind: "toggle-power" }
  | { kind: "set-volume"; value: number }
  | { kind: "set-glow"; value: number }
  | { kind: "toggle-option"; which: "sparks" | "grid" }
  | { kind: "toggle-theme" };

function update(document: SettingsDocument, intent: SettingsIntent): SettingsDocument {
  switch (intent.kind) {

    case "toggle-power":
      return { ...document, power: !document.power };

    case "set-volume":
      return { ...document, volume: intent.value };

    case "set-glow":
      return { ...document, glow: intent.value };

    case "toggle-option":
      return {
        ...document,
        options: { ...document.options, [intent.which]: !document.options[intent.which] },
      };

    case "toggle-theme": {
      // setTheme retargets the live tokens; every style function reads tokens
      // every frame, so the whole UI cross-fades to the new palette.
      setTheme(themeName === "dark" ? "light" : "dark");
      return { ...document, lightTheme: !document.lightTheme };
    }
  }
}

// ── View ──────────────────────────────────────────────────────────────────────

/** A labeled settings row: caption on the left, widget on the right. */
function settingsRow(key: string, caption: string, widget: Element): Element {
  return Row(key, { gap: 14 }, [
    Label(\`\${key}/caption\`, { text: caption, dim: true }),
    widget,
  ]);
}

function view(document: SettingsDocument) {

  // When Sparks is enabled, wrap each clickable widget with the extension —
  // at its use site, per element, without touching the widget definitions.
  const withSparks = (element: Element): Element =>
    document.options.sparks ? withExt(element, sparks) : element;

  return Stack("root", { gap: 14, pad: 48 }, [

    Label("title", { text: "Widgets", size: 20, weight: 600, bright: true }),

    settingsRow("power", "Power",
      withSparks(Toggle("widget", { on: document.power, flip: { kind: "toggle-power" } }))),

    settingsRow("volume", "Volume",
      Slider("widget", { value: document.volume, set: (value) => ({ kind: "set-volume", value }) })),

    settingsRow("glow", "Glow",
      Slider("widget", { value: document.glow, set: (value) => ({ kind: "set-glow", value }) })),

    settingsRow("sparks", "Sparks",
      withSparks(Checkbox("widget", { on: document.options.sparks, toggle: { kind: "toggle-option", which: "sparks" } }))),

    settingsRow("grid", "Grid",
      withSparks(Checkbox("widget", { on: document.options.grid, toggle: { kind: "toggle-option", which: "grid" } }))),

    settingsRow("theme", "Light theme",
      withSparks(Toggle("widget", { on: document.lightTheme, flip: { kind: "toggle-theme" } }))),

    Label("hint", {
      text: "Sparks = a press extension appended to stock widgets at their use site.",
      dim: true,
    }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    power: true,
    volume: 0.6,
    glow: 0.25,
    options: { sparks: true, grid: false },
    lightTheme: false,
  },
  update,
  view,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
`,b=c(m(e=>{var t;return(t=e.spawn)==null||t.call(e,v(e.pointer??e.rect.center,u.accent)),null}));function T(e,t){switch(t.kind){case"toggle-power":return{...e,power:!e.power};case"set-volume":return{...e,volume:t.value};case"set-glow":return{...e,glow:t.value};case"toggle-option":return{...e,options:{...e.options,[t.which]:!e.options[t.which]}};case"toggle-theme":return p(w==="dark"?"light":"dark"),{...e,lightTheme:!e.lightTheme}}}function o(e,t,n){return d(e,{gap:14},[s(`${e}/caption`,{text:t,dim:!0}),n])}function x(e){const t=n=>e.options.sparks?k(n,b):n;return h("root",{gap:14,pad:48},[s("title",{text:"Widgets",size:20,weight:600,bright:!0}),o("power","Power",t(i("widget",{on:e.power,flip:{kind:"toggle-power"}}))),o("volume","Volume",r("widget",{value:e.volume,set:n=>({kind:"set-volume",value:n})})),o("glow","Glow",r("widget",{value:e.glow,set:n=>({kind:"set-glow",value:n})})),o("sparks","Sparks",t(a("widget",{on:e.options.sparks,toggle:{kind:"toggle-option",which:"sparks"}}))),o("grid","Grid",t(a("widget",{on:e.options.grid,toggle:{kind:"toggle-option",which:"grid"}}))),o("theme","Light theme",t(i("widget",{on:e.lightTheme,flip:{kind:"toggle-theme"}}))),s("hint",{text:"Sparks = a press extension appended to stock widgets at their use site.",dim:!0})])}const E=document.getElementById("c");l(E,{init:{power:!0,volume:.6,glow:.25,options:{sparks:!0,grid:!1},lightTheme:!1},update:T,view:x});g([{name:"main.ts",code:S},{name:"widgets.ts (shared)",code:f}]);
