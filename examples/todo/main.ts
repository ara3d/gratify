// Example: todo — proves keyed enter/exit/reflow (README §1 claims).
// You should see: "Add" pops a new row in; the checkbox check springs;
// deleting a row fades it out while siblings glide up. Rows are keyed by id —
// that one fact is the entire animation recipe.

import { mount, Stack, Row, Label } from "gratify";
import { Button, Checkbox, CloseButton } from "../shared/widgets";

interface Todo { id: string; text: string; done: boolean; }
interface Doc { todos: Todo[]; next: number; }

type Intent =
  | { kind: "add" }
  | { kind: "done"; id: string }
  | { kind: "remove"; id: string };

const POOL = [
  "Feed the kea", "Write the layering guide", "Port the kernel",
  "Spring all the things", "Delete a monolith", "Ship an example",
  "Wrap, don't edit", "Chase the target", "Let siblings glide",
];

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "add":
      return {
        next: doc.next + 1,
        todos: [...doc.todos, { id: `t${doc.next}`, text: POOL[doc.next % POOL.length], done: false }],
      };
    case "done":
      return { ...doc, todos: doc.todos.map((t) => (t.id === intent.id ? { ...t, done: !t.done } : t)) };
    case "remove":
      return { ...doc, todos: doc.todos.filter((t) => t.id !== intent.id) };
  }
}

function view(doc: Doc) {
  return Stack("root", { gap: 10, pad: 48 }, [
    Label("title", { text: "Todos", size: 20, weight: 600, bright: true }),
    ...doc.todos.map((t) =>
      Row(t.id, { gap: 10, states: { done: t.done } }, [
        Checkbox("check", { on: t.done, toggle: { kind: "done", id: t.id } }),
        Label("text", { text: t.text, dim: t.done, states: { done: t.done } }),
        CloseButton("x", { press: { kind: "remove", id: t.id } }),
      ]),
    ),
    Button("add", { label: "+ Add", press: { kind: "add" }, accent: true }),
  ]);
}

const canvas = document.getElementById("c") as HTMLCanvasElement;
mount(canvas, {
  init: {
    todos: [
      { id: "t-a", text: "Try hovering things", done: false },
      { id: "t-b", text: "Check one off", done: true },
      { id: "t-c", text: "Delete one — watch the glide", done: false },
    ],
    next: 0,
  },
  update,
  view,
});
