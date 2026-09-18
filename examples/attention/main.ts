// ============================================================================
// Example: attention — cues that ask to be interacted with, and stop asking
// once you do. Eight idle signals from game and product UI:
//
//   Pulse      a heartbeat glow ring on the primary action
//   Sheen      a light band sweeping the face every few seconds
//   Sonar      an inbox whose badge springs in and rings expand while unread
//   Nudge      a button that hops after two idle seconds
//   Drop zone  marching dashes until the chip is dragged in
//   Key        "press Space" blinking until a key answers (keys route to the root)
//   Shimmer    loading placeholders with a moving highlight
//   Spotlight  a pointer-following light; a slow drift hints while idle
//
// The Doc holds only facts (what was answered, when input last happened). Each
// cue reads `node.time` through the pure curves in shared/motion.ts and eases
// out through a `live` channel when its fact flips. `ambient` keeps the loop
// awake while any cue is still live — answer them all and the scene sleeps.
// ============================================================================

import { addOn, Element, Keys, Label, mount, Row, Stack, withExt } from "gratify";
import { Card, TimedButton } from "../shared/widgets";
import {
  CueIntent, DragChip, DropZone, KeyPrompt, NudgeButton, PulseButton, SheenButton, Skeleton,
  SonarInbox, SpotlightTile,
} from "./cues";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";
import cuesSource from "./cues.ts?raw";
import motionSource from "../shared/motion.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────
interface Doc {
  acked: Record<string, boolean>;
  unread: number;
  dropped: boolean;
  loaded: boolean;
  lastInput: number;               // GNode.time of the last input (drives the nudge)
}

type Intent =
  | CueIntent
  | { kind: "message"; time: number }
  | { kind: "drop"; time: number }
  | { kind: "load"; time: number }
  | { kind: "reset"; time: number };

const INIT: Doc = { acked: {}, unread: 3, dropped: false, loaded: false, lastInput: 0 };

function update(doc: Doc, intent: Intent): Doc {
  const touched = { ...doc, lastInput: intent.time };
  switch (intent.kind) {
    case "ack": return intent.id === "sonar"
      ? { ...touched, unread: 0, acked: { ...doc.acked, sonar: true } }
      : { ...touched, acked: { ...doc.acked, [intent.id]: true } };
    case "message": return { ...touched, unread: doc.unread + 1, acked: { ...doc.acked, sonar: false } };
    case "drop": return { ...touched, dropped: true };
    case "load": return { ...touched, loaded: true };
    case "reset": return { ...INIT, lastInput: intent.time };
  }
}

const liveCount = (doc: Doc) =>
  ["pulse", "sheen", "nudge", "key", "spot"].filter((id) => !doc.acked[id]).length
  + (doc.unread > 0 ? 1 : 0) + (doc.dropped ? 0 : 1) + (doc.loaded ? 0 : 1);

// ── View ──────────────────────────────────────────────────────────────────────
const stamp = (doc: Doc, id: string) => (doc.acked[id] ? "answered" : "waiting");

function view(doc: Doc): Element {
  const cells: Element[] = [
    Card("pulse", { title: "Pulse", value: stamp(doc, "pulse") }, [PulseButton("c", { id: "pulse", live: !doc.acked.pulse })]),
    Card("sheen", { title: "Sheen", value: stamp(doc, "sheen") }, [SheenButton("c", { id: "sheen", live: !doc.acked.sheen })]),
    Card("sonar", { title: "Sonar", value: doc.unread ? `${doc.unread} unread` : "read" }, [
      SonarInbox("c", { id: "sonar", live: doc.unread > 0, unread: doc.unread }),
    ]),
    Card("nudge", { title: "Nudge", value: stamp(doc, "nudge") }, [
      NudgeButton("c", { id: "nudge", live: !doc.acked.nudge, lastInput: doc.lastInput }),
    ]),
    Card("zone", { title: "Drop zone", value: doc.dropped ? "dropped" : "waiting" }, [
      Row("r", { gap: 10, align: "center" }, [
        ...(doc.dropped ? [] : [DragChip("chip", { drop: (time) => ({ kind: "drop", time }) })]),
        DropZone("zone", { live: !doc.dropped }),
      ]),
    ]),
    Card("key", { title: "Key prompt", value: stamp(doc, "key") }, [KeyPrompt("c", { id: "key", live: !doc.acked.key })]),
    Card("shimmer", { title: "Shimmer", value: doc.loaded ? "loaded" : "loading" }, [
      doc.loaded
        ? Stack("rows", { gap: 4 }, [
            Label("r0", { text: "Quarterly report.pdf", size: 12, bright: true }),
            Label("r1", { text: "2.4 MB · shared with 3 people", size: 11, dim: true }),
            Label("r2", { text: "edited 4 min ago", size: 11, dim: true }),
          ])
        : Skeleton("sk", { live: true }),
    ]),
    Card("spot", { title: "Spotlight", value: stamp(doc, "spot") }, [SpotlightTile("c", { id: "spot", live: !doc.acked.spot })]),
  ];

  const root = Stack("root", { gap: 16, pad: 32, align: "center" }, [
    Label("title", { text: "Attention", size: 22, weight: 700, bright: true }),
    Label("sub", { text: `${liveCount(doc)} cues still asking — each one stops the moment you answer it`, dim: true, size: 12 }),
    Row("row0", { gap: 16 }, cells.slice(0, 4)),
    Row("row1", { gap: 16 }, cells.slice(4)),
    Row("tools", { gap: 10 }, [
      TimedButton("msg", { label: "New message", to: (time) => ({ kind: "message", time }) }),
      TimedButton("load", { label: doc.loaded ? "Loaded" : "Load content", to: (time) => ({ kind: "load", time }), accent: !doc.loaded }),
      TimedButton("reset", { label: "Reset all", to: (time) => ({ kind: "reset", time }) }),
    ]),
  ]);
  // Space answers the key prompt from anywhere: keys fall through to the root.
  return withExt(root, addOn(Keys({ " ": (n) => ({ kind: "ack", id: "key", time: n.time ?? 0 }) })));
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c") as HTMLCanvasElement;

mount(canvas, {
  init: INIT,
  update,
  view,
  ambient: (doc) => liveCount(doc) > 0,
});

attachSourcePanel([
  { name: "main.ts", code: mainSource },
  { name: "cues.ts", code: cuesSource },
  { name: "motion.ts (shared)", code: motionSource },
]);
