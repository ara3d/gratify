// 2D vector — plain data + free functions.

import { lerp } from "./utils";

export type Vec = { x: number; y: number };
export const v = (x = 0, y = 0): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const vlerp = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const vlen = (a: Vec) => Math.hypot(a.x, a.y);
export const vdist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
