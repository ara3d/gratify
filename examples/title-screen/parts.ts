// Parts of the `title-screen` example: a live backdrop, the sheened title, the
// blinking prompt, cascading menu items with a springing selector, the
// sliding sub-panel, a segmented control whose pill springs between options,
// save-slot cards whose bars fill as they arrive, and the key-hint bar.

import { calpha, clamp, easeOutCubic, part, rect, surface, v, Vec } from "gratify";
import { blink, breathe, cascade, flash, hash01, mod, sweep } from "../shared/motion";
import { bloom, polygon } from "../shared/paint";

// ── Backdrop — a slow aurora, drifting motes, a little pointer parallax ──────
export const Backdrop = part("ts-backdrop")
  .props<{ attract: boolean; begin(time: number): unknown }>()
  .fill()
  .style((t) => ({ a: t.accent, b: t.accent2, mote: t.textBright, line: calpha(t.textDim, 0.08) }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = r.center;
    const px = n.pointer ? (n.pointer.x - c.x) / r.w : 0, py = n.pointer ? (n.pointer.y - c.y) / r.h : 0;
    bloom(p, v(r.w * 0.25 + 40 * Math.sin(t * 0.13) - px * 20, r.h * 0.35 - py * 20), r.h * 0.7, s.a, 0.16);
    bloom(p, v(r.w * 0.8 + 30 * Math.cos(t * 0.1) - px * 30, r.h * 0.75 - py * 30), r.h * 0.6, s.b, 0.14);
    for (let y = 0; y < r.h; y += 48) p.line(v(0, y), v(r.w, y), s.line, 1);
    for (let i = 0; i < 70; i++) {
      const depth = 0.3 + 0.7 * hash01(i, 3), speed = 8 + 18 * depth;
      const x = mod(hash01(i, 1) * r.w + Math.sin(t * 0.3 + i) * 12 - px * 40 * depth, r.w);
      const y = mod(hash01(i, 2) * r.h - t * speed - py * 40 * depth, r.h);
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash01(i, 4)) + i);
      p.dot(v(x, y), 0.6 + 1.6 * depth, calpha(s.mote, 0.12 + 0.35 * depth * tw));
    }
  })
  .press((n) => (n.props.attract ? n.props.begin(n.time ?? 0) : undefined));

// ── Title — big type with a breathing glow and a light sweeping the letters ──
export const Title = part("ts-title")
  .props<{ text: string; sub: string }>()
  .size((p, m) => v(Math.max(m.text(p.text, 46).x + 20, 320), 90))
  .style((t) => ({ text: t.textBright, glow: t.accent, sheen: t.textBright, sub: t.textDim }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, c = v(r.x + r.w / 2, r.y + 34);
    const o = { size: 46, weight: 800 };
    p.glow(s.glow, 14 + 12 * breathe(t, 3), () => p.label(n.props.text, c, s.text, o));
    const x = sweep(t, 4.5, 1.2);
    if (x !== null) {
      const bx = r.x - 40 + (r.w + 80) * x;
      for (const [w, a] of [[26, 0.25], [12, 0.45], [4, 0.9]] as const) {
        p.push(); p.clip(rect(bx - w / 2, r.y, w, 70));
        p.label(n.props.text, c, calpha(s.sheen, a), o);
        p.pop();
      }
    }
    p.label(n.props.sub, v(c.x, r.y + 74), s.sub, { size: 12, weight: 600 });
  });

// ── Prompt — "press Enter" breathing until the game starts ───────────────────
export const Prompt = part("ts-prompt")
  .props<{ text: string }>()
  .size((p, m) => v(m.text(p.text, 13).x + 40, 30))
  .style((t) => ({ text: t.textBright, edge: t.accent }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, k = 0.3 + 0.7 * blink(t, 1.6, 0.6, 0.25);
    p.box(r, 15, calpha(s.edge, 0.08 * k), calpha(s.edge, 0.5 * k), 1);
    p.label(n.props.text, r.center, calpha(s.text, k), { size: 13, weight: 700 });
  });

