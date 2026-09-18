const r=`// Shared example widgets — each one is a single part() definition (README §5).\r
// These live in examples/ deliberately: the framework ships primitives, apps\r
// (or a future widget library) ship widgets.\r
\r
import {\r
  addOn, calpha, Drag1D, Element, Gesture, GNode, Intentish, Label, part, Press, rect, Row,\r
  Stack, surface, v, withExt,\r
} from "gratify";\r
import {\r
  dragMax, dragMin, fracOfValue, pxOfValue, RangeZone, shiftWindow, valueOfPx, zoneAt,\r
} from "./range-math";\r
\r
// ---- Button -----------------------------------------------------------------\r
// The style record is INFERRED from \`style\`'s return value — no named interface,\r
// no second type parameter. \`surface(...)\` supplies the house { fill, edge, text }\r
// hover/press blends; the widget adds only its own fields (corner, lift).\r
export interface ButtonProps {\r
  label: string;\r
  press: Intentish;\r
  accent?: boolean;\r
  danger?: boolean;\r
}\r
\r
export const Button = part<ButtonProps>()("button", {\r
  size: (props, m) => v(m.text(props.label).x + 28, 32),\r
  style: (t, ch, props) => ({\r
    ...surface(t, ch, { tint: props.danger ? t.danger : props.accent ? t.accent : undefined }),\r
    corner: 8,\r
    lift: 2 * ch.hover - 2 * ch.press,\r
  }),\r
  render: (node, p, s) => {\r
    const r = node.rect.raise(s.lift);\r
    p.box(r, s.corner, s.fill, s.edge, 1);\r
    p.label(node.props.label, r.center, s.text, { weight: 500 });\r
  },\r
  on: [Press((node) => node.props.press)],\r
});\r
\r
// ---- TimedButton ----------------------------------------------------------------\r
// The same face as Button, but the intent is built at click time from the\r
// node's clock — for reducers that record WHEN something happened (idle\r
// timers, cooldowns, flashes) without reading a clock themselves.\r
export interface TimedButtonProps {\r
  label: string;\r
  to(time: number): Intentish;\r
  accent?: boolean;\r
  danger?: boolean;\r
}\r
\r
export const TimedButton = part("timed-button")\r
  .props<TimedButtonProps>()\r
  .size((props, m) => v(m.text(props.label).x + 28, 32))\r
  .style((t, ch, props) => ({\r
    ...surface(t, ch, { tint: props.danger ? t.danger : props.accent ? t.accent : undefined }),\r
    corner: 8,\r
    lift: 2 * ch.hover - 2 * ch.press,\r
  }))\r
  .render((node, p, s) => {\r
    const r = node.rect.raise(s.lift);\r
    p.box(r, s.corner, s.fill, s.edge, 1);\r
    p.label(node.props.label, r.center, s.text, { weight: 500 });\r
  })\r
  .press((node) => node.props.to(node.time ?? 0));\r
\r
// ---- Checkbox -----------------------------------------------------------------\r
// With \`label\`, the text is part of the SAME part — so the whole box-plus-text\r
// run is one hit target and clicking the words toggles too (the HTML <label>\r
// courtesy). The label dims through the \`on\` channel, so checking off\r
// cross-fades it for free.\r
export interface CheckboxProps { on: boolean; toggle: Intentish; label?: string; }\r
\r
export const Checkbox = part<CheckboxProps>()("checkbox", {\r
  size: (props, m) => (props.label ? v(28 + m.text(props.label, 12).x, 20) : v(20, 20)),\r
  channels: {\r
    on: { target: (n: GNode<CheckboxProps>) => (n.props.on ? 1 : 0), spring: { stiffness: 340, damping: 22 } },\r
  },\r
  style: (t, ch) => {\r
    const on = Math.min(1, Math.max(0, ch.on));\r
    return {\r
      fill: t.mix(t.surface, t.accent, on * 0.9),\r
      edge: t.mix(t.muted, t.accent, Math.max(on, ch.hover * 0.6)),\r
      mark: calpha(t.textBright, on),\r
      text: t.mix(t.mix(t.text, t.textBright, 0.3 * ch.hover), t.textDim, on),\r
      pop: ch.on,\r
    };\r
  },\r
  render(node, p, s) {\r
    const r = node.rect;\r
    const box = rect(r.x + 1, r.y + 1, 18, 18);\r
    p.box(box, 6, s.fill, s.edge, 1.5);\r
    const c = box.center, k = Math.min(1.15, Math.max(0, s.pop));\r
    if (k > 0.02) {\r
      p.line(v(c.x - 4 * k, c.y), v(c.x - 1 * k, c.y + 3 * k), s.mark, 2);\r
      p.line(v(c.x - 1 * k, c.y + 3 * k), v(c.x + 4.5 * k, c.y - 3.5 * k), s.mark, 2);\r
    }\r
    if (node.props.label) p.label(node.props.label, v(r.x + 28, r.center.y), s.text, { align: "left", size: 12 });\r
  },\r
  on: [Press((node) => node.props.toggle)],\r
});\r
\r
// ---- Toggle switch ------------------------------------------------------------\r
export interface ToggleProps { on: boolean; flip: Intentish; }\r
\r
export const Toggle = part<ToggleProps>()("toggle", {\r
  size: () => v(42, 24),\r
  channels: {\r
    on: { target: (n: GNode<ToggleProps>) => (n.props.on ? 1 : 0), spring: { stiffness: 260, damping: 20 } },\r
  },\r
  style: (t, ch) => ({\r
    track: t.mix(t.muted, t.accent, Math.min(1, Math.max(0, ch.on))),\r
    knob: t.textBright,\r
    travel: ch.on,                    // a spring, so the knob *thunks*\r
    glow: 8 * ch.hover,\r
  }),\r
  render(node, p, s) {\r
    const r = node.rect;\r
    p.box(r, r.h / 2, s.track);\r
    const knobX = r.x + 12 + s.travel * (r.w - 24);\r
    p.glow(s.track, s.glow, () => p.dot(v(knobX, r.center.y), 8, s.knob));\r
  },\r
  on: [Press((node) => node.props.flip)],\r
});\r
\r
// ---- Slider ---------------------------------------------------------------------\r
export interface SliderProps {\r
  value: number;                       // 0..1\r
  set(value: number): Intentish;\r
  width?: number;\r
}\r
\r
export const Slider = part<SliderProps>()("slider", {\r
  size: (props) => v(props.width ?? 170, 30),\r
  channels: {\r
    shown: { target: (n: GNode<SliderProps>) => n.props.value, spring: { stiffness: 300, damping: 24 } },\r
  },\r
  style: (t, ch) => ({\r
    track: t.muted,\r
    fill: t.accent,\r
    knob: t.mix(t.textBright, t.accent, ch.hover * 0.3),\r
    knobR: 6.5 + 2 * ch.hover + 1 * ch.press,\r
    glow: 10 * ch.hover,\r
  }),\r
  render(node, p, s) {\r
    const r = node.rect;\r
    const x = r.x + 8, w = r.w - 16, y = r.center.y;\r
    const t = Math.min(1, Math.max(0, node.ch.shown));\r
    p.box(rect(x, y - 2.5, w, 5), 2.5, s.track);\r
    p.box(rect(x, y - 2.5, w * t, 5), 2.5, s.fill);\r
    p.glow(s.fill, s.glow, () => p.dot(v(x + w * t, y), s.knobR, s.knob));\r
  },\r
  on: [Drag1D({ axis: "x", to: (node, f) => node.props.set(f) })],\r
});\r
\r
// ---- Range (dual-thumb min..max slider) --------------------------------------\r
// A horizontal track with two thumbs and a filled span between them. Dragging a\r
// thumb edits min or max (they can't cross); dragging the fill between them\r
// shifts the whole window, width preserved. Values live in a real domain\r
// [lo, hi] with an optional step. Emits \`set(min, max)\` per move — the host\r
// coalesces (undo middleware, param write-coalescing, etc.). While the pointer\r
// is down, value labels ride above the thumbs. All the value math is in\r
// range-math.ts (pure, kernel-tested).\r
export interface RangeProps {\r
  min: number;\r
  max: number;\r
  lo: number;\r
  hi: number;\r
  step?: number;\r
  set(min: number, max: number): Intentish;\r
  width?: number;\r
  /** Label formatting during drag; default trims to the step's precision. */\r
  fmt?(value: number): string;\r
}\r
\r
const PAD = 10;              // track inset — room for thumbs at the extremes\r
const THUMB = 7;             // thumb radius\r
\r
const rangeFmt = (props: RangeProps) => (value: number): string => {\r
  if (props.fmt) return props.fmt(value);\r
  const step = props.step ?? 0;\r
  const decimals = step >= 1 ? 0 : step > 0 ? Math.ceil(-Math.log10(step)) : 2;\r
  return value.toFixed(decimals);\r
};\r
\r
interface RangeDrag {\r
  zone: RangeZone;\r
  startMin: number;\r
  startMax: number;\r
  startX: number;\r
}\r
\r
export const Range = part<RangeProps>()("range", {\r
  size: (props) => v(props.width ?? 170, 34),\r
  style: (t, ch) => ({\r
    track: t.muted,\r
    fill: t.accent,\r
    thumb: t.mix(t.textBright, t.accent, 0.3 * ch.hover),\r
    thumbR: THUMB + 1.5 * ch.hover,\r
    glow: 9 * ch.hover,\r
    label: t.textBright,\r
    tag: calpha(t.bg, 0.75),\r
    drag: ch.press,                  // labels ride the press channel\r
  }),\r
  render(node, p, s) {\r
    const props = node.props;\r
    const r = node.rect;\r
    const d = { lo: props.lo, hi: props.hi, step: props.step };\r
    const x = r.x + PAD, w = r.w - 2 * PAD, y = r.center.y;\r
    const xMin = pxOfValue(props.min, d, x, w);\r
    const xMax = pxOfValue(props.max, d, x, w);\r
    p.box(rect(x, y - 2.5, w, 5), 2.5, s.track);\r
    p.box(rect(xMin, y - 2.5, Math.max(0, xMax - xMin), 5), 2.5, s.fill);\r
    for (const tx of [xMin, xMax])\r
      p.glow(s.fill, s.glow, () => p.dot(v(tx, y), s.thumbR, s.thumb));\r
    if (s.drag > 0.05) {\r
      const fmt = rangeFmt(props);\r
      const labels = [[xMin, fmt(props.min)], [xMax, fmt(props.max)]] as const;\r
      for (const [tx, text] of labels) {\r
        const lw = 8 + text.length * 6.5;\r
        p.box(rect(tx - lw / 2, y - 26, lw, 14), 4, calpha(s.tag, s.drag));\r
        p.label(text, v(tx, y - 19), calpha(s.label, s.drag), { size: 10, weight: 600 });\r
      }\r
    }\r
  },\r
  on: [\r
    Gesture<RangeProps, RangeDrag>({\r
      begin(node, pointer) {\r
        const props = node.props;\r
        const d = { lo: props.lo, hi: props.hi, step: props.step };\r
        const x = node.rect.x + PAD, w = node.rect.w - 2 * PAD;\r
        const f = w > 0 ? (pointer.x - x) / w : 0;\r
        const zone = zoneAt(f, fracOfValue(props.min, d), fracOfValue(props.max, d), THUMB * 1.5 / Math.max(w, 1));\r
        return { zone, startMin: props.min, startMax: props.max, startX: pointer.x };\r
      },\r
      during(st, node, pointer) {\r
        const props = node.props;\r
        const d = { lo: props.lo, hi: props.hi, step: props.step };\r
        const x = node.rect.x + PAD, w = node.rect.w - 2 * PAD;\r
        const next =\r
          st.zone === "min" ? dragMin(valueOfPx(pointer.x, d, x, w), props.max, d)\r
          : st.zone === "max" ? dragMax(props.min, valueOfPx(pointer.x, d, x, w), d)\r
          : shiftWindow(st.startMin, st.startMax,\r
              (pointer.x - st.startX) / Math.max(w, 1) * (d.hi - d.lo), d);\r
        return props.set(next.min, next.max);\r
      },\r
    }),\r
  ],\r
});\r
\r
// ---- Icon button (×) ---------------------------------------------------------\r
export interface IconButtonProps { press: Intentish; }\r
\r
export const CloseButton = part<IconButtonProps>()("close-button", {\r
  size: () => v(20, 20),\r
  style: (t, ch) => ({\r
    fill: calpha(t.danger, 0.12 + 0.5 * ch.hover),\r
    x: t.mix(t.textDim, t.danger, ch.hover),\r
    spin: ch.press,\r
  }),\r
  render(node, p, s) {\r
    const r = node.rect.inset(1), c = r.center, k = 3.6 * (1 - 0.3 * s.spin);\r
    p.box(r, 6, s.fill);\r
    p.line(v(c.x - k, c.y - k), v(c.x + k, c.y + k), s.x, 1.8);\r
    p.line(v(c.x - k, c.y + k), v(c.x + k, c.y - k), s.x, 1.8);\r
  },\r
  on: [Press((node) => node.props.press)],\r
});\r
\r
// ---- Card (a composite: a part MADE OF parts) --------------------------------\r
// \`body\` supplies the chrome — a titled Stack — and drops the use-site children\r
// into a content slot. \`render\` paints the card background UNDER that content\r
// (drawPass renders a part before its children). One definition; every card in\r
// the app is now themable and restylable through this single seam.\r
export interface CardProps { title: string; value?: string; }\r
\r
export const Card = part<CardProps>()("card", {\r
  style: (t, ch) => ({\r
    fill: t.mix(t.surface, t.surfaceHi, 0.35 + 0.4 * ch.hover),\r
    edge: t.mix(t.muted, t.accent, 0.2 + 0.5 * ch.hover),\r
    corner: 10,\r
  }),\r
  render: (node, p, s) => p.box(node.rect, s.corner, s.fill, s.edge, 1),\r
  body: (props, children): Element[] => [\r
    Stack("layout", { pad: 14, gap: 10, align: "stretch" }, [\r
      Row("head", { gap: 8, justify: "between" }, [\r
        Label("title", { text: props.title, weight: 600, size: 12 }),\r
        ...(props.value ? [Label("value", { text: props.value, dim: true, size: 11 })] : []),\r
      ]),\r
      ...children,\r
    ]),\r
  ],\r
});\r
\r
// ---- Labeled (the rung-1 alternative: a plain function, no framework) --------\r
// When you only need a private arrangement, a function suffices — no named part,\r
// no theme seam. Reach for \`Card\` (a part) when you want the arrangement to be\r
// named, themable, and reachable by \`extendTheme("dark", "card", …)\`.\r
// Pass \`press\` to make the caption clickable (toggle rows: clicking the words\r
// should act like clicking the widget) — a one-line use-site extension.\r
export const Labeled = (key: string, text: string, el: Element, press?: Intentish): Element =>\r
  Row(key, { gap: 8, align: "center" }, [\r
    press === undefined\r
      ? Label(\`\${key}/l\`, { text, dim: true, size: 11 })\r
      : withExt(Label(\`\${key}/l\`, { text, dim: true, size: 11 }), addOn(Press(() => press))),\r
    el,\r
  ]);\r
`;export{r as w};
