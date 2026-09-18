// Desktop + Window parts, headless: placement by mode, chrome layout, and the
// one gesture that moves from the title bar and resizes from an edge. Every
// change flows out as a WindowEvent into reduceWindows on the app's Doc.

import { describe, expect, it } from "vitest";
import {
  activeWindowId, Desktop, emptyWindowSet, Label, openWindow, reduceWindows, Runtime, v, Window,
  WINDOW_PILL, WINDOW_TITLE_H, windowsOf, type Instance, type WindowEvent, type WindowSet,
} from "../src/gratify";

interface Doc { windows: WindowSet }
type Intent = WindowEvent;

const W = 800, H = 600;

const initial = (): WindowSet =>
  openWindow(
    openWindow(
      openWindow(emptyWindowSet, { id: "a", frame: { pos: v(100, 100), size: v(300, 200) }, mode: "normal" }),
      { id: "b", frame: { pos: v(200, 150), size: v(300, 200) }, mode: "maximized" }),
    { id: "c", frame: { pos: v(50, 50), size: v(200, 120) }, mode: "minimized" });

function mountDesktop(windows = initial()) {
  const rt = new Runtime<Doc, Intent>(null, {
    init: { windows },
    update: (d, i) => ({ windows: reduceWindows(d.windows, i) }),
    view: (d) => Desktop("desk", {}, windowsOf(d.windows).map((r) =>
      Window(r.id, { ...r, title: r.id.toUpperCase(), active: r.id === activeWindowId(d.windows), to: (ev) => ev }, [
        Label("body", { text: `content of ${r.id}` }),
      ]))),
  }, { headless: true, width: W, height: H });
  rt.step(2);
  return rt;
}

const win = (rt: Runtime<Doc, Intent>, id: string): Instance => rt.root.children.find((c) => c.key === id)!;
const chrome = (w: Instance) => w.children[0];

describe("Desktop placement", () => {
  it("normal at its frame, maximized over the desktop, minimized in the dock", () => {
    const rt = mountDesktop();
    expect(win(rt, "a").rect).toMatchObject({ x: 100, y: 100, w: 300, h: 200 });
    expect(win(rt, "b").rect).toMatchObject({ x: 0, y: 0, w: W, h: H });
    expect(win(rt, "c").rect).toMatchObject({ x: 0, y: H - WINDOW_PILL.y, w: WINDOW_PILL.x, h: WINDOW_PILL.y });
  });

  it("children follow the set's z-order", () => {
    const rt = mountDesktop();
    expect(rt.root.children.map((c) => c.key)).toEqual(["a", "b", "c"]);
    rt.dispatch({ kind: "focus", id: "a" });
    rt.step(1);
    expect(rt.root.children.map((c) => c.key)).toEqual(["b", "c", "a"]);
  });

  it("the chrome fills the window: a title bar, then content taking the rest", () => {
    const rt = mountDesktop();
    const [title, content] = chrome(win(rt, "a")).children;
    expect(title.rect).toMatchObject({ x: 100, y: 100, w: 300, h: WINDOW_TITLE_H });
    expect(content.rect).toMatchObject({ x: 100, y: 100 + WINDOW_TITLE_H, w: 300, h: 200 - WINDOW_TITLE_H });
  });

  it("a minimized window keeps only its title bar", () => {
    const rt = mountDesktop();
    expect(chrome(win(rt, "c")).children.map((c) => c.key)).toEqual(["title"]);
    expect(chrome(win(rt, "a")).children.map((c) => c.key)).toEqual(["title", "content"]);
  });
});

