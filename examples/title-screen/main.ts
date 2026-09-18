// ============================================================================
// Example: title-screen — a game's main menu, alive the way players expect.
//
//   Attract   the title breathes and a light sweeps its letters; motes drift
//             and the whole backdrop parallaxes with the pointer; "press
//             Enter" pulses until any input answers it
//   Menu      items cascade in left-to-right, a selector bar springs between
//             them (arrows or hover), a tick flashes the newly selected row,
//             Enter or a click opens it
//   Panels    a glass sheet slides in from the right — save slots whose bars
//             fill as they land, a segmented difficulty pill that springs and
//             stretches, volume/music options, credits — Escape slides back
//
// Doc: the phase, the selection and when it changed, which panel is open, the
// option values. The backdrop and title are continuous motion, so `ambient`
// keeps the loop awake for as long as the screen is up — a title screen is
// never asleep.
// ============================================================================

import { addOn, Element, Keys, Label, Layers, mount, Row, Stack, withExt } from "gratify";
import { Button, Labeled, Slider, Toggle } from "../shared/widgets";
import {
  Backdrop, Emblem, HintBar, MenuItem, Panel, Prompt, Screen, Segmented, SlotCard, Title, Version,
} from "./parts";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import partsSource from "./parts.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────
type Phase = "attract" | "menu";
const ITEMS = ["Continue", "New game", "Options", "Credits"] as const;
type PanelId = "continue" | "new" | "options" | "credits";
const PANEL_OF: PanelId[] = ["continue", "new", "options", "credits"];

interface Doc {
  phase: Phase;
  enteredAt: number;       // when the menu cascade started
  selected: number;
  selectedAt: number;
  panel: PanelId | null;
  panelAt: number;
  slot: number;
  difficulty: number;
  volume: number;
  music: boolean;
}

type Intent =
  | { kind: "begin"; time: number }
  | { kind: "confirm"; time: number }           // Enter: begin, or open the selected item
  | { kind: "move"; by: number; time: number }
  | { kind: "open"; index: number; time: number }
  | { kind: "back"; time: number }
  | { kind: "slot"; index: number }
  | { kind: "difficulty"; index: number }
  | { kind: "volume"; value: number }
  | { kind: "music" };

const INIT: Doc = {
  phase: "attract", enteredAt: 0, selected: 0, selectedAt: -9, panel: null, panelAt: -9,
  slot: 0, difficulty: 1, volume: 0.7, music: true,
};

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "begin": return doc.phase === "attract" ? { ...doc, phase: "menu", enteredAt: i.time, selectedAt: i.time + 0.3 } : doc;
    case "move": {
      if (doc.phase !== "menu" || doc.panel) return doc;
      const selected = (doc.selected + i.by + ITEMS.length) % ITEMS.length;
      return { ...doc, selected, selectedAt: i.time };
    }
    case "confirm": return doc.phase === "attract" ? update(doc, { kind: "begin", time: i.time })
      : doc.panel ? doc : update(doc, { kind: "open", index: doc.selected, time: i.time });
    case "open": return doc.phase === "menu"
      ? { ...doc, selected: i.index, selectedAt: i.time, panel: PANEL_OF[i.index], panelAt: i.time }
      : doc;
    case "back": return doc.panel ? { ...doc, panel: null } : doc;
    case "slot": return { ...doc, slot: i.index };
    case "difficulty": return { ...doc, difficulty: i.index };
    case "volume": return { ...doc, volume: i.value };
    case "music": return { ...doc, music: !doc.music };
  }
}

// ── Panels ────────────────────────────────────────────────────────────────────
const SLOTS = [
  { name: "Slot 1 — Kestrel", where: "Outer Reach · 14h 02m", progress: 0.72 },
  { name: "Slot 2 — Nadir", where: "Ice Belt · 3h 41m", progress: 0.28 },
  { name: "Slot 3 — Halcyon", where: "Core · 41h 15m", progress: 0.95 },
];
const CREDITS = ["Direction — A. Vale", "Systems — R. Okafor", "Art — M. Lindqvist", "Music — The Low Orbit", "Made with Gratify"];

