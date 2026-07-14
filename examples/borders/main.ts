// ============================================================================
// Example: borders — five classic control borders drawn by one part.
//
//   none     — no edge at all
//   single   — a flat 1px outline
//   double   — two concentric outlines
//   sunken   — a bevel that reads as pressed IN  (dark top-left, light bottom-right)
//   raised   — a bevel that reads as popping OUT (light top-left, dark bottom-right)
//
// The bevels are the interesting ones: "sunken" and "raised" are the SAME two
// edge colors, swapped. So a raised button that flips to sunken when you press
// it is essentially free here — we cross-fade the flip amount with the press
// channel and the border appears to depress. Click the raised & sunken panels.
// ============================================================================

import {
  calpha, cmix, Color, mount, Painter, part, Press, rgb, Rect,
  Stack, Label, v,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── The five border kinds ─────────────────────────────────────────────────────

type BorderKind = "none" | "single" | "double" | "sunken" | "raised";

// The two bevel edge colors. A light pair of edges plus a dark pair is what
// tricks the eye into seeing depth; swapping which pair is which flips in/out.
const LIGHT_EDGE = calpha(rgb(255, 255, 255), 0.55);
const DARK_EDGE = calpha(rgb(0, 0, 0), 0.5);
const TRANSPARENT = rgb(0, 0, 0, 0);

/**
 * Draw one border into rect `r`.
 * `flip` (0..1) only affects bevels: 0 = raised, 1 = sunken. Animating it
 * makes a raised control appear to sink.
 */
function drawBorder(paint: Painter, r: Rect, kind: BorderKind, outline: Color, flip: number) {
  switch (kind) {
    case "none":
      return;

    case "single":
      paint.box(r, 0, TRANSPARENT, outline, 1);
      return;

    case "double":
      paint.box(r, 0, TRANSPARENT, outline, 1);
      paint.box(r.inset(3), 0, TRANSPARENT, outline, 1);
      return;

    case "raised":
    case "sunken": {
      const isSunken = kind === "sunken" ? 1 : 0;
      const t = Math.max(isSunken, flip);       // 0 = raised look, 1 = sunken look
      const topLeft = cmix(LIGHT_EDGE, DARK_EDGE, t);
      const bottomRight = cmix(DARK_EDGE, LIGHT_EDGE, t);

      paint.line(v(r.x, r.y + 1), v(r.right, r.y + 1), topLeft, 2);           // top
      paint.line(v(r.x + 1, r.y), v(r.x + 1, r.bottom), topLeft, 2);          // left
      paint.line(v(r.x, r.bottom - 1), v(r.right, r.bottom - 1), bottomRight, 2);  // bottom
      paint.line(v(r.right - 1, r.y), v(r.right - 1, r.bottom), bottomRight, 2);   // right
      return;
    }
  }
}

// ── The panel part ────────────────────────────────────────────────────────────

interface PanelProps {
  label: string;
  border: BorderKind;
}

interface PanelStyle {
  fill: Color;
  outline: Color;
  kindText: Color;
  subText: Color;
  pressFlip: number;   // how far a bevel has flipped toward sunken (0..1)
}

const Panel = part<PanelProps, PanelStyle>("panel", {

  size: () => v(220, 58),

  style(tokens, channels): PanelStyle {
    const textColor = tokens.mix(tokens.textDim, tokens.textBright, 0.4 + 0.6 * channels.hover);
    return {
      fill: tokens.mix(tokens.surface, tokens.surfaceHi, 0.5 + 0.4 * channels.hover),
      outline: tokens.mix(tokens.muted, tokens.text, 0.3 + 0.4 * channels.hover),
      kindText: textColor,
      subText: calpha(textColor, 0.7),
      pressFlip: channels.press,   // the press channel drives the bevel flip
    };
  },

  render(node, paint, style) {
    const r = node.rect;
    const isBevel = node.props.border === "sunken" || node.props.border === "raised";

    // The face — square corners for bevels, a soft radius for the flat borders.
    paint.box(r, isBevel ? 0 : 6, style.fill);
    drawBorder(paint, r, node.props.border, style.outline, style.pressFlip);

    // Contents nudge down-and-right by a pixel or two as the bevel sinks — the
    // final touch that sells "this button was pushed in".
    const nudge = 1.5 * style.pressFlip;
    paint.label(node.props.border, v(r.x + 18 + nudge, r.center.y + nudge), style.kindText, { weight: 600, align: "left" });
    paint.label(node.props.label, v(r.right - 18 + nudge, r.center.y + nudge), style.subText, { size: 11, align: "right" });
  },

  on: [Press(() => ({ kind: "noop" }))],
});

// ── App ────────────────────────────────────────────────────────────────────────
//
// The document never changes — this demo is about rendering — so update is a
// no-op. Pressing still animates, because press is a runtime channel, not state.

type BordersDoc = Record<string, never>;
type BordersIntent = { kind: "noop" };

const update = (doc: BordersDoc, _intent: BordersIntent): BordersDoc => doc;

const KINDS: BorderKind[] = ["none", "single", "double", "sunken", "raised"];

function view(_doc: BordersDoc) {
  return Stack("root", { gap: 12, pad: 40 }, [

    Label("title", { text: "Border styles", size: 20, weight: 600, bright: true }),
    Label("subtitle", { text: "Press the raised & sunken panels — the bevel flips.", dim: true }),

    ...KINDS.map((kind) => Panel(kind, { label: "click me", border: kind })),
  ]);
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, { init: {}, update, view });

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
