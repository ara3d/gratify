// The eight attention cues of the `attention` example — each a part that keeps
// signalling "act on me" until the app says it has been answered. Every cue
// takes a `live` flag; a `live` channel eases it to 0 so the signal fades out
// instead of snapping off. All motion is `node.time` through motion.ts curves,
// plus the automatic hover/press channels.

import {
  at, burst, calpha, Color, GNode, hsl, Painter, part, rect, Rect, Ring, surface, v, Vec,
} from "gratify";
import { blink, breathe, dashes, heartbeat, nudge, pings, sweep } from "../shared/motion";

export const CW = 150, CH = 56;      // every cue's content box, the Card pads around it

export interface CueProps { id: string; live: boolean; }
export interface CueIntent { kind: "ack"; id: string; time: number }

const ack = (n: GNode<CueProps>): CueIntent => ({ kind: "ack", id: n.props.id, time: n.time ?? 0 });
const liveOf = { target: (n: GNode<{ live: boolean }>) => (n.props.live ? 1 : 0), rate: 4 };

/** A translucent diagonal band clipped to `r`, its left edge at fraction `x`
 *  of the width (a little past both ends so it enters and leaves cleanly). */
export function sheenBand(p: Painter, r: Rect, x: number, color: Color) {
  const w = r.w * 0.28, skew = r.h * 0.6;
  const left = r.x - w - skew + (r.w + 2 * w + skew) * x;
  p.push(); p.clip(r);
  p.poly([v(left + skew, r.y), v(left + skew + w, r.y), v(left + w, r.bottom), v(left, r.bottom)], color);
  p.pop();
}

// ── 1. Pulse — a heartbeat glow ring around the primary action ───────────────
export const PulseButton = part("cue-pulse")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({ ...surface(t, ch, { tint: t.accent }), halo: t.accent, corner: 12 }))
  .render((n, p, s) => {
    const t = n.time ?? 0, live = n.ch.live, r = n.rect;
    const beat = heartbeat(t, 1.6) * live * (1 - 0.6 * n.ch.hover);
    p.push();
    p.scaleAt(r.center.x, r.center.y, 1 + 0.035 * beat);
    p.box(r.inset(-4 - 6 * beat), s.corner + 4, calpha(s.halo, 0), calpha(s.halo, 0.55 * beat), 2);
    p.glow(s.halo, 8 + 28 * beat + 14 * n.ch.hover, () => p.box(r, s.corner, s.fill, s.edge, 1.5));
    p.label("Start", r.center, s.text, { weight: 600, size: 14 });
    p.pop();
  })
  .press(ack);

// ── 2. Sheen — a light band sweeps the face every few seconds ────────────────
export const SheenButton = part("cue-sheen")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({ ...surface(t, ch, { tint: t.accent2 }), band: t.textBright, corner: 12 }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    p.box(r, s.corner, s.fill, s.edge, 1.5);
    const x = sweep(t, 3.2, 0.9);
    if (x !== null && n.ch.live > 0.01) sheenBand(p, r, x, calpha(s.band, 0.28 * n.ch.live));
    p.label("Upgrade", r.center, s.text, { weight: 600, size: 14 });
  })
  .press(ack);

