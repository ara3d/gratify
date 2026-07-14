// ============================================================================
// Gratify — public API barrel. Apps and examples import from here only.
//
// Layering of the source tree:
//   core/        value types + animation primitives (no DOM)
//   scene        Element/Instance + keyed reconcile
//   part         the part() facet model
//   interact     interactors (input as values) + Query
//   extend       the wrap/append extension algebra (three scopes)
//   effective    per-instance layering composition cache
//   layout/animate/draw   the three per-frame passes
//   runtime      the two-clock loop + input pipeline
//   painter      the drawing contract (Canvas2D + headless)
//   theme        tokens, themes, theme-scope extensions
//   fx/particles/effects  transient-effect contract / engine / stock library
//   containers/label      built-in parts
//   middleware   app-wide policies (undo, logging)
// ============================================================================

export * from "./core";
export * from "./painter";
export * from "./theme";
export * from "./part";
export * from "./scene";
export * from "./interact";
export * from "./style";
export * from "./containers";
export * from "./label";
export * from "./extend";
export * from "./fx";
export * from "./particles";
export * from "./effects";
export * from "./middleware";
export * from "./runtime";
