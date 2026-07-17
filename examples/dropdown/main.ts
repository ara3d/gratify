// ============================================================================
// Example: dropdown & local state — the M3 acceptance test.
//
// ACCEPTANCE: the `Select` below is defined entirely at its own site — one
// part() chain — and used by passing (value, options, set). Its open flag is
// LOCAL state (guide §4d litmus test: it evaporates harmlessly), so the app
// Doc holds the SELECTION ONLY and undo/redo changes the selection but never
// opens or closes the list. Click the field to open — the list is a MODAL
// adornment, so it draws above everything, clicking an item emits exactly ONE
// app intent (Set), and clicking away (or Escape) closes it WITHOUT pressing
// whatever is underneath. Open/close animates via the list's own enter/exit
// channels — zero animate() calls.
//
// The scoops field shows the same reducer carrying a numeric DRAFT: click the
// value to start editing, −/＋ adjust the draft locally (undo history is
// untouched — watch the Undo button), ✓ forwards a single Set(n) on commit,
// ✕ discards. `body` swaps view↔edit structure from local state; the swap
// animates because the two rows are different keys.
//
// The three moves that make a dropdown, all visible below:
//   .local({...})    — declare private state by its initial value
//   .reduce(...)     — change it via Local(...) intents; forward commits onward
//   modal(adorn...)  — the popup: overlay layer + one click-away rule
// ============================================================================

import {
  at, calpha, extendPart, Label, Local, modal, mount, part, rgb, Row, Stack,
  surface, v, withUndo,
} from "gratify";
import { Button } from "../shared/widgets";
import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── App state: the selection and the scoop count. NO open flags, NO drafts. ──

interface Doc { flavor: string; scoops: number; }
type Intent = { kind: "flavor"; value: string } | { kind: "scoops"; value: number };

const FLAVORS = ["vanilla", "strawberry", "pistachio", "stracciatella", "espresso"];

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "flavor": return { ...doc, flavor: intent.value };
    case "scoops": return { ...doc, scoops: intent.value };
  }
}

// ── Select — an enum dropdown, fully self-contained. ─────────────────────────
// Open/closed lives in `.local`; the app passes value + options + set and
// nothing else. `Local(...)` intents from the field, the list items, and the
// modal dismiss all land in `.reduce`; only `set` ever leaves the widget.

type SelIntent = { kind: "toggle" } | { kind: "close" } | { kind: "pick"; value: string };

const W = 230, ROW = 30;

const OptionRow = part("option-row")
  .props<{ text: string; selected: boolean }>()
  .size(() => v(W - 12, ROW))
  .style((t, ch, p) => ({
    fill: calpha(t.accent, 0.22 * ch.hover + 0.1 * ch.press),
    text: t.mix(p.selected ? t.accent : t.text, t.textBright, ch.hover),
    tick: t.accent,
  }))
  .render((n, p, s) => {
    p.box(n.rect, 6, s.fill);
    p.label(n.props.text, v(n.rect.x + 26, n.rect.center.y), s.text, { align: "left", size: 13 });
    if (n.props.selected) p.label("✓", v(n.rect.x + 12, n.rect.center.y), s.tick, { size: 12, weight: 700 });
  })
  .press((n) => Local<SelIntent>({ kind: "pick", value: n.props.text }));

// The popup panel: a themed Stack (extendPart keeps its layout, adds a skin).
// It enters/exits as a keyed adornment — that IS the open/close animation.
const ListPanel = extendPart("select-list", Stack)
  .style((t) => ({
    fill: t.mix(t.bg, t.surface, 0.7),
    edge: calpha(t.accent, 0.45),
    shadow: calpha(rgb(0, 0, 0), 0.6),
  }))
  .render((n, p, s) => {
    p.push();
    p.alpha(0.35 + 0.65 * n.ch.enter);
    p.glow(s.shadow, 18, () => p.box(n.rect, 8, s.fill, s.edge, 1));
    p.pop();
  });