// ── 3. Sonar — an inbox with a springing badge and expanding rings ───────────
export interface SonarProps extends CueProps { unread: number; }
export const SonarInbox = part("cue-sonar")
  .props<SonarProps>()
  .size(() => v(CW, CH))
  .channels({
    live: liveOf,
    badge: { target: (n) => (n.props.unread > 0 ? 1 : 0), spring: { stiffness: 320, damping: 11 } },
  })
  .style((t, ch) => ({
    ...surface(t, ch),
    ping: t.accent,
    badge: t.danger,
    badgeText: t.textBright,
    icon: t.mix(t.text, t.textBright, ch.hover),
    corner: 12,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = r.center, live = n.ch.live;
    p.box(r, s.corner, s.fill, s.edge, 1.5);
    for (const k of pings(t, 2.4, 2)) {
      const a = (1 - k) * (1 - k) * 0.7 * live;
      if (a > 0.01) p.ring(c, 14 + 34 * k, calpha(s.ping, a), 2 - k);
    }
    // an envelope: body plus the flap
    const w = 22, h = 15, x = c.x - w / 2, y = c.y - h / 2;
    p.box(rect(x, y, w, h), 3, calpha(s.icon, 0), s.icon, 1.6);
    p.line(v(x, y + 1), v(c.x, y + h * 0.6), s.icon, 1.6);
    p.line(v(c.x, y + h * 0.6), v(x + w, y + 1), s.icon, 1.6);
    const k = Math.max(0, n.ch.badge);
    if (k > 0.02) {
      const bc = v(x + w + 2, y - 2), br = 8 * k;
      p.glow(s.badge, 8 * k, () => p.dot(bc, br, s.badge));
      if (k > 0.5) p.label(String(n.props.unread), bc, calpha(s.badgeText, k), { size: 10, weight: 700 });
    }
  })
  .press(ack);

// ── 4. Nudge — hops after a few idle seconds; the arrow leads ────────────────
export interface NudgeProps extends CueProps { lastInput: number; }
export const NudgeButton = part("cue-nudge")
  .props<NudgeProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({ ...surface(t, ch, { tint: t.accent }), corner: 12 }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    const hop = nudge(t, n.props.lastInput, 2, 2.6, 0.55) * n.ch.live;
    const lift = 9 * hop, c = v(r.center.x, r.center.y - lift);
    const w = r.w * (1 + 0.05 * hop), h = r.h * (1 - 0.05 * hop);
    p.glow(s.edge, 16 * hop, () => p.box(rect(c.x - w / 2, c.y - h / 2, w, h), s.corner, s.fill, s.edge, 1.5));
    p.label("Continue", v(c.x - 10, c.y), s.text, { weight: 600, size: 14 });
    const ax = c.x + 38 + 7 * hop;
    p.line(v(ax - 8, c.y), v(ax, c.y), s.text, 2);
    p.line(v(ax - 4, c.y - 4), v(ax, c.y), s.text, 2);
    p.line(v(ax - 4, c.y + 4), v(ax, c.y), s.text, 2);
  })
  .press(ack);

