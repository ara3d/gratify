// Kernel-level tests for the pure data-grid arithmetic (examples/shared/grid-math.ts).

import { describe, expect, it } from "vitest";
import {
  clickSelect, columnAt, columnSpans, EMPTY_SELECTION, nearColumnEdge, nextSort, selectAll,
  sortedOrder,
} from "../examples/shared/grid-math";

const keyAt = (i: number) => `k${i}`;

describe("grid-math: columns", () => {
  it("places columns end to end and finds the one under x", () => {
    const spans = columnSpans([100, 50, 80], 10);
    expect(spans).toEqual([{ x: 10, w: 100 }, { x: 110, w: 50 }, { x: 160, w: 80 }]);
    expect(columnAt(spans, 10)).toBe(0);
    expect(columnAt(spans, 159)).toBe(1);
    expect(columnAt(spans, 240)).toBe(-1);
    expect(nearColumnEdge(spans[1], 158)).toBe(true);
    expect(nearColumnEdge(spans[1], 150)).toBe(false);
  });
});

describe("grid-math: selection", () => {
  const plain = { shift: false, ctrl: false };
  it("plain click selects only that row and sets the anchor", () => {
    const s = clickSelect(EMPTY_SELECTION, 3, keyAt, plain);
    expect([...s.keys]).toEqual(["k3"]);
    expect(s.anchor).toBe(3);
    expect([...clickSelect(s, 5, keyAt, plain).keys]).toEqual(["k5"]);
  });
  it("ctrl-click toggles without touching the rest", () => {
    let s = clickSelect(EMPTY_SELECTION, 1, keyAt, plain);
    s = clickSelect(s, 4, keyAt, { shift: false, ctrl: true });
    expect([...s.keys].sort()).toEqual(["k1", "k4"]);
    s = clickSelect(s, 1, keyAt, { shift: false, ctrl: true });
    expect([...s.keys]).toEqual(["k4"]);
    expect(s.anchor).toBe(1);
  });
  it("shift-click selects the range from the anchor, in either direction; ctrl+shift adds it", () => {
    let s = clickSelect(EMPTY_SELECTION, 5, keyAt, plain);
    s = clickSelect(s, 2, keyAt, { shift: true, ctrl: false });
    expect([...s.keys].sort()).toEqual(["k2", "k3", "k4", "k5"]);
    expect(s.anchor).toBe(5);                                   // anchor is kept
    s = clickSelect(s, 9, keyAt, { shift: true, ctrl: true });
    expect(s.keys.size).toBe(8);                                // 2..5 ∪ 5..9 = 2..9
  });
  it("shift-click with no anchor behaves like a plain click", () => {
    expect([...clickSelect(EMPTY_SELECTION, 2, keyAt, { shift: true, ctrl: false }).keys]).toEqual(["k2"]);
  });
  it("selectAll covers [0, count)", () => {
    expect(selectAll(3, keyAt).keys.size).toBe(3);
  });
});

describe("grid-math: sorting", () => {
  it("header clicks cycle asc → desc → none, and a new column starts asc", () => {
    expect(nextSort(null, "a")).toEqual({ key: "a", dir: "asc" });
    expect(nextSort({ key: "a", dir: "asc" }, "a")).toEqual({ key: "a", dir: "desc" });
    expect(nextSort({ key: "a", dir: "desc" }, "a")).toBeNull();
    expect(nextSort({ key: "a", dir: "desc" }, "b")).toEqual({ key: "b", dir: "asc" });
  });
  it("sortedOrder is stable, puts numbers before strings and nulls last, and flips for desc", () => {
    const vals = [3, "b", null, 1, "a", 1];
    expect(sortedOrder(vals.length, (i) => vals[i])).toEqual([3, 5, 0, 4, 1, 2]);
    expect(sortedOrder(vals.length, (i) => vals[i], "desc")).toEqual([2, 1, 4, 0, 3, 5]);
    expect(sortedOrder(3, null)).toEqual([0, 1, 2]);
  });
});
