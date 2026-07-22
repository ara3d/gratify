const u="import|from|export|default|const|let|var|function|return|if|else|switch|case|for|while|do|new|type|interface|extends|implements|class|public|private|protected|readonly|static|void|null|undefined|true|false|this|typeof|keyof|in|of|as|async|await|break|continue|enum|declare|never|unknown|any|number|string|boolean|object|satisfies|instanceof",m=new RegExp(["(\\/\\/[^\\n]*)","(\\/\\*[\\s\\S]*?\\*\\/)","(\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)","\\b(\\d+(?:\\.\\d+)?)\\b",`\\b(${u})\\b`,"\\b([A-Z][A-Za-z0-9_]*)\\b"].join("|"),"g"),r=t=>t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function f(t){let n="",o=0;for(const e of t.matchAll(m)){n+=r(t.slice(o,e.index));const c=e[1]!==void 0||e[2]!==void 0?"tok-comment":e[3]!==void 0?"tok-string":e[4]!==void 0?"tok-number":e[5]!==void 0?"tok-keyword":"tok-type";n+=`<span class="${c}">${r(e[0])}</span>`,o=e.index+e[0].length}return n+=r(t.slice(o)),n}const b=`
  body { display: flex; flex-direction: row; }
  canvas { flex: 1 1 auto; min-width: 0; height: 100vh; }
  #source-panel {
    flex: 0 0 40%;
    max-width: 640px;
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
`;function x(t){const n=document.createElement("style");n.textContent=b,document.head.appendChild(n);const o=document.createElement("aside");o.id="source-panel";const e=document.createElement("div");e.className="tabs";const c=document.createElement("pre"),d=document.createElement("code");c.appendChild(d);const i=[],p=s=>{i.forEach((l,a)=>l.classList.toggle("active",a===s)),d.innerHTML=f(t[s].code),c.scrollTop=0};t.forEach((s,l)=>{const a=document.createElement("button");a.textContent=s.name,a.addEventListener("click",()=>p(l)),e.appendChild(a),i.push(a)}),o.appendChild(e),o.appendChild(c),document.body.appendChild(o),p(0)}export{x as a};
