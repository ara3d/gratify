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

// ---- wheel routing --------------------------------------------------------------
describe("Wheel interactor", () => {
  type D = { scrolled: number; zoomed: boolean };
  type I = { kind: "scroll"; by: number };
  const Row = part("wheel-row").props<Record<string, never>>().size(() => v(100, 20)).render(() => {});
  const List = part("wheel-list").props<Record<string, never>>()
    .measure(() => v(100, 60))
    .arrange((_p, r, kids) => kids.map((k, i) => new Rect(r.x, r.y + i * 20, k.size.x, k.size.y)))
    .render(() => {})
    .wheel((_n, d) => ({ kind: "scroll", by: d.y }));
  const Surface = part("wheel-surface").props<Record<string, never>>()
    .fill().render(() => {}).on({ kind: "pan" });
  const mk = () => new Runtime<D, I>(null, {
    init: { scrolled: 0, zoomed: false },
    update: (d, i) => ({ ...d, scrolled: d.scrolled + i.by }),
    view: () => Surface("root", {}, [List("list", {}, [Row("a", {}), Row("b", {}), Row("c", {})])]),
  }, { headless: true, width: 300, height: 300 });

  it("routes to the nearest wheel-taking ancestor of the hit (a row inside the list)", () => {
    const rt = mk();
    rt.step(2);
    rt.wheel(100, { x: 50, y: 30 });
    expect(rt.doc.scrolled).toBe(100);
    expect(rt.viewport.zoom).toBe(1);            // the list took it; no zoom
  });

  it("falls back to Pan() zoom when nothing under the pointer takes the wheel", () => {
    const rt = mk();
    rt.step(2);
    rt.wheel(100, { x: 250, y: 250 });
    expect(rt.doc.scrolled).toBe(0);
    expect(rt.viewport.zoom).not.toBe(1);
  });
});

// ---- pinned placement -----------------------------------------------------------
import { Free, pin, at } from "../src/gratify";

describe("pin(element)", () => {
  type D = { y: number };
  type I = { kind: "move"; y: number };
  const Box = part("pin-box").props<Record<string, never>>().size(() => v(20, 20)).render(() => {});
  const Inner = part("pin-inner").props<Record<string, never>>()
    .measure(() => v(20, 20))
    .arrange((_p, r, kids) => kids.map((k) => new Rect(r.x, r.y, k.size.x, k.size.y)))
    .render(() => {});
  const mk = (pinned: boolean) => new Runtime<D, I>(null, {
    init: { y: 0 },
    update: (_d, i) => ({ y: i.y }),
    view: (d) => {
      const el = at(Inner("row", {}, [Box("cell", {})]), v(0, d.y));
      return Free("root", {}, [pinned ? pin(el) : el]);
    },
  }, { headless: true, width: 200, height: 200 });

  it("a pinned subtree takes its new rect on the next frame, children included", () => {
    const rt = mk(true);
    rt.step(5);
    rt.dispatch({ kind: "move", y: 100 });
    rt.step(1);
    expect(rt.root.children[0].rect.y).toBe(100);
    expect(rt.root.children[0].children[0].rect.y).toBe(100);
  });

  it("an unpinned subtree still glides (the default is unchanged)", () => {
    const rt = mk(false);
    rt.step(5);
    rt.dispatch({ kind: "move", y: 100 });
    rt.step(1);
    const y = rt.root.children[0].rect.y;
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(100);
  });
});

