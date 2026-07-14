// ============================================================================
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
  calpha,
  Element,
  mapRender,                // extension helper: wrap a part's render
  mount,
  PartExt,                  // the extension type: PartDef → PartDef
  Press,
  setTheme, themeName,      // live theme switching
  tokens,
  Stack, Row, Label,
  v,
  withExt,                  // apply an extension to ONE element (use site)
} from "gratify";
import { Slider, Toggle, Checkbox } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── A use-site extension ──────────────────────────────────────────────────────
//
// `sparks` appends a Press behavior that spawns a particle burst and returns
// null (meaning: no intent — effects only). ALL appended press behaviors run,
// so the widget's own click handling is untouched.

const sparks: PartExt = addOn(
  Press((node) => {
    node.spawn?.(burst(node.pointer ?? node.rect.center, tokens.accent));
    return null;
  }),
);

// `gridBackdrop` wraps the root's render: a dot grid drawn UNDER the content.
// The root carries `states: { grid }`, and a state tag automatically becomes an
// animated channel — so flipping "Grid" cross-fades the dots in and out.
const gridBackdrop: PartExt = mapRender((node, paint, _style, base) => {
  const amount = node.ch.grid ?? 0;
  if (amount > 0.01) {
    const G = 28, r = node.rect;
    const dot = calpha(tokens.muted, 0.35 * Math.min(1, amount));
    for (let x = r.x + G / 2; x < r.right; x += G)
      for (let y = r.y + G / 2; y < r.bottom; y += G) paint.dot(v(x, y), 1, dot);
  }
  base();
});

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

/** A labeled settings row: caption on the left, widget on the right. Pass
 *  `press` to make the caption clickable (clicking "Grid" should toggle Grid) —
 *  the same use-site extension mechanism this example demonstrates. */
function settingsRow(key: string, caption: string, widget: Element, press?: unknown): Element {
  const caption_ = Label(`${key}/caption`, { text: caption, dim: true });
  return Row(key, { gap: 14 }, [
    press === undefined ? caption_ : withExt(caption_, addOn(Press(() => press))),
    widget,
  ]);
}

function view(document: SettingsDocument) {

  // When Sparks is enabled, wrap each clickable widget with the extension —
  // at its use site, per element, without touching the widget definitions.
  const withSparks = (element: Element): Element =>
    document.options.sparks ? withExt(element, sparks) : element;

  // The root carries the grid state tag and the backdrop extension: flipping
  // "Grid" eases `ch.grid`, and the wrapped render fades the dots.
  return withExt(Stack("root", { gap: 14, pad: 48, states: { grid: document.options.grid } }, [

    Label("title", { text: "Widgets", size: 20, weight: 600, bright: true }),

    settingsRow("power", "Power",
      withSparks(Toggle("widget", { on: document.power, flip: { kind: "toggle-power" } })),
      { kind: "toggle-power" }),

    settingsRow("volume", "Volume",
      Slider("widget", { value: document.volume, set: (value) => ({ kind: "set-volume", value }) })),

    settingsRow("glow", "Glow",
      Slider("widget", { value: document.glow, set: (value) => ({ kind: "set-glow", value }) })),

    settingsRow("sparks", "Sparks",
      withSparks(Checkbox("widget", { on: document.options.sparks, toggle: { kind: "toggle-option", which: "sparks" } })),
      { kind: "toggle-option", which: "sparks" }),

    settingsRow("grid", "Grid",
      withSparks(Checkbox("widget", { on: document.options.grid, toggle: { kind: "toggle-option", which: "grid" } })),
      { kind: "toggle-option", which: "grid" }),

    settingsRow("theme", "Light theme",
      withSparks(Toggle("widget", { on: document.lightTheme, flip: { kind: "toggle-theme" } })),
      { kind: "toggle-theme" }),

    Label("hint", {
      text: "Sparks = a press extension appended to stock widgets · Grid = a render extension wrapped on the root.",
      dim: true,
    }),
  ]), gridBackdrop);
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
