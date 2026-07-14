// Example: extensions — proves "wrap, don't edit" (README §3) at all three
// scopes. `outlined`, `sheen`, and `chunky` below are ordinary functions
// PartDef → PartDef. The stock Button never planned for any of them.
//
//   scope 1 (definition): FancyButton = derivePart("fancy", Button, sheen)
//   scope 2 (theme):      the "Neon rows" switch calls extendTheme("dark",
//                         "button", …) — EVERY button restyles, including
//                         FancyButton (ancestry rule), with zero call-site edits
//   scope 3 (use site):   one button gets `outlined` via withExt — only it
//                         changes

import {
  addChannels, calpha, Channels, Color, derivePart, extendTheme, clearThemeExt,
  GNode, mapRender, mapSize, mapStyle, mount, PartExt, rect, Stack, Row, Label,
  Tokens, withExt,
} from "gratify";
import { Button, Toggle } from "../shared/widgets";

// ---- three reusable extensions (each is just a function) --------------------

/** Debug outline over ANY part — wraps render, paints after base. */
const outlined: PartExt = mapRender((node, p, style, base) => {
  base();
  p.box(node.rect, 8, { r: 0, g: 0, b: 0, a: 0 }, { r: 255, g: 92, b: 108, a: 0.9 }, 1.5);
});

/** A hover sheen: appends its own channel + draws over the base. */
const sheen: PartExt = (def) =>
  mapRender((node, p, _s, base) => {
    base();
    const k = node.ch["fx/sheen"] || 0;
    if (k > 0.02) {
      const r = node.rect;
      p.box(rect(r.x, r.y, r.w * k, 3), 1.5, calpha({ r: 255, g: 255, b: 255, a: 1 }, 0.35 * k));
    }
  })(addChannels({
    "fx/sheen": { target: (n: GNode<unknown>) => n.ch.hover || 0, rate: 6 },
  })(def));

/** Touch-target density: wraps size, minimum 44px tall. */
const chunky: PartExt = mapSize((_props, _m, base) => ({ x: base.x + 16, y: Math.max(base.y, 44) }));

/** Neon: a theme-scope restyle — receives the base style, states only deltas. */
const neon: PartExt = mapStyle<{ fill: Color; edge: Color; text: Color }>(
  (t: Tokens, ch: Channels, _props, base) => ({
    ...base,
    fill: t.mix(base.fill, t.accent2, 0.35 + 0.3 * ch.hover),
    edge: t.mix(t.accent2, t.textBright, ch.hover * 0.5),
    text: t.textBright,
  }),
);

// ---- scope 1: bake a new named part -----------------------------------------
const FancyButton = derivePart("fancy-button", Button, sheen);

// ---- the app ------------------------------------------------------------------
interface Doc { clicks: number; neon: boolean; }
type Intent = { kind: "click" } | { kind: "neon" };

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "click": return { ...doc, clicks: doc.clicks + 1 };
    case "neon": {
      // scope 2: extend (or clear) the active theme for ALL buttons — including
      // FancyButton, which extendTheme reaches through its ancestry.
      const on = !doc.neon;
      if (on) extendTheme("dark", "button", neon as (def: unknown) => unknown);
      else clearThemeExt("dark", "button");
      return { ...doc, neon: on };
    }
  }
}

function view(doc: Doc) {
  return Stack("root", { gap: 16, pad: 48 }, [
    Label("title", { text: "Wrap, don't edit", size: 20, weight: 600, bright: true }),
    Label("sub", { text: `Clicks: ${doc.clicks}`, dim: true }),
    Row("plain", { gap: 8 }, [
      Button("a", { label: "Stock", press: { kind: "click" } }),
      FancyButton("b", { label: "Fancy (baked sheen)", press: { kind: "click" } }),
      withExt(Button("c", { label: "Outlined (this one only)", press: { kind: "click" } }), outlined),
      withExt(Button("d", { label: "Chunky", press: { kind: "click" } }), chunky),
    ]),
    Row("theme", { gap: 14 }, [
      Label("tl", { text: "Neon all buttons (theme scope)", dim: true }),
      Toggle("t", { on: doc.neon, flip: { kind: "neon" } }),
    ]),
    Label("hint", { text: "Hover the fancy button — its sheen channel is an appended facet.", dim: true }),
  ]);
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, { init: { clicks: 0, neon: false }, update, view });
