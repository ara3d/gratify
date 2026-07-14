// ============================================================================
// Example: global effects — ordinary controls, one effect over all of them.
//
// The controls here (Button, Toggle, Slider, Checkbox) are the STOCK shared
// widgets, written the normal way — none of them knows anything about the
// effects below. The juice is layered on GLOBALLY by wrapping every control
// with two extensions ("wrap, don't edit"):
//
//   • quake   — press any BUTTON and the whole panel shudders, then the tremor
//               decays away to nothing. The shake is a mapRender that translates
//               each control by a jitter whose amplitude is exp(-t) since the
//               last press; a button just appends a behavior that stamps the
//               press time.
//   • magnify — mapRender scales a control up as the cursor nears its center,
//               a fisheye that follows the pointer. A toggle turns it on.
//
// Both effects read only public capabilities (node.time, node.pointer, the
// painter transform), so the same wrapper works on any widget — including the
// magnify toggle itself. That's the whole point: the effect is a function of a
// part definition, applied to all of them.
// ============================================================================

import {
  addOn, Element, mapRender, mount, PartExt, Press, Row, Stack, Label, withExt,
} from "gratify";
import { Button, Checkbox, Slider, Toggle } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

const PEAK = 6;        // px — the shake amplitude at the instant of a press
const DECAY = 3.5;     // per second — how fast the tremor dies away

// ── The two global effects (each an ordinary PartExt) ─────────────────────────

/** A stable per-node phase so controls shake out of sync (not in lockstep). */
const phase = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000;
  return h;
};

/** Trembles a control after a press, decaying to nothing. `lastQuake` is the
 *  GNode.time of the last button press; amplitude is PEAK·e^(−DECAY·elapsed),
 *  so once it fades below a pixel this is a plain passthrough. */
const quake = (lastQuake: number): PartExt =>
  mapRender((node, paint, _style, base) => {
    const t = node.time ?? 0;
    const amp = PEAK * Math.exp(-DECAY * (t - lastQuake));
    if (amp < 0.05) { base(); return; }
    const ph = phase(node.key);
    const dx = Math.sin(t * 40 + ph) * amp;
    const dy = Math.cos(t * 34 + ph * 1.7) * amp;
    paint.push();
    paint.translate(dx, dy);
    base();
    paint.pop();
  });

/** Scales a control up as the cursor nears its center — a pointer-following
 *  fisheye. `on` (0..1) fades the whole effect in and out. */
const magnify = (on: number): PartExt =>
  mapRender((node, paint, _style, base) => {
    const ptr = node.pointer;
    if (!ptr || on < 0.02) { base(); return; }
    const c = node.rect.center;
    const d = Math.hypot(ptr.x - c.x, ptr.y - c.y);
    const near = Math.max(0, 1 - d / 150);              // 1 at the center, 0 past 150px
    const s = 1 + 0.4 * near * near * on;
    paint.push();
    paint.scaleAt(c.x, c.y, s);
    base();
    paint.pop();
  });

/** Appended to the buttons only: stamps the press time so the panel quakes.
 *  All appended press behaviors run, so the button's own click still fires. */
const triggersQuake = addOn(Press((node) => ({ kind: "quake", time: node.time ?? 0 })));

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  lastQuake: number;   // GNode.time of the last button press
  magnify: boolean;
  // a few ordinary controls, present just to be affected by the effects
  power: boolean;
  volume: number;
  agree: boolean;
  clicks: number;
}

type Intent =
  | { kind: "quake"; time: number }
  | { kind: "magnify" }
  | { kind: "power" }
  | { kind: "volume"; value: number }
  | { kind: "agree" }
  | { kind: "click" };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "quake": return { ...doc, lastQuake: intent.time };
    case "magnify": return { ...doc, magnify: !doc.magnify };
    case "power": return { ...doc, power: !doc.power };
    case "volume": return { ...doc, volume: intent.value };
    case "agree": return { ...doc, agree: !doc.agree };
    case "click": return { ...doc, clicks: doc.clicks + 1 };
  }
}

// ── View ──────────────────────────────────────────────────────────────────────
function view(doc: Doc): Element {
  // The global effects, resolved for this frame. Every control gets both — the
  // effect is decided ONCE here, not per widget.
  const magOn = doc.magnify ? 1 : 0;
  const fx = (el: Element): Element => withExt(el, magnify(magOn), quake(doc.lastQuake));

  const rowLabel = (key: string, text: string, control: Element): Element =>
    Row(key, { gap: 16, align: "center" }, [
      Label(`${key}/l`, { text, dim: true, size: 12 }),
      fx(control),
    ]);

  return Stack("root", { gap: 16, pad: 44 }, [
    Label("title", { text: "Global effects", size: 22, weight: 700, bright: true }),
    Label("sub", { text: "Stock controls, written normally. Two effects wrapped over ALL of them — nothing was edited.", dim: true, size: 12 }),

    rowLabel("mag", "Magnify (hover the controls)",
      Toggle("mag/t", { on: doc.magnify, flip: { kind: "magnify" } })),

    Label("divider", { text: "— ordinary controls —", dim: true, size: 11 }),

    rowLabel("power", "Power",
      Toggle("power/t", { on: doc.power, flip: { kind: "power" } })),
    rowLabel("volume", "Volume",
      Slider("volume/s", { value: doc.volume, set: (value) => ({ kind: "volume", value }) })),
    rowLabel("agree", "Agree",
      Checkbox("agree/c", { on: doc.agree, toggle: { kind: "agree" } })),

    // Press a button → the whole panel quakes, then settles. The stock Button is
    // untouched; a `triggersQuake` behavior is appended at its use site.
    Row("buttons", { gap: 12 }, [
      fx(withExt(Button("save", { label: "Save", accent: true, press: { kind: "click" } }), triggersQuake)),
      fx(withExt(Button("cancel", { label: "Cancel", press: { kind: "click" } }), triggersQuake)),
      fx(withExt(Button("delete", { label: "Delete", danger: true, press: { kind: "click" } }), triggersQuake)),
    ]),

    Label("hint", {
      text: `Press a button to shake the panel · toggle Magnify and move the mouse · clicks ${doc.clicks}`,
      dim: true, size: 11,
    }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { lastQuake: -999, magnify: true, power: true, volume: 0.6, agree: false, clicks: 0 },
  update,
  view,
  // The quake is a function of the clock, which the rest-detector can't see;
  // keep the loop awake while the tremor is still perceptible, then let it sleep.
  ambient: (doc, time) => time - doc.lastQuake < 1.6,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
