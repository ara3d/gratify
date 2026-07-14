import{m as a,d as i,S as s,L as o,R as r}from"./source-panel-cwX9nwkb.js";import{a as m,b as l,B as c}from"./widgets-DkU5qRHh.js";import{w as h}from"./widgets-deNE_SuD.js";const u=`// ============================================================================
// Example: todo — keyed enter / exit / reflow.
//
// What to look for when you run it:
//   • "+ Add" pops a new row in (an automatic \`enter\` animation).
//   • Deleting a row fades it out while the rows below GLIDE UP to fill the
//     gap. Nobody wrote that animation: rows are keyed by a stable id, so the
//     runtime keeps each row's springs alive across state changes, and layout
//     changes simply give those springs new targets.
//   • Checking a row off flips a \`done\` state tag. The tag automatically
//     becomes an animated channel, so the label's dimming cross-fades.
//
// The one rule that buys all of this: KEY LIST ROWS BY A STABLE ID.
// ============================================================================

import { mount, Stack, Row, Label } from "gratify";
import { Button, Checkbox, CloseButton } from "../shared/widgets";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import widgetsSource from "../shared/widgets.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface TodoItem {
  id: string;        // stable identity — this is what reconcile matches on
  text: string;
  done: boolean;
}

interface TodoDocument {
  todos: TodoItem[];
  nextIdNumber: number;   // used to mint fresh ids
}

type TodoIntent =
  | { kind: "add" }
  | { kind: "toggle-done"; id: string }
  | { kind: "remove"; id: string };

// A little pool of task texts so "+ Add" has something to say.
const TASK_TEXT_POOL = [
  "Feed the kea", "Write the layering guide", "Port the kernel",
  "Spring all the things", "Delete a monolith", "Ship an example",
  "Wrap, don't edit", "Chase the target", "Let siblings glide",
];

// ── Update: the single place state changes ────────────────────────────────────

function update(document: TodoDocument, intent: TodoIntent): TodoDocument {
  switch (intent.kind) {

    case "add": {
      const newItem: TodoItem = {
        id: \`todo-\${document.nextIdNumber}\`,
        text: TASK_TEXT_POOL[document.nextIdNumber % TASK_TEXT_POOL.length],
        done: false,
      };
      return {
        nextIdNumber: document.nextIdNumber + 1,
        todos: [...document.todos, newItem],
      };
    }

    case "toggle-done":
      return {
        ...document,
        todos: document.todos.map((item) =>
          item.id === intent.id ? { ...item, done: !item.done } : item),
      };

    case "remove":
      return {
        ...document,
        todos: document.todos.filter((item) => item.id !== intent.id),
      };
  }
}

// ── View: Doc → Element tree ──────────────────────────────────────────────────
//
// Note the \`states: { done: item.done }\` on each row: state tags are open-
// ended labels projected FROM the model BY the view. Each one automatically
// gets an animated channel, which the Label widget reads to dim itself.

function view(document: TodoDocument) {
  return Stack("root", { gap: 10, pad: 48 }, [

    Label("title", { text: "Todos", size: 20, weight: 600, bright: true }),

    // One Row per todo, keyed by the item's stable id.
    ...document.todos.map((item) =>
      Row(item.id, { gap: 10, states: { done: item.done } }, [

        Checkbox("check", {
          on: item.done,
          toggle: { kind: "toggle-done", id: item.id },
        }),

        Label("text", {
          text: item.text,
          dim: item.done,
          states: { done: item.done },
        }),

        CloseButton("delete", {
          press: { kind: "remove", id: item.id },
        }),
      ]),
    ),

    Button("add-button", {
      label: "+ Add",
      press: { kind: "add" },
      accent: true,
    }),
  ]);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: {
    todos: [
      { id: "todo-a", text: "Try hovering things", done: false },
      { id: "todo-b", text: "Check one off", done: true },
      { id: "todo-c", text: "Delete one — watch the glide", done: false },
    ],
    nextIdNumber: 0,
  },
  update,
  view,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "widgets.ts (shared)", code: widgetsSource },
]);
`,d=["Feed the kea","Write the layering guide","Port the kernel","Spring all the things","Delete a monolith","Ship an example","Wrap, don't edit","Chase the target","Let siblings glide"];function g(n,e){switch(e.kind){case"add":{const t={id:`todo-${n.nextIdNumber}`,text:d[n.nextIdNumber%d.length],done:!1};return{nextIdNumber:n.nextIdNumber+1,todos:[...n.todos,t]}}case"toggle-done":return{...n,todos:n.todos.map(t=>t.id===e.id?{...t,done:!t.done}:t)};case"remove":return{...n,todos:n.todos.filter(t=>t.id!==e.id)}}}function p(n){return s("root",{gap:10,pad:48},[o("title",{text:"Todos",size:20,weight:600,bright:!0}),...n.todos.map(e=>r(e.id,{gap:10,states:{done:e.done}},[m("check",{on:e.done,toggle:{kind:"toggle-done",id:e.id}}),o("text",{text:e.text,dim:e.done,states:{done:e.done}}),l("delete",{press:{kind:"remove",id:e.id}})])),c("add-button",{label:"+ Add",press:{kind:"add"},accent:!0})])}const w=document.getElementById("c");a(w,{init:{todos:[{id:"todo-a",text:"Try hovering things",done:!1},{id:"todo-b",text:"Check one off",done:!0},{id:"todo-c",text:"Delete one — watch the glide",done:!1}],nextIdNumber:0},update:g,view:p});i([{name:"main.ts",code:u},{name:"widgets.ts (shared)",code:h}]);
