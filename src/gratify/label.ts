// ============================================================================
// Label — the built-in text part.
// ============================================================================

import { calpha, v } from "./core";
import { part } from "./part";
import { tokens } from "./theme";

export interface LabelProps {
  text: string;
  size?: number;
  weight?: number;
  dim?: boolean;
  bright?: boolean;
  states?: Record<string, boolean>;
}

export const Label = part<LabelProps>("label", {
  size: (props, m) => {
    const s = m.text(props.text, props.size ?? 13);
    return v(s.x + 2, Math.max(s.y, 18));
  },
  render(node, p) {
    const props = node.props;
    const base = props.bright ? tokens.textBright : props.dim ? tokens.textDim : tokens.text;
    // a `done` state dims and fades — the common list-item idiom
    const dim = node.ch.done || 0;
    p.label(props.text, { x: node.rect.x + 1, y: node.rect.center.y },
      calpha(tokens.mix(base, tokens.textDim, dim), 1 - 0.3 * dim),
      { size: props.size ?? 13, weight: props.weight, align: "left" });
  },
});
