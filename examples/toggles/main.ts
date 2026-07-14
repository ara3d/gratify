// Example: toggles — proves custom parts are one part() definition each
// (README §5). The toggle knob *overshoots* because its travel channel is a
// spring; the slider knob glides because `shown` chases the model value; the
// theme switch cross-fades every color on screen through the same channels.

import { mount, setTheme, themeName, Stack, Row, Label } from "gratify";
import { Slider, Toggle, Checkbox } from "../shared/widgets";

interface Doc {
  power: boolean;
  volume: number;        // 0..1
  glow: number;          // 0..1
  opts: { sparks: boolean; grid: boolean };
  light: boolean;
}

type Intent =
  | { kind: "power" }
  | { kind: "volume"; value: number }
  | { kind: "glow"; value: number }
  | { kind: "opt"; which: "sparks" | "grid" }
  | { kind: "theme" };

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "power": return { ...doc, power: !doc.power };
    case "volume": return { ...doc, volume: i.value };
    case "glow": return { ...doc, glow: i.value };
    case "opt": return { ...doc, opts: { ...doc.opts, [i.which]: !doc.opts[i.which] } };
    case "theme": {
      setTheme(themeName === "dark" ? "light" : "dark");
      return { ...doc, light: !doc.light };
    }
  }
}

const row = (key: string, label: string, w: ReturnType<typeof Label>) =>
  Row(key, { gap: 14 }, [Label(`${key}/l`, { text: label, dim: true }), w]);

function view(doc: Doc) {
  return Stack("root", { gap: 14, pad: 48 }, [
    Label("title", { text: "Widgets", size: 20, weight: 600, bright: true }),
    row("power", "Power", Toggle("t", { on: doc.power, flip: { kind: "power" } })),
    row("volume", "Volume", Slider("s", { value: doc.volume, set: (value) => ({ kind: "volume", value }) })),
    row("glow", "Glow", Slider("s", { value: doc.glow, set: (value) => ({ kind: "glow", value }) })),
    row("sparks", "Sparks", Checkbox("c", { on: doc.opts.sparks, toggle: { kind: "opt", which: "sparks" } })),
    row("grid", "Grid", Checkbox("c", { on: doc.opts.grid, toggle: { kind: "opt", which: "grid" } })),
    row("theme", "Light theme", Toggle("t", { on: doc.light, flip: { kind: "theme" } })),
    Label("hint", { text: "Flip the theme — the whole screen cross-fades. Zero code.", dim: true }),
  ]);
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, {
  init: {
    power: true, volume: 0.6, glow: 0.25,
    opts: { sparks: true, grid: false }, light: false,
  },
  update,
  view,
});
