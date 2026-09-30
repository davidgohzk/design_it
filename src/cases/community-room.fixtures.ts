// Test fixtures for the community-room case (spec §3.7, §3.8 and §9).
// Message indexes matter: citations use them.
import type { FoundFact } from "../assessment/types";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED } from "./community-room.seed";

// The golden interview: every hidden fact comes up. It is also /simple's "Complete example".
export const GOLDEN_TRANSCRIPT = COMMUNITY_ROOM_COMPLETE_SEED.messages;

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

/** Level 1A for the golden transcript: every quote is verbatim from the client message it cites. */
export const GOLDEN_FOUND: FoundFact[] = [
  { factId: "cr.current", state: "given" },
  { factId: "cr.scale", state: "surfaced", messageIndex: 4, quote: "We get about 30 bookings a week" },
  {
    factId: "cr.bookers",
    state: "surfaced",
    messageIndex: 6,
    quote: "some of them don't have smartphones, so they call or just walk in",
  },
  {
    factId: "cr.root-cause",
    state: "surfaced",
    messageIndex: 8,
    quote:
      "Whoever answers writes it on a sticky note because the book isn't always in front of them, and sometimes the note never makes it into the book.",
  },
  {
    factId: "cr.staff",
    state: "surfaced",
    messageIndex: 10,
    quote:
      "Just me and one other staff member, on alternating shifts, and volunteers on weekends. We share the one computer at the desk.",
  },
];

/** Mocked /api/assess "evidence" reply for the golden run; every quote verifies. */
export const GOLDEN_EVIDENCE_REPLY = {
  facts: GOLDEN_FOUND.filter((fact) => fact.state !== "given").map((fact) => ({
    factId: fact.factId,
    surfaced: { messageIndex: fact.messageIndex, quote: fact.quote },
    askedInArea: { messageIndex: (fact.messageIndex ?? 1) - 1, quote: GOLDEN_TRANSCRIPT[(fact.messageIndex ?? 1) - 1].content },
    docAssertion: null,
  })),
  invented: [],
};

/** Mocked /api/assess "soundness" reply for the golden run. */
export const GOLDEN_SOUNDNESS_REPLY = {
  requirements: ["R1", "R2", "R3", "R4", "R5"].map((id) => ({ id, rating: "sound", reason: "States its quote faithfully." })),
  decisions: ["D1", "D2", "D3", "D4", "D5"].map((id) => ({ id, rating: "sound", reason: "Follows from its requirements." })),
  sketches: ["D1", "D2", "D3", "D4", "D5"].map((id) => ({ id, rating: "sound", reason: "Shows what the decision says." })),
  expectedDecisions: [
    { id: "ed.single-source", rating: "well", decisionIds: ["D1"], reason: "One shared calendar." },
    { id: "ed.phone-walkin", rating: "well", decisionIds: ["D2"], reason: "Staff enter bookings live." },
    { id: "ed.no-smartphone", rating: "well", decisionIds: ["D4"], reason: "SMS confirmation." },
    { id: "ed.conflicts", rating: "well", decisionIds: ["D3"], reason: "Taken slots are refused." },
    { id: "ed.right-size", rating: "well", decisionIds: ["D5"], reason: "Hosted calendar, no server." },
  ],
};
