import{m as o,S as d,L as i,R as a}from"./runtime-BQ2Zsp_3.js";import{C as s,i as l,B as c}from"./widgets-xXDkx298.js";import{a as m}from"./source-panel-CSqvtNlY.js";import{w as h}from"./widgets-BJYGvrkn.js";const g=`// ============================================================================\r
// Example: todo — keyed enter / exit / reflow.\r
//\r
// What to look for when you run it:\r
//   • "+ Add" pops a new row in (an automatic \`enter\` animation).\r
//   • Deleting a row fades it out while the rows below GLIDE UP to fill the\r
//     gap. Nobody wrote that animation: rows are keyed by a stable id, so the\r
//     runtime keeps each row's springs alive across state changes, and layout\r
//     changes simply give those springs new targets.\r
//   • Checking a row off springs the checkbox's \`on\` channel; the label\r
//     (part of the checkbox, so clicking the text toggles too) cross-fades\r
//     its dimming from the same channel.\r
//\r
// The one rule that buys all of this: KEY LIST ROWS BY A STABLE ID.\r
// ============================================================================\r
\r
import { mount, Stack, Row, Label } from "gratify";\r
import { Button, Checkbox, CloseButton } from "../shared/widgets";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import widgetsSource from "../shared/widgets.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface TodoItem {\r
  id: string;        // stable identity — this is what reconcile matches on\r
  text: string;\r
  done: boolean;\r
}\r
\r
interface TodoDocument {\r
  todos: TodoItem[];\r
  nextIdNumber: number;   // used to mint fresh ids\r
}\r
\r
type TodoIntent =\r
  | { kind: "add" }\r
  | { kind: "toggle-done"; id: string }\r
  | { kind: "remove"; id: string };\r
\r
// A little pool of task texts so "+ Add" has something to say.\r
const TASK_TEXT_POOL = [\r
  "Feed the kea", "Write the layering guide", "Port the kernel",\r
  "Spring all the things", "Delete a monolith", "Ship an example",\r
  "Wrap, don't edit", "Chase the target", "Let siblings glide",\r
];\r
\r
// ── Update: the single place state changes ────────────────────────────────────\r
\r
function update(document: TodoDocument, intent: TodoIntent): TodoDocument {\r
  switch (intent.kind) {\r
\r
    case "add": {\r
      const newItem: TodoItem = {\r
        id: \`todo-\${document.nextIdNumber}\`,\r
        text: TASK_TEXT_POOL[document.nextIdNumber % TASK_TEXT_POOL.length],\r
        done: false,\r
      };\r
      return {\r
        nextIdNumber: document.nextIdNumber + 1,\r
        todos: [...document.todos, newItem],\r
      };\r
    }\r
\r
    case "toggle-done":\r
      return {\r
        ...document,\r
        todos: document.todos.map((item) =>\r
          item.id === intent.id ? { ...item, done: !item.done } : item),\r
      };\r
\r
    case "remove":\r
      return {\r
        ...document,\r
        todos: document.todos.filter((item) => item.id !== intent.id),\r
      };\r
  }\r
}\r
\r
// ── View: Doc → Element tree ──────────────────────────────────────────────────\r
\r
function view(document: TodoDocument) {\r
  return Stack("root", { gap: 10, pad: 48 }, [\r
\r
    Label("title", { text: "Todos", size: 20, weight: 600, bright: true }),\r
\r
    // One Row per todo, keyed by the item's stable id. The text lives INSIDE\r
    // the checkbox (its \`label\` prop), so box and words are one hit target —\r
    // clicking the text toggles too, and the label's dimming cross-fades\r
    // through the checkbox's \`on\` channel.\r
    ...document.todos.map((item) =>\r
      Row(item.id, { gap: 10 }, [\r
\r
        Checkbox("check", {\r
          on: item.done,\r
          label: item.text,\r
          toggle: { kind: "toggle-done", id: item.id },\r
        }),\r
\r
        CloseButton("delete", {\r
          press: { kind: "remove", id: item.id },\r
        }),\r
      ]),\r
    ),\r
\r
    Button("add-button", {\r
      label: "+ Add",\r
      press: { kind: "add" },\r
      accent: true,\r
    }),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: {\r
    todos: [\r
      { id: "todo-a", text: "Try hovering things", done: false },\r
      { id: "todo-b", text: "Check one off", done: true },\r
      { id: "todo-c", text: "Delete one — watch the glide", done: false },\r
    ],\r
    nextIdNumber: 0,\r
  },\r
  update,\r
  view,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "widgets.ts (shared)", code: widgetsSource },\r
]);\r
`,r=["Feed the kea","Write the layering guide","Port the kernel","Spring all the things","Delete a monolith","Ship an example","Wrap, don't edit","Chase the target","Let siblings glide"];function u(e,n){switch(n.kind){case"add":{const t={id:`todo-${e.nextIdNumber}`,text:r[e.nextIdNumber%r.length],done:!1};return{nextIdNumber:e.nextIdNumber+1,todos:[...e.todos,t]}}case"toggle-done":return{...e,todos:e.todos.map(t=>t.id===n.id?{...t,done:!t.done}:t)};case"remove":return{...e,todos:e.todos.filter(t=>t.id!==n.id)}}}function p(e){return d("root",{gap:10,pad:48},[i("title",{text:"Todos",size:20,weight:600,bright:!0}),...e.todos.map(n=>a(n.id,{gap:10},[s("check",{on:n.done,label:n.text,toggle:{kind:"toggle-done",id:n.id}}),l("delete",{press:{kind:"remove",id:n.id}})])),c("add-button",{label:"+ Add",press:{kind:"add"},accent:!0})])}const b=document.getElementById("c");o(b,{init:{todos:[{id:"todo-a",text:"Try hovering things",done:!1},{id:"todo-b",text:"Check one off",done:!0},{id:"todo-c",text:"Delete one — watch the glide",done:!1}],nextIdNumber:0},update:u,view:p});m([{name:"main.ts",code:g},{name:"widgets.ts (shared)",code:h}]);