const Select = part("select")
  .props<{ value: string; options: string[]; set(v: string): Intent }>()
  .local({ open: false })
  .reduce((local, i: SelIntent, node): readonly [{ open: boolean }, Intent?] => {
    switch (i.kind) {
      case "toggle": return [{ open: !local.open }];
      case "close": return [{ open: false }];
      case "pick": return [{ open: false }, node.props.set(i.value)];
    }
  })
  .size(() => v(W, 34))
  // discrete local flag → continuous motion: the chevron chases `open`
  .channels({ open: { target: (n) => (n.local.open ? 1 : 0), rate: 14 } })
  .style((t, ch) => ({ ...surface(t, ch), accent: t.mix(t.muted, t.accent, ch.hover + ch.open) }))
  .render((n, p, s) => {
    p.box(n.rect, 8, s.fill, s.edge, 1);
    p.label(n.props.value, v(n.rect.x + 12, n.rect.center.y), s.text, { align: "left", weight: 500 });
    const c = v(n.rect.right - 16, n.rect.center.y);
    const k = 4, dy = k * (1 - 2 * n.ch.open);            // chevron flips as it opens
    p.line(v(c.x - k, c.y - dy / 2), v(c.x, c.y + dy / 2), s.accent, 2);
    p.line(v(c.x, c.y + dy / 2), v(c.x + k, c.y - dy / 2), s.accent, 2);
  })
  .press(() => Local<SelIntent>({ kind: "toggle" }))
  .adorn((n) => n.local.open
    ? [at(
        modal(
          ListPanel("list", { gap: 1, pad: 6 },
            n.props.options.map((o) => OptionRow(o, { text: o, selected: o === n.props.value }))),
          Local<SelIntent>({ kind: "close" })),                 // click-away / Escape
        v(n.rect.x, n.rect.bottom + 4))]
    : []);

// ── ScoopsField — a draft editor: the reducer generalizes past a boolean. ────
// `body` swaps structure from local state (view row ↔ edit row); the draft
// only becomes real when ✓ forwards ONE Set(n) intent.

type ScoopIntent = { kind: "begin" } | { kind: "adjust"; by: number } | { kind: "end"; commit: boolean };

const Chip = part("scoop-chip")
  .props<{ text: string; accent?: boolean; to?: ScoopIntent }>()
  .size((p, m) => v(m.text(p.text).x + 24, 30))
  .style((t, ch, p) => ({ ...surface(t, ch, { tint: p.accent ? t.accent : undefined }) }))
  .render((n, p, s) => {
    p.box(n.rect, 8, s.fill, s.edge, 1);
    p.label(n.props.text, n.rect.center, s.text, { weight: 600 });
  })
  .press((n) => (n.props.to ? Local<ScoopIntent>(n.props.to) : undefined));

const ScoopsField = part("scoops-field")
  .props<{ value: number; set(v: number): Intent }>()
  .local({ draft: null as number | null })
  .reduce((l, i: ScoopIntent, n): readonly [{ draft: number | null }, Intent?] => {
    switch (i.kind) {
      case "begin": return [{ draft: n.props.value }];
      case "adjust": return [{ draft: Math.max(1, Math.min(9, (l.draft ?? n.props.value) + i.by)) }];
      case "end": return [{ draft: null }, i.commit && l.draft != null ? n.props.set(l.draft) : undefined];
    }
  })
  .keys({ Escape: () => Local<ScoopIntent>({ kind: "end", commit: false }) })
  .body((p, _kids, l) => l.draft == null
    ? [Row("view", { gap: 8 }, [
        Chip("value", { text: `${p.value} scoop${p.value === 1 ? "" : "s"}`, to: { kind: "begin" } }),
        Label("hint", { text: "click to edit", dim: true, size: 11 }),
      ])]
    : [Row("edit", { gap: 6 }, [
        Chip("minus", { text: "−", to: { kind: "adjust", by: -1 } }),
        Chip("draft", { text: String(l.draft), accent: true }),
        Chip("plus", { text: "＋", to: { kind: "adjust", by: 1 } }),
        Chip("ok", { text: "✓", accent: true, to: { kind: "end", commit: true } }),
        Chip("cancel", { text: "✕", to: { kind: "end", commit: false } }),
      ])]);

// ── View ─────────────────────────────────────────────────────────────────────

const app = withUndo<Doc, Intent>({
  init: { flavor: "vanilla", scoops: 2 },
  update,
  view: (doc) => Stack("root", { gap: 14, pad: 40 }, [
    Label("title", { text: "Dropdown & local state — undo never re-opens it", size: 18, weight: 600, bright: true }),
    Label("sub", { text: "open the list, pick, click away, press Escape — then undo: the selection reverts, the popup stays shut", dim: true }),

    Select("flavor", { value: doc.flavor, options: FLAVORS, set: (value) => ({ kind: "flavor", value }) }),
    ScoopsField("scoops", { value: doc.scoops, set: (value) => ({ kind: "scoops", value }) }),

    Label("order", { text: `order: ${doc.scoops}× ${doc.flavor}`, dim: true }),
    Row("history", { gap: 8 }, [
      Button("undo", { label: "Undo", press: { kind: "undo" } }),
      Button("redo", { label: "Redo", press: { kind: "redo" } }),
    ]),
  ]),
});

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, app);

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
