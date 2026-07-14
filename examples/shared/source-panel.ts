// ============================================================================
// Source panel — shows each example's own TypeScript source in a syntax-
// colored viewer on the right-hand side of the page. Examples pass their
// source in via Vite's `?raw` imports, so the panel always shows exactly the
// code that is running. Zero dependencies: the highlighter below is a small
// regex tokenizer, good enough for our own instructional code.
// ============================================================================

export interface SourceFile {
  /** Tab label, e.g. "main.ts". */
  name: string;
  /** The raw TypeScript source (import it with `?raw`). */
  code: string;
}

// ---- a minimal TypeScript syntax highlighter ---------------------------------

const KEYWORDS =
  "import|from|export|default|const|let|var|function|return|if|else|switch|case|" +
  "for|while|do|new|type|interface|extends|implements|class|public|private|" +
  "protected|readonly|static|void|null|undefined|true|false|this|typeof|keyof|" +
  "in|of|as|async|await|break|continue|enum|declare|never|unknown|any|number|" +
  "string|boolean|object|satisfies|instanceof";

const TOKEN_PATTERN = new RegExp(
  [
    "(\\/\\/[^\\n]*)",                                   // 1: line comment
    "(\\/\\*[\\s\\S]*?\\*\\/)",                          // 2: block comment
    "(\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)", // 3: string
    "\\b(\\d+(?:\\.\\d+)?)\\b",                          // 4: number
    `\\b(${KEYWORDS})\\b`,                               // 5: keyword
    "\\b([A-Z][A-Za-z0-9_]*)\\b",                        // 6: Type-like identifier
  ].join("|"),
  "g",
);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Turn TypeScript source into HTML with token <span>s. */
export function highlight(code: string): string {
  let html = "";
  let last = 0;
  for (const m of code.matchAll(TOKEN_PATTERN)) {
    html += escapeHtml(code.slice(last, m.index));
    const cls =
      m[1] !== undefined || m[2] !== undefined ? "tok-comment"
      : m[3] !== undefined ? "tok-string"
      : m[4] !== undefined ? "tok-number"
      : m[5] !== undefined ? "tok-keyword"
      : "tok-type";
    html += `<span class="${cls}">${escapeHtml(m[0])}</span>`;
    last = m.index! + m[0].length;
  }
  html += escapeHtml(code.slice(last));
  return html;
}

// ---- the panel ------------------------------------------------------------------

const PANEL_CSS = `
  body { display: flex; flex-direction: row; }
  canvas { flex: 1 1 auto; min-width: 0; height: 100vh; }
  #source-panel {
    flex: 0 0 44%;
    max-width: 720px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #0d0f14;
    border-left: 1px solid #2a2f3c;
    font: 12.5px/1.55 "Cascadia Code", Consolas, ui-monospace, monospace;
  }
  #source-panel .tabs {
    display: flex; gap: 2px; padding: 8px 10px 0 10px;
    background: #12141a; border-bottom: 1px solid #2a2f3c;
  }
  #source-panel .tabs button {
    all: unset; cursor: pointer; padding: 6px 14px; border-radius: 7px 7px 0 0;
    color: #828a9c; font: 12px "Segoe UI", system-ui, sans-serif;
  }
  #source-panel .tabs button.active { background: #0d0f14; color: #e8ecf4; }
  #source-panel .tabs button:hover { color: #40baff; }
  #source-panel pre {
    margin: 0; padding: 14px 18px; overflow: auto; flex: 1;
    color: #c6cdd9; tab-size: 2; white-space: pre;
  }
  .tok-comment { color: #6b7d5e; font-style: italic; }
  .tok-string  { color: #d8a35a; }
  .tok-number  { color: #c792ea; }
  .tok-keyword { color: #559cd6; }
  .tok-type    { color: #4ec9b0; }
`;

/** Mount the source viewer on the right side of the page. */
export function attachSourcePanel(files: SourceFile[]) {
  const style = document.createElement("style");
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);

  const panel = document.createElement("aside");
  panel.id = "source-panel";

  const tabs = document.createElement("div");
  tabs.className = "tabs";
  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  pre.appendChild(codeEl);

  const buttons: HTMLButtonElement[] = [];
  const select = (index: number) => {
    buttons.forEach((b, i) => b.classList.toggle("active", i === index));
    codeEl.innerHTML = highlight(files[index].code);
    pre.scrollTop = 0;
  };

  files.forEach((file, index) => {
    const button = document.createElement("button");
    button.textContent = file.name;
    button.addEventListener("click", () => select(index));
    tabs.appendChild(button);
    buttons.push(button);
  });

  panel.appendChild(tabs);
  panel.appendChild(pre);
  document.body.appendChild(panel);
  select(0);
}