// ── 5. Drop zone — marching dashes until the chip lands ──────────────────────
export interface ZoneProps { live: boolean; }
export const DropZone = part("cue-zone")
  .props<ZoneProps>()
  .size(() => v(96, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({
    fill: t.mix(t.surface, t.accent, 0.08 + 0.1 * ch.hover),
    dash: t.accent,
    solid: t.mix(t.accent, t.textBright, 0.3),
    text: t.textDim,
    done: t.accent,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect.inset(1), live = n.ch.live;
    const breath = 0.5 + 0.5 * breathe(t, 2.2);
    p.box(r, 10, calpha(s.fill, 1), calpha(s.solid, 1 - live), 2);
    for (const [a, b] of dashes(r, 10, 12, 0.55, t * 0.06))
      p.line(a, b, calpha(s.dash, live * (0.45 + 0.55 * breath)), 2);
    if (live > 0.5) p.label("drop here", r.center, calpha(s.text, live), { size: 11 });
    else {
      const c = r.center, k = 1 - live;
      p.line(v(c.x - 7, c.y), v(c.x - 2, c.y + 5), calpha(s.done, k), 2.5);
      p.line(v(c.x - 2, c.y + 5), v(c.x + 8, c.y - 6), calpha(s.done, k), 2.5);
    }
  })
  .anchors((n) => [{ id: "drop-zone", pos: n.rect.center, meta: n.rect }]);

export interface ChipProps { drop: (time: number) => unknown; }
const ChipFace = part("cue-chip-face")
  .props<{ near: number }>()
  .size(() => v(44, 30))
  .style((t, _ch, p) => ({
    fill: t.mix(t.accent2, t.accent, p.near),
    text: t.textBright,
    scale: 1 + 0.12 * p.near,
  }))
  .render((n, p, s) => {
    p.push(); p.scaleAt(n.rect.center.x, n.rect.center.y, s.scale);
    p.glow(s.fill, 14, () => p.box(n.rect, 8, s.fill));
    p.label("file", n.rect.center, s.text, { size: 11, weight: 600 });
    p.pop();
  });

const insideRect = (p: Vec, r: Rect | undefined) =>
  !!r && p.x >= r.x && p.x <= r.right && p.y >= r.y && p.y <= r.bottom;

export const DragChip = part("cue-chip")
  .props<ChipProps>()
  .size(() => v(44, 30))
  .style((t, ch) => ({
    fill: calpha(t.mix(t.accent2, t.textBright, 0.2 * ch.hover), 1 - 0.7 * ch.press),
    text: calpha(t.textBright, 1 - 0.7 * ch.press),
    lift: 2 * ch.hover,
  }))
  .render((n, p, s) => {
    const r = n.rect.raise(s.lift);
    p.box(r, 8, s.fill);
    p.label("file", r.center, s.text, { size: 11, weight: 600 });
  })
  .gesture({
    begin: (_n, p) => ({ pos: p, near: 0 }),
    move: (st, _n, p, q) => ({ ...st, pos: p, near: insideRect(p, q.anchor("drop-zone")?.meta as Rect | undefined) ? 1 : 0 }),
    up: (st, n, p, q) => insideRect(p, q.anchor("drop-zone")?.meta as Rect | undefined)
      ? (n.spawn?.(burst(p, hsl(200, 0.9, 0.65))), n.spawn?.(new Ring(p, hsl(200, 0.9, 0.65), 40, 0.5)), n.props.drop(n.time ?? 0))
      : undefined,
    view: (st) => [at(ChipFace("ghost", { near: st.near }), v(st.pos.x - 22, st.pos.y - 15))],
  });

// ── 6. Key prompt — "press Space" blinks until a key answers ─────────────────
export const KeyPrompt = part("cue-key")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({
    fill: t.mix(t.bg, t.surface, 0.6 + 0.2 * ch.hover),
    edge: t.mix(t.muted, t.accent, 0.4 * ch.hover),
    key: t.textBright,
    keyFace: t.surfaceHi,
    text: t.text,
    ready: t.accent,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, live = n.ch.live;
    p.box(r, 10, s.fill, s.edge, 1);
    if (live > 0.01) {
      const on = 0.35 + 0.65 * blink(t, 1.3, 0.55);
      const kr = rect(r.x + 14, r.center.y - 11, 52, 22);
      p.box(kr.raise(1), 5, calpha(s.keyFace, live), calpha(s.key, 0.6 * live), 1);
      p.label("Space", kr.center, calpha(s.key, on * live), { size: 11, weight: 700, mono: true });
      p.label("to begin", v(r.x + 104, r.center.y), calpha(s.text, on * live), { size: 12 });
    }
    if (live < 0.99) p.label("Ready.", r.center, calpha(s.ready, 1 - live), { size: 14, weight: 700 });
  })
  .press(ack);

// ── 7. Shimmer — loading placeholders with a moving highlight ────────────────
export const Skeleton = part("cue-skeleton")
  .props<{ live: boolean }>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t) => ({ bar: t.mix(t.surface, t.muted, 0.5), band: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, live = n.ch.live;
    if (live < 0.01) return;
    const rows = [[0, 0.7], [1, 1], [2, 0.5]] as const;
    for (const [i, w] of rows) p.box(rect(r.x, r.y + 4 + i * 18, r.w * w, 10), 5, calpha(s.bar, live));
    const x = sweep(t, 1.5, 1.5);
    p.push(); p.clip(r);
    for (const [i, w] of rows) {
      const br = rect(r.x, r.y + 4 + i * 18, r.w * w, 10);
      p.push(); p.clip(br);
      if (x !== null) sheenBand(p, r, x, calpha(s.band, 0.16 * live));
      p.pop();
    }
    p.pop();
  });

// ── 8. Spotlight — a pointer-following highlight; a slow drift while idle ────
export const SpotlightTile = part("cue-spotlight")
  .props<CueProps>()
  .size(() => v(CW, CH))
  .channels({ live: liveOf })
  .style((t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.5 + 0.3 * ch.hover),
    edge: t.mix(t.muted, t.accent, 0.3 + 0.7 * ch.hover),
    light: t.accent,
    text: t.mix(t.text, t.textBright, ch.hover),
    lift: 3 * ch.hover - 2 * ch.press,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect.raise(s.lift), hover = n.ch.hover;
    p.glow(s.light, 18 * hover, () => p.box(r, 12, s.fill, s.edge, 1.5));
    // the light: under the pointer when hovered, otherwise drifting along the face
    const drift = 0.5 + 0.5 * Math.sin(t * 1.1), idleY = r.y + r.h * (0.3 + 0.4 * (0.5 + 0.5 * Math.cos(t * 0.7)));
    const idle = v(r.x + r.w * drift, idleY);
    const at_ = n.pointer && hover > 0.02 ? n.pointer : idle;
    const strength = Math.max(hover, 0.45 * n.ch.live * (1 - hover));
    p.push(); p.clip(r.inset(1));
    for (let i = 1; i <= 14; i++) p.dot(at_, 70 * (i / 14), calpha(s.light, (0.06 * strength) / 14 * (15 - i)));
    p.pop();
    p.label("Hover me", r.center, s.text, { weight: 600, size: 14 });
  })
  .press(ack);
