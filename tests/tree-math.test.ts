// Kernel-level tests for the pure tree arithmetic (examples/shared/tree-math.ts).

import { describe, expect, it } from "vitest";
import {
  allBranchIds, ancestorsOf, arrowLeft, arrowRight, flatten, toggleExpanded, type TreeNode,
} from "../examples/shared/tree-math";

const T: TreeNode[] = [
  { id: "db", label: "shop", children: [
    { id: "t1", label: "orders", children: [{ id: "c1", label: "id" }, { id: "c2", label: "total" }] },
    { id: "t2", label: "customers", children: [{ id: "c3", label: "id" }] },
    { id: "v1", label: "a view" },
  ] },
  { id: "db2", label: "empty", children: [] },
];

describe("tree-math: flatten", () => {
  it("shows only roots when nothing is expanded; a childless branch is a leaf", () => {
    const rows = flatten(T, new Set());
    expect(rows.map((r) => r.node.id)).toEqual(["db", "db2"]);
    expect(rows[0].branch).toBe(true);
    expect(rows[1].branch).toBe(false);
  });
  it("walks only expanded branches, with depth and parent indices", () => {
    const rows = flatten(T, new Set(["db", "t2"]));
    expect(rows.map((r) => r.node.id)).toEqual(["db", "t1", "t2", "c3", "v1", "db2"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1, 2, 1, 0]);
    expect(rows[3].parent).toBe(2);
    expect(rows[1].expanded).toBe(false);
  });
  it("an expanded id whose parent is closed stays hidden", () => {
    expect(flatten(T, new Set(["t1"])).length).toBe(2);
  });
});

describe("tree-math: expansion", () => {
  it("toggleExpanded returns a new set", () => {
    const a = new Set(["x"]);
    const b = toggleExpanded(a, "x");
    expect(b.has("x")).toBe(false);
    expect(a.has("x")).toBe(true);
    expect(toggleExpanded(b, "y").has("y")).toBe(true);
  });
  it("allBranchIds lists every node with children; ancestorsOf gives the path to open", () => {
    expect([...allBranchIds(T)].sort()).toEqual(["db", "t1", "t2"]);
    expect(ancestorsOf(T, "c2")).toEqual(["db", "t1"]);
    expect(ancestorsOf(T, "db")).toEqual([]);
    expect(ancestorsOf(T, "nope")).toEqual([]);
  });
});

describe("tree-math: arrow keys", () => {
  const rows = flatten(T, new Set(["db"]));   // db, t1, t2, v1, db2
  it("Right opens a closed branch, steps into an open one, does nothing on a leaf", () => {
    expect(arrowRight(rows, 1)).toEqual({ kind: "toggle", id: "t1" });
    expect(arrowRight(rows, 0)).toEqual({ kind: "cursor", index: 1 });
    expect(arrowRight(rows, 3)).toBeNull();
  });
  it("Left closes an open branch, else steps to the parent, and stops at a root", () => {
    expect(arrowLeft(rows, 0)).toEqual({ kind: "toggle", id: "db" });
    expect(arrowLeft(rows, 3)).toEqual({ kind: "cursor", index: 0 });
    expect(arrowLeft(rows, 4)).toBeNull();
  });
});
