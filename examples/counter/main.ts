// Example: counter — proves README "Hello, Gratify" runs as written.
// You should see: a label and a button. The button brightens + lifts on hover,
// sinks on press; the count updates instantly; nobody wrote animation code.

import { mount, part, Press, Stack, Label, v, Tokens, Channels, Color } from "gratify";

// ── 1. State: any plain data, yours entirely. ──────────────────────────────
interface Doc { count: number; }
type Intent = { kind: "increment" };

function update(doc: Doc, intent: Intent): Doc {
  if (intent.kind === "increment") return { count: doc.count + 1 };
  return doc;
}

// ── 2. A part: style + behavior + rendering, in one place. ─────────────────
interface ButtonProps { label: string; press: Intent; }

interface ButtonStyle { fill: Color; corner: number; lift: number; text: Color; }

const Button = part<ButtonProps, ButtonStyle>("button", {
  size(props, measure) {
    return v(measure.text(props.label).x + 28, 34);
  },
  style(tokens: Tokens, channels: Channels): ButtonStyle {
    const emphasis = 0.2 + 0.3 * channels.hover + 0.4 * channels.press;
    return {
      fill: tokens.mix(tokens.surface, tokens.accent, emphasis),
      corner: 8,
      lift: 2 * channels.hover - 2 * channels.press,
      text: tokens.text,
    };
  },
  render(instance, painter, style) {
    const raised = instance.rect.raise(style.lift);
    painter.box(raised, style.corner, style.fill);
    painter.label(instance.props.label, raised.center, style.text, { weight: 500 });
  },
  on: [Press((instance) => instance.props.press)],
});

// ── 3. The view: a pure function from Doc to an Element tree. ──────────────
function view(doc: Doc) {
  return Stack("root", { gap: 12, pad: 48 }, [
    Label("msg", { text: `Clicked ${doc.count} times`, size: 15 }),
    Button("btn", { label: "Click me", press: { kind: "increment" } }),
  ]);
}

// ── 4. Mount. ───────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, { init: { count: 0 }, update, view });
