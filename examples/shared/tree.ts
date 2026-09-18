// TreeView — a virtualized tree (a schema explorer): chevrons that spring
// open, kind icons, notes, a selection the keyboard drives with the standard
// arrow idiom (Right opens / steps in, Left closes / steps out). It renders the
// FLAT rows the app derives with `flatten` (tree-math.ts) — the app owns which
// branches are open, so the tree part is a pure function of props and every
// interaction leaves as an intent.
//
//   TreeView ─ TreeFrame (focusable, clipped) ─ Virtual ─ TreeRow × visible

import { calpha, Color, Element, fitText, Focusable, hsl, Intentish, part, rect, v, Virtual } from "gratify";
import { arrowLeft, arrowRight, FlatRow, TreeMove } from "./tree-math";

export interface TreeProps<T = unknown> {
  /** The visible rows, from `flatten(roots, expanded)`. */
  rows: FlatRow<T>[];
  /** The selected node id (also the keyboard cursor), or null. */
  selected: string | null;
  rowHeight?: number;
  width?: number;
  height?: number;
  // ── intents ──
  toggle(id: string): Intentish;
  select(id: string): Intentish;
  /** Move the cursor by `by` rows (relative; the app clamps). */
  moveCursor(by: number): Intentish;
  /** Enter on a leaf. */
  activate?(id: string): Intentish;
  states?: Record<string, boolean>;
}

const INDENT = 16;
const PAD = 10;
const CHEVRON_ZONE = 18;
const finiteOr = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

/** A hue per node kind, so a schema reads at a glance. Unknown kinds are grey. */
const KIND_HUE: Record<string, number> = { db: 200, schema: 260, table: 150, view: 40, column: 0, key: 45, index: 300 };
const kindColor = (kind: string | undefined, dim: Color): Color =>
  kind && kind in KIND_HUE ? hsl(KIND_HUE[kind], 0.6, 0.6) : dim;

// ── One row ───────────────────────────────────────────────────────────────────
interface RowProps {
  id: string;
  label: string;
  kind?: string;
  note?: string;
  depth: number;
  branch: boolean;
  expanded: boolean;
  toggle(id: string): Intentish;
  select(id: string): Intentish;
  states?: Record<string, boolean>;
}

const TreeRow = part("tree-row")
  .props<RowProps>()
  .size(() => v(0, 0))
  .channels({ open: { target: (n) => (n.props.expanded ? 1 : 0), spring: { stiffness: 320, damping: 22 } } })
  .style((t, ch, p) => {
    const sel = Math.min(1, ch.sel || 0);
    return {
      fill: t.mix(calpha(t.accent, 0), calpha(t.accent, 0.22), Math.max(sel, 0.4 * ch.hover)),
      text: t.mix(p.branch ? t.text : t.textDim, t.textBright, Math.max(sel, ch.hover)),
      note: t.textDim,
      chevron: t.mix(t.textDim, t.textBright, ch.hover),
      icon: kindColor(p.kind, t.muted),
      turn: ch.open,
    };
  })
  .render((n, p, s) => {
    const r = n.rect, props = n.props;
    const x0 = r.x + PAD + props.depth * INDENT;
    p.box(r, 4, s.fill);
    if (props.branch) {
      // a chevron turning from ▸ to ▾ as `open` springs 0→1
      const c = v(x0 + 6, r.center.y), a = (Math.PI / 2) * s.turn, k = 3.5;
      const rot = (dx: number, dy: number) => v(c.x + dx * Math.cos(a) - dy * Math.sin(a), c.y + dx * Math.sin(a) + dy * Math.cos(a));
      p.line(rot(-k * 0.5, -k), rot(k * 0.5, 0), s.chevron, 1.6);
      p.line(rot(k * 0.5, 0), rot(-k * 0.5, k), s.chevron, 1.6);
    }
    const ix = x0 + CHEVRON_ZONE;
    p.box(rect(ix, r.center.y - 6, 12, 12), 3, calpha(s.icon, 0.85));
    p.label((props.kind ?? "?")[0].toUpperCase(), v(ix + 6, r.center.y + 0.5), calpha(s.note, 0), { size: 8 });
    const noteW = props.note ? p.measure.text(props.note, 11).x : 0;
    const lx = ix + 18;
    p.label(fitText(p.measure, props.label, r.right - PAD - noteW - 8 - lx, 12), v(lx, r.center.y), s.text, { size: 12, align: "left" });
    if (props.note) p.label(props.note, v(r.right - PAD, r.center.y), s.note, { size: 11, align: "right", mono: true });
  })
  // clicking the chevron zone toggles; anywhere else selects
  .press((n) =>
    n.props.branch && n.pointer && n.pointer.x < n.rect.x + PAD + n.props.depth * INDENT + CHEVRON_ZONE
      ? n.props.toggle(n.props.id)
      : n.props.select(n.props.id))
  .semantics((n) => ({ role: "treeitem", label: n.props.label, value: n.props.expanded }));

