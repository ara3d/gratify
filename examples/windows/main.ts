// ============================================================================
// Example: windows — floating glass windows on a desktop.
//
// The app Doc holds a `WindowSet` (window-math.ts) next to its own settings.
// The view lays a `Desktop` of `Window`s over an aurora backdrop, with a HUD
// bar on top. Every window emits `WindowEvent`s through one `to` prop, and
// `update` hands them to `reduceWindows` — the app never touches z-order or
// frames by hand.
//
// Try: drag a title bar (the window lifts, edges snap to the screen) · drag
// any edge or corner · hover the dots · minimize (it glides into the dock;
// click the pill to bring it back) · maximize (corners square off) · close
// (it shrinks away) · New window · Theme.
// ============================================================================

import {
  activeWindowId, at, calpha, cascadeFrame, Desktop, Element, emptyWindowSet, Flow, Free, Label, Layers, mount,
  openWindow, part, reduceWindows, Row, setTheme, Stack, themeName, v, Window, WindowEvent, windowsOf,
  WindowSet,
} from "gratify";
import { Button, Checkbox, Labeled, Slider, Toggle } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

type Kind = "inspector" | "palette" | "notes";

interface Doc {
  windows: WindowSet;
  kinds: Record<string, Kind>;
  next: number;
  volume: number;
  bass: number;
  shuffle: boolean;
  loop: boolean;
  swatch: string | null;
}

type Intent =
  | { kind: "window"; ev: WindowEvent }
  | { kind: "open"; what: Kind }
  | { kind: "theme" }
  | { kind: "volume"; value: number }
  | { kind: "bass"; value: number }
  | { kind: "shuffle" }
  | { kind: "loop" }
  | { kind: "swatch"; name: string };

const SIZES: Record<Kind, { x: number; y: number }> = {
  inspector: v(300, 250),
  palette: v(340, 210),
  notes: v(320, 180),
};

function open(doc: Doc, what: Kind): Doc {
  const id = `${what}-${doc.next}`;
  return {
    ...doc,
    next: doc.next + 1,
    kinds: { ...doc.kinds, [id]: what },
    windows: openWindow(doc.windows, { id, frame: cascadeFrame(doc.next, SIZES[what], v(80, 72)), mode: "normal" }),
  };
}

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "window": return { ...doc, windows: reduceWindows(doc.windows, intent.ev) };
    case "open": return open(doc, intent.what);
    case "theme": setTheme(themeName === "dark" ? "light" : "dark"); return doc;
    case "volume": return { ...doc, volume: intent.value };
    case "bass": return { ...doc, bass: intent.value };
    case "shuffle": return { ...doc, shuffle: !doc.shuffle };
    case "loop": return { ...doc, loop: !doc.loop };
    case "swatch": return { ...doc, swatch: intent.name };
  }
}

// ── Backdrop — an aurora of soft glows and a dot grid, under everything ───────

const Backdrop = part("backdrop")
  .props<Record<string, never>>()
  .fill()
  .style((t) => ({
    a: calpha(t.accent, 0.16),
    b: calpha(t.accent2, 0.14),
    dots: calpha(t.textDim, 0.18),
  }))
  .render((n, p, s) => {
    const r = n.rect;
    // no gradients in the painter: stacked translucent discs fake a soft falloff
    const bloom = (c: { x: number; y: number }, radius: number, color: typeof s.a) => {
      for (let i = 1; i <= 24; i++) p.dot(c, radius * (i / 24), calpha(color, 1 / 24));
    };
    bloom(v(r.w * 0.22, r.h * 0.3), r.h * 0.5, s.a);
    bloom(v(r.w * 0.78, r.h * 0.72), r.h * 0.55, s.b);
    for (let x = 24; x < r.w; x += 24) for (let y = 24; y < r.h; y += 24) p.dot(v(x, y), 0.8, s.dots);
  });

// ── Window contents — plain elements dropped into each window's slot ──────────

