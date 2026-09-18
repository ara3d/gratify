// The `hud` example's gauges and controls: a health bar with a damage ghost,
// an XP bar and level badge that flash on level-up, a rolling odometer, a
// hold-to-confirm button, and ability buttons with radial cooldown wipes.
// Every motion is a channel or a `node.time` curve from shared/motion.ts.

import {
  burst, calpha, clamp, GNode, hsl, part, rect, Ring, surface, v, Vec,
} from "gratify";
import { breathe, cooldown, digitRolls, flash, impulseAge, smoothstep, TAU } from "../shared/motion";
import { polygon, sectorPoints } from "../shared/paint";

const GREEN = hsl(140, 0.7, 0.5);

// ── Health — the fast bar drops at once; a pale ghost trails down after it ────
export interface HealthProps { hp: number; max: number; hitAt: number; healAt: number; }
export const HealthBar = part("hud-health")
  .props<HealthProps>()
  .size(() => v(260, 22))
  .channels({
    fast: { target: (n) => n.props.hp / n.props.max, spring: { stiffness: 420, damping: 26 } },
    slow: { target: (n) => n.props.hp / n.props.max, rate: 1.6 },
  })
  .style((t, ch) => ({
    track: t.mix(t.bg, t.surface, 0.8),
    edge: t.muted,
    fill: t.mix(t.danger, GREEN, smoothstep(0.25, 0.7, clamp(ch.fast, 0, 1))),
    ghost: calpha(t.textBright, 0.5),
    heal: hsl(140, 0.8, 0.7),
    text: t.textBright,
    tick: calpha(t.bg, 0.5),
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, hit = flash(t, n.props.hitAt, 0.35), heal = flash(t, n.props.healAt, 0.5);
    const r = n.rect.raise(-4 * hit * Math.sin(t * 60)), inner = r.inset(2);
    const fast = clamp(n.ch.fast, 0, 1), slow = clamp(n.ch.slow, 0, 1);
    p.box(r, 6, s.track, s.edge, 1);
    if (slow > fast) p.box(rect(inner.x, inner.y, inner.w * slow, inner.h), 4, calpha(s.ghost, 0.5 + 0.5 * hit));
    p.glow(s.fill, 6 + 14 * heal, () => p.box(rect(inner.x, inner.y, inner.w * fast, inner.h), 4, s.fill));
    if (slow < fast) p.box(rect(inner.x + inner.w * slow, inner.y, inner.w * (fast - slow), inner.h), 4, calpha(s.heal, 0.6));
    if (hit > 0) p.box(inner, 4, calpha(s.text, 0.6 * hit));
    for (let i = 1; i < 10; i++) {
      const x = inner.x + inner.w * i / 10;
      p.line(v(x, inner.y), v(x, inner.bottom), s.tick, 1);
    }
    p.label(`${Math.round(n.props.hp)} / ${n.props.max}`, r.center, s.text, { size: 11, weight: 700 });
  });

// ── XP — a springing fill with a breathing tip; a white flash on level-up ────
export interface XpProps { xp: number; need: number; leveledAt: number; }
export const XpBar = part("hud-xp")
  .props<XpProps>()
  .size(() => v(260, 12))
  .channels({ shown: { target: (n) => n.props.xp / n.props.need, spring: { stiffness: 160, damping: 16 } } })
  .style((t) => ({ track: t.mix(t.bg, t.surface, 0.8), edge: t.muted, fill: t.accent2, tip: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, inner = r.inset(2);
    const k = clamp(n.ch.shown, 0, 1), fl = flash(t, n.props.leveledAt, 0.7);
    p.box(r, 5, s.track, s.edge, 1);
    p.glow(s.fill, 6 + 20 * fl, () => p.box(rect(inner.x, inner.y, inner.w * k, inner.h), 3, s.fill));
    if (k > 0.01) p.dot(v(inner.x + inner.w * k, inner.center.y), 2.5 + 1.5 * breathe(t, 1.2), calpha(s.tip, 0.85));
    if (fl > 0) p.box(inner, 3, calpha(s.tip, 0.7 * fl));
  });

export const LevelBadge = part("hud-level")
  .props<{ level: number; leveledAt: number }>()
  .size(() => v(46, 46))
  .style((t) => ({ fill: t.mix(t.surface, t.accent2, 0.6), edge: t.mix(t.accent2, t.textBright, 0.4), text: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, c = n.rect.center, fl = flash(t, n.props.leveledAt, 0.6);
    p.push();
    p.scaleAt(c.x, c.y, 1 + 0.5 * fl * fl);
    p.glow(s.edge, 6 + 24 * fl, () => p.poly(polygon(c, 20, 6, fl * TAU / 6), s.fill, s.edge, 2));
    p.label(String(n.props.level), c, s.text, { size: 16, weight: 800 });
    p.pop();
    if (fl > 0) p.ring(c, 24 + 26 * (1 - fl), calpha(s.edge, fl), 2);
  });

// ── Odometer — each column rolls to its next digit; leading zeros dimmed ─────
export const Odometer = part("hud-odometer")
  .props<{ value: number; digits?: number }>()
  .defaults({ digits: 6 })
  .size((p) => v(p.digits * 22 + 12, 36))
  .channels({ shown: { target: (n) => n.props.value, spring: { stiffness: 90, damping: 16 } } })
  .style((t) => ({ fill: t.mix(t.bg, t.surface, 0.7), edge: t.muted, text: t.textBright, dim: calpha(t.textDim, 0.4), split: calpha(t.bg, 0.6) }))
  .render((n, p, s) => {
    const r = n.rect, cols = digitRolls(n.ch.shown, n.props.digits);
    const w = 22, h = r.h - 6, y0 = r.y + 3;
    p.box(r, 6, s.fill, s.edge, 1);
    p.push(); p.clip(r.inset(3));
    cols.forEach((c, i) => {
      const x = r.right - 6 - w * i - w / 2, dy = c.roll * h;
      const leading = i > 0 && cols.slice(i).every((k) => k.digit === 0 && k.roll === 0);
      const color = leading ? s.dim : s.text;
      p.label(String(c.digit), v(x, y0 + h / 2 - dy), color, { size: 20, weight: 700, mono: true });
      if (c.roll > 0) p.label(String((c.digit + 1) % 10), v(x, y0 + h / 2 - dy + h), color, { size: 20, weight: 700, mono: true });
      if (i > 0) p.line(v(x + w / 2, y0), v(x + w / 2, y0 + h), s.split, 1);
    });
    p.pop();
  });

// ── Hold to confirm — a ring fills while the pointer is down; release fires ──
// The elapsed hold time is recovered from an impulse channel kicked at press
// (impulseAge), so the part needs no timer and no local state.
const HOLD_SECONDS = 1.1;
export interface HoldProps { label: string; to(time: number): unknown; }
export const HoldButton = part("hud-hold")
  .props<HoldProps>()
  .size(() => v(210, 56))
  .channels({ hold: { decay: 1 } })
  .style((t, ch) => ({
    ...surface(t, ch, { tint: t.accent }),
    ring: t.accent,
    track: t.muted,
    ready: GREEN,
    corner: 14,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, press = clamp(n.ch.press, 0, 1);
    const held = press > 0.02 ? clamp(impulseAge(n.ch.hold, 1) / HOLD_SECONDS, 0, 1) : 0;
    const k = held * press, ready = held >= 1 ? press : 0;
    const c = v(r.x + 30, r.center.y), tint = ready > 0 ? s.ready : s.ring;
    p.glow(tint, 10 * k + 16 * ready * breathe(t, 0.6), () => p.box(r, s.corner, s.fill, s.edge, 1.5));
    p.ring(c, 15, s.track, 3);
    if (k > 0) p.glow(tint, 8, () => p.arc(c, 15, -TAU / 4, -TAU / 4 + TAU * k, tint, 3.5));
    if (ready > 0) p.dot(c, 6 + 2 * breathe(t, 0.6), calpha(s.ready, ready));
    p.label(ready > 0.5 ? "Release!" : n.props.label, v(r.x + 122, r.center.y), s.text, { weight: 700, size: 14 });
  })
  .gesture({
    begin: (n) => { n.kick?.("hold", 1); return {}; },
    up: (_s, n, pt) => {
      if (impulseAge(n.ch.hold, 1) < HOLD_SECONDS) return;
      n.spawn?.(burst(pt, GREEN));
      n.spawn?.(new Ring(v(n.rect.x + 30, n.rect.center.y), GREEN, 60, 0.6));
      return n.props.to(n.time ?? 0);
    },
  });

// ── Abilities — a radial wipe counts the cooldown down; a flash says ready ───
export type Glyph = "bolt" | "shield" | "flame" | "star";
export interface AbilityProps {
  id: string; glyph: Glyph; usedAt: number; cd: number; hotkey: string;
  cast(id: string, time: number): unknown;
}

function glyphPoints(g: Glyph, c: Vec, r: number): Vec[] {
  switch (g) {
    case "bolt": return [v(c.x + 3, c.y - r), v(c.x - 6, c.y + 2), v(c.x - 1, c.y + 2), v(c.x - 3, c.y + r), v(c.x + 6, c.y - 2), v(c.x + 1, c.y - 2)];
    case "shield": return [v(c.x, c.y - r), v(c.x + r * 0.85, c.y - r * 0.55), v(c.x + r * 0.7, c.y + r * 0.3), v(c.x, c.y + r), v(c.x - r * 0.7, c.y + r * 0.3), v(c.x - r * 0.85, c.y - r * 0.55)];
    case "flame": return [v(c.x, c.y - r), v(c.x + r * 0.5, c.y - r * 0.2), v(c.x + r * 0.7, c.y + r * 0.5), v(c.x, c.y + r), v(c.x - r * 0.7, c.y + r * 0.5), v(c.x - r * 0.4, c.y), v(c.x - r * 0.1, c.y - r * 0.4)];
    case "star": return polygon(c, r, 10).map((pt, i) => (i % 2 ? v(c.x + (pt.x - c.x) * 0.45, c.y + (pt.y - c.y) * 0.45) : pt));
  }
}

const remaining = (n: GNode<AbilityProps>) => cooldown(n.time ?? 0, n.props.usedAt, n.props.cd);

export const AbilityButton = part("hud-ability")
  .props<AbilityProps>()
  .size(() => v(56, 56))
  .style((t, ch) => ({
    ...surface(t, ch, { tint: t.accent }),
    icon: t.textBright,
    shade: calpha(t.bg, 0.74),
    ready: t.accent,
    key: t.textDim,
    corner: 12,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = r.center;
    const rem = remaining(n), fl = flash(t, n.props.usedAt + n.props.cd, 0.5);
    p.push();
    p.scaleAt(c.x, c.y, 1 + 0.12 * fl - 0.05 * n.ch.press);
    p.glow(s.ready, 22 * fl + (rem > 0 ? 0 : 10 * n.ch.hover), () => p.box(r, s.corner, s.fill, s.edge, 1.5));
    p.poly(glyphPoints(n.props.glyph, c, 13), calpha(s.icon, rem > 0 ? 0.45 : 1));
    if (rem > 0) {
      p.push(); p.clip(r.inset(1));
      p.poly(sectorPoints(c, r.w, -TAU / 4, TAU * rem), s.shade);
      p.pop();
      p.label(Math.ceil(rem * n.props.cd).toString(), c, s.icon, { size: 16, weight: 800 });
    }
    if (fl > 0) p.ring(c, 28 + 18 * (1 - fl), calpha(s.ready, fl), 2);
    p.pop();
    p.label(n.props.hotkey, v(r.right - 8, r.y + 8), s.key, { size: 9, weight: 700, mono: true });
  })
  .press((n) => {
    if (remaining(n) > 0) return;
    n.spawn?.(new Ring(n.rect.center, hsl(200, 0.9, 0.65), 40, 0.4));
    return n.props.cast(n.props.id, n.time ?? 0);
  });
