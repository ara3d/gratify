import{p as o,m as a,d as i,S as r,L as c,P as l,v as u}from"./source-panel-cwX9nwkb.js";const h=`// ============================================================================
// Example: counter — the "Hello, Gratify" application.
//
// What to look for when you run it:
//   • The button brightens and lifts when you hover it, and sinks when you
//     press it — yet this file contains NO animation code. The style function
//     below reads \`channels.hover\` and \`channels.press\`, which are numbers the
//     runtime continuously eases between 0 and 1. Everything computed from
//     them animates automatically.
//   • There is no event-listener plumbing. The Press interactor declares WHAT
//     intent a click means; the runtime does the rest.
// ============================================================================

import {
  mount,          // starts an application on a canvas
  part,           // defines a widget: size + style + render + behavior in one place
  Press,          // an interactor: "when clicked, emit this intent"
  Stack, Label,   // built-in layout container and text widget
  v,              // 2D vector constructor: v(x, y)
  Tokens,         // the theme's named design values (colors)
  Channels,       // the animated channel values on a widget (hover, press, …)
  Color,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── Step 1. Application state ────────────────────────────────────────────────
//
// The "Doc" is plain immutable data that you own entirely. It knows nothing
// about pixels, hover states, or widgets.

interface CounterDocument {
  clickCount: number;
}

// An Intent is a small typed message describing a change the UI would like to
// make. Intents are the ONLY way state changes.

type CounterIntent = { kind: "increment" };

// The update function is the single place where state changes. It is a pure
// function: given the old document and an intent, it returns the new document.

function update(document: CounterDocument, intent: CounterIntent): CounterDocument {
  if (intent.kind === "increment") {
    return { clickCount: document.clickCount + 1 };
  }
  return document;
}

// ── Step 2. A custom widget (a "part") ───────────────────────────────────────
//
// A part bundles everything about button-ness into one definition:
// how big it is, what it looks like, how it draws, and how it behaves.

interface ButtonProps {
  label: string;
  press: CounterIntent;   // the intent to emit when the button is clicked
}

// The style function computes a flat record of resolved visual values.
// Declaring its shape keeps the render function honest: render may read
// only what style produced.

interface ButtonStyle {
  fill: Color;
  cornerRadius: number;
  lift: number;           // vertical offset in pixels (hover raises, press sinks)
  text: Color;
}

const Button = part<ButtonProps, ButtonStyle>("button", {

  // SIZE — how big the button wants to be: wide enough for its label.
  size(props, measure) {
    const labelWidth = measure.text(props.label).x;
    return v(labelWidth + 28, 34);
  },

  // STYLE — tokens (theme colors) + channels (animated 0..1 values) → visuals.
  //
  // \`channels.hover\` eases toward 1 while the pointer is over the button and
  // back toward 0 when it leaves. Because \`emphasis\` is computed from it,
  // the fill color fades smoothly in both directions — for free.
  style(tokens: Tokens, channels: Channels): ButtonStyle {
    const emphasis = 0.2 + 0.3 * channels.hover + 0.4 * channels.press;
    return {
      fill: tokens.mix(tokens.surface, tokens.accent, emphasis),
      cornerRadius: 8,
      lift: 2 * channels.hover - 2 * channels.press,
      text: tokens.text,
    };
  },

  // RENDER — a dumb painter. It reads only the rect and the resolved style.
  render(node, painter, style) {
    const raisedRect = node.rect.raise(style.lift);
    painter.box(raisedRect, style.cornerRadius, style.fill);
    painter.label(node.props.label, raisedRect.center, style.text, { weight: 500 });
  },

  // BEHAVIOR — interactors as values. Press emits the caller's intent.
  on: [
    Press((node) => node.props.press),
  ],
});

// ── Step 3. The view: a pure function from Doc to an Element tree ────────────
//
// Called only when state changes. Elements are cheap descriptions; the runtime
// matches them to its retained scene BY KEY, which is how animation state
// survives across rebuilds.

function view(document: CounterDocument) {
  return Stack("root", { gap: 12, pad: 48 }, [

    Label("message", {
      text: \`Clicked \${document.clickCount} times\`,
      size: 15,
    }),

    Button("increment-button", {
      label: "Click me",
      press: { kind: "increment" },
    }),
  ]);
}

// ── Step 4. Mount ─────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { clickCount: 0 },
  update,
  view,
});

// (This last line just feeds the source viewer on the right.)
attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`;function d(e,n){return n.kind==="increment"?{clickCount:e.clickCount+1}:e}const m=o("button",{size(e,n){const t=n.text(e.label).x;return u(t+28,34)},style(e,n){const t=.2+.3*n.hover+.4*n.press;return{fill:e.mix(e.surface,e.accent,t),cornerRadius:8,lift:2*n.hover-2*n.press,text:e.text}},render(e,n,t){const s=e.rect.raise(t.lift);n.box(s,t.cornerRadius,t.fill),n.label(e.props.label,s.center,t.text,{weight:500})},on:[l(e=>e.props.press)]});function p(e){return r("root",{gap:12,pad:48},[c("message",{text:`Clicked ${e.clickCount} times`,size:15}),m("increment-button",{label:"Click me",press:{kind:"increment"}})])}const f=document.getElementById("c");a(f,{init:{clickCount:0},update:d,view:p});i([{name:"main.ts",code:h}]);