// ---- size-dependent bodies ----------------------------------------------------
describe("body(size)", () => {
  type D = { h: number };
  type I = { kind: "size"; h: number };
  const Cell = part("bs-cell").props<Record<string, never>>().size(() => v(50, 20)).render(() => {});
  // builds as many rows as its arranged height can show
  let expansions = 0;
  const Rows = part("bs-rows").props<Record<string, never>>()
    .body((_p, _kids, _l, size) => {
      expansions++;
      return Array.from({ length: Math.floor(size.y / 20) }, (_, i) => Cell(`r${i}`, {}));
    });
  const Box = part("bs-box").props<{ h: number }>()
    .measure((p) => v(50, p.h))
    .arrange((_p, r, kids) => kids.map(() => new Rect(r.x, r.y, r.w, r.h)));
  const mk = () => new Runtime<D, I>(null, {
    init: { h: 100 },
    update: (_d, i) => ({ h: i.h }),
    view: (d) => Stack("root", { gap: 0 }, [Box("box", { h: d.h }, [Rows("rows", {})])]),
  }, { headless: true, width: 200, height: 400 });

  it("sees its arranged size one frame after layout, and again after a resize", () => {
    const rt = mk();
    expect(rt.root.children[0].children[0].children.length).toBe(0);    // before any layout: size is zero
    rt.step(2);
    expect(rt.root.children[0].children[0].children.length).toBe(5);    // 100 / 20
    rt.dispatch({ kind: "size", h: 200 });
    rt.step(2);
    expect(rt.root.children[0].children[0].children.length).toBe(10);
    const seen = expansions;
    rt.step(300);
    expect(expansions).toBe(seen);                          // no expand loop once the size is stable
    expect(rt.animating).toBe(false);
  });
});

// ---- scroll arithmetic ------------------------------------------------------------
import {
  clampScroll, maxScroll, revealScroll, scrollOfThumb, thumbOf, windowOf, Virtual,
} from "../src/gratify";

describe("scroll math", () => {
  it("windowOf covers the visible rows plus overscan, offset ≤ 0, and is empty for no rows", () => {
    const w = windowOf(1000, 20, 100, 250, 1);
    expect(w.first).toBe(11);                  // floor(250/20)=12, minus overscan
    expect(w.last).toBe(18);                   // ceil(350/20)-1=17, plus overscan
    expect(w.offset).toBe(11 * 20 - 250);      // -30
    expect(windowOf(0, 20, 100, 0)).toEqual({ first: 0, last: -1, offset: 0 });
    expect(windowOf(3, 20, 100, 999).last).toBe(2);   // clamps: never past the end
  });

  it("clampScroll keeps the last row on the bottom edge; NaN reads as 0", () => {
    expect(maxScroll(50, 20, 100)).toBe(900);
    expect(clampScroll(5000, 50, 20, 100)).toBe(900);
    expect(clampScroll(-5, 50, 20, 100)).toBe(0);
    expect(clampScroll(NaN, 50, 20, 100)).toBe(0);
    expect(clampScroll(40, 3, 20, 100)).toBe(0);      // content fits: no scroll
  });

  it("revealScroll moves the minimum: none when visible, to the top edge above, bottom edge below", () => {
    expect(revealScroll(7, 100, 20, 100, 100)).toBe(100);   // rows 5..9 visible
    expect(revealScroll(2, 100, 20, 100, 100)).toBe(40);
    expect(revealScroll(20, 100, 20, 100, 100)).toBe(320);  // 21*20 - 100
  });

  it("thumb maps scroll ↔ track position round-trip and honors the minimum length", () => {
    expect(thumbOf(3, 20, 100, 0, 100)).toBeNull();        // fits: no bar
    const t = thumbOf(100000, 20, 300, 0, 300)!;
    expect(t.len).toBe(24);                                  // clamped up to minLen
    for (const s of [0, 12345, 999999]) {
      const th = thumbOf(1000, 20, 300, s, 300)!;
      expect(scrollOfThumb(th.start, 1000, 20, 300, 300)).toBeCloseTo(clampScroll(s, 1000, 20, 300), 6);
    }
  });
});

