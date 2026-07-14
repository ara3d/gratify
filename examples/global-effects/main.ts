// ============================================================================
// Example: global effects — ordinary controls, one effect over all of them.
//
// The controls here (Button, Toggle, Slider, Checkbox) are the STOCK shared
// widgets, written the normal way — none of them knows anything about the
// effects below. The juice is layered on GLOBALLY by wrapping every control
// with two extensions ("wrap, don't edit"):
//
//   • shake   — mapRender translates each control by a tiny time-based jitter,
//               so the whole panel trembles. A slider sets the amplitude; at 0
//               it's off and the loop sleeps.
//   • magnify — mapRender scales a control up as the cursor nears its center,
//               a fisheye that follows the pointer. A toggle turns it on.
//
// Both effects read only public capabilities (node.time, node.pointer, the
// painter transform), so the same wrapper works on any widget — including the
// very slider and toggle that control the effects. That's the whole point:
// the effect is a function of a part definition, applied to all of them.
// ============================================================================

import {
  Element, mapRender, mount, PartExt, Row, Stack, Label, withExt,
} from "gratify";
import { Button, Checkbox, Slider, Toggle } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── The two global effects (each an ordinary PartExt) ─────────────────────────

/** A stable per-node phase so controls shake out of sync (not in lockstep). */
const phase = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000;
  return h;
};

/** Trembles a control by `amp` px, a function of the clock. Amplitude 0 = a
 *  plain passthrough, so the panel is perfectly still until you raise it. */
const shake = (amp: number): PartExt =>
  mapRender((node, paint, _style, base) => {
    if (amp < 0.05) { base(); return; }
    const t = node.time ?? 0, ph = phase(node.key);
    const dx = Math.sin(t * 34 + ph) * amp;
    const dy = Math.cos(t * 29 + ph * 1.7) * amp;
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

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  shake: number;     // 0..1 — shake amplitude
  magnify: boolean;
  // a few ordinary controls, present just to be affected by the effects
  power: boolean;
  volume: number;
  agree: boolean;
  clicks: number;
}

type Intent =
  | { kind: "shake"; value: number }
  | { kind: "magnify" }
  | { kind: "power" }
  | { kind: "volume"; value: number }
  | { kind: "agree" }
  | { kind: "click" };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "shake": return { ...doc, shake: intent.value };
    case "magnify": return { ...doc, magnify: !doc.magnify };
    case "power": return { ...doc, power: !doc.power };
    case "volume": return { ...doc, volume: intent.value };
    case "agree": return { ...doc, agree: !doc.agree };
    case "click": return { ...doc, clicks: doc.clicks + 1 };
  }
}

const MAX_SHAKE = 6;   // px at slider = 1

// ── View ──────────────────────────────────────────────────────────────────────
function view(doc: Doc): Element {
  // The global effects, resolved for this frame. Every control gets both — the
  // effect is decided ONCE here, not per widget.
  const amp = doc.shake * MAX_SHAKE;
  const magOn = doc.magnify ? 1 : 0;
  const fx = (el: Element): Element => withExt(el, magnify(magOn), shake(amp));

  const rowLabel = (key: string, text: string, control: Element): Element =>
    Row(key, { gap: 16, align: "center" }, [
      Label(`${key}/l`, { text, dim: true, size: 12 }),
      fx(control),
    ]);

  return Stack("root", { gap: 16, pad: 44 }, [
    Label("title", { text: "Global effects", size: 22, weight: 700, bright: true }),
    Label("sub", { text: "Stock controls, written normally. Two effects wrapped over ALL of them — nothing was edited.", dim: true, size: 12 }),

    // The effect controls — themselves ordinary widgets, and themselves affected.
    rowLabel("shake", "Shake",
      Slider("shake/s", { value: doc.shake, set: (value) => ({ kind: "shake", value }) })),
    rowLabel("mag", "Magnify (hover the controls)",
      Toggle("mag/t", { on: doc.magnify, flip: { kind: "magnify" } })),

    Label("divider", { text: "— ordinary controls —", dim: true, size: 11 }),

    rowLabel("power", "Power",
      Toggle("power/t", { on: doc.power, flip: { kind: "power" } })),
    rowLabel("volume", "Volume",
      Slider("volume/s", { value: doc.volume, set: (value) => ({ kind: "volume", value }) })),
    rowLabel("agree", "Agree",
      Checkbox("agree/c", { on: doc.agree, toggle: { kind: "agree" } })),
    Row("buttons", { gap: 12 }, [
      fx(Button("save", { label: "Save", accent: true, press: { kind: "click" } })),
      fx(Button("cancel", { label: "Cancel", press: { kind: "click" } })),
      fx(Button("delete", { label: "Delete", danger: true, press: { kind: "click" } })),
    ]),

    Label("hint", {
      text: `Raise Shake to make everything tremble · toggle Magnify and move the mouse · clicks ${doc.clicks}`,
      dim: true, size: 11,
    }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { shake: 0.35, magnify: true, power: true, volume: 0.6, agree: false, clicks: 0 },
  update,
  view,
  // Shake is a function of the clock, which the rest-detector can't see; keep
  // the loop awake while there's any amplitude, then let it sleep.
  ambient: (doc) => doc.shake * MAX_SHAKE > 0.05,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
