// Two greppable house rules (plan §0.1, §S3):
//  1. Host boundary: the framework package imports no example module — ever.
//     Kea paid for breaking this rule; Gratify enforces it in CI.
//  2. Style boundary: a file that DEFINES a part must not import the `tokens`
//     singleton. Style functions receive tokens; render receives the resolved
//     style. Reading `tokens` inside a part is the exact failure mode (skipped
//     style facet → not restylable). App-level free drawing (fx, ramps) may
//     still import `tokens` because those files define no parts.
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const abs = (rel) =>
  new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const boundaryBad = [];   // rule 1
const tokenBad = [];      // rule 2

/** Strip // line and /* block *\/ comments so commas inside comments don't
 *  corrupt the naive import split. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** The set of identifiers a module pulls in via `import { … } from …`. */
function namedImports(src) {
  const names = new Set();
  for (const m of stripComments(src).matchAll(/import\s*(?:type\s*)?{([^}]*)}\s*from/g)) {
    for (const raw of m[1].split(",")) {
      const id = raw.trim().split(/\s+as\s+/)[0].trim();
      if (id) names.add(id);
    }
  }
  return names;
}

function walk(dir, { checkTokens }) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, { checkTokens });
    else if (/\.(ts|tsx|js)$/.test(name)) {
      const src = readFileSync(p, "utf8");
      if (/from\s+["'][^"']*(examples\/|\.\.\/\.\.\/examples)[^"']*["']/.test(src)) boundaryBad.push(p);
      if (checkTokens) {
        const named = namedImports(src);
        // A part-defining file imports `part`; it must not also import `tokens`.
        if (named.has("part") && named.has("tokens")) tokenBad.push(p);
      }
    }
  }
}

walk(abs("../src/gratify"), { checkTokens: true });      // rules 1 + 2
walk(abs("../examples"), { checkTokens: true });          // rule 2 (+ rule 1, always clean here)

let failed = false;
// rule 1 only applies to framework files (examples importing examples is fine)
const frameworkBad = boundaryBad.filter((p) => p.includes(join("src", "gratify")));
if (frameworkBad.length) {
  failed = true;
  console.error("BOUNDARY VIOLATION — framework imports example code:");
  for (const p of frameworkBad) console.error("  " + p);
}
if (tokenBad.length) {
  failed = true;
  console.error("STYLE VIOLATION — a part-defining file imports the `tokens` singleton");
  console.error("(move the value into a style() facet; render reads style, not tokens):");
  for (const p of tokenBad) console.error("  " + p);
}
if (failed) process.exit(1);
console.log("boundary check ok: framework imports no example module; no part reads tokens");
