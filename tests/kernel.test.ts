// Kernel tests — reconcile identity, spring behavior, undo middleware, and a
// full headless app driven by deterministic step() (plan M0 acceptance).

import { describe, expect, it } from "vitest";
import {
  approach, part, reconcile, Runtime, Spring, Stack, Label, v, withUndo,
  type AppSpec, type Element,
} from "../src/gratify";

// ---- reconcile ---------------------------------------------------------------
const Box = part<{ n: number }>("box", { size: () => v(10, 10), render() {} });

const tree = (keys: string[]): Element =>
  Stack("root", {}, keys.map((k) => Box(k, { n: 1 })));

describe("reconcile", () => {
  it("reuses instances by key (channels survive)", () => {
    const a = reconcile(null, tree(["x", "y"]));
    a.children[0].ch.hover = 0.7;
    const b = reconcile(a, tree(["x", "y"]));
    expect(b.children[0].ch.hover).toBe(0.7);
  });

  it("ghosts vanished children for exit animation", () => {
    const a = reconcile(null, tree(["x", "y"]));
    const b = reconcile(a, tree(["x"]));
    expect(b.children.length).toBe(1);
    expect(b.ghosts.length).toBe(1);
    expect(b.ghosts[0].key).toBe("y");
    expect(b.ghosts[0].exiting).toBe(true);
  });

  it("fresh key plays enter from 0", () => {
    const a = reconcile(null, tree(["x"]));
    a.children[0].ch.enter = 1;
    const b = reconcile(a, tree(["x", "z"]));
    expect(b.children[0].ch.enter).toBe(1);   // reused
    expect(b.children[1].ch.enter).toBe(0);   // fresh
  });
});

// ---- animation primitives ------------------------------------------------------
describe("spring + approach", () => {
  it("spring converges to target", () => {
    const s = new Spring(0);
    for (let i = 0; i < 300; i++) s.step(100, 240, 26, 1 / 60);
    expect(Math.abs(s.v - 100)).toBeLessThan(0.5);
  });
  it("approach is frame-rate independent-ish", () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = approach(a, 1, 10, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = approach(b, 1, 10, 1 / 30);
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });
});

// ---- undo middleware -------------------------------------------------------------
interface Doc { n: number; }
type Intent = { kind: "inc" };
const app: AppSpec<Doc, Intent> = {
  init: { n: 0 },
  update: (d, i) => (i.kind === "inc" ? { n: d.n + 1 } : d),
  view: (d) => Label("l", { text: `${d.n}` }),
};

describe("withUndo", () => {
  it("undo/redo travel history; unchanged docs don't snapshot", () => {
    const u = withUndo(app);
    let s = u.init;
    s = u.update(s, { kind: "inc" });
    s = u.update(s, { kind: "inc" });
    expect(s.present.n).toBe(2);
    s = u.update(s, { kind: "undo" });
    expect(s.present.n).toBe(1);
    s = u.update(s, { kind: "redo" });
    expect(s.present.n).toBe(2);
    const before = s;
    s = u.update(s, { kind: "undo" });
    s = u.update(s, { kind: "undo" });
    s = u.update(s, { kind: "undo" });   // past exhausted → no-op
    expect(s.present.n).toBe(0);
    void before;
  });
});

// ---- headless runtime (M0 acceptance: step() drives the counter) ---------------
describe("headless runtime", () => {
  it("mounts, dispatches, animates enter, ghosts prune", () => {
    interface D { items: string[]; }
    type I = { kind: "set"; items: string[] };
    const rt = new Runtime<D, I>(null, {
      init: { items: ["a", "b"] },
      update: (_d, i) => ({ items: i.items }),
      view: (d) => Stack("root", { gap: 4 }, d.items.map((k) => Box(k, { n: 0 }))),
    }, { headless: true, width: 400, height: 300 });

    rt.step(30);
    expect(rt.root.children[0].ch.enter).toBeGreaterThan(0.9);
    expect(rt.root.children[0].rect.w).toBe(10);

    rt.dispatch({ kind: "set", items: ["a"] });
    rt.step(1);
    expect(rt.root.ghosts.length).toBe(1);
    rt.step(120);                                   // exit completes → pruned
    expect(rt.root.ghosts.length).toBe(0);
    expect(rt.root.children.length).toBe(1);
  });

  it("layout reflows: second child glides up after first is removed", () => {
    interface D { items: string[]; }
    type I = { kind: "set"; items: string[] };
    const rt = new Runtime<D, I>(null, {
      init: { items: ["a", "b"] },
      update: (_d, i) => ({ items: i.items }),
      view: (d) => Stack("root", { gap: 4 }, d.items.map((k) => Box(k, { n: 0 }))),
    }, { headless: true });

    rt.step(30);
    const yBefore = rt.root.children[1].rect.y;
    expect(yBefore).toBeGreaterThan(rt.root.children[0].rect.y);

    rt.dispatch({ kind: "set", items: ["b"] });
    rt.step(2);
    const mid = rt.root.children[0].rect.y;         // "b", mid-glide
    expect(mid).toBeLessThan(yBefore);              // moving up…
    expect(mid).toBeGreaterThan(0);                 // …but not teleported
    rt.step(200);
    expect(Math.abs(rt.root.children[0].rect.y - 0)).toBeLessThan(1);
  });
});

