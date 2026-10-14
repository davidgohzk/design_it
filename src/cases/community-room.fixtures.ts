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

/** Removes the fenced sketch block under the given decision (after any labelled fields). */
const removeSketch = (text: string, decisionId: string) => {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`- **${decisionId}**`));
  let open = start + 1;
  while (open < lines.length && /^\s+- /.test(lines[open])) open += 1;
  if (start < 0 || !lines[open]?.trim().startsWith("```mermaid")) {
    throw new Error(`Fixture sketch not found: ${decisionId}`);
  }
  let end = open + 1;
  while (!lines[end].trim().startsWith("```")) end += 1;
  lines.splice(open, end - open + 1);
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

/** §9 test 5: Staff is not marked as a person in the final diagram. */
export const FINAL_STAFF_NOT_ACTOR = GOLDEN_FINAL.replace(
  'Staff["Front-desk staff [person]"]',
  'Staff["Front-desk staff"]',
);

const FENCE = "```";

/**
 * The golden doc in the older one-line format (before WP5), which must still parse. Decisions put
 * "because", the trade-off and any alternative on one line, and people are marked (actor).
 */
export const LEGACY_INLINE_DOC = `## Requirements
- **R1** Bookings live in one paper book and double bookings keep happening — [Brief](#cs "double bookings keep happening")
- **R2** Three rooms, about 30 bookings a week — [Chat #4](#chat-msg-4 "We get about 30 bookings a week")
- **R3** Many bookers have no smartphone and book by phone or in person — [Chat #6](#chat-msg-6 "some of them don't have smartphones, so they call or just walk in")
- **R4** Phone bookings on sticky notes don't always reach the book — [Chat #8](#chat-msg-8 "sometimes the note never makes it into the book")
- **R5** Two staff on shifts share one desk computer — [Chat #10](#chat-msg-10 "We share the one computer at the desk.")

## Assumptions
- **A1** Bookers can receive an SMS on a basic phone (not asked)
- **A2** The desk computer has reliable internet (not asked)

## Decisions
- **D1** One shared online calendar is the only record; the book and sticky notes are retired — because [R1](#R1), [R4](#R4). Trade-off: staff need to be online to book (A2).
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar")]
  ${FENCE}
- **D2** Staff enter phone and walk-in bookings directly while the booker is still there — because [R3](#R3), [R4](#R4), [R5](#R5). Trade-off: calls take a little longer.
  ${FENCE}mermaid
  flowchart TD
    Resident["Resident (actor)"] -->|"calls or walks in"| Staff["Front-desk staff (actor)"]
    Staff -->|"enters booking during the call"| Desk["Desk computer"]
    Desk --> Calendar[("Shared booking calendar")]
  ${FENCE}
- **D3** A taken slot blocks any second booking for the same room and time — because [R1](#R1). Trade-off: none significant.
  ${FENCE}mermaid
  flowchart TD
    Desk["Desk computer"] -->|"request slot"| Calendar[("Shared booking calendar")]
    Calendar -->|"slot taken: refuse"| Desk
  ${FENCE}
- **D4** Bookers get an SMS confirmation — because [R3](#R3). Trade-off: small SMS cost; depends on A1.
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar")] -->|"sends confirmation"| SMS["SMS confirmation"]
    SMS --> Resident["Resident (actor)"]
  ${FENCE}
- **D5** Use a hosted calendar with a conflict check; no custom server — because [R2](#R2). Instead of: a booking app with its own database. Trade-off: fewer custom features.
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar")]
  ${FENCE}
`;

export const LEGACY_INLINE_FINAL = `flowchart TD
  Resident["Resident (actor)"] -->|"calls or walks in"| Staff["Front-desk staff (actor)"]
  Staff -->|"enters booking during the call"| Desk["Desk computer"]
  Desk -->|"request slot"| Calendar[("Shared booking calendar")]
  Calendar -->|"slot taken: refuse"| Desk
  Calendar -->|"sends confirmation"| SMS["SMS confirmation"]
  SMS --> Resident`;

/** Level 3.1 for the golden transcript: every quote is verbatim from the client message it cites. */
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
  requirementsMet: ["R1", "R2", "R3", "R4", "R5"].map((id) => ({
    id,
    rating: "met",
    nodeIds: ["Calendar"],
    reason: "The final design meets it.",
  })),
  similar: [] as { kind: string; ids: string[]; reason: string }[],
  requirementItems: ["R1", "R2", "R3", "R4", "R5"].map((id) => ({ id, rating: "sound", reason: "Clear and checkable." })),
  decisionItems: ["D1", "D2", "D3", "D4", "D5"].map((id) => ({ id, rating: "sound", reason: "A workable choice with a real trade-off." })),
  sketchItems: ["D1", "D2", "D3", "D4", "D5"].map((id) => ({ id, rating: "sound", reason: "Clear on its own." })),
  sketchIntegration: ["D1", "D2", "D3", "D4", "D5"].map((id) => ({ id, rating: "sound", reason: "Fits the final diagram." })),
  overall: {
    summary: "A right-sized design that fixes the real cause of the double bookings.",
    strengths: [{ point: "Bookings go straight into one calendar during the call.", refs: ["D2", "Calendar"] }],
    weaknesses: [{ point: "D3 hides the cost of refusing a caller.", refs: ["D3"] }],
    improvements: [{ point: "Give D3 an honest trade-off.", refs: ["D3"] }],
  },
};
