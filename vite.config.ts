import { defineConfig } from "vite";
import { resolve } from "path";

// Multi-page: gallery root + one page per example.
export default defineConfig({
  resolve: {
    alias: { gratify: resolve(__dirname, "src/gratify/index.ts") },
  },
  server: { port: 5199 },
  build: {
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
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
