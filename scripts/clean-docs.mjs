// Clean the GitHub Pages output folder (docs/) before a build, PRESERVING
// markdown documents (docs/plan.md etc.) AND hand-authored assets (logo,
// social-preview card) — the folder is shared between the deployed demo, the
// repo's design docs, and a few committed source assets. Everything else is
// vite build output and safe to wipe.
import { readdirSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const docs = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");

// Committed, non-generated files that live in docs/ and must survive a rebuild.
const KEEP = new Set(["logo.svg", "social-card.html", "social-card.png"]);

for (const name of readdirSync(docs)) {
  if (name.endsWith(".md") || KEEP.has(name)) continue;
  rmSync(join(docs, name), { recursive: true, force: true });
}
console.log("docs/ cleaned (markdown preserved)");