// ---- Virtual: the virtualized list, headless --------------------------------------
describe("Virtual", () => {
  type D = { count: number; reveal?: number };
  type I = { kind: "count"; n: number } | { kind: "reveal"; i: number };
  const Row = part("vt-row").props<{ i: number }>().size(() => v(50, 20)).render(() => {})
    .press(() => ({ kind: "count", n: -1 }));
  const Pane = part("vt-pane").props<Record<string, never>>()
    .measure(() => v(200, 100))
    .arrange((_p, r, kids) => kids.map(() => r));
  const mk = () => new Runtime<D, I>(null, {
    init: { count: 1000 },
    update: (d, i) => (i.kind === "count" ? { ...d, count: i.n } : { ...d, reveal: i.i }),
    view: (d) => Stack("root", { gap: 0 }, [
      Pane("pane", {}, [
        Virtual("list", { count: d.count, rowHeight: 20, overscan: 0, reveal: d.reveal, row: (i) => Row(`r${i}`, { i }) }),
      ]),
    ]),
  }, { headless: true, width: 400, height: 400 });
  const rowKeys = (rt: Runtime<D, I>) =>
    rt.root.children[0].children[0].children[0].children.map((c) => c.key);
  const rowRect = (rt: Runtime<D, I>, key: string) =>
    rt.root.children[0].children[0].children[0].children.find((c) => c.key === key)!.rect;

  it("builds only the rows the viewport can show", () => {
    const rt = mk();
    rt.step(3);
    expect(rowKeys(rt)).toEqual(["r0", "r1", "r2", "r3", "r4"]);   // 100px / 20px
    expect(rowRect(rt, "r0").w).toBe(190);                        // viewport minus the scrollbar gutter
  });

  it("the wheel scrolls it; rows re-window with no lag; the doc is untouched", () => {
    const rt = mk();
    rt.step(3);
    rt.wheel(50, { x: 50, y: 50 });
    rt.step(2);
    expect(rowKeys(rt)).toEqual(["r2", "r3", "r4", "r5", "r6", "r7"]);
    expect(rowRect(rt, "r2").y).toBe(-10);                        // pinned: exact on the next frame
    expect(rt.doc.count).toBe(1000);
  });

  it("clamps at both ends", () => {
    const rt = mk();
    rt.step(3);
    rt.wheel(-500, { x: 50, y: 50 }); rt.step(2);
    expect(rowKeys(rt)[0]).toBe("r0");
    rt.wheel(1e9, { x: 50, y: 50 }); rt.step(2);
    expect(rowKeys(rt)).toEqual(["r995", "r996", "r997", "r998", "r999"]);
  });

  it("a scrolled-out row cannot be clicked; a visible one can", () => {
    const rt = mk();
    rt.step(3);
    rt.pointerDown({ x: 50, y: 150 }); rt.pointerUp({ x: 50, y: 150 });   // below the 100px viewport
    expect(rt.doc.count).toBe(1000);
    rt.pointerDown({ x: 50, y: 50 }); rt.pointerUp({ x: 50, y: 50 });
    expect(rt.doc.count).toBe(-1);
  });

  it("reveal brings a row into view with minimal motion, and stops steering once the user scrolls", () => {
    const rt = mk();
    rt.step(3);
    rt.dispatch({ kind: "reveal", i: 50 }); rt.step(2);
    expect(rowKeys(rt)).toEqual(["r46", "r47", "r48", "r49", "r50"]);   // row 50 on the bottom edge
    rt.wheel(20, { x: 50, y: 50 }); rt.step(2);
    expect(rowKeys(rt)[0]).toBe("r47");                                 // scrolled from the revealed offset
    rt.wheel(-2000, { x: 50, y: 50 }); rt.step(2);
    expect(rowKeys(rt)[0]).toBe("r0");                                  // reveal no longer pins us to row 50
  });

  it("dragging the scrollbar thumb scrolls; clicking the track pages", () => {
    const rt = mk();
    rt.step(3);
    const gutterX = 200 - 4;
    rt.pointerDown({ x: gutterX, y: 2 });                  // on the thumb (starts at top, 24px min)
    rt.pointerMove({ x: gutterX, y: 40 });                 // 38px of a 76px travel → half of maxScroll
    rt.step(2);
    expect(rowKeys(rt)[0]).toBe(String("r" + Math.floor((38 / 76) * 19900 / 20)));
    rt.pointerUp({ x: gutterX, y: 40 });
    rt.step(2);
    const before = rowKeys(rt)[0];
    rt.pointerDown({ x: gutterX, y: 98 }); rt.pointerUp({ x: gutterX, y: 98 });   // track below thumb
    rt.step(2);
    expect(Number(rowKeys(rt)[0].slice(1))).toBe(Number(before.slice(1)) + 5);  // one page = 100px = 5 rows
  });

  it("stays consistent when the count shrinks under the scroll offset", () => {
    const rt = mk();
    rt.step(3);
    rt.wheel(1e9, { x: 50, y: 50 }); rt.step(2);
    rt.dispatch({ kind: "count", n: 8 }); rt.step(2);
    expect(rowKeys(rt)).toEqual(["r3", "r4", "r5", "r6", "r7"]);
  });

  it("exposes semantics", () => {
    const rt = mk();
    rt.step(3);
    expect(rt.semanticsTree()[0]).toMatchObject({ role: "list", value: 1000 });
  });
});

