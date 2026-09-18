// The parts of the schema graph: a table node with one port per column, the
// foreign-key wire between ports, the rubber wire shown while dragging a new
// key, and the dot-grid surface that hosts marquee, pan, and the editor-wide
// keys. Geometry helpers (`tableSize`, `portId`) are exported so the app's
// pure `update` can hit-test the same rects the parts draw.

import {
  Anchor, burst, calpha, Color, hsl, Intentish, Mods, Pan, part, Press, Rect, rect, rgb, v, Vec, wireDist,
} from "gratify";
import { marquee } from "../shared/marquee";

export interface ColumnDef { name: string; type: string; pk?: boolean }
export interface TableDef { id: string; name: string; hue: number; pos: Vec; columns: ColumnDef[] }
/** A foreign key: `from` is a `/out` port on the referencing column, `to` an
 *  `/in` port on the referenced column. */
export interface FkEdge { id: string; from: string; to: string }

export const NODE_W = 220;
export const HEAD_H = 30;
export const ROW_H = 22;
const PORT_R = 4;
const PORT_GRAB = 11;

export const tableSize = (columnCount: number): Vec => v(NODE_W, HEAD_H + columnCount * ROW_H + 6);
export const tableRect = (t: TableDef): Rect => rect(t.pos.x, t.pos.y, NODE_W, tableSize(t.columns.length).y);
export const portId = (table: string, column: string, side: "in" | "out") => `${table}:${column}/${side}`;
export const tableOfPort = (id: string) => id.slice(0, id.indexOf(":"));
export const sideOfPort = (id: string): "in" | "out" => (id.endsWith("/out") ? "out" : "in");

const rowY = (r: Rect, i: number) => r.y + HEAD_H + 3 + i * ROW_H + ROW_H / 2;

// ── Table node ────────────────────────────────────────────────────────────────
export interface TableProps {
  id: string;
  name: string;
  hue: number;
  pos: Vec;
  columns: ColumnDef[];
  select(id: string, mods: Mods): Intentish;
  drag(id: string, delta: Vec): Intentish;
  connect(from: string, to: string): Intentish;
  states?: Record<string, boolean>;
}

const SPARK = rgb(64, 186, 255);

export const TableNode = part("table-node")
  .props<TableProps>()
  .size((p) => tableSize(p.columns.length))
  .anchors((n) => n.props.columns.flatMap((c, i) => [
    { id: portId(n.props.id, c.name, "in"), pos: v(n.rect.x, rowY(n.rect, i)), meta: { table: n.props.id } },
    { id: portId(n.props.id, c.name, "out"), pos: v(n.rect.right, rowY(n.rect, i)), meta: { table: n.props.id } },
  ]))
  .style((t, ch, p) => {
    const sel = Math.min(1, ch.sel || 0);
    return {
      fill: t.mix(t.surface, t.surfaceHi, 0.35 * ch.hover + 0.5 * ch.drag),
      edge: t.mix(t.muted, t.accent, Math.max(sel, 0.5 * ch.hover)),
      edgeW: 1 + 1.2 * sel,
      glow: 14 * sel,
      head: hsl(p.hue, 0.55, 0.42 + 0.08 * ch.hover),
      title: t.textBright,
      name: t.mix(t.text, t.textBright, ch.hover),
      type: t.textDim,
      key: hsl(45, 0.8, 0.6),
      port: t.mix(t.muted, t.accent, 0.4 + 0.6 * ch.hover),
      rule: calpha(t.muted, 0.35),
      lift: 3 * ch.drag,
    };
  })
  .render((n, p, s) => {
    const r = n.rect.raise(s.lift), props = n.props;
    p.glow(calpha(s.edge, 0.9), s.glow, () => p.box(r, 8, s.fill, s.edge, s.edgeW));
    p.box(rect(r.x, r.y, r.w, HEAD_H), 8, s.head);
    p.box(rect(r.x, r.y + HEAD_H - 8, r.w, 8), 0, s.head);        // square the header's bottom corners
    p.label(props.name, v(r.x + 12, r.y + HEAD_H / 2), s.title, { align: "left", weight: 600, size: 13 });
    p.label(`${props.columns.length} cols`, v(r.right - 10, r.y + HEAD_H / 2), calpha(s.title, 0.7), { align: "right", size: 10 });
    props.columns.forEach((c, i) => {
      const y = rowY(r, i);
      if (i > 0) p.line(v(r.x + 8, y - ROW_H / 2), v(r.right - 8, y - ROW_H / 2), s.rule, 1);
      if (c.pk) p.label("⚿", v(r.x + 16, y), s.key, { size: 11 });
      p.label(c.name, v(r.x + (c.pk ? 28 : 16), y), s.name, { align: "left", size: 12 });
      p.label(c.type, v(r.right - 14, y), s.type, { align: "right", size: 10, mono: true });
      p.dot(v(r.x, y), PORT_R, s.port);
      p.dot(v(r.right, y), PORT_R, s.port);
    });
  })
  // 1. wire drag — begins only on a port of THIS node; the magnetic snap looks
  //    for a port on a different table
  .gesture<{ from: string; cursor: Vec; snap?: Anchor }>({
    begin(n, p, q) {
      const port = q.nearestAnchor(p, PORT_GRAB, (a) => a.key === n.key);
      return port ? { from: port.id, cursor: p } : null;
    },
    move: (s, n, p, q) => ({
      ...s, cursor: p,
      snap: q.nearestAnchor(p, 22, (a) => a.key !== n.key && sideOfPort(a.id) !== sideOfPort(s.from)),
    }),
    view: (s, q) => {
      const a = q.anchor(s.from);
      return a ? [RubberWire("rubber", { a: a.pos, b: s.snap?.pos ?? s.cursor, snapped: !!s.snap })] : [];
    },
    up(s, n) {
      if (!s.snap) return;
      n.spawn?.(burst(s.snap.pos, SPARK));
      return n.props.connect(s.from, s.snap.id);
    },
  })
  // 2. move — relative deltas, so a multi-selection drags together
  .gesture<{ last: Vec; delta: Vec }>({
    begin: (_n, p) => ({ last: p, delta: v(0, 0) }),
    move: (s, _n, p) => ({ last: p, delta: v(p.x - s.last.x, p.y - s.last.y) }),
    during: (s, n) => (s.delta.x || s.delta.y ? n.props.drag(n.props.id, s.delta) : undefined),
  })
  .press((n, mods) => n.props.select(n.props.id, mods))
  .semantics((n) => ({ role: "group", label: n.props.name }));

