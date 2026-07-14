// Host-boundary check (plan §0.1): the framework package imports no example
// module — ever. Kea paid for breaking this rule; Gratify enforces it in CI.
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const root = new URL("../src/gratify", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const bad = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js)$/.test(name)) {
      const src = readFileSync(p, "utf8");
      const re = /from\s+["'][^"']*(examples\/|\.\.\/\.\.\/examples)[^"']*["']/g;
      if (re.test(src)) bad.push(p);
    }
  }
}

walk(root);
if (bad.length) {
  console.error("BOUNDARY VIOLATION — framework imports example code:");
  for (const p of bad) console.error("  " + p);
  process.exit(1);
}
console.log("boundary check ok: framework imports no example module");
