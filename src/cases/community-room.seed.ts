// The two examples /simple can load in practice mode, each with its review:
// - the flawed sample attempt it opens with, which gives every level of the report something to show
//   (a client failure, an invented fact, a failed reply, a missed on-probe fact, a dropped fact, hidden
//   and unverified requirements, an unsupported decision, undrawn decisions, an unexplained box, and
//   weak or unsound ratings);
// - the complete example: the golden interview (spec §3.7) and the model answer (§3.8), which passes.
// Each review goes through the same verification as a live one, so every quote in it is checked
// against the transcript and every link is computed from the doc.
import type { ChatMessage } from "../shared/lib/types";
import { COMMUNITY_ROOM_CASE as CASE } from "./community-room";
import { buildSeed } from "./seed";
import type { SeedSoundness } from "./seed";

const FENCE = "```";

/** Evidence that the engineer asked in a fact's area: their whole message. */
const asked = (messages: ChatMessage[], messageIndex: number) => ({ messageIndex, quote: messages[messageIndex].content });

// ---------------------------------------------------------------------------------------------
// The flawed sample attempt

// Message indexes matter: the doc's citations and the review's evidence use them.
const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: "assistant", content: CASE.openingMessage },
  { role: "user", content: "Hi Mei! What happens today when someone wants to book a room?" },
  {
    role: "assistant",
    content:
      "They come to the front desk or call us, and we write it in the booking book. It's just a big paper book that stays at the desk. The trouble is we keep getting double bookings - two groups turn up for the same room at the same time, and someone always goes home upset.",
  },
  { role: "user", content: "How many bookings do you get in a typical week?" },
  // Level 0 client failure: asked about volume, but the client gives no numbers.
  { role: "assistant", content: "Oh, it goes up and down - some months are much busier than others. Hard to say, really." },
  { role: "user", content: "Who usually makes the bookings?" },
  // Level 0 session check: a reply that timed out.
  { role: "assistant", content: "Request failed: The server took too long to respond." },
  { role: "user", content: "Sorry, who usually makes the bookings?" },
  {
    role: "assistant",
    content:
      // The last sentence is a level 0 invented fact: it is in none of the case facts.
      "Mostly residents' groups - the seniors' exercise group, the tuition teachers, a few family events. Many of our regulars are elderly, and some of them don't have smartphones, so they call or just walk in. Oh, and we're hoping to start charging a small fee for the hall next year.",
  },
  { role: "user", content: "Who works at the desk?" },
  {
    role: "assistant",
    content:
      "Just me and one other staff member, on alternating shifts, and volunteers on weekends. We share the one computer at the desk.",
  },
];

// Never asks why the double bookings happen (the on-probe root cause is missed), drops the staff
// fact, and leaves format, link and soundness problems for the review to find.
const SAMPLE_DOC = `## Requirements
- **R1** Bookings live in one paper book and double bookings keep happening — [Brief](#cs "double bookings keep happening")
- **R2** Many bookers have no smartphone and book by phone or in person — [Chat #8](#chat-msg-8 "some of them don't have smartphones, so they call or just walk in")
- **R3** Bookings must be confirmed instantly online
- **R4** The hall is booked every day — [Chat #4](#chat-msg-4 "we're fully booked every day")

## Assumptions
- **A1** Bookers can receive an SMS on a basic phone (not asked)

## Decisions
- **D1** One shared online calendar is the only record; the paper book is retired — because [R1](#R1). Trade-off: staff need to be online to book.
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar")]
  ${FENCE}
- **D2** Bookers get an SMS confirmation — because [R2](#R2). Trade-off: small SMS cost; depends on A1.
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar")] -->|"sends confirmation"| SMS["SMS confirmation"]
    SMS --> Resident["Resident (actor)"]
  ${FENCE}
- **D3** A taken slot blocks any second booking for the same room and time — because [R1](#R1). Trade-off: none significant.
- **D4** Send every booking through a message queue so none get lost — because the centre is busy.
  ${FENCE}mermaid
  flowchart TD
    Desk["Desk computer"] -->|"new booking"| Queue["Message queue"]
    Queue --> Calendar[("Shared booking calendar")]
  ${FENCE}
- **D5** — because [R4](#R4). Trade-off: none.
`;

const SAMPLE_FINAL_DIAGRAM = `flowchart TD
  Resident["Resident (actor)"] -->|"calls or walks in"| Staff["Front-desk staff (actor)"]
  Staff -->|"types the booking"| Desk["Desk computer"]
  Desk -->|"new booking"| Queue["Message queue"]
  Queue --> Calendar[("Shared booking calendar")]
  Calendar -->|"sends confirmation"| SMS["SMS confirmation"]
  SMS --> Resident
  Calendar --> Printer["Printed weekly schedule"]`;

