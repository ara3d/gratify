// Kernel-level tests for the pure motion curves (examples/shared/motion.ts).

import { describe, expect, it } from "vitest";
import { rect } from "../src/gratify";
import {
  blink, breathe, cascade, cooldown, dashes, digitRolls, easeOutElastic, flash, hash01, heartbeat,
  impulseAge, mod, nudge, perimeter, perimeterPoint, pings, smoothstep, sweep,
} from "../examples/shared/motion";

describe("motion: scalar curves", () => {
  it("mod is positive; smoothstep clamps and is smooth at the midpoint", () => {
    expect(mod(-1, 3)).toBe(2);
    expect(smoothstep(0, 1, -5)).toBe(0);
    expect(smoothstep(0, 1, 5)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });
  it("easeOutElastic pins its ends and overshoots 1 on the way", () => {
    expect(easeOutElastic(0)).toBe(0);
    expect(easeOutElastic(1)).toBe(1);
    expect(Math.max(...[0.1, 0.15, 0.2, 0.25].map(easeOutElastic))).toBeGreaterThan(1);
  });
  it("breathe rises from 0 to 1 over half a period and is periodic", () => {
    expect(breathe(0, 2)).toBeCloseTo(0);
    expect(breathe(1, 2)).toBeCloseTo(1);
    expect(breathe(7, 2)).toBeCloseTo(breathe(1, 2));
  });
  it("heartbeat thumps twice early in the period and rests late", () => {
    expect(heartbeat(0.08, 1)).toBeCloseTo(1, 1);
    expect(heartbeat(0.24, 1)).toBeGreaterThan(0.6);
    expect(heartbeat(0.16, 1)).toBeLessThan(0.3);
    expect(heartbeat(0.7, 1)).toBeLessThan(0.01);
  });
  it("sweep moves for the travel window then rests", () => {
    expect(sweep(0.5, 4, 1)).toBeCloseTo(0.5);
    expect(sweep(2, 4, 1)).toBeNull();
    expect(sweep(4.25, 4, 1)).toBeCloseTo(0.25);
  });
  it("pings are evenly staggered and each stays in 0..1", () => {
    const ps = pings(0, 3, 3);
    expect(ps.map((p) => Math.round(p * 3))).toEqual([0, 2, 1]);
    for (const p of pings(12.34, 3, 4)) { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThan(1); }
  });
  it("nudge is silent until idle, then bumps on schedule", () => {
    expect(nudge(1, 0, 2, 3, 0.5)).toBe(0);
    expect(nudge(2.25, 0, 2, 3, 0.5)).toBeCloseTo(1);
    expect(nudge(3.5, 0, 2, 3, 0.5)).toBe(0);
    expect(nudge(5.25, 0, 2, 3, 0.5)).toBeCloseTo(1);
  });
  it("blink is on inside the duty window with soft edges", () => {
    expect(blink(0.3, 1, 0.6)).toBeCloseTo(1);
    expect(blink(0.8, 1, 0.6)).toBe(0);
    expect(blink(0.06, 1, 0.6)).toBeGreaterThan(0);
    expect(blink(0.06, 1, 0.6)).toBeLessThan(1);
  });
  it("cascade delays each item by its index", () => {
    expect(cascade(0.5, 0, 0, 0.1, 0.5)).toBe(1);
    expect(cascade(0.5, 0, 2, 0.1, 0.5)).toBeCloseTo(0.6);
    expect(cascade(0.5, 0, 9, 0.1, 0.5)).toBe(0);
  });
  it("cooldown and flash run 1 to 0 over their duration", () => {
    expect(cooldown(0, 0, 2)).toBe(1);
    expect(cooldown(1, 0, 2)).toBe(0.5);
    expect(cooldown(9, 0, 2)).toBe(0);
    expect(flash(-1, 0, 1)).toBe(0);
    expect(flash(0.25, 0, 1)).toBe(0.75);
  });
  it("impulseAge inverts an exponential decay", () => {
    expect(impulseAge(Math.exp(-2 * 0.5), 2)).toBeCloseTo(0.5);
    expect(impulseAge(1, 2)).toBe(0);
    expect(impulseAge(0, 2)).toBe(Infinity);
  });
  it("hash01 is deterministic and in range", () => {
    expect(hash01(7)).toBe(hash01(7));
    expect(hash01(7)).not.toBe(hash01(8));
    for (let i = 0; i < 50; i++) { expect(hash01(i)).toBeGreaterThanOrEqual(0); expect(hash01(i)).toBeLessThan(1); }
  });
});

describe("motion: odometer", () => {
  it("only the lowest column rolls in the middle of a decade", () => {
    expect(digitRolls(123.5, 3)).toEqual([
      { digit: 3, roll: 0.5 }, { digit: 2, roll: 0 }, { digit: 1, roll: 0 },
    ]);
  });
  it("129.5 rolls the 9 and the 2 together, leaving the 1 still", () => {
    expect(digitRolls(129.5, 3)).toEqual([
      { digit: 9, roll: 0.5 }, { digit: 2, roll: 0.5 }, { digit: 1, roll: 0 },
    ]);
  });
  it("999.9 rolls every column", () => {
    for (const c of digitRolls(999.9, 3)) { expect(c.digit).toBe(9); expect(c.roll).toBeCloseTo(0.9); }
  });
  it("negative input reads as zero", () => {
    expect(digitRolls(-4, 2)).toEqual([{ digit: 0, roll: 0 }, { digit: 0, roll: 0 }]);
  });
});

describe("motion: rounded-rect perimeter", () => {
  const r = rect(10, 20, 100, 60);
  it("perimeter matches the straight-edge plus circle formula", () => {
    expect(perimeter(r, 10)).toBeCloseTo(2 * 80 + 2 * 40 + Math.PI * 20);
    expect(perimeter(r, 0)).toBeCloseTo(320);
  });
  it("s=0 is the top edge's left end; s=0.5 is the diagonally opposite point", () => {
    const a = perimeterPoint(r, 10, 0), b = perimeterPoint(r, 10, 0.5);
    expect(a.x).toBeCloseTo(20); expect(a.y).toBeCloseTo(20);
    expect(b.x).toBeCloseTo(100); expect(b.y).toBeCloseTo(80);
  });
  it("every sample lies on an edge or inside a corner band", () => {
    for (let i = 0; i < 40; i++) {
      const p = perimeterPoint(r, 10, i / 40);
      const onEdge = Math.abs(p.x - r.x) < 1e-6 || Math.abs(p.x - r.right) < 1e-6
        || Math.abs(p.y - r.y) < 1e-6 || Math.abs(p.y - r.bottom) < 1e-6;
      const inCornerBand = (p.x < r.x + 10 || p.x > r.right - 10) && (p.y < r.y + 10 || p.y > r.bottom - 10);
      expect(onEdge || inCornerBand).toBe(true);
    }
  });
  it("dashes yields two segments per dash and wraps the offset", () => {
    const d = dashes(r, 10, 8, 0.5, 0.9);
    expect(d.length).toBe(16);
    expect(d[0][0].x).toBeCloseTo(perimeterPoint(r, 10, 0.9).x);
  });
});
