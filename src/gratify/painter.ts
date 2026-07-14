// ============================================================================
// Gratify painter — the drawing contract parts render through, plus the
// Canvas2D implementation and a headless null implementation (for tests and
// deterministic stepping without a DOM).
// ============================================================================

import { Color, css, Rect, Vec, wireCtrl } from "./core";

export interface LabelOpts {
  size?: number;                       // px, default 13
  weight?: number;                     // css font-weight, default 400
  align?: CanvasTextAlign;             // default "center"
  mono?: boolean;
}

export interface Measure {
  /** Size of a text run at the given px size (default 13). */
  text(s: string, size?: number): Vec;
}

export interface Painter {
  measure: Measure;
  clear(c: Color, w: number, h: number): void;
  box(r: Rect, corner: number, fill: Color, stroke?: Color, lw?: number): void;
  label(s: string, at: Vec, color: Color, o?: LabelOpts): void;
  dot(p: Vec, r: number, c: Color): void;
  ring(p: Vec, r: number, c: Color, lw?: number): void;
  line(a: Vec, b: Vec, c: Color, lw?: number): void;
  glow(c: Color, blur: number, draw: () => void): void;
  push(): void;
  pop(): void;
  alpha(a: number): void;
  scaleAt(cx: number, cy: number, s: number): void;
  screen(dpr: number): void;
  /** Set the world transform (viewport pan/zoom). */
  view(pan: Vec, zoom: number, dpr: number): void;
  /** Cubic bezier connector with horizontal tangents. */
  wire(a: Vec, b: Vec, c: Color, lw: number): void;
}

const SANS = `"Segoe UI", system-ui, sans-serif`;
const MONO = `"Cascadia Code", ui-monospace, monospace`;
const font = (o?: LabelOpts) => `${o?.weight || 400} ${o?.size || 13}px ${o?.mono ? MONO : SANS}`;

export class CanvasPainter implements Painter {
  ctx: CanvasRenderingContext2D;
  constructor(public canvas: HTMLCanvasElement) { this.ctx = canvas.getContext("2d")!; }

  measure: Measure = {
    text: (s, size = 13) => {
      this.ctx.font = `400 ${size}px ${SANS}`;
      return { x: this.ctx.measureText(s).width, y: size * 1.3 };
    },
  };

  clear(c: Color, w: number, h: number) {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = css(c);
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    void w; void h;
  }
  screen(dpr: number) { this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  view(pan: Vec, zoom: number, dpr: number) {
    this.ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, pan.x * dpr, pan.y * dpr);
  }
  wire(a: Vec, b: Vec, col: Color, lw: number) {
    const c = this.ctx, [c1, c2] = wireCtrl(a, b);
    c.beginPath(); c.moveTo(a.x, a.y); c.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
    c.strokeStyle = css(col); c.lineWidth = lw; c.lineCap = "round"; c.stroke();
  }
  push() { this.ctx.save(); }
  pop() { this.ctx.restore(); }
  alpha(a: number) { this.ctx.globalAlpha *= a; }
  scaleAt(cx: number, cy: number, s: number) {
    this.ctx.translate(cx, cy); this.ctx.scale(s, s); this.ctx.translate(-cx, -cy);
  }
  glow(c: Color, blur: number, draw: () => void) {
    const x = this.ctx; x.save(); x.shadowColor = css(c); x.shadowBlur = blur; draw(); x.restore();
  }

  private roundRect(r: Rect, rad: number) {
    const c = this.ctx;
    if (r.w <= 0 || r.h <= 0) { c.beginPath(); return; }
    rad = Math.max(0, Math.min(rad, r.w / 2, r.h / 2));
    c.beginPath();
    c.moveTo(r.x + rad, r.y);
    c.arcTo(r.right, r.y, r.right, r.bottom, rad);
    c.arcTo(r.right, r.bottom, r.x, r.bottom, rad);
    c.arcTo(r.x, r.bottom, r.x, r.y, rad);
    c.arcTo(r.x, r.y, r.right, r.y, rad);
    c.closePath();
  }
  box(r: Rect, corner: number, fill: Color, stroke?: Color, lw = 1) {
    this.roundRect(r, corner);
    if (fill.a > 0) { this.ctx.fillStyle = css(fill); this.ctx.fill(); }
    if (stroke) { this.ctx.strokeStyle = css(stroke); this.ctx.lineWidth = lw; this.ctx.stroke(); }
  }
  label(s: string, at: Vec, color: Color, o?: LabelOpts) {
    const c = this.ctx;
    c.fillStyle = css(color); c.font = font(o);
    c.textAlign = o?.align || "center"; c.textBaseline = "middle";
    c.fillText(s, at.x, at.y);
  }
  line(a: Vec, b: Vec, col: Color, lw = 1) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
    c.strokeStyle = css(col); c.lineWidth = lw; c.stroke();
  }
  dot(p: Vec, r: number, col: Color) {
    const c = this.ctx;
    c.beginPath(); c.arc(p.x, p.y, Math.max(0, r), 0, 7); c.fillStyle = css(col); c.fill();
  }
  ring(p: Vec, r: number, col: Color, lw = 2) {
    const c = this.ctx;
    c.beginPath(); c.arc(p.x, p.y, Math.max(0.1, r), 0, 7);
    c.strokeStyle = css(col); c.lineWidth = lw; c.stroke();
  }
}

/** Headless painter: draws nothing, measures approximately. For tests. */
export class NullPainter implements Painter {
  measure: Measure = { text: (s, size = 13) => ({ x: s.length * size * 0.55, y: size * 1.3 }) };
  clear() {} box() {} label() {} dot() {} ring() {} line() {} wire() {}
  glow(_c: Color, _b: number, draw: () => void) { draw(); }
  push() {} pop() {} alpha() {} scaleAt() {} screen() {} view() {}
}