describe("Window gesture", () => {
  it("dragging the title bar moves the frame and raises the window", () => {
    const rt = mountDesktop(reduceWindows(initial(), { kind: "close", id: "b" }));
    rt.pointerDown(v(150, 110));
    rt.pointerMove(v(190, 140));
    rt.pointerUp(v(190, 140));
    expect(rt.doc.windows.byId.a.frame).toEqual({ pos: v(140, 130), size: v(300, 200) });
    expect(rt.doc.windows.order[rt.doc.windows.order.length - 1]).toBe("a");
  });

  it("a drag snaps to the desktop edge and never leaves it", () => {
    const rt = mountDesktop(reduceWindows(initial(), { kind: "close", id: "b" }));
    rt.pointerDown(v(150, 110));
    rt.pointerMove(v(56, 110));                  // frame.x would be 6 → snaps to 0
    expect(rt.doc.windows.byId.a.frame.pos.x).toBe(0);
    rt.pointerMove(v(-900, 110));
    rt.pointerUp(v(-900, 110));
    expect(rt.doc.windows.byId.a.frame.pos.x).toBeGreaterThan(-300);
  });

  it("dragging an edge resizes against the opposite edge", () => {
    const rt = mountDesktop(reduceWindows(initial(), { kind: "close", id: "b" }));
    rt.pointerDown(v(398, 200));                 // east edge of a (right = 400)
    rt.pointerMove(v(438, 200));
    rt.pointerUp(v(438, 200));
    expect(rt.doc.windows.byId.a.frame).toEqual({ pos: v(100, 100), size: v(340, 200) });
    rt.step(1);
    rt.pointerDown(v(102, 102));                 // north-west corner
    rt.pointerMove(v(82, 92));
    rt.pointerUp(v(82, 92));
    expect(rt.doc.windows.byId.a.frame).toEqual({ pos: v(80, 90), size: v(360, 210) });
  });

  it("a resize honours minSize", () => {
    const rt = mountDesktop(reduceWindows(initial(), { kind: "close", id: "b" }));
    rt.pointerDown(v(398, 200));
    rt.pointerMove(v(0, 200));
    rt.pointerUp(v(0, 200));
    expect(rt.doc.windows.byId.a.frame.size.x).toBe(180);
  });

  it("a click in the content focuses; a click on a pill restores", () => {
    const rt = mountDesktop(reduceWindows(initial(), { kind: "close", id: "b" }));
    expect(activeWindowId(rt.doc.windows)).toBe("a");
    rt.pointerDown(v(20, H - 10)); rt.pointerUp(v(20, H - 10));     // the pill for c
    expect(rt.doc.windows.byId.c.mode).toBe("normal");
    expect(activeWindowId(rt.doc.windows)).toBe("c");
    rt.step(1);
    rt.pointerDown(v(250, 250)); rt.pointerUp(v(250, 250));         // inside a's content
    expect(activeWindowId(rt.doc.windows)).toBe("a");
  });

  it("the controls close, minimize, and toggle maximize", () => {
    const rt = mountDesktop(reduceWindows(initial(), { kind: "close", id: "b" }));
    const controls = chrome(win(rt, "a")).children[0].children[0];
    const center = (key: string) => controls.children.find((c) => c.key === key)!.rect.center;
    // settle the glide after each click: hit-testing reads the animated rects
    const click = (p: { x: number; y: number }) => { rt.pointerDown(p); rt.pointerUp(p); rt.step(60); };
    click(center("maximize"));
    expect(rt.doc.windows.byId.a.mode).toBe("maximized");
    expect(win(rt, "a").rect.w).toBeCloseTo(W, 3);
    click(center("restore"));
    expect(rt.doc.windows.byId.a.mode).toBe("normal");
    click(center("minimize"));
    expect(rt.doc.windows.byId.a.mode).toBe("minimized");
    rt.dispatch({ kind: "restore", id: "a" }); rt.step(60);
    click(center("close"));
    expect(rt.doc.windows.byId.a).toBeUndefined();
    expect(rt.root.children.map((c) => c.key)).toEqual(["c"]);
  });

  it("publishes a window semantics node", () => {
    const rt = mountDesktop();
    const roles = rt.semanticsTree().map((n) => `${n.role}:${n.label}:${n.value}`);
    expect(roles).toContain("window:A:normal");
    expect(roles).toContain("window:B:maximized");
  });
});
