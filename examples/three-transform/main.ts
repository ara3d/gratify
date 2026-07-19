// ============================================================================
// Example: three-transform — Gratify as an animated tool-panel HUD composited
// over a live Three.js render loop.
//
// The thesis (see the chat that spawned this): Gratify is NOT an immediate-mode
// IMGUI. It is a retained, spring-animated canvas UI. Where it shines against a
// 3D app is exactly where IMGUI can't follow — beautiful, juicy tool panels.
// This PoC demonstrates the "two-loop composite" pattern:
//
//   • Three.js owns its own requestAnimationFrame loop (the 3D clock). Every
//     frame it READS the current Gratify document and maps it onto a mesh.
//   • Gratify owns its own loop (the UI clock). Sliders/buttons mutate the doc;
//     knobs and hovers ease for free; it sleeps when idle.
//   • The doc is the single shared source of truth between the two.
//
// Compositing is two stacked canvases: an opaque WebGL canvas behind, and a
// transparent Gratify HUD canvas in front (bg token alpha = 0, see below).
// ============================================================================

import * as THREE from "three";
import {
  mount, Stack, Row, Label, tokens, themes, rgb, type Element,
} from "gratify";
import { Card, Slider, Button, Labeled } from "../shared/widgets";

// ── Shared state: the document both loops agree on ──────────────────────────
// All slider values are normalized 0..1; the 3D loop maps them to real ranges.

interface Doc {
  rotX: number;   // 0..1 → 0..2π
  rotY: number;   // 0..1 → 0..2π (added on top of auto-spin)
  scale: number;  // 0..1 → 0.4..2.6
  hue: number;    // 0..1 → material hue
  spin: boolean;  // auto-rotate about Y
  wire: boolean;  // wireframe material
}

type Intent =
  | { kind: "set"; field: "rotX" | "rotY" | "scale" | "hue"; value: number }
  | { kind: "toggle-spin" }
  | { kind: "toggle-wire" }
  | { kind: "reset" };

const initial: Doc = { rotX: 0.12, rotY: 0.0, scale: 0.5, hue: 0.55, spin: true, wire: false };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "set":         return { ...doc, [intent.field]: intent.value };
    case "toggle-spin": return { ...doc, spin: !doc.spin };
    case "toggle-wire": return { ...doc, wire: !doc.wire };
    case "reset":       return { ...initial };
  }
}

// Map the normalized scale slider to the value the mesh actually uses, so the
// panel and the 3D readout never disagree.
const realScale = (s: number) => 0.4 + s * 2.2;

// ── The view: a pure Doc → Element panel ────────────────────────────────────

function view(doc: Doc): Element {
  const set = (field: "rotX" | "rotY" | "scale" | "hue") =>
    (value: number): Intent => ({ kind: "set", field, value });

  return Stack("root", { pad: 20, gap: 12, align: "start" }, [
    Card("panel", { title: "Transform", value: `${realScale(doc.scale).toFixed(2)}×` }, [
      Labeled("rx", "Rotate X", Slider("rx-s", { value: doc.rotX, set: set("rotX") })),
      Labeled("ry", "Rotate Y", Slider("ry-s", { value: doc.rotY, set: set("rotY") })),
      Labeled("sc", "Scale",    Slider("sc-s", { value: doc.scale, set: set("scale") })),
      Labeled("hu", "Hue",      Slider("hu-s", { value: doc.hue,   set: set("hue") })),
      Row("btns", { gap: 8 }, [
        Button("spin", { label: doc.spin ? "Spin ✓" : "Spin",  press: { kind: "toggle-spin" }, accent: doc.spin }),
        Button("wire", { label: doc.wire ? "Wire ✓" : "Wire",  press: { kind: "toggle-wire" }, accent: doc.wire }),
        Button("reset", { label: "Reset", press: { kind: "reset" }, danger: true }),
      ]),
    ]),
    Label("hint", {
      text: "Gratify HUD (canvas 2) composited over a live Three.js loop (canvas 1)",
      dim: true, size: 11,
    }),
  ]);
}

// ── Make the Gratify HUD canvas transparent ─────────────────────────────────
// The runtime clears with tokens.bg each frame. Zeroing its alpha (on both the
// live tokens and the dark palette it chases) makes the HUD see-through so the
// WebGL canvas underneath shows. Paired with the clearRect fix in painter.ts.
const transparent = rgb(0, 0, 0, 0);
tokens.bg = transparent;
themes.dark.bg = transparent;
themes.light.bg = transparent;

// ── Three.js scene (the 3D loop) ────────────────────────────────────────────

const glCanvas = document.getElementById("gl") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 6);

const geometry = new THREE.TorusKnotGeometry(1, 0.34, 160, 24);
const material = new THREE.MeshStandardMaterial({ color: 0x40baff, roughness: 0.28, metalness: 0.6 });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0x40baff, 0.9);  rim.position.set(-6, -2, -4); scene.add(rim);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

// ── Mount Gratify; keep the handle so the 3D loop can read the live doc ──────

const hud = document.getElementById("hud") as HTMLCanvasElement;
// `ambient: () => true` keeps the HUD loop awake so it always repaints in step
// with the 3D scene it floats over. Gratify would otherwise sleep when idle
// (correct for a standalone app); a live-3D HUD wants every frame.
const rt = mount(hud, { init: initial, update, view, ambient: () => true });

// ── The 3D clock: every frame, map the shared doc onto the mesh ─────────────

let last = performance.now();
let spinY = 0;
const color = new THREE.Color();

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const d = rt.doc;                         // <-- the shared source of truth
  if (d.spin) spinY += dt * 0.7;

  mesh.rotation.x = d.rotX * Math.PI * 2;
  mesh.rotation.y = d.rotY * Math.PI * 2 + spinY;
  mesh.scale.setScalar(realScale(d.scale));
  color.setHSL(d.hue, 0.65, 0.58);
  material.color.copy(color);
  material.wireframe = d.wire;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
