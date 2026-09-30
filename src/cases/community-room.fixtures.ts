// Test fixtures for the community-room case (spec §3.7, §3.8 and §9).
// Message indexes matter: citations use them.
import type { ChatMessage } from "../types";
import { COMMUNITY_ROOM_CASE } from "./community-room";

export const GOLDEN_TRANSCRIPT: ChatMessage[] = [
  { role: "assistant", content: COMMUNITY_ROOM_CASE.openingMessage },
  { role: "user", content: "Hi Mei! What happens today when someone wants to book a room?" },
  {
    role: "assistant",
    content:
      "They come to the front desk or call us, and we write it in the booking book. It's just a big paper book that stays at the desk. The trouble is we keep getting double bookings - two groups turn up for the same room at the same time, and someone always goes home upset.",
  },
  { role: "user", content: "How many rooms do you have, and how many bookings do you get?" },
  {
    role: "assistant",
    content:
      "Three rooms - the activity hall, the meeting room and the dance studio. We get about 30 bookings a week, more during the school holidays.",
  },
  { role: "user", content: "Who usually makes the bookings?" },
  {
    role: "assistant",
    content:
      "Mostly residents' groups - the seniors' exercise group, the tuition teachers, a few family events. Many of our regulars are elderly, and some of them don't have smartphones, so they call or just walk in.",
  },
  { role: "user", content: "Why do you think the double bookings happen?" },
  {
    role: "assistant",
    content:
      "Hmm, I suppose it's usually the phone bookings. Whoever answers writes it on a sticky note because the book isn't always in front of them, and sometimes the note never makes it into the book.",
  },
  { role: "user", content: "Who works at the desk?" },
  {
    role: "assistant",
    content:
      "Just me and one other staff member, on alternating shifts, and volunteers on weekends. We share the one computer at the desk.",
  },
];

export const GOLDEN_DOC = COMMUNITY_ROOM_CASE.modelAnswerMarkdown;
export const GOLDEN_FINAL = COMMUNITY_ROOM_CASE.modelAnswerFinalDiagram;
export const BRIEF = COMMUNITY_ROOM_CASE.briefMarkdown;

const removeLine = (text: string, startsWith: string) => {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.startsWith(startsWith));
  if (index < 0) throw new Error(`Fixture line not found: ${startsWith}`);
  lines.splice(index, 1);
  return lines.join("\n");
};

/** Removes the fenced sketch block directly under the given decision. */
const removeSketch = (text: string, decisionId: string) => {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`- **${decisionId}**`));
  if (start < 0 || !lines[start + 1]?.trim().startsWith("```mermaid")) {
    throw new Error(`Fixture sketch not found: ${decisionId}`);
  }
  let end = start + 2;
  while (!lines[end].trim().startsWith("```")) end += 1;
  lines.splice(start + 1, end - start);
  return lines.join("\n");
};

/** §9 test 4: (a) R4 deleted, (b) D3's sketch deleted, (c) a Queue added to the final diagram. */
export const FLAWED_DOC = removeSketch(removeLine(GOLDEN_DOC, "- **R4**"), "D3");
export const FLAWED_FINAL = `${GOLDEN_FINAL}
  Queue["Message queue"]
  Desk --> Queue`;

/** §9 test 5: the final diagram without the SMS box. */
export const FINAL_WITHOUT_SMS = GOLDEN_FINAL.split("\n")
  .filter((line) => !line.includes("SMS"))
  .join("\n");

/** §9 test 5: Staff is not marked as an actor in the final diagram. */
export const FINAL_STAFF_NOT_ACTOR = GOLDEN_FINAL.replace(
  'Staff["Front-desk staff (actor)"]',
  'Staff["Front-desk staff"]',
);
