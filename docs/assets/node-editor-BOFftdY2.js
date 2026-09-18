import{p as d,c,G as f,z as k,m as S,y as E,S as x,L as I,v as i,x as A,P as v,K as P,A as N,r as R,h as T,a as g,B as G}from"./runtime-BaMoeUMO.js";import{b as C}from"./effects-sMK-JssO.js";import{a as D}from"./source-panel-CSqvtNlY.js";const O=d("slice-line",{style:e=>({stroke:e.danger}),render(e,r,n){r.line(e.props.a,e.props.b,c(n.stroke,.9),2),r.dot(e.props.a,3,n.stroke),r.dot(e.props.b,3,n.stroke)}});function _(e){return f({begin:(r,n,t)=>t.mods.shift?{a:n,b:n}:null,move:(r,n,t)=>({...r,b:t}),view:r=>[O("slice-preview",{a:r.a,b:r.b})],up(r,n,t,o){const s=[];for(const a of e(n.props)){const l=o.anchor(a.from),p=o.anchor(a.to);if(!l||!p)continue;k(l.pos,p.pos,r.a,r.b)&&s.push({kind:"disconnect",id:a.id})}return s}})}const W=`// ============================================================================\r
// Example: node editor — the editor-tier flagship.\r
//\r
// Everything editor-grade here is built from ordinary Gratify concepts:\r
//\r
//   • THE SURFACE IS A PART. The dot grid is its render; pan/zoom is its\r
//     Pan() interactor; Delete-to-cut is its Keys(); the slice gesture\r
//     (slice.ts — a separate app file) is just one more entry in its \`on:\`.\r
//\r
//   • WIRES ARE ELEMENTS. Each edge in the document becomes a keyed Wire\r
//     element whose geometry is two ANCHOR REFERENCES. Because wires are real\r
//     elements they hit-test (by distance to the curve), select, theme, and\r
//     exit-fade when deleted — none of that is special-cased.\r
//\r
//   • ANCHORS connect geometry between parts: each node publishes the world\r
//     position of its sockets every layout pass; wires and gestures resolve\r
//     them through the read-only query.\r
//\r
// Controls: drag node body = move · drag a socket = wire (snaps green) ·\r
// click wire = select, Del = cut · Shift-drag empty = slice · drag empty =\r
// pan · wheel = zoom.\r
// ============================================================================\r
\r
import {\r
  Anchor,\r
  burst,\r
  calpha, Color,\r
  Element,\r
  Free,             // container that places children at their props.pos\r
  Gesture,\r
  GNode,\r
  hsl,\r
  Keys,\r
  mount,\r
  Pan,              // surface interactor: drag empty space pans, wheel zooms\r
  part,\r
  Press,\r
  rect, rgb,\r
  v, Vec, vdist,\r
  wireDist,         // distance from a point to a wire curve (hit-testing)\r
  Stack, Label,\r
} from "gratify";\r
import { slice, EdgeRef } from "./slice";\r
\r
import { attachSourcePanel } from "../shared/source-panel";\r
import mainSource from "./main.ts?raw";\r
import sliceSource from "./slice.ts?raw";\r
\r
// ── State ─────────────────────────────────────────────────────────────────────\r
\r
interface GraphNode {\r
  id: string;\r
  title: string;\r
  hue: number;      // header accent color\r
  pos: Vec;         // world-space position — Free reads this to place the node\r
}\r
\r
interface GraphDocument {\r
  nodes: Record<string, GraphNode>;\r
  edges: EdgeRef[];\r
  selectedEdgeId: string | null;\r
}\r
\r
type GraphIntent =\r
  | { kind: "move"; id: string; pos: Vec }\r
  | { kind: "connect"; a: string; b: string }      // two anchor ids, either order\r
  | { kind: "disconnect"; id: string }\r
  | { kind: "select"; id: string | null };\r
\r
let nextEdgeNumber = 100;\r
\r
function update(document: GraphDocument, intent: GraphIntent): GraphDocument {\r
  switch (intent.kind) {\r
\r
    case "move":\r
      return {\r
        ...document,\r
        nodes: { ...document.nodes, [intent.id]: { ...document.nodes[intent.id], pos: intent.pos } },\r
      };\r
\r
    case "connect": {\r
      // Normalize so \`from\` is always the output socket.\r
      const [from, to] = intent.a.endsWith("/out") ? [intent.a, intent.b] : [intent.b, intent.a];\r
\r
      // An input holds exactly one wire: connecting replaces what was there.\r
      const remainingEdges = document.edges.filter((edge) => edge.to !== to);\r
\r
      return {\r
        ...document,\r
        edges: [...remainingEdges, { id: \`edge-\${nextEdgeNumber++}\`, from, to }],\r
      };\r
    }\r
\r
    case "disconnect":\r
      return {\r
        ...document,\r
        edges: document.edges.filter((edge) => edge.id !== intent.id),\r
        selectedEdgeId: document.selectedEdgeId === intent.id ? null : document.selectedEdgeId,\r
      };\r
\r
    case "select":\r
      return { ...document, selectedEdgeId: intent.id };\r
  }\r
}\r
\r
// ── Socket-compatibility rules (the app's business, passed to gestures) --------\r
\r
const socketKind = (anchorId: string) => (anchorId.endsWith("/out") ? "out" : "in");\r
const nodeOfSocket = (anchorId: string) => anchorId.split("/")[0];\r
\r
/** A wire may connect an output to an input on a different node. */\r
const canConnect = (fromAnchorId: string, candidate: Anchor) =>\r
  socketKind(fromAnchorId) !== socketKind(candidate.id) &&\r
  nodeOfSocket(fromAnchorId) !== nodeOfSocket(candidate.id);\r
\r
// ── The surface ───────────────────────────────────────────────────────────────\r
\r
interface SurfaceProps {\r
  edges: EdgeRef[];\r
  selectedEdgeId: string | null;\r
}\r
\r
const Surface = part<SurfaceProps, { gridDot: Color }>("surface", {\r
\r
  style: (t) => ({ gridDot: calpha(t.muted, 0.35) }),\r
\r
  // The surface is the infinite canvas behind everything: it fills whatever\r
  // room it's offered (the viewport).\r
  measure: (_p, avail) => avail,\r
  hit: () => true,\r
\r
  // Its render is the dot grid. node.view carries the live viewport, so we\r
  // only draw the dots that are actually visible.\r
  render(node, painter, style) {\r
    const viewport = node.view!;\r
    const GRID_SPACING = 28;\r
\r
    const worldLeft = Math.floor(-viewport.pan.x / viewport.zoom / GRID_SPACING) * GRID_SPACING;\r
    const worldRight = (viewport.w - viewport.pan.x) / viewport.zoom;\r
    const worldTop = Math.floor(-viewport.pan.y / viewport.zoom / GRID_SPACING) * GRID_SPACING;\r
    const worldBottom = (viewport.h - viewport.pan.y) / viewport.zoom;\r
\r
    for (let x = worldLeft; x <= worldRight; x += GRID_SPACING) {\r
      for (let y = worldTop; y <= worldBottom; y += GRID_SPACING) {\r
        painter.dot(v(x, y), 1, style.gridDot);\r
      }\r
    }\r
  },\r
\r
  on: [\r
    // The slice gesture from slice.ts — declines unless Shift is held,\r
    // so it composes cleanly with Pan below.\r
    slice((props) => (props as SurfaceProps).edges),\r
\r
    // Drag empty space to pan; mouse wheel zooms toward the cursor.\r
    Pan(),\r
\r
    // Clicking empty space clears the wire selection.\r
    Press(() => ({ kind: "select", id: null })),\r
\r
    // Delete cuts the selected wire. Keys on the surface act as the\r
    // editor-wide fallback (nothing else claimed the key first).\r
    Keys({\r
      Delete: (node: GNode<SurfaceProps>) =>\r
        node.props.selectedEdgeId ? { kind: "disconnect", id: node.props.selectedEdgeId } : null,\r
      Backspace: (node: GNode<SurfaceProps>) =>\r
        node.props.selectedEdgeId ? { kind: "disconnect", id: node.props.selectedEdgeId } : null,\r
    }),\r
  ],\r
});\r
\r
// ── Nodes ─────────────────────────────────────────────────────────────────────\r
\r
interface NodeProps {\r
  id: string;\r
  title: string;\r
  hue: number;\r
  pos: Vec;\r
}\r
\r
interface NodeStyle {\r
  fill: Color;\r
  edge: Color;\r
  text: Color;\r
  lift: number;\r
  socket: Color;\r
}\r
\r
const SOCKET_RADIUS = 5.5;\r
const SOCKET_GRAB_RADIUS = 14;   // how close a press must be to start a wire\r
\r
const GraphNodePart = part<NodeProps, NodeStyle>("graph-node", {\r
\r
  size: () => v(150, 56),\r
\r
  // ANCHORS: publish the world position of both sockets each layout pass.\r
  // Wires, the magnetic snap, and connect-bursts all read these — geometry\r
  // between parts flows through the anchor registry, never through globals.\r
  anchors: (node) => [\r
    { id: \`\${node.props.id}/in\`, pos: v(node.rect.x, node.rect.center.y), meta: { kind: "in" } },\r
    { id: \`\${node.props.id}/out\`, pos: v(node.rect.right, node.rect.center.y), meta: { kind: "out" } },\r
  ],\r
\r
  style(t, channels): NodeStyle {\r
    return {\r
      fill: t.mix(t.surface, t.surfaceHi, 0.4 * channels.hover + 0.6 * channels.drag),\r
      edge: t.mix(t.muted, t.accent, 0.5 * channels.hover + 0.5 * channels.drag),\r
      text: t.mix(t.text, t.textBright, channels.hover),\r
      lift: 3 * channels.drag,\r
      socket: t.accent,\r
    };\r
  },\r
\r
  render(node, painter, style) {\r
    const r = node.rect.raise(style.lift);\r
    painter.box(r, 10, style.fill, style.edge, 1.2);\r
    painter.box(rect(r.x, r.y, r.w, 6), 3, hsl(node.props.hue, 0.7, 0.55));   // header stripe\r
    painter.label(node.props.title, v(r.x + 12, r.center.y + 3), style.text, { align: "left", weight: 500 });\r
\r
    // The sockets, drawn at the same spots the anchors publish.\r
    painter.dot(v(r.x, r.center.y), SOCKET_RADIUS, style.socket);\r
    painter.dot(v(r.right, r.center.y), SOCKET_RADIUS, style.socket);\r
  },\r
\r
  on: [\r
    // GESTURE 1 — wire drag. Starts ONLY if the press lands near a socket;\r
    // otherwise begin() returns null and the node-move gesture (below) runs.\r
    Gesture<NodeProps, { fromAnchorId: string; cursor: Vec; snap?: Anchor }>({\r
\r
      begin(node, pointer, query) {\r
        for (const suffix of ["/out", "/in"]) {\r
          const anchor = query.anchor(node.props.id + suffix);\r
          if (anchor && vdist(anchor.pos, pointer) < SOCKET_GRAB_RADIUS) {\r
            return { fromAnchorId: anchor.id, cursor: pointer };\r
          }\r
        }\r
        return null;   // not near a socket — decline\r
      },\r
\r
      // Magnetic snap: ask the query for the nearest COMPATIBLE socket within\r
      // 26 world pixels. The compatibility predicate is the app's, not the\r
      // framework's.\r
      move: (state, _node, pointer, query) => ({\r
        ...state,\r
        cursor: pointer,\r
        snap: query.nearestAnchor(pointer, 26, (candidate) => canConnect(state.fromAnchorId, candidate)),\r
      }),\r
\r
      // The live rubber wire — an overlay element re-described every frame.\r
      view(state, query) {\r
        const fromAnchor = query.anchor(state.fromAnchorId);\r
        if (!fromAnchor) return [];\r
        return [RubberWire("rubber-wire", {\r
          a: fromAnchor.pos,\r
          b: state.snap?.pos ?? state.cursor,\r
          snapped: state.snap !== undefined,\r
        })];\r
      },\r
\r
      up(state, node) {\r
        if (!state.snap) return;                                  // dropped on nothing\r
        node.spawn?.(burst(state.snap.pos, SNAP_SPARK));          // one-shot juice\r
        return { kind: "connect", a: state.fromAnchorId, b: state.snap.id };\r
      },\r
    }),\r
\r
    // GESTURE 2 — node move. \`during\` dispatches a move intent on every\r
    // pointer move; the node's position spring is what makes it glide.\r
    Gesture<NodeProps, { grabOffset: Vec }>({\r
\r
      begin: (node, pointer) => ({\r
        grabOffset: v(pointer.x - node.props.pos.x, pointer.y - node.props.pos.y),\r
      }),\r
\r
      during: (state, node, pointer) => ({\r
        kind: "move",\r
        id: node.props.id,\r
        pos: v(pointer.x - state.grabOffset.x, pointer.y - state.grabOffset.y),\r
      }),\r
    }),\r
  ],\r
});\r
\r
// ── Wires (connectors) ─────────────────────────────────────────────────────────\r
\r
interface WireProps {\r
  id: string;\r
  from: string;   // anchor id\r
  to: string;     // anchor id\r
  states?: Record<string, boolean>;\r
}\r
\r
// A fixed accent for the one-shot connect spark. A part-defining file may not\r
// import the \`tokens\` singleton (npm run check), and a gesture callback has no\r
// style facet to read; a constant juice color is fine for a transient burst.\r
const SNAP_SPARK = rgb(64, 186, 255);\r
\r
const Wire = part<WireProps, { color: Color; selected: number }>("wire", {\r
\r
  // The gold selection blend is resolved HERE, in style — render just paints it.\r
  style: (t, channels) => {\r
    const selected = channels.sel || 0;     // the \`sel\` state tag, eased 0..1\r
    return {\r
      color: selected > 0.02 ? t.mix(t.accent, rgb(255, 200, 80), selected) : t.accent,\r
      selected,\r
    };\r
  },\r
\r
  // Custom hit test: a wire is "hit" when the pointer is within 8 world px\r
  // of its curve — not its bounding rect.\r
  hit(node, pointer) {\r
    const a = node.anchor?.(node.props.from);\r
    const b = node.anchor?.(node.props.to);\r
    return !!a && !!b && wireDist(a, b, pointer) < 8;\r
  },\r
\r
  render(node, painter, style) {\r
    const a = node.anchor?.(node.props.from);\r
    const b = node.anchor?.(node.props.to);\r
    if (!a || !b) return;   // an endpoint's node is mid-exit — skip a frame\r
\r
    // Shadow pass, then the wire itself. Selection blends toward gold and\r
    // thickens; hover thickens slightly (the affordance for "clickable").\r
    painter.wire(a, b, calpha(rgb(0, 0, 0), 0.35), 4.5);\r
    painter.wire(a, b, calpha(style.color, 0.9), 2.2 + 1.6 * style.selected + 0.8 * node.ch.hover);\r
  },\r
\r
  on: [\r
    Press((node: GNode<WireProps>) => ({ kind: "select", id: node.props.id })),\r
  ],\r
});\r
\r
// ── The rubber-wire preview (overlay layer) ─────────────────────────────────────\r
\r
interface RubberWireProps {\r
  a: Vec;\r
  b: Vec;\r
  snapped: boolean;   // true → green "will connect" look\r
}\r
\r
const RubberWire = part<RubberWireProps, { color: Color }>("rubber-wire", {\r
\r
  style: (t) => ({ color: t.accent }),\r
\r
  render(node, painter, style) {\r
    const color = node.props.snapped\r
      ? rgb(90, 220, 130)                  // green: release to connect\r
      : calpha(style.color, 0.8);\r
    painter.wire(node.props.a, node.props.b, color, node.props.snapped ? 2.6 : 2);\r
    painter.dot(node.props.b, 4, color);\r
  },\r
});\r
\r
// ── View ──────────────────────────────────────────────────────────────────────\r
\r
/** Mark an element (and its subtree) as screen-layer: untransformed HUD. */\r
const onScreenLayer = (element: Element): Element => ({ ...element, layer: "screen" });\r
\r
function view(document: GraphDocument): Element {\r
  return Surface("root", { edges: document.edges, selectedEdgeId: document.selectedEdgeId }, [\r
\r
    // World-layer content. Wires first, so nodes draw over them.\r
    Free("graph", {}, [\r
\r
      ...document.edges.map((edge) =>\r
        Wire(edge.id, {\r
          id: edge.id,\r
          from: edge.from,\r
          to: edge.to,\r
          states: { sel: document.selectedEdgeId === edge.id },\r
        })),\r
\r
      ...Object.values(document.nodes).map((graphNode) =>\r
        GraphNodePart(graphNode.id, {\r
          id: graphNode.id,\r
          title: graphNode.title,\r
          hue: graphNode.hue,\r
          pos: graphNode.pos,\r
        })),\r
    ]),\r
\r
    // Screen-layer HUD: stays put while the world pans and zooms.\r
    onScreenLayer(Stack("hud", { pad: 12 }, [\r
      Label("hint", {\r
        text: "drag node · drag socket = wire · click wire + Del = cut · Shift-drag = slice · drag/wheel = pan/zoom",\r
        dim: true, size: 12,\r
      }),\r
    ])),\r
  ]);\r
}\r
\r
// ── Mount ─────────────────────────────────────────────────────────────────────\r
\r
const makeNode = (id: string, title: string, hue: number, x: number, y: number): GraphNode =>\r
  ({ id, title, hue, pos: v(x, y) });\r
\r
const canvas = document.getElementById("c") as HTMLCanvasElement;\r
\r
mount(canvas, {\r
  init: {\r
    nodes: {\r
      time: makeNode("time", "Time", 200, 120, 140),\r
      noise: makeNode("noise", "Noise", 260, 120, 300),\r
      mix: makeNode("mix", "Mix", 140, 380, 220),\r
      out: makeNode("out", "Output", 30, 640, 220),\r
    },\r
    edges: [\r
      { id: "edge-1", from: "time/out", to: "mix/in" },\r
      { id: "edge-2", from: "mix/out", to: "out/in" },\r
    ],\r
    selectedEdgeId: null,\r
  },\r
  update,\r
  view,\r
});\r
\r
attachSourcePanel([\r
  { name: "main.ts", code: mainSource },\r
  { name: "slice.ts", code: sliceSource },\r
]);\r
`,z=`// ============================================================================\r
// slice.ts — a NEW editor gesture in ONE app-side file, zero framework edits.\r
//\r
// Hold Shift and drag a line across wires: every wire the line crosses is\r
// cut, Blender-style. This file is the plan's M3 acceptance test, and it uses\r
// exactly the three bounded powers a Gratify gesture gets:\r
//\r
//   1. PRIVATE STATE — the two endpoints of the line being dragged.\r
//   2. THE QUERY    — read-only scene access: anchor positions (where the\r
//                     wires actually are right now) and modifier keys.\r
//   3. AN OVERLAY VIEW — the red preview line, contributed as an ordinary\r
//                     element while the gesture runs. The element tree stays\r
//                     the whole truth of what is on screen, even mid-drag.\r
//\r
// Writes still travel one road: the intents returned from up().\r
// ============================================================================\r
\r
import {\r
  calpha, Color,\r
  Gesture,\r
  Interactor,\r
  part,\r
  Vec,\r
  wireCrossesSegment,   // sampled bezier-vs-segment intersection (core/curve)\r
} from "gratify";\r
\r
/** The shape of an edge as the surface's props carry it. */\r
export interface EdgeRef {\r
  id: string;\r
  from: string;   // anchor id of the source socket, e.g. "time/out"\r
  to: string;     // anchor id of the target socket, e.g. "mix/in"\r
}\r
\r
// ── The preview element ───────────────────────────────────────────────────────\r
//\r
// An ordinary part. The gesture emits one of these into the overlay layer on\r
// every frame while the drag is active; it exit-fades when the gesture ends.\r
\r
interface SliceLineProps {\r
  a: Vec;   // where the drag started (world coordinates)\r
  b: Vec;   // where the pointer is now\r
}\r
\r
const SliceLine = part<SliceLineProps, { stroke: Color }>("slice-line", {\r
\r
  style: (tokens) => ({ stroke: tokens.danger }),\r
\r
  render(node, painter, style) {\r
    painter.line(node.props.a, node.props.b, calpha(style.stroke, 0.9), 2);\r
    painter.dot(node.props.a, 3, style.stroke);\r
    painter.dot(node.props.b, 3, style.stroke);\r
  },\r
});\r
\r
// ── The gesture ───────────────────────────────────────────────────────────────\r
\r
interface SliceState {\r
  a: Vec;\r
  b: Vec;\r
}\r
\r
/**\r
 * Build the slice interactor. The edge list arrives as a FUNCTION OF THE\r
 * HOST'S PROPS — the gesture never stores the document, so it always sees\r
 * current state, and the business shape (EdgeRef) stays the app's vocabulary.\r
 *\r
 * Attach it to the surface part's \`on:\` list, before Pan(): begin() declines\r
 * (returns null) when Shift isn't held, which lets the pan interactor run.\r
 */\r
export function slice(edgesOfProps: (props: unknown) => EdgeRef[]): Interactor<unknown> {\r
\r
  return Gesture<unknown, SliceState>({\r
\r
    // Only begin when Shift is held — otherwise decline, and the next\r
    // interactor on the surface (Pan) gets the drag instead.\r
    begin: (_node, pointer, query) =>\r
      query.mods.shift ? { a: pointer, b: pointer } : null,\r
\r
    // Track the pointer.\r
    move: (state, _node, pointer) => ({ ...state, b: pointer }),\r
\r
    // The preview: one overlay element, re-described every frame.\r
    view: (state) => [\r
      SliceLine("slice-preview", { a: state.a, b: state.b }),\r
    ],\r
\r
    // On release: cut every wire whose curve crosses the dragged segment.\r
    up(state, node, _pointer, query) {\r
      const intentsToDispatch: unknown[] = [];\r
\r
      for (const edge of edgesOfProps(node.props)) {\r
        const sourceAnchor = query.anchor(edge.from);\r
        const targetAnchor = query.anchor(edge.to);\r
        if (!sourceAnchor || !targetAnchor) continue;\r
\r
        const crossed = wireCrossesSegment(\r
          sourceAnchor.pos, targetAnchor.pos,   // the wire's endpoints\r
          state.a, state.b,                     // the slice line\r
        );\r
        if (crossed) {\r
          intentsToDispatch.push({ kind: "disconnect", id: edge.id });\r
        }\r
      }\r
\r
      return intentsToDispatch;\r
    },\r
  });\r
}\r
\r
export { SliceLine };\r
`;let L=100;function K(e,r){switch(r.kind){case"move":return{...e,nodes:{...e.nodes,[r.id]:{...e.nodes[r.id],pos:r.pos}}};case"connect":{const[n,t]=r.a.endsWith("/out")?[r.a,r.b]:[r.b,r.a],o=e.edges.filter(s=>s.to!==t);return{...e,edges:[...o,{id:`edge-${L++}`,from:n,to:t}]}}case"disconnect":return{...e,edges:e.edges.filter(n=>n.id!==r.id),selectedEdgeId:e.selectedEdgeId===r.id?null:e.selectedEdgeId};case"select":return{...e,selectedEdgeId:r.id}}}const w=e=>e.endsWith("/out")?"out":"in",b=e=>e.split("/")[0],B=(e,r)=>w(e)!==w(r.id)&&b(e)!==b(r.id),V=d("surface",{style:e=>({gridDot:c(e.muted,.35)}),measure:(e,r)=>r,hit:()=>!0,render(e,r,n){const t=e.view,o=28,s=Math.floor(-t.pan.x/t.zoom/o)*o,a=(t.w-t.pan.x)/t.zoom,l=Math.floor(-t.pan.y/t.zoom/o)*o,p=(t.h-t.pan.y)/t.zoom;for(let h=s;h<=a;h+=o)for(let m=l;m<=p;m+=o)r.dot(i(h,m),1,n.gridDot)},on:[_(e=>e.edges),A(),v(()=>({kind:"select",id:null})),P({Delete:e=>e.props.selectedEdgeId?{kind:"disconnect",id:e.props.selectedEdgeId}:null,Backspace:e=>e.props.selectedEdgeId?{kind:"disconnect",id:e.props.selectedEdgeId}:null})]}),y=5.5,H=14,U=d("graph-node",{size:()=>i(150,56),anchors:e=>[{id:`${e.props.id}/in`,pos:i(e.rect.x,e.rect.center.y),meta:{kind:"in"}},{id:`${e.props.id}/out`,pos:i(e.rect.right,e.rect.center.y),meta:{kind:"out"}}],style(e,r){return{fill:e.mix(e.surface,e.surfaceHi,.4*r.hover+.6*r.drag),edge:e.mix(e.muted,e.accent,.5*r.hover+.5*r.drag),text:e.mix(e.text,e.textBright,r.hover),lift:3*r.drag,socket:e.accent}},render(e,r,n){const t=e.rect.raise(n.lift);r.box(t,10,n.fill,n.edge,1.2),r.box(R(t.x,t.y,t.w,6),3,T(e.props.hue,.7,.55)),r.label(e.props.title,i(t.x+12,t.center.y+3),n.text,{align:"left",weight:500}),r.dot(i(t.x,t.center.y),y,n.socket),r.dot(i(t.right,t.center.y),y,n.socket)},on:[f({begin(e,r,n){for(const t of["/out","/in"]){const o=n.anchor(e.props.id+t);if(o&&N(o.pos,r)<H)return{fromAnchorId:o.id,cursor:r}}return null},move:(e,r,n,t)=>({...e,cursor:n,snap:t.nearestAnchor(n,26,o=>B(e.fromAnchorId,o))}),view(e,r){var t;const n=r.anchor(e.fromAnchorId);return n?[F("rubber-wire",{a:n.pos,b:((t=e.snap)==null?void 0:t.pos)??e.cursor,snapped:e.snap!==void 0})]:[]},up(e,r){var n;if(e.snap)return(n=r.spawn)==null||n.call(r,C(e.snap.pos,M)),{kind:"connect",a:e.fromAnchorId,b:e.snap.id}}}),f({begin:(e,r)=>({grabOffset:i(r.x-e.props.pos.x,r.y-e.props.pos.y)}),during:(e,r,n)=>({kind:"move",id:r.props.id,pos:i(n.x-e.grabOffset.x,n.y-e.grabOffset.y)})})]}),M=g(64,186,255),q=d("wire",{style:(e,r)=>{const n=r.sel||0;return{color:n>.02?e.mix(e.accent,g(255,200,80),n):e.accent,selected:n}},hit(e,r){var o,s;const n=(o=e.anchor)==null?void 0:o.call(e,e.props.from),t=(s=e.anchor)==null?void 0:s.call(e,e.props.to);return!!n&&!!t&&G(n,t,r)<8},render(e,r,n){var s,a;const t=(s=e.anchor)==null?void 0:s.call(e,e.props.from),o=(a=e.anchor)==null?void 0:a.call(e,e.props.to);!t||!o||(r.wire(t,o,c(g(0,0,0),.35),4.5),r.wire(t,o,c(n.color,.9),2.2+1.6*n.selected+.8*e.ch.hover))},on:[v(e=>({kind:"select",id:e.props.id}))]}),F=d("rubber-wire",{style:e=>({color:e.accent}),render(e,r,n){const t=e.props.snapped?g(90,220,130):c(n.color,.8);r.wire(e.props.a,e.props.b,t,e.props.snapped?2.6:2),r.dot(e.props.b,4,t)}}),j=e=>({...e,layer:"screen"});function $(e){return V("root",{edges:e.edges,selectedEdgeId:e.selectedEdgeId},[E("graph",{},[...e.edges.map(r=>q(r.id,{id:r.id,from:r.from,to:r.to,states:{sel:e.selectedEdgeId===r.id}})),...Object.values(e.nodes).map(r=>U(r.id,{id:r.id,title:r.title,hue:r.hue,pos:r.pos}))]),j(x("hud",{pad:12},[I("hint",{text:"drag node · drag socket = wire · click wire + Del = cut · Shift-drag = slice · drag/wheel = pan/zoom",dim:!0,size:12})]))])}const u=(e,r,n,t,o)=>({id:e,title:r,hue:n,pos:i(t,o)}),Y=document.getElementById("c");S(Y,{init:{nodes:{time:u("time","Time",200,120,140),noise:u("noise","Noise",260,120,300),mix:u("mix","Mix",140,380,220),out:u("out","Output",30,640,220)},edges:[{id:"edge-1",from:"time/out",to:"mix/in"},{id:"edge-2",from:"mix/out",to:"out/in"}],selectedEdgeId:null},update:K,view:$});D([{name:"main.ts",code:W},{name:"slice.ts",code:z}]);
