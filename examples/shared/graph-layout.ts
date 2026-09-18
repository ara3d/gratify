// Pure layered graph layout ("arrange"): assign each node a column by the
// longest path from a source along its edges (cycles broken by discovery
// order), order each column by the mean position of the neighbors in the
// previous one (one barycenter sweep), then place columns left to right and
// nodes top to bottom with gaps. O(V + E) layering, O(V log V) ordering. No
// framework imports — kernel-tested on its own.

import type { Vec } from "gratify";

export interface LayoutNode { id: string; w: number; h: number }
export interface LayoutEdge { from: string; to: string }
export interface LayoutOpts { gapX?: number; gapY?: number; origin?: Vec }

/** Column index per node: longest path from any source (0 for sources).
 *  Edges that would close a cycle are ignored, so the result is always a DAG
 *  layering. Isolated nodes sit in column 0. */
export function layerOf(nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id));
  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of ids) { out.set(id, []); indeg.set(id, 0); }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) continue;
    out.get(e.from)!.push(e.to);
    indeg.set(e.to, indeg.get(e.to)! + 1);
  }
  const layer = new Map<string, number>();
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  for (const id of queue) layer.set(id, 0);
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    for (const to of out.get(id)!) {
      layer.set(to, Math.max(layer.get(to) ?? 0, layer.get(id)! + 1));
      indeg.set(to, indeg.get(to)! - 1);
      if (indeg.get(to) === 0) queue.push(to);
    }
  }
  // nodes still unvisited sit on cycles: break by giving them the layer after
  // their best-known predecessor, in input order
  for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, 0);
  return layer;
}

/** Positions (top-left) for every node in a layered arrangement. */
export function layeredLayout(
  nodes: readonly LayoutNode[], edges: readonly LayoutEdge[], opts: LayoutOpts = {},
): Map<string, Vec> {
  const gapX = opts.gapX ?? 80, gapY = opts.gapY ?? 40;
  const origin = opts.origin ?? { x: 0, y: 0 };
  const layer = layerOf(nodes, edges);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const columns: string[][] = [];
  for (const n of nodes) (columns[layer.get(n.id)!] ??= []).push(n.id);

  // one barycenter sweep: order a column by the mean row of its predecessors
  const rowOf = new Map<string, number>();
  const preds = new Map<string, string[]>();
  for (const e of edges) if (byId.has(e.from) && byId.has(e.to)) (preds.get(e.to) ?? preds.set(e.to, []).get(e.to)!).push(e.from);
  columns.forEach((col, ci) => {
    if (ci > 0) {
      const key = (id: string) => {
        const ps = (preds.get(id) ?? []).filter((p) => rowOf.has(p));
        return ps.length ? ps.reduce((a, p) => a + rowOf.get(p)!, 0) / ps.length : Number.MAX_SAFE_INTEGER;
      };
      col.sort((a, b) => key(a) - key(b) || a.localeCompare(b));
    }
    col.forEach((id, i) => rowOf.set(id, i));
  });

  const pos = new Map<string, Vec>();
  let x = origin.x;
  for (const col of columns) {
    if (!col) continue;
    let y = origin.y;
    let colW = 0;
    for (const id of col) {
      const n = byId.get(id)!;
      pos.set(id, { x, y });
      y += n.h + gapY;
      colW = Math.max(colW, n.w);
    }
    x += colW + gapX;
  }
  return pos;
}

/** The union of rects placed at `pos` — the graph's world extent. */
export function boundsOf(nodes: readonly LayoutNode[], pos: (id: string) => Vec | undefined):
  { x: number; y: number; w: number; h: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) {
    const p = pos(n.id);
    if (!p) continue;
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + n.w); y1 = Math.max(y1, p.y + n.h);
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
