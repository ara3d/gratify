// The `hud` example's feed: toasts that slide in from the right with a timer
// bar, a level-up banner that drops from the top with a one-time sheen, and
// the floating "+120" text effect. Toast and banner are ordinary keyed
// elements — enter/exit are the automatic channels; the app owns their life.

import { calpha, clamp, Color, easeOutCubic, Fx, Painter, part, rect, v, Vec } from "gratify";
import { polygon, sheenBand } from "../shared/paint";

export type ToastKind = "info" | "good" | "bad";
export interface ToastData { id: number; text: string; kind: ToastKind; at: number; }

export interface ToastProps { data: ToastData; life: number; dismiss(id: number): unknown; }
export const Toast = part("hud-toast")
  .props<ToastProps>()
  .size((p, m) => v(Math.max(220, m.text(p.data.text, 12).x + 40), 40))
  .style((t, ch, p) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.5 + 0.3 * ch.hover),
    edge: t.mix(t.muted, t.textDim, ch.hover),
    stripe: p.data.kind === "good" ? t.accent : p.data.kind === "bad" ? t.danger : t.accent2,
    text: t.textBright,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    p.push();
    p.translate((1 - clamp(n.ch.enter, 0, 1)) * 70, 0);       // slide in from the right
    p.box(r, 8, s.fill, s.edge, 1);
    p.push(); p.clip(rect(r.x, r.y, 5, r.h)); p.box(r, 8, s.stripe); p.pop();
    p.label(n.props.data.text, v(r.x + 16, r.center.y - 3), s.text, { align: "left", size: 12, weight: 500 });
    const left = clamp(1 - (t - n.props.data.at) / n.props.life, 0, 1);
    p.box(rect(r.x + 12, r.bottom - 6, (r.w - 24) * left, 2), 1, calpha(s.stripe, 0.8));
    p.pop();
  })
  .press((n) => n.props.dismiss(n.props.data.id));

export interface BannerProps { title: string; sub: string; level: number; at: number; }
export const Banner = part("hud-banner")
  .props<BannerProps>()
  .size(() => v(340, 64))
  .style((t) => ({
    fill: t.mix(t.surface, t.accent2, 0.35),
    edge: t.mix(t.accent2, t.textBright, 0.3),
    badge: t.accent2,
    text: t.textBright,
    sub: t.text,
    band: t.textBright,
  }))
  .render((n, p, s) => {
    const t = n.time ?? 0, r = n.rect;
    p.push();
    p.translate(0, -(1 - clamp(n.ch.enter, 0, 1)) * 40);      // drop in from above
    p.glow(s.badge, 18, () => p.box(r, 12, s.fill, s.edge, 1.5));
    const c = v(r.x + 34, r.center.y);
    p.glow(s.badge, 10, () => p.poly(polygon(c, 20, 6), s.badge, s.text, 1.5));
    p.label(String(n.props.level), c, s.text, { size: 15, weight: 800 });
    p.label(n.props.title, v(r.x + 70, r.center.y - 9), s.text, { align: "left", size: 16, weight: 800 });
    p.label(n.props.sub, v(r.x + 70, r.center.y + 11), s.sub, { align: "left", size: 11 });
    const x = (t - n.props.at - 0.25) / 0.7;                 // one sheen pass after landing
    if (x > 0 && x < 1) sheenBand(p, r, x, calpha(s.band, 0.3), 0.2);
    p.pop();
  });

/** Rising, fading text — "+120" over a score, "MISS" over a target. */
export class Floater implements Fx {
  t = 0; done = false;
  constructor(public at: Vec, public text: string, public color: Color, public dur = 0.9) {}
  update(dt: number) { this.t += dt; if (this.t >= this.dur) this.done = true; }
  draw(p: Painter) {
    const k = this.t / this.dur;
    p.label(this.text, v(this.at.x, this.at.y - 44 * easeOutCubic(k)), calpha(this.color, 1 - k * k), { size: 15 + 5 * (1 - k), weight: 800 });
  }
}
