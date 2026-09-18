// ============================================================================
// Example: hud — a game heads-up display with the motion players expect.
//
//   Health    drops at once, a pale ghost trails down; heals glow; hits shake
//   XP        springs toward the next level, flashes white and rolls over
//   Level     a hexagon badge that punches and rings on level-up; a banner
//             drops from the top with a one-time sheen
//   Score     an odometer whose columns roll, with "+120" floaters
//   Launch    hold to fill the ring, release to fire (no timer: impulseAge)
//   Abilities four buttons with radial cooldown wipes and a ready flash,
//             castable by click or the 1–4 keys
//   Toasts    slide in from the right with a draining timer bar
//
// The Doc records WHEN things happened (hitAt, usedAt, toast.at) and the
// parts turn those stamps into motion through `node.time`. Toasts and the
// banner expire through `onCommit`: the host observes a new toast and
// schedules its dismissal — the only timer in the file.
// ============================================================================

import {
  addOn, calpha, Element, hsl, Keys, Label, Layers, mount, part, Row, Stack, v, withExt,
} from "gratify";
import { TimedButton } from "../shared/widgets";
import { Dock } from "../shared/minimap";
import { bloom } from "../shared/paint";
import {
  AbilityButton, Glyph, HealthBar, HoldButton, LevelBadge, Odometer, XpBar,
} from "./gauges";
import { Banner, Floater, Toast, ToastData, ToastKind } from "./feed";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import gaugesSource from "./gauges.ts?raw";
import feedSource from "./feed.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  hp: number; hitAt: number; healAt: number;
  xp: number; level: number; leveledAt: number;
  score: number;
  usedAt: Record<string, number>;
  toasts: ToastData[];
  banner: { title: string; sub: string; at: number } | null;
  nextId: number;
}

type Intent =
  | { kind: "damage"; time: number }
  | { kind: "heal"; time: number }
  | { kind: "xp"; time: number }
  | { kind: "collect"; time: number }
  | { kind: "cast"; id: string; time: number }
  | { kind: "launch"; time: number }
  | { kind: "dismiss"; id: number }
  | { kind: "closeBanner" };

const HP_MAX = 100, TOAST_LIFE = 4, BANNER_LIFE = 3.5;
const needFor = (level: number) => 100 + 25 * level;

const ABILITIES: { id: string; glyph: Glyph; cd: number; hotkey: string }[] = [
  { id: "bolt", glyph: "bolt", cd: 3, hotkey: "1" },
  { id: "shield", glyph: "shield", cd: 6, hotkey: "2" },
  { id: "flame", glyph: "flame", cd: 4.5, hotkey: "3" },
  { id: "star", glyph: "star", cd: 8, hotkey: "4" },
];

const INIT: Doc = {
  hp: 78, hitAt: -9, healAt: -9, xp: 40, level: 3, leveledAt: -9, score: 1180,
  usedAt: {}, toasts: [], banner: null, nextId: 1,
};

const toast = (doc: Doc, kind: ToastKind, text: string, at: number): Doc => ({
  ...doc,
  nextId: doc.nextId + 1,
  toasts: [...doc.toasts, { id: doc.nextId, kind, text, at }].slice(-4),
});

function update(doc: Doc, i: Intent): Doc {
  switch (i.kind) {
    case "damage": return toast({ ...doc, hp: Math.max(0, doc.hp - 28), hitAt: i.time }, "bad", "Hit for 28", i.time);
    case "heal": return { ...doc, hp: Math.min(HP_MAX, doc.hp + 24), healAt: i.time };
    case "xp": {
      const xp = doc.xp + 45, need = needFor(doc.level);
      if (xp < need) return { ...doc, xp };
      const level = doc.level + 1;
      return toast({ ...doc, xp: xp - need, level, leveledAt: i.time,
        banner: { title: `Level ${level}`, sub: "New ability slot unlocked", at: i.time } }, "good", `Reached level ${level}`, i.time);
    }
    case "collect": return { ...doc, score: doc.score + 120 };
    case "cast": {
      const spec = ABILITIES.find((a) => a.id === i.id);
      if (!spec || i.time - (doc.usedAt[i.id] ?? -99) < spec.cd) return doc;   // still cooling
      return { ...doc, usedAt: { ...doc.usedAt, [i.id]: i.time }, score: doc.score + 40 };
    }
    case "launch": return toast({ ...doc, score: doc.score + 500 }, "good", "Launch confirmed  +500", i.time);
    case "dismiss": return { ...doc, toasts: doc.toasts.filter((t) => t.id !== i.id) };
    case "closeBanner": return { ...doc, banner: null };
  }
}

// ── Backdrop — a vignette, two blooms, a faint grid ───────────────────────────
const Backdrop = part("hud-backdrop")
  .props<Record<string, never>>()
  .fill()
  .style((t) => ({ a: t.accent, b: t.accent2, grid: calpha(t.textDim, 0.12) }))
  .render((n, p, s) => {
    const r = n.rect;
    bloom(p, v(r.w * 0.15, r.h * 0.2), r.h * 0.6, s.a, 0.14);
    bloom(p, v(r.w * 0.85, r.h * 0.85), r.h * 0.6, s.b, 0.12);
    for (let x = 0; x < r.w; x += 40) p.line(v(x, 0), v(x, r.h), s.grid, 1);
    for (let y = 0; y < r.h; y += 40) p.line(v(0, y), v(r.w, y), s.grid, 1);
  });

