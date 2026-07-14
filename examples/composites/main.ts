// ============================================================================
// Example: composites — "parts made of parts" (the body facet, layering rung 2).
//
// Two ways to build a widget out of other widgets:
//
//   RUNG 1 — a plain function (`Labeled` in widgets.ts). No framework at all:
//            it just arranges elements. Right when the arrangement is private
//            and nobody else needs to reach it.
//
//   RUNG 2 — a PART with a `body` facet (`Card` in widgets.ts). Named, themable,
//            and — the point — an extension SEAM: `extendTheme("dark", "card",
//            …)` reaches every card in the app, and `mapBody` can restructure
//            it. A plain function permits none of that.
//
// This file shows both, plus a use-site `mapBody` (inject a child into one
// card) and a theme-scope `mapBody` (add a footer to every card, live).
// ============================================================================

import {
  Element,
  mapBody,                  // wrap the structure facet (three scopes)
  mount,
  setTheme, themeName,
  Stack, Row, Label,
  withExt,                  // scope 3: apply to one element
} from "gratify";
import { Button, Card, Checkbox, Labeled, Slider } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── A theme-scope structural extension ────────────────────────────────────────
// `mapBody` receives the base body's output and returns a new list. Registered
// on the "card" part while a theme is active, it restructures EVERY card —
// code you own or not. Here it appends a footer row to each card's Stack.
const withFooter = mapBody((_props, _children, base): Element[] => {
  // base[0] is the Card's Stack("layout"); append a footer child inside it.
  const [layout, ...rest] = base;
  const stack = layout as Element;
  return [
    { ...stack, children: [...(stack.children ?? []), Label("footer", { text: "— themed footer —", dim: true, size: 10 })] },
    ...rest,
  ];
});

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  agreed: boolean;
  volume: number;
  footers: boolean;   // theme-scope mapBody on/off
  light: boolean;
}

type Intent =
  | { kind: "agree" }
  | { kind: "set-volume"; value: number }
  | { kind: "toggle-footers" }
  | { kind: "toggle-theme" };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "agree":
      return { ...doc, agreed: !doc.agreed };
    case "set-volume":
      return { ...doc, volume: intent.value };
    case "toggle-footers": {
      const footers = !doc.footers;
      // Scope 2: add/remove the structural extension on every card, live. The
      // runtime treats the theme bump as dirty and re-expands the bodies.
      if (footers) extendThemeBoth(withFooter);
      else clearThemeBoth();
      return { ...doc, footers };
    }
    case "toggle-theme":
      setTheme(themeName === "dark" ? "light" : "dark");
      return { ...doc, light: !doc.light };
  }
}

// Register the extension under whichever theme names the app uses.
import { extendTheme, clearThemeExt } from "gratify";
const extendThemeBoth = (ext: ReturnType<typeof mapBody>) => {
  extendTheme("dark", "card", ext as (d: unknown) => unknown);
  extendTheme("light", "card", ext as (d: unknown) => unknown);
};
const clearThemeBoth = () => {
  clearThemeExt("dark", "card");
  clearThemeExt("light", "card");
};

// ── View ──────────────────────────────────────────────────────────────────────
function view(doc: Doc) {
  return Stack("root", { gap: 16, pad: 40 }, [
    Label("title", { text: "Composites — parts made of parts", size: 20, weight: 600, bright: true }),

    // RUNG 2: a Card part. Its title/value chrome is ONE definition (widgets.ts),
    // used here with arbitrary content dropped into its slot.
    Card("settings", { title: "Settings", value: "card = rung 2" }, [
      // RUNG 1: a plain Labeled() function — private arrangement, no seam.
      Labeled("vol", "Volume", Slider("vol/s", { value: doc.volume, set: (value) => ({ kind: "set-volume", value }) })),
      Labeled("agree", "Agree", Checkbox("agree/c", { on: doc.agreed, toggle: { kind: "agree" } }), { kind: "agree" }),
    ]),

    // SCOPE 3: a use-site mapBody injects an extra child into THIS card only.
    withExt(
      Card("promo", { title: "One card only", value: "use-site mapBody" }, [
        Label("promo/body", { text: "A badge was appended below by withExt(…, mapBody).", dim: true, size: 11 }),
      ]),
      mapBody((_p, _ch, base): Element[] => {
        const [layout, ...rest] = base;
        const stack = layout as Element;
        return [
          { ...stack, children: [...(stack.children ?? []), Button("promo/badge", { label: "Injected button", press: { kind: "agree" } })] },
          ...rest,
        ];
      }),
    ),

    Row("controls", { gap: 14 }, [
      Button("footers", { label: doc.footers ? "Remove card footers" : "Add card footers (theme scope)", press: { kind: "toggle-footers" } }),
      Button("theme", { label: "Toggle theme", press: { kind: "toggle-theme" } }),
    ]),

    Label("hint", {
      text: "Footers = a theme-scope mapBody on the card part; it reaches BOTH cards at once.",
      dim: true,
    }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: { agreed: false, volume: 0.5, footers: false, light: false },
  update,
  view,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
