// ============================================================================
// Gratify update middleware — app-wide policies as wrappers around AppSpec
// (README: "undo/redo as a three-line middleware"). The framework never
// stores history itself; withUndo turns any app into an undoable one.
// ============================================================================

import type { AppSpec } from "./runtime";
import type { Element } from "./scene";

export interface UndoState<TDoc> {
  past: TDoc[];
  present: TDoc;
  future: TDoc[];
}

export type UndoIntent = { kind: "undo" } | { kind: "redo" };

const isUndo = (i: unknown): i is UndoIntent => {
  const k = (i as { kind?: string })?.kind;
  return k === "undo" || k === "redo";
};

/** Wrap an app so every intent snapshots history; `{kind:"undo"|"redo"}`
 *  travel it. Requires a pure (non-mutating) update. */
export function withUndo<TDoc, TIntent extends { kind: string }>(
  app: AppSpec<TDoc, TIntent>,
  limit = 200,
): AppSpec<UndoState<TDoc>, TIntent | UndoIntent> {
  return {
    init: { past: [], present: app.init, future: [] },
    update(s, intent): UndoState<TDoc> {
      if (isUndo(intent)) {
        if (intent.kind === "undo" && s.past.length)
          return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] };
        if (intent.kind === "redo" && s.future.length)
          return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
        return s;
      }
      const next = app.update(s.present, intent as TIntent);
      if (next === s.present) return s;
      return { past: [...s.past, s.present].slice(-limit), present: next, future: [] };
    },
    view: (s): Element => app.view(s.present),
  };
}

/** Log every intent (README §3.9-style policy middleware). */
export function withLog<TDoc, TIntent>(
  app: AppSpec<TDoc, TIntent>,
  log: (i: TIntent, doc: TDoc) => void = (i) => console.log("[intent]", i),
): AppSpec<TDoc, TIntent> {
  return {
    ...app,
    update(d, i) { const next = app.update(d, i); log(i, next); return next; },
  };
}