// ── View ──────────────────────────────────────────────────────────────────────
const caption = (key: string, text: string) => Label(key, { text, size: 10, weight: 700, dim: true });
const cast = (id: string) => (time: number): Intent => ({ kind: "cast", id, time });

/** Collect spawns its floater from the button so the text rises from the click. */
const CollectButton = part("hud-collect")
  .props<{ label: string }>()
  .size((p, m) => v(m.text(p.label).x + 28, 32))
  .style((t, ch) => ({ fill: t.mix(t.surface, t.accent2, 0.3 + 0.4 * ch.hover + 0.3 * ch.press), edge: t.mix(t.muted, t.accent2, ch.hover), text: t.textBright, lift: 2 * ch.hover - 2 * ch.press }))
  .render((n, p, s) => { const r = n.rect.raise(s.lift); p.box(r, 8, s.fill, s.edge, 1); p.label(n.props.label, r.center, s.text, { weight: 500 }); })
  .press((n) => {
    n.spawn?.(new Floater(v(n.rect.center.x, n.rect.y), "+120", hsl(270, 0.8, 0.75)));
    return { kind: "collect", time: n.time ?? 0 } as Intent;
  });

function view(doc: Doc): Element {
  const panel = Stack("panel", { gap: 22, pad: 40, align: "center" }, [
    Label("title", { text: "Mission control", size: 22, weight: 700, bright: true }),
    Row("gauges", { gap: 28, align: "start" }, [
      Stack("hp", { gap: 6 }, [caption("c", "HEALTH"), HealthBar("bar", { hp: doc.hp, max: HP_MAX, hitAt: doc.hitAt, healAt: doc.healAt })]),
      Row("lvl", { gap: 10, align: "center" }, [
        LevelBadge("badge", { level: doc.level, leveledAt: doc.leveledAt }),
        Stack("xp", { gap: 6 }, [
          caption("c", `LEVEL ${doc.level}  ·  ${doc.xp} / ${needFor(doc.level)} XP`),
          XpBar("bar", { xp: doc.xp, need: needFor(doc.level), leveledAt: doc.leveledAt }),
        ]),
      ]),
      Stack("score", { gap: 6, align: "end" }, [caption("c", "SCORE"), Odometer("odo", { value: doc.score })]),
    ]),
    Row("abilities", { gap: 12 }, ABILITIES.map((a) =>
      AbilityButton(a.id, { ...a, usedAt: doc.usedAt[a.id] ?? -99, cast: (id, time) => cast(id)(time) }))),
    HoldButton("launch", { label: "Hold to launch", to: (time) => ({ kind: "launch", time }) }),
    Row("actions", { gap: 10 }, [
      TimedButton("dmg", { label: "Take damage", to: (time) => ({ kind: "damage", time }), danger: true }),
      TimedButton("heal", { label: "Heal", to: (time) => ({ kind: "heal", time }) }),
      TimedButton("xp", { label: "Gain XP", to: (time) => ({ kind: "xp", time }), accent: true }),
      CollectButton("collect", { label: "Collect +120" }),
    ]),
    Label("hint", { text: "Keys 1–4 cast abilities · click a toast to dismiss it", size: 11, dim: true }),
  ]);

  const root = Layers("root", {}, [
    Backdrop("bg", {}),
    Stack("center", { pad: 0, align: "center" }, [panel]),
    Dock("toasts", { corner: "top-right", margin: 16 }, [
      Stack("list", { gap: 8, align: "end" }, doc.toasts.map((t) =>
        Toast(`t${t.id}`, { data: t, life: TOAST_LIFE, dismiss: (id) => ({ kind: "dismiss", id }) }))),
    ]),
    Dock("banner", { corner: "top", margin: 18 }, doc.banner
      ? [Banner("b", { title: doc.banner.title, sub: doc.banner.sub, level: doc.level, at: doc.banner.at })]
      : []),
  ]);
  const hotkeys = Object.fromEntries(ABILITIES.map((a) => [a.hotkey, (n: { time?: number }) => cast(a.id)(n.time ?? 0)]));
  return withExt(root, addOn(Keys(hotkeys)));
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

const rt = mount(canvas, {
  init: INIT,
  update,
  view,
  // Time-based motion runs while a cooldown counts, a flash fades, or the
  // feed shows anything with a timer bar.
  ambient: (doc, time) =>
    doc.toasts.length > 0 || doc.banner !== null
    || time - Math.max(doc.hitAt, doc.healAt, doc.leveledAt) < 1
    || ABILITIES.some((a) => time - (doc.usedAt[a.id] ?? -99) < a.cd + 0.6),
  // The host's one timer: whatever the doc just added to the feed, expire it.
  onCommit: (doc, prev) => {
    for (const t of doc.toasts) if (!prev.toasts.includes(t))
      setTimeout(() => rt.dispatch({ kind: "dismiss", id: t.id }), TOAST_LIFE * 1000);
    if (doc.banner && doc.banner !== prev.banner)
      setTimeout(() => rt.dispatch({ kind: "closeBanner" }), BANNER_LIFE * 1000);
  },
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "gauges.ts", code: gaugesSource },
  { name: "feed.ts", code: feedSource },
]);