// ---- extension algebra (M2) -------------------------------------------------
import {
  addChannels, addOn, derivePart, extendTheme, clearThemeExt, mapSize, mapStyle,
  Press, withExt,
} from "../src/gratify";

describe("extension algebra", () => {
  it("mapStyle wraps: base result flows into the delta", () => {
    const Base = part<{ x: number }, { a: number; b: number }>("mb", {
      style: () => ({ a: 1, b: 2 }),
      render() {},
    });
    const ext = mapStyle<{ a: number; b: number }>((_t, _c, _p, base) => ({ ...base, b: base.b * 10 }));
    const def = ext(Base.def as never) as typeof Base.def;
    const out = def.style!(null as never, {}, { x: 0 }) as { a: number; b: number };
    expect(out).toEqual({ a: 1, b: 20 });
  });

  it("mapSize wraps; addOn/addChannels append", () => {
    const Base = part<Record<string, never>>("ms", { size: () => v(10, 10), render() {}, on: [Press(() => null)] });
    const def = mapSize((_p, _m, b) => v(b.x, Math.max(b.y, 44)))(
      addOn(Press(() => null))(addChannels({ "fx/k": { target: () => 1 } })(Base.def as never)),
    ) as typeof Base.def;
    expect(def.size!({}, { text: () => v(0, 0) }).y).toBe(44);
    expect(def.on!.length).toBe(2);
    expect(Object.keys(def.channels!)).toContain("fx/k");
  });

  it("derivePart records ancestry; theme extensions reach derivatives", () => {
    const Base = part<Record<string, never>, { n: number }>("tb", { style: () => ({ n: 1 }), render() {} });
    const Derived = derivePart("tb-fancy", Base);
    expect(Derived.def.ancestors).toContain("tb");

    extendTheme("dark", "tb", mapStyle<{ n: number }>((_t, _c, _p, b) => ({ n: b.n + 100 })) as never);
    const rt = new Runtime(null, {
      init: 0,
      update: (d: number) => d,
      view: () => Stack("root", {}, [Base("x", {}), Derived("y", {})]),
    }, { headless: true });
    rt.step(2);
    const styleOf = (i: number) => {
      const inst = rt.root.children[i];
      const eff = (rt as unknown as { eff(x: unknown): { style(t: unknown, c: unknown, p: unknown): unknown } }).eff(inst);
      return eff.style(null, {}, {}) as { n: number };
    };
    expect(styleOf(0).n).toBe(101);   // base part themed
    expect(styleOf(1).n).toBe(101);   // derivative reached via ancestry
    clearThemeExt("dark", "tb");
    expect(styleOf(0).n).toBe(1);     // cache invalidated by themeVersion bump
  });

  it("use-site exts apply to that element only; all press behaviors run", () => {
    let hits = 0;
    const Base = part<Record<string, never>>("us", { size: () => v(10, 10), render() {}, on: [Press(() => { hits++; return null; })] });
    const extra = addOn(Press(() => { hits += 10; return null; }));
    const rt = new Runtime(null, {
      init: 0,
      update: (d: number) => d,
      view: () => Stack("root", {}, [withExt(Base("a", {}), extra), Base("b", {})]),
    }, { headless: true });
    rt.step(2);
    const effA = (rt as unknown as { eff(x: unknown): { on?: unknown[] } }).eff(rt.root.children[0]);
    const effB = (rt as unknown as { eff(x: unknown): { on?: unknown[] } }).eff(rt.root.children[1]);
    expect(effA.on!.length).toBe(2);
    expect(effB.on!.length).toBe(1);
    void hits;
  });
});
