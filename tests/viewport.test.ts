// Viewport-tier kernel tests: clipping (paint mask + hit mask), text fitting,
// wheel routing, pinned placement, and the virtualized list — the primitives a
// scrolling data view is built from. All headless via step().

import { describe, expect, it } from "vitest";
import {
  fitText, NullPainter, part, Rect, Runtime, Stack, v,
} from "../src/gratify";

// ---- text fitting -----------------------------------------------------------
describe("fitText", () => {
  const m = new NullPainter().measure;   // 0.55 * size px per character
  it("returns the text unchanged when it fits", () => {
    expect(fitText(m, "hello", 100, 13)).toBe("hello");
  });
  it("cuts to the longest prefix that fits with an ellipsis", () => {
    const out = fitText(m, "a fairly long column value", 60, 13);
    expect(out.endsWith("…")).toBe(true);
    expect(m.text(out, 13).x).toBeLessThanOrEqual(60);
    expect(fitText(m, "a fairly long column value", 61, 13).length).toBeGreaterThanOrEqual(out.length);
  });
  it("returns nothing when not even the ellipsis fits", () => {
    expect(fitText(m, "abc", 2, 13)).toBe("");
  });
});

// ---- clip: the paint mask and the hit mask ------------------------------------
describe("clip facet", () => {
  type D = { hits: number };
  type I = { kind: "hit" };
  const Tall = part("clip-tall").props<Record<string, never>>()
    .size(() => v(100, 200)).render(() => {}).press(() => ({ kind: "hit" }));
  const Window = part("clip-window").props<Record<string, never>>()
    .measure(() => v(100, 50))
    .arrange((_p, r, kids) => kids.map((k) => new Rect(r.x, r.y, k.size.x, k.size.y)))
    .render(() => {})
    .clip();
  const mk = () => new Runtime<D, I>(null, {
    init: { hits: 0 },
    update: (d) => ({ hits: d.hits + 1 }),
    view: () => Stack("root", { gap: 0, pad: 0 }, [Window("w", {}, [Tall("t", {})])]),
  }, { headless: true, width: 300, height: 300 });

  it("hides the masked region from hit-testing, and keeps the visible region live", () => {
    const rt = mk();
    rt.step(2);
    rt.pointerDown({ x: 50, y: 150 }); rt.pointerUp({ x: 50, y: 150 });   // inside the child, outside the window
    expect(rt.doc.hits).toBe(0);
    rt.pointerDown({ x: 50, y: 25 }); rt.pointerUp({ x: 50, y: 25 });     // inside both
    expect(rt.doc.hits).toBe(1);
  });

  it("asks the painter to clip to the part's rect before its subtree paints", () => {
    const rt = mk();
    const clips: Rect[] = [];
    rt.painter = new (class extends NullPainter { clip(r: Rect) { clips.push(r); } })();
    rt.step(2);
    expect(clips.length).toBeGreaterThan(0);
    expect(clips[clips.length - 1].w).toBe(100);
    expect(clips[clips.length - 1].h).toBe(50);
  });
});
