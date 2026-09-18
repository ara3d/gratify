import{p as i,v as r,c as d,j as s,k as g,a as x,s as m,d as k,l as y,R as u,L as l,S as v,m as b}from"./runtime-BaMoeUMO.js";import{w}from"./middleware-DnFxgLOc.js";import{B as h}from"./widgets-BJEltdMZ.js";import{a as S}from"./source-panel-CSqvtNlY.js";const L=`// ============================================================================\r
// Example: dropdown & local state — the M3 acceptance test.\r
//\r
// ACCEPTANCE: the \`Select\` below is defined entirely at its own site — one\r
// part() chain — and used by passing (value, options, set). Its open flag is\r
// LOCAL state (guide §4d litmus test: it evaporates harmlessly), so the app\r
// Doc holds the SELECTION ONLY and undo/redo changes the selection but never\r
// opens or closes the list. Click the field to open — the list is a MODAL\r
// adornment, so it draws above everything, clicking an item emits exactly ONE\r
// app intent (Set), and clicking away (or Escape) closes it WITHOUT pressing\r
// whatever is underneath. Open/close animates via the list's own enter/exit\r
// channels — zero animate() calls.\r
//\r
// The scoops field shows the same reducer carrying a numeric DRAFT: click the\r
// value to start editing, −/＋ adjust the draft locally (undo history is\r
// untouched — watch the Undo button), ✓ forwards a single Set(n) on commit,\r
// ✕ discards. \`body\` swaps view↔edit structure from local state; the swap\r
// animates because the two rows are different keys.\r
//\r
// The three moves that make a dropdown, all visible below:\r
//   .local({...})    — declare private state by its initial value\r
//   .reduce(...)     — change it via Local(...) intents; forward commits onward\r
//   modal(adorn...)  — the popup: overlay layer + one click-away rule\r
// ============================================================================\r
\r
import {\r
  at, calpha, extendPart, Label, Local, modal, mount, part, rgb, Row, Stack,\r
  surface, v, withUndo,\r
} from "gratify";\r
import { Button } from "../shared/widgets";\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
\r
// ── App state: the selection and the scoop count. NO open flags, NO drafts. ──\r
\r
interface Doc { flavor: string; scoops: number; }\r
type Intent = { kind: "flavor"; value: string } | { kind: "scoops"; value: number };\r
\r
const FLAVORS = ["vanilla", "strawberry", "pistachio", "stracciatella", "espresso"];\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "flavor": return { ...doc, flavor: intent.value };\r
    case "scoops": return { ...doc, scoops: intent.value };\r
  }\r
}\r
\r
// ── Select — an enum dropdown, fully self-contained. ─────────────────────────\r
// Open/closed lives in \`.local\`; the app passes value + options + set and\r
// nothing else. \`Local(...)\` intents from the field, the list items, and the\r
// modal dismiss all land in \`.reduce\`; only \`set\` ever leaves the widget.\r
\r
type SelIntent = { kind: "toggle" } | { kind: "close" } | { kind: "pick"; value: string };\r
\r
const W = 230, ROW = 30;\r
\r
const OptionRow = part("option-row")\r
  .props<{ text: string; selected: boolean }>()\r
  .size(() => v(W - 12, ROW))\r
  .style((t, ch, p) => ({\r
    fill: calpha(t.accent, 0.22 * ch.hover + 0.1 * ch.press),\r
    text: t.mix(p.selected ? t.accent : t.text, t.textBright, ch.hover),\r
    tick: t.accent,\r
  }))\r
  .render((n, p, s) => {\r
    p.box(n.rect, 6, s.fill);\r
    p.label(n.props.text, v(n.rect.x + 26, n.rect.center.y), s.text, { align: "left", size: 13 });\r
    if (n.props.selected) p.label("✓", v(n.rect.x + 12, n.rect.center.y), s.tick, { size: 12, weight: 700 });\r
  })\r
  .press((n) => Local<SelIntent>({ kind: "pick", value: n.props.text }));\r
\r
// The popup panel: a themed Stack (extendPart keeps its layout, adds a skin).\r
// It enters/exits as a keyed adornment — that IS the open/close animation.\r
const ListPanel = extendPart("select-list", Stack)\r
  .style((t) => ({\r
    fill: t.mix(t.bg, t.surface, 0.7),\r
    edge: calpha(t.accent, 0.45),\r
    shadow: calpha(rgb(0, 0, 0), 0.6),\r
  }))\r
  .render((n, p, s) => {\r
    p.push();\r
    p.alpha(0.35 + 0.65 * n.ch.enter);\r
    p.glow(s.shadow, 18, () => p.box(n.rect, 8, s.fill, s.edge, 1));\r
    p.pop();\r
  });\r
\r
const Select = part("select")\r
  .props<{ value: string; options: string[]; set(v: string): Intent }>()\r
  .local({ open: false })\r
  .reduce((local, i: SelIntent, node): readonly [{ open: boolean }, Intent?] => {\r
    switch (i.kind) {\r
      case "toggle": return [{ open: !local.open }];\r
      case "close": return [{ open: false }];\r
      case "pick": return [{ open: false }, node.props.set(i.value)];\r
    }\r
  })\r
  .size(() => v(W, 34))\r
  // discrete local flag → continuous motion: the chevron chases \`open\`\r
  .channels({ open: { target: (n) => (n.local.open ? 1 : 0), rate: 14 } })\r
  .style((t, ch) => ({ ...surface(t, ch), accent: t.mix(t.muted, t.accent, ch.hover + ch.open) }))\r
  .render((n, p, s) => {\r
    p.box(n.rect, 8, s.fill, s.edge, 1);\r
    p.label(n.props.value, v(n.rect.x + 12, n.rect.center.y), s.text, { align: "left", weight: 500 });\r
    const c = v(n.rect.right - 16, n.rect.center.y);\r
    const k = 4, dy = k * (1 - 2 * n.ch.open);            // chevron flips as it opens\r
    p.line(v(c.x - k, c.y - dy / 2), v(c.x, c.y + dy / 2), s.accent, 2);\r
    p.line(v(c.x, c.y + dy / 2), v(c.x + k, c.y - dy / 2), s.accent, 2);\r
  })\r
  .press(() => Local<SelIntent>({ kind: "toggle" }))\r
  .adorn((n) => n.local.open\r
    ? [at(\r
        modal(\r
          ListPanel("list", { gap: 1, pad: 6 },\r
            n.props.options.map((o) => OptionRow(o, { text: o, selected: o === n.props.value }))),\r
          Local<SelIntent>({ kind: "close" })),                 // click-away / Escape\r
        v(n.rect.x, n.rect.bottom + 4))]\r
    : []);\r
\r
// ── ScoopsField — a draft editor: the reducer generalizes past a boolean. ────\r
// \`body\` swaps structure from local state (view row ↔ edit row); the draft\r
// only becomes real when ✓ forwards ONE Set(n) intent.\r
\r
type ScoopIntent = { kind: "begin" } | { kind: "adjust"; by: number } | { kind: "end"; commit: boolean };\r
\r
const Chip = part("scoop-chip")\r
  .props<{ text: string; accent?: boolean; to?: ScoopIntent }>()\r
  .size((p, m) => v(m.text(p.text).x + 24, 30))\r
  .style((t, ch, p) => ({ ...surface(t, ch, { tint: p.accent ? t.accent : undefined }) }))\r
  .render((n, p, s) => {\r
    p.box(n.rect, 8, s.fill, s.edge, 1);\r
    p.label(n.props.text, n.rect.center, s.text, { weight: 600 });\r
  })\r
  .press((n) => (n.props.to ? Local<ScoopIntent>(n.props.to) : undefined));\r
\r
const ScoopsField = part("scoops-field")\r
  .props<{ value: number; set(v: number): Intent }>()\r
  .local({ draft: null as number | null })\r
  .reduce((l, i: ScoopIntent, n): readonly [{ draft: number | null }, Intent?] => {\r
    switch (i.kind) {\r
      case "begin": return [{ draft: n.props.value }];\r
      case "adjust": return [{ draft: Math.max(1, Math.min(9, (l.draft ?? n.props.value) + i.by)) }];\r
      case "end": return [{ draft: null }, i.commit && l.draft != null ? n.props.set(l.draft) : undefined];\r
    }\r
  })\r
  .keys({ Escape: () => Local<ScoopIntent>({ kind: "end", commit: false }) })\r
  .body((p, _kids, l) => l.draft == null\r
    ? [Row("view", { gap: 8 }, [\r
        Chip("value", { text: \`\${p.value} scoop\${p.value === 1 ? "" : "s"}\`, to: { kind: "begin" } }),\r
        Label("hint", { text: "click to edit", dim: true, size: 11 }),\r
      ])]\r
    : [Row("edit", { gap: 6 }, [\r
        Chip("minus", { text: "−", to: { kind: "adjust", by: -1 } }),\r
        Chip("draft", { text: String(l.draft), accent: true }),\r
        Chip("plus", { text: "＋", to: { kind: "adjust", by: 1 } }),\r
        Chip("ok", { text: "✓", accent: true, to: { kind: "end", commit: true } }),\r
        Chip("cancel", { text: "✕", to: { kind: "end", commit: false } }),\r
      ])]);\r
\r
// ── View ─────────────────────────────────────────────────────────────────────\r
\r
const app = withUndo<Doc, Intent>({\r
  init: { flavor: "vanilla", scoops: 2 },\r
  update,\r
  view: (doc) => Stack("root", { gap: 14, pad: 40 }, [\r
    Label("title", { text: "Dropdown & local state — undo never re-opens it", size: 18, weight: 600, bright: true }),\r
    Label("sub", { text: "open the list, pick, click away, press Escape — then undo: the selection reverts, the popup stays shut", dim: true }),\r
\r
    Select("flavor", { value: doc.flavor, options: FLAVORS, set: (value) => ({ kind: "flavor", value }) }),\r
    ScoopsField("scoops", { value: doc.scoops, set: (value) => ({ kind: "scoops", value }) }),\r
\r
    Label("order", { text: \`order: \${doc.scoops}× \${doc.flavor}\`, dim: true }),\r
    Row("history", { gap: 8 }, [\r
      Button("undo", { label: "Undo", press: { kind: "undo" } }),\r
      Button("redo", { label: "Redo", press: { kind: "redo" } }),\r
    ]),\r
  ]),\r
});\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
mount(canvas, app);\r
\r
attachSourcePanel([{ name: "main.ts", code: mainSource }]);\r
`,I=["vanilla","strawberry","pistachio","stracciatella","espresso"];function O(e,t){switch(t.kind){case"flavor":return{...e,flavor:t.value};case"scoops":return{...e,scoops:t.value}}}const f=230,R=30,z=i("option-row").props().size(()=>r(f-12,R)).style((e,t,n)=>({fill:d(e.accent,.22*t.hover+.1*t.press),text:e.mix(n.selected?e.accent:e.text,e.textBright,t.hover),tick:e.accent})).render((e,t,n)=>{t.box(e.rect,6,n.fill),t.label(e.props.text,r(e.rect.x+26,e.rect.center.y),n.text,{align:"left",size:13}),e.props.selected&&t.label("✓",r(e.rect.x+12,e.rect.center.y),n.tick,{size:12,weight:700})}).press(e=>s({kind:"pick",value:e.props.text})),E=g("select-list",v).style(e=>({fill:e.mix(e.bg,e.surface,.7),edge:d(e.accent,.45),shadow:d(x(0,0,0),.6)})).render((e,t,n)=>{t.push(),t.alpha(.35+.65*e.ch.enter),t.glow(n.shadow,18,()=>t.box(e.rect,8,n.fill,n.edge,1)),t.pop()}),C=i("select").props().local({open:!1}).reduce((e,t,n)=>{switch(t.kind){case"toggle":return[{open:!e.open}];case"close":return[{open:!1}];case"pick":return[{open:!1},n.props.set(t.value)]}}).size(()=>r(f,34)).channels({open:{target:e=>e.local.open?1:0,rate:14}}).style((e,t)=>({...m(e,t),accent:e.mix(e.muted,e.accent,t.hover+t.open)})).render((e,t,n)=>{t.box(e.rect,8,n.fill,n.edge,1),t.label(e.props.value,r(e.rect.x+12,e.rect.center.y),n.text,{align:"left",weight:500});const o=r(e.rect.right-16,e.rect.center.y),p=4,c=p*(1-2*e.ch.open);t.line(r(o.x-p,o.y-c/2),r(o.x,o.y+c/2),n.accent,2),t.line(r(o.x,o.y+c/2),r(o.x+p,o.y-c/2),n.accent,2)}).press(()=>s({kind:"toggle"})).adorn(e=>e.local.open?[k(y(E("list",{gap:1,pad:6},e.props.options.map(t=>z(t,{text:t,selected:t===e.props.value}))),s({kind:"close"})),r(e.rect.x,e.rect.bottom+4))]:[]),a=i("scoop-chip").props().size((e,t)=>r(t.text(e.text).x+24,30)).style((e,t,n)=>({...m(e,t,{tint:n.accent?e.accent:void 0})})).render((e,t,n)=>{t.box(e.rect,8,n.fill,n.edge,1),t.label(e.props.text,e.rect.center,n.text,{weight:600})}).press(e=>e.props.to?s(e.props.to):void 0),P=i("scoops-field").props().local({draft:null}).reduce((e,t,n)=>{switch(t.kind){case"begin":return[{draft:n.props.value}];case"adjust":return[{draft:Math.max(1,Math.min(9,(e.draft??n.props.value)+t.by))}];case"end":return[{draft:null},t.commit&&e.draft!=null?n.props.set(e.draft):void 0]}}).keys({Escape:()=>s({kind:"end",commit:!1})}).body((e,t,n)=>n.draft==null?[u("view",{gap:8},[a("value",{text:`${e.value} scoop${e.value===1?"":"s"}`,to:{kind:"begin"}}),l("hint",{text:"click to edit",dim:!0,size:11})])]:[u("edit",{gap:6},[a("minus",{text:"−",to:{kind:"adjust",by:-1}}),a("draft",{text:String(n.draft),accent:!0}),a("plus",{text:"＋",to:{kind:"adjust",by:1}}),a("ok",{text:"✓",accent:!0,to:{kind:"end",commit:!0}}),a("cancel",{text:"✕",to:{kind:"end",commit:!1}})])]),j=w({init:{flavor:"vanilla",scoops:2},update:O,view:e=>v("root",{gap:14,pad:40},[l("title",{text:"Dropdown & local state — undo never re-opens it",size:18,weight:600,bright:!0}),l("sub",{text:"open the list, pick, click away, press Escape — then undo: the selection reverts, the popup stays shut",dim:!0}),C("flavor",{value:e.flavor,options:I,set:t=>({kind:"flavor",value:t})}),P("scoops",{value:e.scoops,set:t=>({kind:"scoops",value:t})}),l("order",{text:`order: ${e.scoops}× ${e.flavor}`,dim:!0}),u("history",{gap:8},[h("undo",{label:"Undo",press:{kind:"undo"}}),h("redo",{label:"Redo",press:{kind:"redo"}})])])}),A=document.getElementById("c");b(A,j);S([{name:"main.ts",code:L}]);