// ── The frame: focusable, clipped, keyboard idiom ─────────────────────────────
interface FrameProps extends Pick<TreeProps, "toggle" | "moveCursor" | "activate" | "select"> {
  width: number;
  height: number;
  rows: FlatRow[];
  cursor: number;   // flat index or -1
}

const moveOf = (n: { props: FrameProps }, move: TreeMove | null): Intentish =>
  move === null ? undefined
  : move.kind === "toggle" ? n.props.toggle(move.id)
  : n.props.moveCursor(move.index - n.props.cursor);

const TreeFrame = part("tree-frame")
  .props<FrameProps>()
  .measure((p, avail) => v(finiteOr(avail.x, p.width), finiteOr(avail.y, p.height)))
  .arrange((_p, r, kids) => kids.map(() => r))
  .clip()
  .style((t, ch) => ({ fill: t.surface, edge: t.mix(t.muted, t.accent, 0.7 * ch.focus) }))
  .render((n, p, s) => p.box(n.rect, 6, s.fill, s.edge, 1))
  .on(Focusable())
  .keys({
    ArrowDown: (n) => n.props.moveCursor(1),
    ArrowUp: (n) => n.props.moveCursor(-1),
    Home: (n) => n.props.moveCursor(-n.props.rows.length),
    End: (n) => n.props.moveCursor(n.props.rows.length),
    ArrowRight: (n) => moveOf(n, arrowRight(n.props.rows, n.props.cursor)),
    ArrowLeft: (n) => moveOf(n, arrowLeft(n.props.rows, n.props.cursor)),
    Enter: (n) => {
      const row = n.props.rows[n.props.cursor];
      return !row ? undefined : row.branch ? n.props.toggle(row.node.id) : n.props.activate?.(row.node.id);
    },
  })
  .semantics((n) => ({ role: "tree", value: n.props.rows.length }));

// ── The tree ──────────────────────────────────────────────────────────────────
const Tree = part("tree-view")
  .props<TreeProps<any>>()
  .defaults({ rowHeight: 24, width: 260, height: 320 })
  .body((p, _kids, _l, size) => {
    const cursor = p.selected === null ? -1 : p.rows.findIndex((r) => r.node.id === p.selected);
    const row = (i: number): Element => {
      const r = p.rows[i];
      return TreeRow(r.node.id, {
        id: r.node.id, label: r.node.label, kind: r.node.kind, note: r.node.note,
        depth: r.depth, branch: r.branch, expanded: r.expanded,
        toggle: p.toggle, select: p.select,
        states: { sel: p.selected === r.node.id },
      });
    };
    return [TreeFrame("frame", {
      width: size.x || p.width, height: size.y || p.height,
      rows: p.rows, cursor, toggle: p.toggle, select: p.select, moveCursor: p.moveCursor, activate: p.activate,
    }, [
      Virtual("rows", { count: p.rows.length, rowHeight: p.rowHeight, row, reveal: cursor >= 0 ? cursor : undefined }),
    ])];
  });

/** A typed constructor over the untyped part: `TreeView<Payload>("tree", props)`. */
export const TreeView = <T>(key: string, props: TreeProps<T>): Element => Tree(key, props as TreeProps<any>);
