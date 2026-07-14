// ============================================================================
// Example: adornments — decoration by composition.
//
// An adornment is an overlay element anchored to a host widget: a tooltip, a
// badge, a resize grip, a close button. The `adorn` facet produces them, and
// `addAdorn(...)` APPENDS them to any widget — so you decorate a control that
// was never written to expect it.
//
// The `Card` part below knows nothing about tooltips, badges, or close buttons.
// Every decoration is layered on at the use site:
//
//   withExt(Card(id, props), tip("…"), badge(n), closable(intent))
//
// Adornments are ordinary keyed elements: they play enter/exit, they're
// themeable, they can carry their own interactors (the close button is a real
// button you click), and they draw on the overlay layer so they escape the
// host's bounds. Hover a card for a tooltip; click a card to bump its badge;
// click the × to remove it; Reset brings them all back.
// ============================================================================

import {
  addAdorn, at, calpha, cmix, Color, GNode, mount, PartExt, part, Press, rect,
  rgb, v, Vec, withExt, Stack, Label,
} from "gratify";
import { Button } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface Item { id: string; title: string; sub: string; tip: string; count: number; }
interface Doc { items: Item[]; }

type Intent =
  | { kind: "remove"; id: string }
  | { kind: "bump"; id: string }
  | { kind: "reset" };

const INITIAL: Item[] = [
  { id: "layers", title: "Layers", sub: "3 visible", tip: "The world / overlay / screen stack", count: 0 },
  { id: "springs", title: "Springs", sub: "stiff 240", tip: "Momentum and overshoot", count: 0 },
  { id: "channels", title: "Channels", sub: "hover · press", tip: "Numbers that chase targets", count: 2 },
  { id: "reconcile", title: "Reconcile", sub: "keyed", tip: "Identity survives rebuilds", count: 0 },
];

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "remove": return { items: doc.items.filter((i) => i.id !== intent.id) };
    case "bump": return { items: doc.items.map((i) => (i.id === intent.id ? { ...i, count: i.count + 1 } : i)) };
    case "reset": return { items: INITIAL };
  }
}

// ── The host widget — a plain card. It has NO idea it will be decorated. ──────

interface CardProps { title: string; sub: string; press: Intent; }

const Card = part<CardProps, { fill: Color; edge: Color; text: Color }>("card", {
  size: () => v(200, 62),
  style: (t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.4 * ch.hover + 0.6 * ch.press),
    edge: t.mix(t.muted, t.accent, ch.hover),
    text: t.mix(t.text, t.textBright, ch.hover),
  }),
  render(node, paint, s) {
    const r = node.rect;
    paint.box(r, 10, s.fill, s.edge, 1);
    paint.label(node.props.title, v(r.x + 14, r.center.y - 8), s.text, { align: "left", weight: 600 });
    paint.label(node.props.sub, v(r.x + 14, r.center.y + 10), calpha(s.text, 0.6), { align: "left", size: 11 });
  },
  on: [Press((node) => node.props.press)],   // clicking the body bumps the badge
});

// ── The adornment parts — small widgets that live on the overlay layer. ───────

// A tooltip bubble that self-centers above an anchor point (so it can overflow
// the host). Decorative — no interactors — so it stays transparent to clicks.
const Tooltip = part<{ text: string; anchor: Vec }>()("tooltip", {
  size: (props, measure) => v(measure.text(props.text).x + 20, 28),
  style: (t) => ({ bubble: cmix(t.bg, rgb(0, 0, 0), 0.45), edge: calpha(t.accent, 0.5), text: t.textBright, pointer: calpha(t.accent, 0.7) }),
  render(node, paint, s) {
    const a = node.props.anchor;
    const w = paint.measure.text(node.props.text).x + 20;
    const box = rect(a.x - w / 2, a.y - 34, w, 26);
    paint.glow(rgb(0, 0, 0), 12, () => paint.box(box, 7, s.bubble, s.edge, 1));
    paint.label(node.props.text, box.center, s.text, { size: 12 });
    paint.dot(v(a.x, a.y - 6), 2.5, s.pointer);   // a little pointer
  },
});

// A count badge at a corner. Decorative.
const Badge = part<{ count: number }>()("badge", {
  size: () => v(22, 22),
  style: (t) => ({ accent: t.accent, text: t.textBright }),
  render(node, paint, s) {
    const c = node.rect.center;
    paint.glow(s.accent, 8 * (0.5 + 0.5 * node.ch.enter), () => paint.dot(c, 10, s.accent));
    paint.label(String(node.props.count), c, s.text, { size: 11, weight: 700 });
  },
});

// A close button. INTERACTIVE — it carries its own Press, so clicking it emits
// the host's remove intent. It captures hover and clicks; the host does not.
const CloseButton = part<{ press: Intent }, { bg: Color; x: Color; pop: number }>("close-button", {
  size: () => v(22, 22),
  style: (t, ch) => ({
    bg: calpha(t.danger, 0.18 + 0.6 * ch.hover),
    x: t.mix(t.textDim, t.textBright, ch.hover),
    pop: ch.press,
  }),
  render(node, paint, s) {
    const c = node.rect.center, k = 4 * (1 - 0.3 * s.pop);
    paint.dot(c, 11, s.bg);
    paint.line(v(c.x - k, c.y - k), v(c.x + k, c.y + k), s.x, 2);
    paint.line(v(c.x - k, c.y + k), v(c.x + k, c.y - k), s.x, 2);
  },
  on: [Press((node) => node.props.press)],
});

// ── The adornment EXTENSIONS — the composable API. Each appends to `adorn`. ───
//
// These are the whole point: `tip`, `badge`, and `closable` decorate ANY
// widget, at its use site, with zero changes to the widget.

/** Show a tooltip above the host while it is hovered. */
const tip = (text: string): PartExt =>
  addAdorn((node: GNode<unknown>) => {
    if ((node.ch.hover ?? 0) < 0.5) return [];   // gated on the host's hover channel
    const anchor = v(node.rect.center.x, node.rect.y);
    return [at(Tooltip("tip", { text, anchor }), anchor)];
  });

/** Pin a count badge to the host's top-right corner (only when count > 0). */
const badge = (count: number): PartExt =>
  addAdorn((node: GNode<unknown>) =>
    count > 0 ? [at(Badge("badge", { count }), v(node.rect.right - 14, node.rect.y - 8))] : []);

/** Attach a close button that overhangs the host's top-left corner. */
const closable = (press: Intent): PartExt =>
  addAdorn((node: GNode<unknown>) =>
    [at(CloseButton("x", { press }), v(node.rect.x - 8, node.rect.y - 8))]);

// ── View ──────────────────────────────────────────────────────────────────────

function view(doc: Doc) {
  return Stack("root", { gap: 16, pad: 40 }, [

    Label("title", { text: "Adornments — decoration by composition", size: 18, weight: 600, bright: true }),
    Label("sub", { text: "hover a card for a tooltip · click a card to bump its badge · click × to remove", dim: true }),

    ...doc.items.map((item) =>
      // The card is decorated purely by layering extensions onto it. Every card
      // gets a tooltip + a close button; ones with a count also get a badge.
      withExt(
        Card(item.id, { title: item.title, sub: item.sub, press: { kind: "bump", id: item.id } }),
        tip(item.tip),
        closable({ kind: "remove", id: item.id }),
        ...(item.count > 0 ? [badge(item.count)] : []),
      )),

    Button("reset", { label: "Reset", press: { kind: "reset" }, accent: true }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, { init: { items: INITIAL }, update, view });

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
