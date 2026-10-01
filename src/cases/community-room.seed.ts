// The two examples /simple can load in practice mode, each with its review:
// - the complete example it opens with: the golden interview (spec §3.7) and the model answer (§3.8),
//   plus three requirements most booking designs share (peak load, ease of use, reliability), each
//   quoting the chat. Every fact is carried through; the review still finds a few small things (two
//   sketches too alike, a requirement that blurs its quote, one requirement only partly met);
// - the flawed sample attempt, which gives every check in the report something to show (a client
//   failure, an invented fact, a failed reply, a missed on-probe fact, a dropped fact, hidden and
//   unverified requirements, an unsupported decision, undrawn decisions, an unexplained box, a
//   requirement, a decision and a sketch that repeat others, and weak or unsound ratings).
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
// fact, and leaves format, link and soundness problems for the review to find. R5 restates R1, and D6
// repeats D3 with a sketch that draws no more than D1's: one item too alike at each stage.
const SAMPLE_DOC = `## Requirements
- **R1** Bookings live in one paper book and double bookings keep happening — [Brief](#cs "double bookings keep happening")
- **R2** Many bookers have no smartphone and book by phone or in person — [Chat #8](#chat-msg-8 "some of them don't have smartphones, so they call or just walk in")
- **R3** Bookings must be confirmed instantly online
- **R4** The hall is booked every day — [Chat #4](#chat-msg-4 "we're fully booked every day")
- **R5** Two groups sometimes turn up for the same room at the same time — [Chat #2](#chat-msg-2 "two groups turn up for the same room at the same time")

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
- **D6** The calendar refuses a booking for a room and time that is already taken — because [R1](#R1). Trade-off: staff must offer the caller another slot.
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar")]
  ${FENCE}
`;

const SAMPLE_FINAL_DIAGRAM = `flowchart TD
  Resident["Resident (actor)"] -->|"calls or walks in"| Staff["Front-desk staff (actor)"]
  Staff -->|"types the booking"| Desk["Desk computer"]
  Desk -->|"new booking"| Queue["Message queue"]
  Queue --> Calendar[("Shared booking calendar")]
  Calendar -->|"sends confirmation"| SMS["SMS confirmation"]
  SMS --> Resident
  Calendar --> Printer["Printed weekly schedule"]`;

