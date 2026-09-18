import { defineConfig } from "vite";
import { resolve } from "path";

// Multi-page: gallery root + one page per example.
// The build deploys to GitHub Pages from docs/ (served at /gratify/), so the
// base is relative and all hand-written links in the HTML are relative too.
export default defineConfig({
  base: "./",
  resolve: {
    alias: { gratify: resolve(__dirname, "src/gratify/index.ts") },
  },
  server: { port: Number(process.env.PORT) || 5199 },
  build: {
    outDir: "docs",
    emptyOutDir: false,       // scripts/clean-docs.mjs empties it, keeping *.md
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        counter: resolve(__dirname, "examples/counter/index.html"),
        todo: resolve(__dirname, "examples/todo/index.html"),
        toggles: resolve(__dirname, "examples/toggles/index.html"),
        undo: resolve(__dirname, "examples/undo/index.html"),
        extensions: resolve(__dirname, "examples/extensions/index.html"),
        "keyboard-and-drag": resolve(__dirname, "examples/keyboard-and-drag/index.html"),
        "node-editor": resolve(__dirname, "examples/node-editor/index.html"),
        borders: resolve(__dirname, "examples/borders/index.html"),
        "combo-button": resolve(__dirname, "examples/combo-button/index.html"),
        "global-effects": resolve(__dirname, "examples/global-effects/index.html"),
        "widget-board": resolve(__dirname, "examples/widget-board/index.html"),
        composites: resolve(__dirname, "examples/composites/index.html"),
        "split-pane": resolve(__dirname, "examples/split-pane/index.html"),
        "juice-gallery": resolve(__dirname, "examples/juice-gallery/index.html"),
        adornments: resolve(__dirname, "examples/adornments/index.html"),
        dropdown: resolve(__dirname, "examples/dropdown/index.html"),
        island: resolve(__dirname, "examples/island/index.html"),
        "three-transform": resolve(__dirname, "examples/three-transform/index.html"),
        "focus-semantics": resolve(__dirname, "examples/focus-semantics/index.html"),
        "data-grid": resolve(__dirname, "examples/data-grid/index.html"),
        "tree-view": resolve(__dirname, "examples/tree-view/index.html"),
        windows: resolve(__dirname, "examples/windows/index.html"),
        "schema-graph": resolve(__dirname, "examples/schema-graph/index.html"),
        workbench: resolve(__dirname, "examples/workbench/index.html"),
        attention: resolve(__dirname, "examples/attention/index.html"),
        hud: resolve(__dirname, "examples/hud/index.html"),
        "title-screen": resolve(__dirname, "examples/title-screen/index.html"),
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
