import{m as p,S as g,L as a,R as f,s as b,e as c,f as l,t as w}from"./runtime-BQ2Zsp_3.js";import{b as m,L as h,S as y,C as k,w as v,c as u,B as d}from"./widgets-xXDkx298.js";import{a as x}from"./source-panel-CSqvtNlY.js";import{w as B}from"./widgets-BJYGvrkn.js";const T=`// ============================================================================\r
// Example: composites — "parts made of parts" (the body facet, layering rung 2).\r
//\r
// Two ways to build a widget out of other widgets:\r
//\r
//   RUNG 1 — a plain function (\`Labeled\` in widgets.ts). No framework at all:\r
//            it just arranges elements. Right when the arrangement is private\r
//            and nobody else needs to reach it.\r
//\r
//   RUNG 2 — a PART with a \`body\` facet (\`Card\` in widgets.ts). Named, themable,\r
//            and — the point — an extension SEAM: \`extendTheme("dark", "card",\r
//            …)\` reaches every card in the app, and \`mapBody\` can restructure\r
//            it. A plain function permits none of that.\r
//\r
// This file shows both, plus a use-site \`mapBody\` (inject a child into one\r
// card) and a theme-scope \`mapBody\` (add a footer to every card, live).\r
// ============================================================================\r
\r
import {\r
  Element,\r
  mapBody,                  // wrap the structure facet (three scopes)\r
  mount,\r
  setTheme, themeName,\r
  Stack, Row, Label,\r
  withExt,                  // scope 3: apply to one element\r
} from "gratify";\r
import { Button, Card, Checkbox, Labeled, Slider } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
// ── A theme-scope structural extension ────────────────────────────────────────\r
// \`mapBody\` receives the base body's output and returns a new list. Registered\r
// on the "card" part while a theme is active, it restructures EVERY card —\r
// code you own or not. Here it appends a footer row to each card's Stack.\r
const withFooter = mapBody((_props, _children, base): Element[] => {\r
  // base[0] is the Card's Stack("layout"); append a footer child inside it.\r
  const [layout, ...rest] = base;\r
  const stack = layout as Element;\r
  return [\r
    { ...stack, children: [...(stack.children ?? []), Label("footer", { text: "— themed footer —", dim: true, size: 10 })] },\r
    ...rest,\r
  ];\r
});\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
interface Doc {\r
  agreed: boolean;\r
  volume: number;\r
  footers: boolean;   // theme-scope mapBody on/off\r
  light: boolean;\r
}\r
\r
type Intent =\r
  | { kind: "agree" }\r
  | { kind: "set-volume"; value: number }\r
  | { kind: "toggle-footers" }\r
  | { kind: "toggle-theme" };\r
\r
function update(doc: Doc, intent: Intent): Doc {\r
  switch (intent.kind) {\r
    case "agree":\r
      return { ...doc, agreed: !doc.agreed };\r
    case "set-volume":\r
      return { ...doc, volume: intent.value };\r
    case "toggle-footers": {\r
      const footers = !doc.footers;\r
      // Scope 2: add/remove the structural extension on every card, live. The\r
      // runtime treats the theme bump as dirty and re-expands the bodies.\r
      if (footers) extendThemeBoth(withFooter);\r
      else clearThemeBoth();\r
      return { ...doc, footers };\r
    }\r
    case "toggle-theme":\r
      setTheme(themeName === "dark" ? "light" : "dark");\r
      return { ...doc, light: !doc.light };\r
  }\r
}\r
\r
// Register the extension under whichever theme names the app uses.\r
import { extendTheme, clearThemeExt } from "gratify";\r
const extendThemeBoth = (ext: ReturnType<typeof mapBody>) => {\r
  extendTheme("dark", "card", ext as (d: unknown) => unknown);\r
  extendTheme("light", "card", ext as (d: unknown) => unknown);\r
};\r
const clearThemeBoth = () => {\r
  clearThemeExt("dark", "card");\r
  clearThemeExt("light", "card");\r
};\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
function view(doc: Doc) {\r
  return Stack("root", { gap: 16, pad: 40 }, [\r
    Label("title", { text: "Composites — parts made of parts", size: 20, weight: 600, bright: true }),\r
\r
    // RUNG 2: a Card part. Its title/value chrome is ONE definition (widgets.ts),\r
    // used here with arbitrary content dropped into its slot.\r
    Card("settings", { title: "Settings", value: "card = rung 2" }, [\r
      // RUNG 1: a plain Labeled() function — private arrangement, no seam.\r
      Labeled("vol", "Volume", Slider("vol/s", { value: doc.volume, set: (value) => ({ kind: "set-volume", value }) })),\r
      Labeled("agree", "Agree", Checkbox("agree/c", { on: doc.agreed, toggle: { kind: "agree" } }), { kind: "agree" }),\r
    ]),\r
\r
    // SCOPE 3: a use-site mapBody injects an extra child into THIS card only.\r
    withExt(\r
      Card("promo", { title: "One card only", value: "use-site mapBody" }, [\r
        Label("promo/body", { text: "A badge was appended below by withExt(…, mapBody).", dim: true, size: 11 }),\r
      ]),\r
      mapBody((_p, _ch, base): Element[] => {\r
        const [layout, ...rest] = base;\r
        const stack = layout as Element;\r
        return [\r
          { ...stack, children: [...(stack.children ?? []), Button("promo/badge", { label: "Injected button", press: { kind: "agree" } })] },\r
          ...rest,\r
        ];\r
      }),\r
    ),\r
\r
    Row("controls", { gap: 14 }, [\r
      Button("footers", { label: doc.footers ? "Remove card footers" : "Add card footers (theme scope)", press: { kind: "toggle-footers" } }),\r
      Button("theme", { label: "Toggle theme", press: { kind: "toggle-theme" } }),\r
    ]),\r
\r
    Label("hint", {\r
      text: "Footers = a theme-scope mapBody on the card part; it reaches BOTH cards at once.",\r
      dim: true,\r
    }),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: { agreed: false, volume: 0.5, footers: false, light: false },\r
  update,\r
  view,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,S=u((e,t,r)=>{const[o,...s]=r,n=o;return[{...n,children:[...n.children??[],a("footer",{text:"— themed footer —",dim:!0,size:10})]},...s]});function E(e,t){switch(t.kind){case"agree":return{...e,agreed:!e.agreed};case"set-volume":return{...e,volume:t.value};case"toggle-footers":{const r=!e.footers;return r?R(S):C(),{...e,footers:r}}case"toggle-theme":return b(w==="dark"?"light":"dark"),{...e,light:!e.light}}}const R=e=>{c("dark","card",e),c("light","card",e)},C=()=>{l("dark","card"),l("light","card")};function L(e){return g("root",{gap:16,pad:40},[a("title",{text:"Composites — parts made of parts",size:20,weight:600,bright:!0}),m("settings",{title:"Settings",value:"card = rung 2"},[h("vol","Volume",y("vol/s",{value:e.volume,set:t=>({kind:"set-volume",value:t})})),h("agree","Agree",k("agree/c",{on:e.agreed,toggle:{kind:"agree"}}),{kind:"agree"})]),v(m("promo",{title:"One card only",value:"use-site mapBody"},[a("promo/body",{text:"A badge was appended below by withExt(…, mapBody).",dim:!0,size:11})]),u((t,r,o)=>{const[s,...n]=o,i=s;return[{...i,children:[...i.children??[],d("promo/badge",{label:"Injected button",press:{kind:"agree"}})]},...n]})),f("controls",{gap:14},[d("footers",{label:e.footers?"Remove card footers":"Add card footers (theme scope)",press:{kind:"toggle-footers"}}),d("theme",{label:"Toggle theme",press:{kind:"toggle-theme"}})]),a("hint",{text:"Footers = a theme-scope mapBody on the card part; it reaches BOTH cards at once.",dim:!0})])}const A=document.getElementById("c");p(A,{init:{agreed:!1,volume:.5,footers:!1,light:!1},update:E,view:L});x([{name:"main.ts",code:T},{name:"widgets.ts (shared)",code:B}]);
