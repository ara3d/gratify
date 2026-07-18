const r=`// Shared example widgets — each one is a single part() definition (README §5).\r
// These live in examples/ deliberately: the framework ships primitives, apps\r
// (or a future widget library) ship widgets.\r
\r
import {\r
  addOn, calpha, Drag1D, Element, GNode, Intentish, Label, part, Press, rect, Row, Stack,\r
  surface, v, withExt,\r
} from "gratify";\r
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