/** Levels 0 + 1A for the sample, in the shape /api/assess returns. */
const SAMPLE_EVIDENCE = [
  // Asked in #3, but the reply gave no numbers: client failed, excluded from scores.
  { factId: "cr.scale", surfaced: null, askedInArea: asked(SAMPLE_MESSAGES, 3), docAssertion: null },
  {
    factId: "cr.bookers",
    surfaced: { messageIndex: 8, quote: "some of them don't have smartphones, so they call or just walk in" },
    askedInArea: asked(SAMPLE_MESSAGES, 7),
    docAssertion: null,
  },
  // Never probed: missed.
  { factId: "cr.root-cause", surfaced: null, askedInArea: null, docAssertion: null },
  {
    factId: "cr.staff",
    surfaced: {
      messageIndex: 10,
      quote:
        "Just me and one other staff member, on alternating shifts, and volunteers on weekends. We share the one computer at the desk.",
    },
    askedInArea: asked(SAMPLE_MESSAGES, 9),
    docAssertion: null,
  },
];

const SAMPLE_INVENTED = [{ messageIndex: 8, quote: "we're hoping to start charging a small fee for the hall next year" }];

/** Level 3 for the sample, in the shape /api/assess returns. */
const SAMPLE_SOUNDNESS: SeedSoundness = {
  requirements: [
    { id: "R1", rating: "sound", reason: "Restates the brief's problem without adding to it." },
    { id: "R2", rating: "sound", reason: "Faithful to the quote about bookers without smartphones." },
    {
      id: "R3",
      rating: "weak",
      reason: "Mei never asked for instant online confirmation, and R2 says many bookers aren't online at all.",
    },
    {
      id: "R4",
      rating: "unsound",
      reason: "Overstated: Mei said bookings \"go up and down\"; nothing says the hall is booked every day.",
    },
  ],
  decisions: [
    { id: "D1", rating: "sound", reason: "One shared record removes the paper book that lets double bookings happen (R1)." },
    { id: "D2", rating: "sound", reason: "SMS reaches bookers without smartphones (R2); the dependency on A1 is stated." },
    { id: "D3", rating: "sound", reason: "Blocking a taken slot directly prevents the double bookings in R1." },
    {
      id: "D4",
      rating: "unsound",
      reason: "A message queue solves high-volume delivery; a community centre's bookings argue against one, and no requirement asks for it.",
    },
    { id: "D5", rating: "unsound", reason: "States no choice, so there is nothing to follow from R4." },
  ],
  sketches: [
    { id: "D1", rating: "sound", reason: "Shows only the shared calendar the decision introduces." },
    { id: "D2", rating: "sound", reason: "Shows the confirmation going from the calendar to the resident by SMS." },
    {
      id: "D4",
      rating: "weak",
      reason: "The decision is about not losing bookings, but the queue box shows nothing that would recover a lost one.",
    },
  ],
  expectedDecisions: [
    { id: "ed.single-source", rating: "well", decisionIds: ["D1"], reason: "D1 retires the paper book for one shared calendar." },
    {
      id: "ed.phone-walkin",
      rating: "not_addressed",
      decisionIds: [],
      reason: "No decision says how phone and walk-in bookings reach the calendar; the sticky-note cause was never found.",
    },
    { id: "ed.no-smartphone", rating: "well", decisionIds: ["D2"], reason: "D2 confirms by SMS, which works on basic phones." },
    {
      id: "ed.conflicts",
      rating: "weakly",
      decisionIds: ["D3"],
      reason: "D3 blocks a taken slot, but it has no sketch, so the final diagram doesn't show where the check happens.",
    },
    {
      id: "ed.right-size",
      rating: "weakly",
      decisionIds: ["D1", "D4"],
      reason: "A shared calendar is the right size, but D4 adds a message queue the evidence doesn't call for.",
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// The complete example: every hidden fact comes up and is carried through to the final diagram.

const COMPLETE_MESSAGES: ChatMessage[] = [
  { role: "assistant", content: CASE.openingMessage },
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

/** Levels 0 + 1A for the complete example. */
const COMPLETE_EVIDENCE = [
  {
    factId: "cr.scale",
    surfaced: { messageIndex: 4, quote: "We get about 30 bookings a week" },
    askedInArea: asked(COMPLETE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "cr.bookers",
    surfaced: { messageIndex: 6, quote: "some of them don't have smartphones, so they call or just walk in" },
    askedInArea: asked(COMPLETE_MESSAGES, 5),
    docAssertion: null,
  },
  {
    factId: "cr.root-cause",
    surfaced: {
      messageIndex: 8,
      quote:
        "Whoever answers writes it on a sticky note because the book isn't always in front of them, and sometimes the note never makes it into the book.",
    },
    askedInArea: asked(COMPLETE_MESSAGES, 7),
    docAssertion: null,
  },
  {
    factId: "cr.staff",
    surfaced: {
      messageIndex: 10,
      quote:
        "Just me and one other staff member, on alternating shifts, and volunteers on weekends. We share the one computer at the desk.",
    },
    askedInArea: asked(COMPLETE_MESSAGES, 9),
    docAssertion: null,
  },
];

/** Level 3 for the complete example. */
const COMPLETE_SOUNDNESS: SeedSoundness = {
  requirements: [
    { id: "R1", rating: "sound", reason: "Restates the brief's problem without adding to it." },
    { id: "R2", rating: "sound", reason: "Matches the quote; the school-holiday peak could also be noted." },
    { id: "R3", rating: "sound", reason: "Faithful to the quote about bookers without smartphones." },
    { id: "R4", rating: "sound", reason: "Captures the real cause: phone bookings bypass the book." },
    { id: "R5", rating: "sound", reason: "Faithful: two staff on shifts sharing one computer." },
  ],
  decisions: [
    { id: "D1", rating: "sound", reason: "One record removes the gap where sticky notes get lost (R4)." },
    { id: "D2", rating: "sound", reason: "Entering bookings during the call closes the phone-booking gap for staff on one computer." },
    { id: "D3", rating: "sound", reason: "Blocking taken slots directly prevents the double bookings in R1." },
    { id: "D4", rating: "sound", reason: "SMS reaches bookers without smartphones; the dependency on A1 is stated." },
    { id: "D5", rating: "sound", reason: "A hosted calendar is right-sized for about 30 bookings a week." },
  ],
  sketches: [
    { id: "D1", rating: "sound", reason: "Shows only the shared calendar the decision introduces." },
    { id: "D2", rating: "sound", reason: "Shows the resident, staff, desk computer and calendar the decision names." },
    { id: "D3", rating: "sound", reason: "Shows the request and the refusal of a taken slot." },
    { id: "D4", rating: "sound", reason: "Shows the confirmation going from the calendar to the resident by SMS." },
    { id: "D5", rating: "sound", reason: "A single hosted calendar box; nothing extra is drawn." },
  ],
  expectedDecisions: [
    { id: "ed.single-source", rating: "well", decisionIds: ["D1"], reason: "D1 retires the paper book and sticky notes for one shared calendar." },
    { id: "ed.phone-walkin", rating: "well", decisionIds: ["D2"], reason: "D2 has staff enter bookings while the booker is still on the phone or at the desk." },
    { id: "ed.no-smartphone", rating: "well", decisionIds: ["D4"], reason: "D4 confirms by SMS, which works on basic phones." },
    { id: "ed.conflicts", rating: "well", decisionIds: ["D3"], reason: "D3 refuses a second booking for a taken room and time." },
    { id: "ed.right-size", rating: "well", decisionIds: ["D5"], reason: "D5 uses a hosted calendar instead of a custom server." },
  ],
};

// ---------------------------------------------------------------------------------------------

/** The flawed sample attempt practice mode opens with. */
export const COMMUNITY_ROOM_SEED = buildSeed(CASE, {
  messages: SAMPLE_MESSAGES,
  doc: SAMPLE_DOC,
  finalDiagram: SAMPLE_FINAL_DIAGRAM,
  evidence: SAMPLE_EVIDENCE,
  invented: SAMPLE_INVENTED,
  soundness: SAMPLE_SOUNDNESS,
  diagramPrompt:
    "Residents call or walk in to the front-desk staff, who type the booking on the desk computer. Bookings go through a message queue into a shared booking calendar, which sends the resident an SMS confirmation and prints a weekly schedule.",
});

/** The complete example: the golden interview and the model answer, with a review that passes. */
export const COMMUNITY_ROOM_COMPLETE_SEED = buildSeed(CASE, {
  messages: COMPLETE_MESSAGES,
  doc: CASE.modelAnswerMarkdown,
  finalDiagram: CASE.modelAnswerFinalDiagram,
  evidence: COMPLETE_EVIDENCE,
  invented: [],
  soundness: COMPLETE_SOUNDNESS,
  diagramPrompt:
    "Residents call or walk in to the front-desk staff, who enter the booking on the desk computer into a shared booking calendar. The calendar refuses a slot that is already taken, and sends the resident an SMS confirmation.",
});