// ── Menu item — cascades in, the selector bar springs to it, ticks on select ─
export interface MenuItemProps {
  label: string; index: number; selected: boolean; selectedAt: number;
  enteredAt: number; dimmed: boolean; open(index: number, time: number): unknown;
}
export const MenuItem = part("ts-menu-item")
  .props<MenuItemProps>()
  .size(() => v(250, 42))
  .channels({
    sel: { target: (n) => (n.props.selected ? 1 : 0), spring: { stiffness: 260, damping: 18 } },
    dim: { target: (n) => (n.props.dimmed ? 1 : 0), rate: 8 },
  })
  .style((t, ch) => {
    const k = Math.max(clamp(ch.sel, 0, 1), ch.hover);
    return {
      text: t.mix(t.text, t.textBright, k),
      bar: t.accent,
      fill: calpha(t.accent, 0.12 * k),
      glow: 14 * k,
      shift: 14 * ch.sel + 4 * ch.hover,
      tick: t.textBright,
    };
  })
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    const k = cascade(t, n.props.enteredAt, n.props.index, 0.07, 0.45), e = easeOutCubic(k);
    const tick = n.props.selected ? flash(t, n.props.selectedAt, 0.25) : 0;
    p.push();
    p.alpha(e * (1 - 0.7 * n.ch.dim));
    p.translate(-40 * (1 - e) - 24 * n.ch.dim, 0);
    p.box(r, 8, s.fill);
    const sel = clamp(n.ch.sel, 0, 1);
    if (sel > 0.01) p.glow(s.bar, s.glow, () => p.box(rect(r.x, r.center.y - 12 * sel, 4, 24 * sel), 2, s.bar));
    p.label(n.props.label, v(r.x + 22 + s.shift, r.center.y), s.text, { align: "left", size: 17, weight: 600 });
    if (tick > 0) p.box(rect(r.x + 14, r.y + 4, r.w - 28, r.h - 8), 6, calpha(s.tick, 0.18 * tick));
    p.pop();
  })
  .press((n) => n.props.open(n.props.index, n.time ?? 0));

// ── Panel — a glass sheet that slides in from the right; body is the slot ────
// The slot places the use-site children below the header, inside the padding.
const PanelSlot = part("ts-panel-slot")
  .props<{ w: number; h: number }>()
  .measure((p) => v(p.w, p.h))
  .arrange((_p, r, kids) => kids.map((k) => rect(r.x + 24, r.y + 68, k.size.x, k.size.y)));

export const Panel = part("ts-panel")
  .props<{ title: string; w?: number; h?: number }>()
  .defaults({ w: 380, h: 330 })
  .style((t) => ({ fill: calpha(t.surface, 0.72), edge: t.mix(t.muted, t.accent, 0.4), title: t.textBright, rule: calpha(t.accent, 0.5) }))
  .render((n, p, s) => {
    const r = n.rect, e = clamp(n.ch.enter, 0, 1);
    p.push();
    p.translate(60 * (1 - easeOutCubic(e)), 0);
    p.glow(s.edge, 16, () => p.box(r, 14, s.fill, s.edge, 1));
    p.label(n.props.title, v(r.x + 24, r.y + 30), s.title, { align: "left", size: 18, weight: 800 });
    p.box(rect(r.x + 24, r.y + 48, 60, 2), 1, s.rule);
    p.pop();
  })
  .body((props, children) => [PanelSlot("slot", { w: props.w, h: props.h }, children)]);

// ── Segmented — a pill that springs between options ──────────────────────────
export interface SegmentedProps { options: string[]; index: number; pick(index: number): unknown; }
export const Segmented = part("ts-segmented")
  .props<SegmentedProps>()
  .size((p) => v(p.options.length * 96, 36))
  .channels({ pos: { target: (n) => n.props.index, spring: { stiffness: 300, damping: 20 } } })
  .style((t, ch) => ({ track: calpha(t.bg, 0.5), edge: t.muted, pill: t.accent, on: t.textBright, off: t.mix(t.textDim, t.text, ch.hover) }))
  .render((n, p, s) => {
    const r = n.rect, w = r.w / n.props.options.length, pos = n.ch.pos;
    p.box(r, 18, s.track, s.edge, 1);
    const stretch = 1 + 0.25 * Math.min(1, Math.abs(pos - n.props.index));   // the pill leans into its move
    p.glow(s.pill, 10, () => p.box(rect(r.x + 3 + w * pos - (w - 6) * (stretch - 1) / 2, r.y + 3, (w - 6) * stretch, r.h - 6), 15, s.pill));
    n.props.options.forEach((o, i) => {
      const near = 1 - clamp(Math.abs(pos - i), 0, 1);
      p.label(o, v(r.x + w * (i + 0.5), r.center.y), calpha(near > 0.5 ? s.on : s.off, 1), { size: 12, weight: 700 });
    });
  })
  .press((n) => {
    const w = n.rect.w / n.props.options.length;
    const i = n.pointer ? clamp(Math.floor((n.pointer.x - n.rect.x) / w), 0, n.props.options.length - 1) : n.props.index;
    return n.props.pick(i);
  });