// ---- focus model: nearest focusable ancestor, key bubbling, mods -----------------
import { Focusable } from "../src/gratify";

describe("focus routing for composite views", () => {
  type D = { log: string[] };
  type I = { kind: "log"; s: string };
  const log = (s: string): I => ({ kind: "log", s });
  const Row = part("fr-row").props<{ i: number }>().size(() => v(100, 20)).render(() => {})
    .press((n, mods) => log(`row${n.props.i}${mods.shift ? "+shift" : ""}${mods.ctrl ? "+ctrl" : ""}`));
  const Grid = part("fr-grid").props<Record<string, never>>()
    .measure(() => v(100, 60))
    .arrange((_p, r, kids) => kids.map((k, i) => new Rect(r.x, r.y + i * 20, k.size.x, k.size.y)))
    .render(() => {})
    .on(Focusable())
    .keys({ ArrowDown: () => log("grid-down"), a: (_n, m) => log(m.ctrl ? "select-all" : "a") });
  const mk = (rows = 3) => new Runtime<D, I>(null, {
    init: { log: [] },
    update: (d, i) => ({ log: [...d.log, i.s] }),
    view: () => Stack("root", { gap: 0 }, [Grid("grid", {}, Array.from({ length: rows }, (_, i) => Row(`r${i}`, { i })))]),
  }, { headless: true, width: 300, height: 300 });

  it("clicking a row focuses the grid (nearest focusable ancestor) and the row's press still fires", () => {
    const rt = mk();
    rt.step(2);
    rt.pointerDown({ x: 50, y: 30 }); rt.pointerUp({ x: 50, y: 30 });
    expect(rt.focusedKey).toBe("grid");
    expect(rt.doc.log).toEqual(["row1"]);
  });

  it("press handlers receive the modifier keys", () => {
    const rt = mk();
    rt.step(2);
    rt.pointerDown({ x: 50, y: 30 }, { shift: true }); rt.pointerUp({ x: 50, y: 30 });
    rt.pointerDown({ x: 50, y: 50 }, { shift: false, ctrl: true }); rt.pointerUp({ x: 50, y: 50 });
    expect(rt.doc.log).toEqual(["row1+shift", "row2+ctrl"]);
  });

  it("keys bubble from the focused part through its ancestors, with the pointer elsewhere; handlers see mods", () => {
    const rt = mk();
    rt.step(2);
    rt.pointerDown({ x: 50, y: 30 }); rt.pointerUp({ x: 50, y: 30 });
    rt.pointerMove({ x: 250, y: 250 });                     // pointer far from the grid
    expect(rt.key("ArrowDown")).toBe(true);
    expect(rt.key("a", { ctrl: true })).toBe(true);
    expect(rt.doc.log.slice(1)).toEqual(["grid-down", "select-all"]);
  });

  it("a focused part that leaves the tree releases focus", () => {
    const rt = mk();
    rt.step(2);
    rt.pointerDown({ x: 50, y: 30 }); rt.pointerUp({ x: 50, y: 30 });
    expect(rt.focusedKey).toBe("grid");
    // swap the app's view to one without the grid
    (rt.app as { view: (d: D) => ReturnType<typeof Stack> }).view = () => Stack("root", {}, []);
    rt.dispatch(log("x")); rt.step(2);
    expect(rt.focusedKey).toBeNull();
  });
});

// ---- grow: main-axis slack ---------------------------------------------------------
import { grow, Row } from "../src/gratify";