function panelBody(doc: Doc): Element[] {
  switch (doc.panel) {
    case "continue": return [Stack("slots", { gap: 10 }, SLOTS.map((s, index) =>
      SlotCard(`s${index}`, { ...s, index, enteredAt: doc.panelAt, picked: doc.slot === index, pick: (i) => ({ kind: "slot", index: i }) })))];
    case "new": return [Stack("new", { gap: 14 }, [
      Label("l", { text: "Difficulty", size: 12, dim: true }),
      Segmented("d", { options: ["Story", "Normal", "Hard", "Nightmare"], index: doc.difficulty, pick: (index) => ({ kind: "difficulty", index }) }),
      Label("desc", { text: ["A gentle drift through the story.", "The intended experience.", "Fuel is scarce; mistakes cost.", "One life. No map."][doc.difficulty], size: 12 }),
      Button("go", { label: "Begin voyage", press: { kind: "back", time: 0 }, accent: true }),
    ])];
    case "options": return [Stack("opts", { gap: 14 }, [
      Labeled("vol", "Volume", Slider("vol/s", { value: doc.volume, set: (value) => ({ kind: "volume", value }), width: 220 })),
      Labeled("music", "Music", Toggle("music/t", { on: doc.music, flip: { kind: "music" } }), { kind: "music" }),
      Label("readout", { text: `volume ${Math.round(doc.volume * 100)}%  ·  music ${doc.music ? "on" : "off"}`, size: 11, dim: true }),
    ])];
    case "credits": return [Stack("credits", { gap: 8 }, CREDITS.map((line, i) =>
      Label(`c${i}`, { text: line, size: i === CREDITS.length - 1 ? 11 : 13, dim: i === CREDITS.length - 1 })))];
    default: return [];
  }
}
const PANEL_TITLE: Record<PanelId, string> = { continue: "Continue", new: "New game", options: "Options", credits: "Credits" };

// ── View ──────────────────────────────────────────────────────────────────────
function view(doc: Doc): Element {
  const inMenu = doc.phase === "menu";
  const column = Stack("column", { gap: 26 }, [
    Row("head", { gap: 18, align: "center" }, [Emblem("emblem", {}), Title("title", { text: "NEBULA DRIFT", sub: "A  D R I F T I N G   S T R A T E G Y" })]),
    inMenu
      ? Stack("menu", { gap: 2 }, ITEMS.map((label, index) =>
          MenuItem(`m${index}`, {
            label, index, selected: doc.selected === index, selectedAt: doc.selectedAt,
            enteredAt: doc.enteredAt, dimmed: doc.panel !== null,
            open: (i, time) => ({ kind: "open", index: i, time }),
          })))
      : Stack("attract", { pad: 8 }, [Prompt("prompt", { text: "PRESS ENTER  ·  OR CLICK" })]),
  ]);

  const hints: [string, string][] = doc.panel
    ? [["Esc", "Back"], ["Enter", "Confirm"]]
    : [["↑↓", "Navigate"], ["Enter", "Select"]];

  const root = Layers("root", {}, [
    Backdrop("bg", { attract: !inMenu, begin: (time) => ({ kind: "begin", time }) }),
    Screen("screen", {}, [
      column,
      doc.panel ? Panel(`panel-${doc.panel}`, { title: PANEL_TITLE[doc.panel] }, panelBody(doc)) : Stack("nopanel", {}, []),
      HintBar("hints", { hints, shown: inMenu }),
      Version("ver", { text: "v0.9.2 · build 2261" }),
    ]),
  ]);

  // Key intents are RELATIVE (confirm, move by) — the view closure is a frame
  // old, so several keys in one frame must resolve against the live doc.
  const time = (n: { time?: number }) => n.time ?? 0;
  return withExt(root, addOn(Keys({
    Enter: (n) => ({ kind: "confirm", time: time(n) }),
    " ": (n) => ({ kind: "confirm", time: time(n) }),
    ArrowUp: (n) => ({ kind: "move", by: -1, time: time(n) }),
    ArrowDown: (n) => ({ kind: "move", by: 1, time: time(n) }),
    Escape: (n) => ({ kind: "back", time: time(n) }),
    Backspace: (n) => ({ kind: "back", time: time(n) }),
  })));
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: INIT,
  update,
  view,
  ambient: () => true,     // the backdrop and title never rest
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "parts.ts", code: partsSource },
]);