// ── Foreign-key wire ──────────────────────────────────────────────────────────
export interface WireProps { id: string; from: string; to: string; select(id: string): Intentish; states?: Record<string, boolean> }

export const FkWire = part("fk-wire")
  .props<WireProps>()
  .style((t, ch) => {
    const sel = Math.min(1, ch.sel || 0), hot = Math.min(1, ch.hot || 0);
    return {
      color: t.mix(t.mix(calpha(t.textDim, 0.7), t.accent, hot), rgb(255, 200, 80), sel),
      width: 1.6 + 1.2 * Math.max(sel, hot) + 0.8 * ch.hover,
      shadow: calpha(rgb(0, 0, 0), 0.35),
    };
  })
  .hit((n, p) => {
    const a = n.anchor?.(n.props.from), b = n.anchor?.(n.props.to);
    return !!a && !!b && wireDist(a, b, p) < 8;
  })
  .render((n, p, s) => {
    const a = n.anchor?.(n.props.from), b = n.anchor?.(n.props.to);
    if (!a || !b) return;
    p.wire(a, b, s.shadow, s.width + 2.5);
    p.wire(a, b, s.color, s.width);
    p.dot(b, 3, s.color);
  })
  .on(Press((n) => n.props.select(n.props.id)));

// ── Rubber wire (gesture preview) ─────────────────────────────────────────────
const RubberWire = part("rubber-wire")
  .props<{ a: Vec; b: Vec; snapped: boolean }>()
  .style((t, _ch, p) => ({ color: p.snapped ? rgb(90, 220, 130) : calpha(t.accent, 0.8), w: p.snapped ? 2.6 : 2 }))
  .render((n, p, s) => { p.wire(n.props.a, n.props.b, s.color, s.w); p.dot(n.props.b, 4, s.color); });

// ── Surface ───────────────────────────────────────────────────────────────────
export interface SurfaceProps {
  marquee(r: Rect, mods: Mods): Intentish;
  clear: Intentish;
  keys: Record<string, (mods: Mods) => Intentish>;
}

export const Surface = part("schema-surface")
  .props<SurfaceProps>()
  .fill()
  .hit(() => true)
  .style((t) => ({ dot: calpha(t.muted, 0.35) as Color }))
  .render((n, p, s) => {
    const vw = n.view!, step = 28;
    const x0 = Math.floor(-vw.pan.x / vw.zoom / step) * step, x1 = (vw.w - vw.pan.x) / vw.zoom;
    const y0 = Math.floor(-vw.pan.y / vw.zoom / step) * step, y1 = (vw.h - vw.pan.y) / vw.zoom;
    for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) p.dot(v(x, y), 1, s.dot);
  })
  .on(marquee<SurfaceProps>({ select: (r, mods, host) => host.props.marquee(r, mods) }))
  .on(Pan())
  .press((n) => n.props.clear)
  .keys({
    Delete: (n, m) => n.props.keys.Delete?.(m),
    Backspace: (n, m) => n.props.keys.Delete?.(m),
    Escape: (n) => n.props.clear,
    a: (n, m) => n.props.keys.a?.(m),
    l: (n, m) => n.props.keys.l?.(m),
  });
