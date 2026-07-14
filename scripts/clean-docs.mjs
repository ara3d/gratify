// Clean the GitHub Pages output folder (docs/) before a build, PRESERVING
// markdown documents (docs/plan.md etc.) — the folder is shared between the
// deployed demo and the repo's design docs.
import { readdirSync, rmSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const docs = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");

for (const name of readdirSync(docs)) {
  if (name.endsWith(".md")) continue;
  rmSync(join(docs, name), { recursive: true, force: true });
}
console.log("docs/ cleaned (markdown preserved)");