// ── Slot card — arrives in cascade; its progress bar fills as it lands ──────
export interface SlotProps { name: string; where: string; progress: number; index: number; enteredAt: number; picked: boolean; pick(index: number): unknown; }
export const SlotCard = part("ts-slot")
  .props<SlotProps>()
  .size(() => v(330, 56))
  .channels({
    // the target rises with the cascade, so the bar fills on arrival instead of snapping
    fill: { target: (n) => n.props.progress * cascade(n.time ?? 0, n.props.enteredAt, n.props.index, 0.1, 0.6), spring: { stiffness: 120, damping: 14 } },
  })
  .style((t, ch, p) => ({
    ...surface(t, ch, { tint: p.picked ? t.accent : undefined }),
    bar: t.accent,
    track: t.muted,
    name: t.textBright,
    where: t.textDim,
    corner: 10,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect, k = easeOutCubic(cascade(t, n.props.enteredAt, n.props.index, 0.1, 0.5));
    p.push();
    p.alpha(k); p.translate(0, 16 * (1 - k));
    p.box(r, s.corner, s.fill, s.edge, 1);
    p.label(n.props.name, v(r.x + 14, r.y + 18), s.name, { align: "left", size: 13, weight: 700 });
    p.label(n.props.where, v(r.right - 14, r.y + 18), s.where, { align: "right", size: 11 });
    const bar = rect(r.x + 14, r.bottom - 16, r.w - 28, 6);
    p.box(bar, 3, s.track);
    p.box(rect(bar.x, bar.y, bar.w * clamp(n.ch.fill, 0, 1), bar.h), 3, s.bar);
    p.pop();
  })
  .press((n) => n.props.pick(n.props.index));

// ── Hint bar — key glyphs along the bottom, fading in with the menu ──────────
export const HintBar = part("ts-hints")
  .props<{ hints: [string, string][]; shown: boolean }>()
  .size((p, m) => v(p.hints.reduce((w, [k, l]) => w + m.text(k, 10).x + m.text(l, 11).x + 44, 0), 24))
  .channels({ on: { target: (n) => (n.props.shown ? 1 : 0), rate: 5 } })
  .style((t) => ({ key: t.textBright, keyFace: t.surfaceHi, text: t.textDim }))
  .render((n, p, s) => {
    const r = n.rect, a = n.ch.on;
    if (a < 0.01) return;
    let x = r.x;
    for (const [k, label] of n.props.hints) {
      const kw = p.measure.text(k, 10).x + 12;
      p.box(rect(x, r.y + 3, kw, 18), 4, calpha(s.keyFace, a), calpha(s.key, 0.4 * a), 1);
      p.label(k, v(x + kw / 2, r.center.y), calpha(s.key, a), { size: 10, weight: 700, mono: true });
      x += kw + 8;
      p.label(label, v(x, r.center.y), calpha(s.text, a), { align: "left", size: 11 });
      x += p.measure.text(label, 11).x + 24;
    }
  });

// ── Emblem — a slowly turning hexagon pair beside the title ──────────────────
export const Emblem = part("ts-emblem")
  .props<Record<string, never>>()
  .size(() => v(64, 64))
  .style((t) => ({ a: t.accent, b: t.accent2, core: t.textBright }))
  .render((n, p, s) => {
    const t = n.time ?? 0, c = n.rect.center;
    p.glow(s.a, 12, () => p.poly(polygon(c, 26, 6, t * 0.25), calpha(s.a, 0), s.a, 1.5));
    p.poly(polygon(c, 18, 6, -t * 0.4), calpha(s.b, 0.25), s.b, 1.5);
    p.dot(c, 4 + 2 * breathe(t, 2), s.core);
  });

/** The tiny version stamp in the corner. */
export const Version = part("ts-version")
  .props<{ text: string }>()
  .size((p, m) => v(m.text(p.text, 10).x + 4, 14))
  .style((t) => ({ text: calpha(t.textDim, 0.7) }))
  .render((n, p, s) => p.label(n.props.text, v(n.rect.x, n.rect.center.y), s.text, { align: "left", size: 10, mono: true }));

/** Screen layout: menu column left, panel right, hints bottom-center, version
 *  bottom-left — proportional to the viewport. */
export const Screen = part("ts-screen")
  .props<Record<string, never>>()
  .fill()
  .arrange((_p, r, kids) => {
    const left = r.x + Math.max(56, r.w * 0.08);
    const columnRight = left + (kids[0]?.size.x ?? 0);
    const panelW = kids[1]?.size.x ?? 0;
    const spots: Vec[] = [
      v(left, r.y + r.h * 0.18),
      // never over the title column; on a narrow viewport it overflows the right edge instead
      v(Math.max(columnRight + 40, Math.min(r.x + r.w * 0.55, r.right - panelW - 24)), r.y + r.h * 0.2),
      v(r.x + (r.w - (kids[2]?.size.x ?? 0)) / 2, r.bottom - 44),
      v(r.x + 16, r.bottom - 26),
    ];
    return kids.map((k, i) => rect(spots[i]?.x ?? r.x, spots[i]?.y ?? r.y, k.size.x, k.size.y));
  });
