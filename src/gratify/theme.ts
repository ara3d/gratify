// ============================================================================
// Gratify tokens + themes. Tokens are the named design values every style
// function reads. setTheme() retargets them and the live values cross-fade —
// a theme swap is a choreographed fade of the whole UI, for free.
// ============================================================================

import { approach, cmix, Color, rgb } from "./core";

export interface Tokens {
  bg: Color;          // canvas background
  surface: Color;     // widget body
  surfaceHi: Color;   // raised / hovered surface
  muted: Color;       // tracks, separators, quiet chrome
  text: Color;
  textDim: Color;
  textBright: Color;
  accent: Color;
  accent2: Color;
  danger: Color;
  /** Blend two colors — the one styling verb (README §4: styling is arithmetic). */
  mix(a: Color, b: Color, t: number): Color;
}

type Palette = Omit<Tokens, "mix">;

const dark: Palette = {
  bg: rgb(18, 20, 26),
  surface: rgb(36, 40, 52),
  surfaceHi: rgb(52, 58, 74),
  muted: rgb(70, 76, 94),
  text: rgb(206, 212, 224),
  textDim: rgb(130, 138, 156),
  textBright: rgb(242, 246, 252),
  accent: rgb(64, 186, 255),
  accent2: rgb(168, 130, 255),
  danger: rgb(255, 92, 108),
};

const light: Palette = {
  bg: rgb(243, 245, 249),
  surface: rgb(255, 255, 255),
  surfaceHi: rgb(238, 242, 250),
  muted: rgb(198, 205, 218),
  text: rgb(38, 44, 56),
  textDim: rgb(120, 128, 144),
  textBright: rgb(10, 14, 22),
  accent: rgb(20, 122, 255),
  accent2: rgb(128, 84, 240),
  danger: rgb(224, 56, 76),
};

export const themes: Record<string, Palette> = { dark, light };

/** The live tokens — values chase the active theme's palette every frame. */
export const tokens: Tokens = {
  ...structuredClone(dark),
  mix: cmix,
};

let target: Palette = dark;
export let themeName = "dark";

export function setTheme(name: string) {
  if (themes[name]) { target = themes[name]; themeName = name; }
}

/** Step live token values toward the target palette. True while still fading. */
export function tickTheme(dt: number): boolean {
  let moving = false;
  for (const k of Object.keys(target) as (keyof Palette)[]) {
    const cur = tokens[k] as Color, want = target[k];
    for (const c of ["r", "g", "b", "a"] as const) {
      const next = approach(cur[c], want[c], 8, dt);
      if (Math.abs(next - want[c]) > 0.5) moving = true;
      cur[c] = next;
    }
  }
  return moving;
}