/** Level 0 + 3.1 for the sample, in the shape /api/assess returns. */
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
    { id: "R5", rating: "sound", reason: "Faithful to Mei's words, but it says again what R1 already says." },
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
    { id: "D6", rating: "weak", reason: "Follows from R1, but it is the same choice as D3." },
  ],
  sketches: [
    { id: "D1", rating: "sound", reason: "Shows only the shared calendar the decision introduces." },
    { id: "D2", rating: "sound", reason: "Shows the confirmation going from the calendar to the resident by SMS." },
    {
      id: "D4",
      rating: "weak",
      reason: "The decision is about not losing bookings, but the queue box shows nothing that would recover a lost one.",
    },
    { id: "D6", rating: "weak", reason: "Draws only the calendar; the refusal of a taken slot that D6 is about isn't shown." },
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
      decisionIds: ["D3", "D6"],
      reason: "D3 and D6 both block a taken slot, but neither sketch shows where the check happens.",
    },
    {
      id: "ed.right-size",
      rating: "weakly",
      decisionIds: ["D1", "D4"],
      reason: "A shared calendar is the right size, but D4 adds a message queue the evidence doesn't call for.",
    },
  ],
  requirementsMet: [
    {
      id: "R1",
      rating: "partly",
      nodeIds: ["Calendar"],
      reason: "The shared calendar is the one record, but nothing in the final diagram refuses a taken slot.",
    },
    {
      id: "R2",
      rating: "met",
      nodeIds: ["Staff", "Desk", "SMS"],
      reason: "Phone and walk-in bookings reach the desk staff, and the confirmation goes out by SMS.",
    },
    {
      id: "R3",
      rating: "not_met",
      nodeIds: [],
      reason: "Nothing confirms a booking online; confirmations go out by SMS after staff type them in.",
    },
    { id: "R4", rating: "met", nodeIds: ["Calendar"], reason: "A shared calendar copes with a booking every day; the queue adds nothing." },
    {
      id: "R5",
      rating: "partly",
      nodeIds: ["Calendar"],
      reason: "As for R1: the calendar is the one record, but nothing in the final diagram refuses a taken slot.",
    },
  ],
  similar: [
    { kind: "requirements", ids: ["R1", "R5"], reason: "Both describe the double bookings; R5 adds nothing R1 doesn't say." },
    { kind: "decisions", ids: ["D3", "D6"], reason: "Both refuse a second booking for a room and time that is already taken." },
    {
      kind: "sketches",
      ids: ["D1", "D6"],
      reason: "Both draw only the shared calendar, so the diagram can't tell the record apart from the slot check.",
    },
  ],
  requirementItems: [
    { id: "R1", rating: "sound", reason: "A specific, observable problem: double bookings from one paper book." },
    { id: "R2", rating: "sound", reason: "A clear constraint any design can be checked against." },
    { id: "R3", rating: "unsound", reason: "A solution (online confirmation) written as a requirement." },
    { id: "R4", rating: "sound", reason: "A specific load claim a design could be sized against." },
    { id: "R5", rating: "sound", reason: "A specific, observable problem." },
  ],
  decisionItems: [
    { id: "D1", rating: "sound", reason: "A clear choice whose trade-off names a real cost: staff must be online." },
    { id: "D2", rating: "sound", reason: "A clear choice with a real cost (SMS) and its dependency stated." },
    { id: "D3", rating: "weak", reason: "\"Trade-off: none significant\" hides a real cost: refused callers must be re-booked." },
    { id: "D4", rating: "weak", reason: "Names no trade-off, though a queue is one more part to run and watch." },
    { id: "D5", rating: "unsound", reason: "There is no choice here to judge." },
    { id: "D6", rating: "sound", reason: "A clear choice whose trade-off names the cost to staff." },
  ],
  sketchItems: [
    { id: "D1", rating: "sound", reason: "One labelled box; clear." },
    { id: "D2", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D4", rating: "weak", reason: "The queue's connection to the calendar is unlabelled, so it's unclear what flows." },
    { id: "D6", rating: "sound", reason: "One labelled box; clear." },
  ],
  sketchIntegration: [
    { id: "D1", rating: "sound", reason: "The calendar sits at the centre of the final diagram, where the one record belongs." },
    { id: "D2", rating: "sound", reason: "The SMS goes from the calendar to the resident, as sketched." },
    { id: "D4", rating: "weak", reason: "The queue is wedged between the desk and the calendar: an extra hop nothing in the design needs." },
    { id: "D6", rating: "sound", reason: "The calendar that refuses taken slots is the same one at the centre of the diagram." },
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

// The model answer, plus the requirements most booking designs share, each quoting what Mei said.
const COMPLETE_DOC = CASE.modelAnswerMarkdown
  .replace(
    "\n\n## Assumptions",
    [
      "",
      '- **R6** Bookings rise during the school holidays — [Chat #4](#chat-msg-4 "more during the school holidays")',
      '- **R7** Weekend volunteers take bookings too, so it must be simple for occasional users — [Chat #10](#chat-msg-10 "volunteers on weekends")',
      '- **R8** A double booking sends someone home upset, so a booking must never be lost or doubled — [Chat #2](#chat-msg-2 "someone always goes home upset")',
      "",
      "## Assumptions",
    ].join("\n"),
  )
  .replace("because [R3](#R3), [R4](#R4), [R5](#R5).", "because [R3](#R3), [R4](#R4), [R5](#R5), [R7](#R7).")
  .replace("because [R1](#R1). Trade-off: none significant.", "because [R1](#R1), [R8](#R8). Trade-off: none significant.")
  .replace("because [R2](#R2). Instead of", "because [R2](#R2), [R6](#R6). Instead of");

/** Level 0 + 3.1 for the complete example. */
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
    { id: "R2", rating: "weak", reason: "Leaves out the school-holiday peak Mei mentioned in the same answer." },
    { id: "R3", rating: "sound", reason: "Faithful to the quote about bookers without smartphones." },
    { id: "R4", rating: "sound", reason: "Captures the real cause: phone bookings bypass the book." },
    { id: "R5", rating: "sound", reason: "Faithful: two staff on shifts sharing one computer." },
    { id: "R6", rating: "sound", reason: "Faithful to the school-holiday peak Mei mentioned." },
    { id: "R7", rating: "sound", reason: "Follows from the weekend volunteers; the simplicity it asks for is a fair reading." },
    { id: "R8", rating: "sound", reason: "Faithful to what a double booking costs the people who book." },
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
  requirementsMet: [
    { id: "R1", rating: "met", nodeIds: ["Desk", "Calendar"], reason: "One calendar holds every booking and refuses a taken slot." },
    { id: "R2", rating: "met", nodeIds: ["Calendar"], reason: "A single hosted calendar is plenty for about 30 bookings a week." },
    {
      id: "R3",
      rating: "met",
      nodeIds: ["Staff", "Desk", "SMS"],
      reason: "Staff take phone and walk-in bookings, and the SMS confirmation works on a basic phone.",
    },
    {
      id: "R4",
      rating: "met",
      nodeIds: ["Staff", "Desk", "Calendar"],
      reason: "Phone bookings go straight into the calendar during the call, so there is no sticky note to lose.",
    },
    { id: "R5", rating: "met", nodeIds: ["Desk"], reason: "Both staff use the one desk computer to reach the shared calendar." },
    { id: "R6", rating: "met", nodeIds: ["Calendar"], reason: "A hosted calendar copes with a school-holiday rise from about 30 bookings a week." },
    {
      id: "R7",
      rating: "partly",
      nodeIds: ["Desk"],
      reason: "Volunteers book at the desk like staff, but nothing in the design keeps it simple for occasional users.",
    },
    { id: "R8", rating: "met", nodeIds: ["Desk", "Calendar"], reason: "The calendar refuses a taken slot, so no group is turned away at the door." },
  ],
  similar: [
    {
      kind: "sketches",
      ids: ["D1", "D5"],
      reason: "Both sketches draw only the shared calendar, so neither shows what its own decision adds.",
    },
  ],
  requirementItems: [
    { id: "R1", rating: "sound", reason: "A specific, observable problem." },
    { id: "R2", rating: "sound", reason: "Concrete numbers a design can be sized against." },
    { id: "R3", rating: "sound", reason: "A clear constraint on who must be able to book." },
    { id: "R4", rating: "sound", reason: "A specific cause, checkable in any design." },
    { id: "R5", rating: "sound", reason: "A concrete constraint: two staff, one computer." },
    { id: "R6", rating: "sound", reason: "A specific peak to size for." },
    { id: "R7", rating: "weak", reason: "\"Simple for occasional users\" can't be checked as written; say what they must manage alone." },
    { id: "R8", rating: "sound", reason: "A clear, testable reliability need." },
  ],
  decisionItems: [
    { id: "D1", rating: "sound", reason: "A clear choice whose trade-off names a real cost." },
    { id: "D2", rating: "sound", reason: "A clear choice with an honest cost: calls take longer." },
    { id: "D3", rating: "weak", reason: "\"Trade-off: none significant\" hides a real cost: a refused caller must be offered another slot." },
    { id: "D4", rating: "sound", reason: "A clear choice with a real cost (SMS) and its dependency stated." },
    { id: "D5", rating: "sound", reason: "A clear choice, the alternative named, and an honest cost." },
  ],
  sketchItems: [
    { id: "D1", rating: "sound", reason: "One labelled box; clear." },
    { id: "D2", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D3", rating: "sound", reason: "The request and the refusal read clearly." },
    { id: "D4", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D5", rating: "sound", reason: "One labelled box; clear." },
  ],
  sketchIntegration: [
    { id: "D1", rating: "sound", reason: "The calendar sits at the centre of the final diagram, where the one record belongs." },
    { id: "D2", rating: "sound", reason: "Calls and walk-ins reach the calendar through the staff and the desk computer, as sketched." },
    { id: "D3", rating: "sound", reason: "The slot check sits between the desk computer and the calendar, where bookings arrive." },
    { id: "D4", rating: "sound", reason: "The SMS goes from the calendar to the resident, as sketched." },
    { id: "D5", rating: "sound", reason: "The one hosted calendar is the same box everything else connects to." },
  ],
};

// ---------------------------------------------------------------------------------------------

/** The flawed sample attempt, loaded by the Flawed example button. */
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

/** The complete example practice mode opens with: the golden interview and the model answer, and its review. */
export const COMMUNITY_ROOM_COMPLETE_SEED = buildSeed(CASE, {
  messages: COMPLETE_MESSAGES,
  doc: COMPLETE_DOC,
  finalDiagram: CASE.modelAnswerFinalDiagram,
  evidence: COMPLETE_EVIDENCE,
  invented: [],
  soundness: COMPLETE_SOUNDNESS,
  diagramPrompt:
    "Residents call or walk in to the front-desk staff, who enter the booking on the desk computer into a shared booking calendar. The calendar refuses a slot that is already taken, and sends the resident an SMS confirmation.",
});