const Swatch = part("swatch")
  .props<{ name: string; hue: number; picked: boolean }>()
  .intrinsic(44, 44)
  .style((t, ch, p) => ({
    fill: { r: 128 + 110 * Math.cos(p.hue), g: 128 + 110 * Math.cos(p.hue + 2.1), b: 128 + 110 * Math.cos(p.hue + 4.2), a: 1 },
    ring: t.mix(calpha(t.textBright, 0), t.textBright, p.picked ? 1 : 0.5 * ch.hover),
    lift: 2 * ch.hover - 2 * ch.press,
  }))
  .render((n, p, s) => {
    const r = n.rect.raise(s.lift);
    p.glow(s.fill, 10, () => p.box(r, 10, s.fill, s.ring, 2));
  })
  .press((n) => ({ kind: "swatch", name: n.props.name }));

const HUES = ["coral", "amber", "lime", "mint", "sky", "iris", "plum", "rose"];

function contentOf(doc: Doc, id: string): Element[] {
  switch (doc.kinds[id]) {
    case "inspector": return [
      Labeled("vol", "Volume", Slider("vol/s", { value: doc.volume, set: (value) => ({ kind: "volume", value }) })),
      Labeled("bass", "Bass", Slider("bass/s", { value: doc.bass, set: (value) => ({ kind: "bass", value }) })),
      Labeled("shuffle", "Shuffle", Toggle("shuffle/t", { on: doc.shuffle, flip: { kind: "shuffle" } }), { kind: "shuffle" }),
      Checkbox("loop", { on: doc.loop, toggle: { kind: "loop" }, label: "Loop the playlist" }),
      Label("readout", { text: `volume ${Math.round(doc.volume * 100)}  ·  bass ${Math.round(doc.bass * 100)}`, dim: true, size: 11 }),
    ];
    case "palette": return [
      Flow("chips", { gap: 8, pad: 0 }, HUES.map((name, i) => Swatch(name, { name, hue: (i / HUES.length) * Math.PI * 2, picked: doc.swatch === name }))),
      Label("picked", { text: doc.swatch ? `picked: ${doc.swatch}` : "pick a swatch", dim: true, size: 11 }),
    ];
    case "notes": return [
      Label("l1", { text: "Windows are ordinary keyed elements.", size: 12 }),
      Label("l2", { text: "Open pops in, close shrinks away, minimize glides", dim: true, size: 11 }),
      Label("l3", { text: "into the dock — none of it is animation code.", dim: true, size: 11 }),
      Label("l4", { text: "Drag any edge. Corners resize diagonally.", dim: true, size: 11 }),
    ];
    default: return [];
  }
}

const TITLES: Record<Kind, string> = { inspector: "Inspector", palette: "Palette", notes: "Notes" };

// ── View ──────────────────────────────────────────────────────────────────────

function view(doc: Doc): Element {
  const active = activeWindowId(doc.windows);
  const to = (ev: WindowEvent): Intent => ({ kind: "window", ev });
  return Layers("root", {}, [
    Backdrop("bg", {}),
    Desktop("desk", { inset: 12 }, windowsOf(doc.windows).map((rec) =>
      Window(rec.id, { ...rec, title: `${TITLES[doc.kinds[rec.id]]} ${rec.id.split("-")[1]}`, active: rec.id === active, to },
        contentOf(doc, rec.id)))),
    // the HUD sits below the page's "← gallery" link
    Free("hud", {}, [
      at(Stack("bar", { gap: 6 }, [
        Row("buttons", { gap: 8 }, [
          Button("inspector", { label: "+ Inspector", press: { kind: "open", what: "inspector" }, accent: true }),
          Button("palette", { label: "+ Palette", press: { kind: "open", what: "palette" } }),
          Button("notes", { label: "+ Notes", press: { kind: "open", what: "notes" } }),
          Button("theme", { label: "Theme", press: { kind: "theme" } }),
        ]),
        Label("hint", { text: "drag titles and edges · hover the dots · minimize to the dock", dim: true, size: 11 }),
      ]), v(16, 36)),
    ]),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

const seed: Doc = { windows: emptyWindowSet, kinds: {}, next: 1, volume: 0.62, bass: 0.35, shuffle: true, loop: false, swatch: null };
const init = open(open(open(seed, "notes"), "palette"), "inspector");

mount(canvas, { init, update, view });

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
