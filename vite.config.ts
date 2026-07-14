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
  server: { port: 5199 },
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
        magnify: resolve(__dirname, "examples/magnify/index.html"),
        earthquake: resolve(__dirname, "examples/earthquake/index.html"),
        "widget-board": resolve(__dirname, "examples/widget-board/index.html"),
        adornments: resolve(__dirname, "examples/adornments/index.html"),
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
