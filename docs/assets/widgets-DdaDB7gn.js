const n=`// Shared example widgets — each one is a single part() definition (README §5).
// These live in examples/ deliberately: the framework ships primitives, apps
// (or a future widget library) ship widgets.

import {
  calpha, Color, Drag1D, GNode, Intentish, part, Press, rect, v,
} from "gratify";

// ---- Button -----------------------------------------------------------------
export interface ButtonProps {
  label: string;
  press: Intentish;
  accent?: boolean;
  danger?: boolean;
}

interface ButtonStyle { fill: Color; edge: Color; corner: number; lift: number; text: Color; }

export const Button = part<ButtonProps, ButtonStyle>("button", {
  size: (props, m) => v(m.text(props.label).x + 28, 32),
  style(t, ch, props): ButtonStyle {
    const base = props.danger ? t.danger : props.accent ? t.accent : t.surfaceHi;
    const emphasis = 0.18 + 0.32 * ch.hover + 0.4 * ch.press;
    return {
      fill: t.mix(t.surface, base, props.accent || props.danger ? 0.25 + emphasis : emphasis * 0.8),
      edge: t.mix(t.muted, base, ch.hover),
      corner: 8,
      lift: 2 * ch.hover - 2 * ch.press,
      text: t.mix(t.text, t.textBright, ch.hover),
    };
  },
  render(node, p, s) {
    const r = node.rect.raise(s.lift);
    p.box(r, s.corner, s.fill, s.edge, 1);
    p.label(node.props.label, r.center, s.text, { weight: 500 });
  },
  on: [Press((node) => node.props.press)],
});

// ---- Checkbox -----------------------------------------------------------------
export interface CheckboxProps { on: boolean; toggle: Intentish; }

interface CheckboxStyle { fill: Color; edge: Color; mark: Color; pop: number; }

export const Checkbox = part<CheckboxProps, CheckboxStyle>("checkbox", {
  size: () => v(20, 20),
  channels: {
    on: { target: (n: GNode<CheckboxProps>) => (n.props.on ? 1 : 0), spring: { stiffness: 340, damping: 22 } },
  },
  style(t, ch): CheckboxStyle {
    return {
      fill: t.mix(t.surface, t.accent, Math.min(1, Math.max(0, ch.on)) * 0.9),
      edge: t.mix(t.muted, t.accent, Math.max(ch.on, ch.hover * 0.6)),
      mark: calpha(t.textBright, Math.min(1, Math.max(0, ch.on))),
      pop: ch.on,
    };
  },
  render(node, p, s) {
    const r = node.rect.inset(1);
    p.box(r, 6, s.fill, s.edge, 1.5);
    const c = r.center, k = Math.min(1.15, Math.max(0, s.pop));
    if (k > 0.02) {
      p.line(v(c.x - 4 * k, c.y), v(c.x - 1 * k, c.y + 3 * k), s.mark, 2);
      p.line(v(c.x - 1 * k, c.y + 3 * k), v(c.x + 4.5 * k, c.y - 3.5 * k), s.mark, 2);
    }
  },
  on: [Press((node) => node.props.toggle)],
});

// ---- Toggle switch ------------------------------------------------------------
export interface ToggleProps { on: boolean; flip: Intentish; }

interface ToggleStyle { track: Color; knob: Color; travel: number; glow: number; }

export const Toggle = part<ToggleProps, ToggleStyle>("toggle", {
  size: () => v(42, 24),
  channels: {
    on: { target: (n: GNode<ToggleProps>) => (n.props.on ? 1 : 0), spring: { stiffness: 260, damping: 20 } },
  },
  style(t, ch): ToggleStyle {
    return {
      track: t.mix(t.muted, t.accent, Math.min(1, Math.max(0, ch.on))),
      knob: t.textBright,
      travel: ch.on,                    // a spring, so the knob *thunks*
      glow: 8 * ch.hover,
    };
  },
  render(node, p, s) {
    const r = node.rect;
    p.box(r, r.h / 2, s.track);
    const knobX = r.x + 12 + s.travel * (r.w - 24);
    p.glow(s.track, s.glow, () => p.dot(v(knobX, r.center.y), 8, s.knob));
  },
  on: [Press((node) => node.props.flip)],
});

// ---- Slider ---------------------------------------------------------------------
export interface SliderProps {
  value: number;                       // 0..1
  set(value: number): Intentish;
  width?: number;
}

interface SliderStyle { track: Color; fill: Color; knob: Color; knobR: number; glow: number; }

export const Slider = part<SliderProps, SliderStyle>("slider", {
  size: (props) => v(props.width ?? 170, 30),
  channels: {
    shown: { target: (n: GNode<SliderProps>) => n.props.value, spring: { stiffness: 300, damping: 24 } },
  },
  style(t, ch): SliderStyle {
    return {
      track: t.muted,
      fill: t.accent,
      knob: t.mix(t.textBright, t.accent, ch.hover * 0.3),
      knobR: 6.5 + 2 * ch.hover + 1 * ch.press,
      glow: 10 * ch.hover,
    };
  },
  render(node, p, s) {
    const r = node.rect;
    const x = r.x + 8, w = r.w - 16, y = r.center.y;
    const t = Math.min(1, Math.max(0, node.ch.shown));
    p.box(rect(x, y - 2.5, w, 5), 2.5, s.track);
    p.box(rect(x, y - 2.5, w * t, 5), 2.5, s.fill);
    p.glow(s.fill, s.glow, () => p.dot(v(x + w * t, y), s.knobR, s.knob));
  },
  on: [Drag1D({ axis: "x", to: (node, f) => node.props.set(f) })],
});

// ---- Icon button (×) ---------------------------------------------------------
export interface IconButtonProps { press: Intentish; }

interface CloseStyle { fill: Color; x: Color; spin: number; }

export const CloseButton = part<IconButtonProps, CloseStyle>("close-button", {
  size: () => v(20, 20),
  style(t, ch): CloseStyle {
    return {
      fill: calpha(t.danger, 0.12 + 0.5 * ch.hover),
      x: t.mix(t.textDim, t.danger, ch.hover),
      spin: ch.press,
    };
  },
  render(node, p, s) {
    const r = node.rect.inset(1), c = r.center, k = 3.6 * (1 - 0.3 * s.spin);
    p.box(r, 6, s.fill);
    p.line(v(c.x - k, c.y - k), v(c.x + k, c.y + k), s.x, 1.8);
    p.line(v(c.x - k, c.y + k), v(c.x + k, c.y - k), s.x, 1.8);
  },
  on: [Press((node) => node.props.press)],
});
`;export{n as w};