describe("grow(element)", () => {
  const Box = part("gr-box").props<{ w: number; h: number }>().size((p) => v(p.w, p.h)).render(() => {});
  it("a growing Stack child takes the viewport slack; siblings keep their size", () => {
    const rt = new Runtime<null, never>(null, {
      init: null, update: (d) => d,
      view: () => Stack("root", { gap: 10, pad: 0 }, [
        Box("bar", { w: 100, h: 30 }), grow(Box("body", { w: 100, h: 50 })), Box("foot", { w: 100, h: 20 }),
      ]),
    }, { headless: true, width: 400, height: 300 });
    rt.step(2);
    const [bar, body, foot] = rt.root.children.map((c) => c.rect);
    expect(bar.h).toBe(30);
    expect(body.h).toBe(300 - 30 - 20 - 20);   // slack = view - content - gaps
    expect(foot.y).toBe(300 - 20);
  });
  it("Row shares slack by weight; an unbounded container has none to give", () => {
    const rt = new Runtime<null, never>(null, {
      init: null, update: (d) => d,
      view: () => Stack("root", {}, [
        Row("row", { gap: 0 }, [grow(Box("a", { w: 50, h: 10 }), 1), grow(Box("b", { w: 50, h: 10 }), 3)]),
      ]),
    }, { headless: true, width: 400, height: 300 });
    rt.step(2);
    const [a, b] = rt.root.children[0].children.map((c) => c.rect);
    expect(a.w).toBe(50);     // the Row measured to content (100); no slack inside it
    expect(b.w).toBe(50);
    const rt2 = new Runtime<null, never>(null, {
      init: null, update: (d) => d,
      view: () => Row("root", { gap: 0, pad: 0 }, [grow(Box("a", { w: 50, h: 10 }), 1), grow(Box("b", { w: 50, h: 10 }), 3)]),
    }, { headless: true, width: 500, height: 300 });
    rt2.step(2);
    const [a2, b2] = rt2.root.children.map((c) => c.rect);
    expect(a2.w).toBe(50 + 100);
    expect(b2.w).toBe(50 + 300);
  });
});

describe("pin(element): instant enter/exit", () => {
  const Box = part("pi-box").props<Record<string, never>>().size(() => v(20, 20)).render(() => {});
  it("pinned children appear at full enter and leave without ghosting", () => {
    type D = { keys: string[] };
    type I = { kind: "set"; keys: string[] };
    const rt = new Runtime<D, I>(null, {
      init: { keys: ["a", "b"] },
      update: (_d, i) => ({ keys: i.keys }),
      view: (d) => Free("root", {}, d.keys.map((k, i) => pin(at(Box(k, {}), v(0, i * 20))))),
    }, { headless: true, width: 200, height: 200 });
    rt.step(1);
    expect(rt.root.children[0].ch.enter).toBe(1);
    rt.dispatch({ kind: "set", keys: ["b", "c"] });
    rt.step(1);
    expect(rt.root.ghosts.length).toBe(0);
    expect(rt.root.children.map((c) => c.key)).toEqual(["b", "c"]);
    expect(rt.root.children[1].ch.enter).toBe(1);
  });
});

describe("fill() hands its room to its children", () => {
  it("a fill inside a fill inside the root measures to the viewport, not to a fallback", () => {
    const Outer = part("ff-outer").props<Record<string, never>>().fill().render(() => {});
    const Inner = part("ff-inner").props<Record<string, never>>().fill()
      .arrange((_p, r, kids) => kids.map((k) => new Rect(r.right - k.size.x, r.bottom - k.size.y, k.size.x, k.size.y)));
    const Box = part("ff-box").props<Record<string, never>>().size(() => v(30, 20)).render(() => {});
    const rt = new Runtime<null, never>(null, {
      init: null, update: (d) => d,
      view: () => Outer("root", {}, [Inner("inner", {}, [Box("box", {})])]),
    }, { headless: true, width: 400, height: 300 });
    rt.step(2);
    expect(rt.root.children[0].rect.w).toBe(400);
    expect(rt.root.children[0].children[0].rect.x).toBe(370);   // docked bottom-right of a real viewport
    expect(rt.root.children[0].children[0].rect.y).toBe(280);
  });
});
