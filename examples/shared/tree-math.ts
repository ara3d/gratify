// Pure arithmetic under the tree view (tree.ts): flattening an expanded tree
// into the rows a virtualized list shows, and the keyboard moves over that
// flat list. No framework imports — kernel-tested on its own.

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  /** A kind tag the row renderer maps to an icon/color ("db", "table", …). */
  kind?: string;
  /** A trailing note: a count, a type, a size. */
  note?: string;
  children?: TreeNode<T>[];
  /** App payload, untouched by the tree. */
  data?: T;
}

/** One visible row of an expanded tree. */
export interface FlatRow<T = unknown> {
  node: TreeNode<T>;
  depth: number;
  /** Has children (shows a chevron). */
  branch: boolean;
  expanded: boolean;
  /** Flat index of the parent row, or -1 for a root. */
  parent: number;
}

/** The rows an expanded tree shows, depth-first, in document order. Only the
 *  children of expanded branches are walked, so a 100k-node schema with a few
 *  tables open costs the rows on screen, not the schema. */
export function flatten<T>(roots: readonly TreeNode<T>[], expanded: ReadonlySet<string>): FlatRow<T>[] {
  const out: FlatRow<T>[] = [];
  const walk = (nodes: readonly TreeNode<T>[], depth: number, parent: number) => {
    for (const node of nodes) {
      const branch = !!node.children?.length;
      const open = branch && expanded.has(node.id);
      const index = out.length;
      out.push({ node, depth, branch, expanded: open, parent });
      if (open) walk(node.children!, depth + 1, index);
    }
  };
  walk(roots, 0, -1);
  return out;
}

/** Toggle one id in an expanded set (a new set; the input is untouched). */
export function toggleExpanded(expanded: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

/** Every branch id under `roots` — "expand all". */
export function allBranchIds<T>(roots: readonly TreeNode<T>[]): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: readonly TreeNode<T>[]) => {
    for (const n of nodes) if (n.children?.length) { out.add(n.id); walk(n.children); }
  };
  walk(roots);
  return out;
}

/** The ids on the path from a root down to `id` (exclusive) — what must be
 *  expanded for `id` to be visible. Empty when `id` is a root or unknown. */
export function ancestorsOf<T>(roots: readonly TreeNode<T>[], id: string): string[] {
  const path: string[] = [];
  const find = (nodes: readonly TreeNode<T>[]): boolean => {
    for (const n of nodes) {
      if (n.id === id) return true;
      if (n.children?.length) {
        path.push(n.id);
        if (find(n.children)) return true;
        path.pop();
      }
    }
    return false;
  };
  return find(roots) ? path : [];
}

/** What an arrow key does at a flat row, in the standard tree idiom:
 *  Right opens a closed branch or steps into an open one; Left closes an open
 *  branch or steps to the parent. Returns the move, or null for no-op. */
export type TreeMove = { kind: "toggle"; id: string } | { kind: "cursor"; index: number };

export function arrowRight<T>(rows: readonly FlatRow<T>[], index: number): TreeMove | null {
  const row = rows[index];
  if (!row?.branch) return null;
  if (!row.expanded) return { kind: "toggle", id: row.node.id };
  return index + 1 < rows.length ? { kind: "cursor", index: index + 1 } : null;
}

export function arrowLeft<T>(rows: readonly FlatRow<T>[], index: number): TreeMove | null {
  const row = rows[index];
  if (!row) return null;
  if (row.branch && row.expanded) return { kind: "toggle", id: row.node.id };
  return row.parent >= 0 ? { kind: "cursor", index: row.parent } : null;
}
