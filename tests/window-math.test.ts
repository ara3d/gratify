// Window math — edge zones, anchored resizing, snapping, dock slots, and the
// WindowSet reducer. Pure functions, no runtime.

import { describe, expect, it } from "vitest";
import {
  activeWindowId, cascadeFrame, clampFrame, closeWindow, dockSlot, edgeAt, emptyWindowSet,
  openWindow, placeWindow, raiseWindow, rect, reduceWindows, resizeFrame, snapToBounds, v,
  type WindowFrame, type WindowRec, type WindowSet,
} from "../src/gratify";

const frame = (x: number, y: number, w: number, h: number): WindowFrame => ({ pos: v(x, y), size: v(w, h) });
const rec = (id: string, mode: WindowRec["mode"] = "normal"): WindowRec => ({ id, frame: frame(10, 10, 200, 100), mode });

describe("edgeAt", () => {
  const r = rect(100, 100, 200, 100);
  it("finds edges, corners, interior, and far-outside", () => {
    expect(edgeAt(r, v(200, 101), 6)).toBe("n");
    expect(edgeAt(r, v(200, 199), 6)).toBe("s");
    expect(edgeAt(r, v(299, 150), 6)).toBe("e");
    expect(edgeAt(r, v(101, 150), 6)).toBe("w");
    expect(edgeAt(r, v(298, 198), 6)).toBe("se");
    expect(edgeAt(r, v(102, 102), 6)).toBe("nw");
    expect(edgeAt(r, v(200, 150), 6)).toBeNull();
    expect(edgeAt(r, v(200, 90), 6)).toBeNull();
  });
  it("accepts points just outside the rect within the grab band", () => {
    expect(edgeAt(r, v(304, 150), 6)).toBe("e");
    expect(edgeAt(r, v(96, 96), 6)).toBe("nw");
  });
});

describe("resizeFrame", () => {
  const f = frame(100, 100, 200, 100);
  const min = v(80, 40);
  it("east/south grow away from a fixed origin", () => {
    expect(resizeFrame(f, "se", v(30, 20), min)).toEqual(frame(100, 100, 230, 120));
  });
  it("west/north move the origin and keep the far edge", () => {
    const r = resizeFrame(f, "nw", v(30, 20), min);
    expect(r).toEqual(frame(130, 120, 170, 80));
    expect(r.pos.x + r.size.x).toBe(300);
    expect(r.pos.y + r.size.y).toBe(200);
  });
  it("clamps to the minimum size, keeping the far edge for west/north", () => {
    expect(resizeFrame(f, "e", v(-500, 0), min).size.x).toBe(80);
    const r = resizeFrame(f, "w", v(500, 0), min);
    expect(r.size.x).toBe(80);
    expect(r.pos.x).toBe(220);
  });
});

describe("snapToBounds + clampFrame", () => {
  const bounds = rect(0, 0, 800, 600);
  it("snaps sides within the threshold and leaves others alone", () => {
    expect(snapToBounds(frame(7, 300, 200, 100), bounds, 12).pos).toEqual(v(0, 300));
    expect(snapToBounds(frame(595, 495, 200, 100), bounds, 12).pos).toEqual(v(600, 500));
    expect(snapToBounds(frame(50, 50, 200, 100), bounds, 12).pos).toEqual(v(50, 50));
  });
  it("keeps a sliver of the window reachable", () => {
    expect(clampFrame(frame(-500, -50, 200, 100), bounds, 40).pos).toEqual(v(-160, 0));
    expect(clampFrame(frame(900, 900, 200, 100), bounds, 40).pos).toEqual(v(760, 560));
  });
});

describe("placement", () => {
  const bounds = rect(0, 0, 800, 600);
  it("cascades and wraps", () => {
    expect(cascadeFrame(0, v(200, 100), v(40, 40)).pos).toEqual(v(40, 40));
    expect(cascadeFrame(2, v(200, 100), v(40, 40)).pos).toEqual(v(96, 96));
    expect(cascadeFrame(8, v(200, 100), v(40, 40)).pos).toEqual(v(40, 40));
  });
  it("dock slots run left to right along the bottom", () => {
    expect(dockSlot(bounds, 0, v(160, 32), 8)).toEqual(rect(0, 568, 160, 32));
    expect(dockSlot(bounds, 2, v(160, 32), 8)).toEqual(rect(336, 568, 160, 32));
  });
  it("places by mode", () => {
    expect(placeWindow(rec("a"), bounds, 0, v(160, 32))).toEqual(rect(10, 10, 200, 100));
    expect(placeWindow(rec("a", "maximized"), bounds, 0, v(160, 32))).toEqual(bounds);
    expect(placeWindow(rec("a", "minimized"), bounds, 1, v(160, 32))).toEqual(rect(168, 568, 160, 32));
  });
});

describe("WindowSet", () => {
  const three = (): WindowSet => ["a", "b", "c"].reduce((s, id) => openWindow(s, rec(id)), emptyWindowSet);

  it("open appends and raises; re-open of an existing id only raises", () => {
    const s = three();
    expect(s.order).toEqual(["a", "b", "c"]);
    expect(openWindow(s, rec("a")).order).toEqual(["b", "c", "a"]);
  });
  it("raise moves to the top and is identity when already there", () => {
    const s = three();
    expect(raiseWindow(s, "a").order).toEqual(["b", "c", "a"]);
    expect(raiseWindow(s, "c")).toBe(s);
    expect(raiseWindow(s, "zzz")).toBe(s);
  });
  it("close removes from both order and byId", () => {
    const s = closeWindow(three(), "b");
    expect(s.order).toEqual(["a", "c"]);
    expect(s.byId.b).toBeUndefined();
  });
  it("active is the topmost non-minimized window", () => {
    let s = three();
    expect(activeWindowId(s)).toBe("c");
    s = reduceWindows(s, { kind: "minimize", id: "c" });
    expect(activeWindowId(s)).toBe("b");
    expect(activeWindowId(emptyWindowSet)).toBeUndefined();
  });
  it("reduceWindows: restore and frame changes raise; toggle-max flips", () => {
    let s = reduceWindows(three(), { kind: "minimize", id: "a" });
    expect(s.byId.a.mode).toBe("minimized");
    s = reduceWindows(s, { kind: "restore", id: "a" });
    expect(s.byId.a.mode).toBe("normal");
    expect(s.order).toEqual(["b", "c", "a"]);
    s = reduceWindows(s, { kind: "toggle-max", id: "b" });
    expect(s.byId.b.mode).toBe("maximized");
    expect(s.order).toEqual(["c", "a", "b"]);
    s = reduceWindows(s, { kind: "toggle-max", id: "b" });
    expect(s.byId.b.mode).toBe("normal");
    s = reduceWindows(s, { kind: "frame", id: "c", frame: frame(1, 2, 300, 200) });
    expect(s.byId.c.frame).toEqual(frame(1, 2, 300, 200));
    expect(s.order[s.order.length - 1]).toBe("c");
    expect(reduceWindows(s, { kind: "focus", id: "nope" })).toBe(s);
  });
});
