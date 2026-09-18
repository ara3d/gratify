// Kernel-level tests for the pure layered layout (examples/shared/graph-layout.ts).

import { describe, expect, it } from "vitest";
import { boundsOf, layeredLayout, layerOf } from "../examples/shared/graph-layout";

const N = (id: string, w = 100, h = 50) => ({ id, w, h });

describe("graph-layout: layering", () => {
  it("assigns the longest path from a source; sources and isolated nodes are column 0", () => {
    const layer = layerOf([N("a"), N("b"), N("c"), N("d"), N("x")], [
      { from: "a", to: "b" }, { from: "b", to: "c" }, { from: "a", to: "c" }, { from: "c", to: "d" },
    ]);
    expect([...layer.entries()].sort()).toEqual([["a", 0], ["b", 1], ["c", 2], ["d", 3], ["x", 0]]);
  });
  it("survives cycles and unknown endpoints", () => {
    const layer = layerOf([N("a"), N("b")], [{ from: "a", to: "b" }, { from: "b", to: "a" }, { from: "a", to: "zzz" }]);
    expect(layer.size).toBe(2);
  });
});

describe("graph-layout: placement", () => {
  it("places columns left to right by layer, nodes top to bottom with gaps", () => {
    const pos = layeredLayout([N("a", 120, 40), N("b", 80, 60), N("c", 100, 50)], [
      { from: "a", to: "b" }, { from: "a", to: "c" },
    ], { gapX: 20, gapY: 10, origin: { x: 5, y: 7 } });
    expect(pos.get("a")).toEqual({ x: 5, y: 7 });
    expect(pos.get("b")).toEqual({ x: 5 + 120 + 20, y: 7 });
    expect(pos.get("c")).toEqual({ x: 145, y: 7 + 60 + 10 });
  });
  it("orders a column by its predecessors' rows (barycenter), so wires do not cross needlessly", () => {
    const pos = layeredLayout([N("p"), N("q"), N("qq"), N("pp")], [
      { from: "p", to: "pp" }, { from: "q", to: "qq" },
    ], { gapY: 0 });
    expect(pos.get("pp")!.y).toBeLessThan(pos.get("qq")!.y);   // pp follows p (row 0), qq follows q (row 1)
  });
  it("boundsOf is the union of placed rects, or null with nothing placed", () => {
    const pos = new Map([["a", { x: 10, y: 10 }], ["b", { x: 200, y: 50 }]]);
    expect(boundsOf([N("a"), N("b")], (id) => pos.get(id))).toEqual({ x: 10, y: 10, w: 290, h: 90 });
    expect(boundsOf([N("a")], () => undefined)).toBeNull();
  });
});
