// The two examples /simple can load in practice mode, each with its walkthrough answers and review:
// - the complete example it opens with: the golden interview and the model answer, plus three
//   requirements most booking designs share (peak load, ease of use, reliability), each quoting the
//   chat. Every fact is carried through; Justify still finds a few small things (a requirement that
//   blurs its quote, a trade-off that hides a cost, a sketch that adds nothing);
// - the flawed sample attempt, which gives every check in the report something to show (a client
//   failure, an invented price, a failed reply, a missed on-probe fact, a dropped fact, uncited
//   requirements, an unsupported decision, undrawn decisions, an unexplained box, skipped and
//   uncertain Justify items, weak and unsound verdicts, and scenarios only partly handled).
// Each review is assembled by the same code as a live one, so every quote in it is verified.
import type { ChatMessage } from "../shared/lib/types";
import { COMMUNITY_ROOM_CASE as CASE } from "./community-room";
import { buildSeed, fromAnswer, fromChat, fromDoc } from "./seed";

const FENCE = "```";

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
      "Mostly residents' groups - the seniors' exercise group, the tuition teachers, a few family events. Many of our regulars are elderly, and some of them don't have smartphones, so they call or just walk in. Oh, and we're hoping to start charging a $20 fee for the hall next year.",
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
- **D1** One shared online calendar is the only record; the paper book is retired
  - Because: [R1](#R1)
  - Trade-off: staff need to be online to book
  - Quality: reliability
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
- **D2** Bookers get an SMS confirmation
  - Because: [R2](#R2)
  - Instead of: an app notification
  - Trade-off: small SMS cost; depends on A1
  - Quality: interaction-capability
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar [datastore]")] -->|"sends confirmation"| SMS["SMS confirmation [external]"]
    SMS --> Resident["Resident [person]"]
  ${FENCE}
- **D3** A taken slot blocks any second booking for the same room and time
  - Because: [R1](#R1)
  - Instead of: staff check the calendar by eye
  - Trade-off: none significant
  - Quality: reliability
- **D4** Send every booking through a message queue so none get lost
  - Because: the centre is busy
  - Quality: speed
  ${FENCE}mermaid
  flowchart LR
    Desk["Desk computer [system]"] -->|"new booking"| Queue["Message queue"]
    Queue --> Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
- **D5** — because [R4](#R4). Trade-off: none.
- **D6** The calendar refuses a booking for a room and time that is already taken
  - Because: [R1](#R1)
  - Instead of: double-check with the caller afterwards
  - Trade-off: staff must offer the caller another slot
  - Quality: reliability
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
`;

const SAMPLE_FINAL_DIAGRAM = `flowchart LR
  Resident["Resident [person]"] -->|"calls or walks in"| Staff["Front-desk staff [person]"]
  Staff -->|"types the booking"| Desk["Desk computer [system]"]
  Desk -->|"new booking"| Queue["Message queue"]
  Queue --> Calendar[("Shared booking calendar [datastore]")]
  Calendar -->|"sends confirmation"| SMS["SMS confirmation [external]"]
  SMS --> Resident
  Calendar --> Printer["Printed weekly schedule"]`;

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

// The model answer, plus the requirements most booking designs share (R6–R8), each quoting what Mei
// said, and the decisions that use them. Written out in full so a change to the model answer can't
// silently skip an edit.
const COMPLETE_DOC = `## Requirements
- **R1** Bookings live in one paper book and double bookings keep happening — [Brief](#cs "double bookings keep happening")
- **R2** Three rooms, about 30 bookings a week — [Chat #4](#chat-msg-4 "We get about 30 bookings a week")
- **R3** Many bookers have no smartphone and book by phone or in person — [Chat #6](#chat-msg-6 "some of them don't have smartphones, so they call or just walk in")
- **R4** Phone bookings on sticky notes don't always reach the book — [Chat #8](#chat-msg-8 "sometimes the note never makes it into the book")
- **R5** Two staff on shifts share one desk computer — [Chat #10](#chat-msg-10 "We share the one computer at the desk.")
- **R6** Bookings rise during the school holidays — [Chat #4](#chat-msg-4 "more during the school holidays")
- **R7** Weekend volunteers take bookings too, so it must be simple for occasional users — [Chat #10](#chat-msg-10 "volunteers on weekends")
- **R8** A double booking sends someone home upset, so a booking must never be lost or doubled — [Chat #2](#chat-msg-2 "someone always goes home upset")

## Assumptions
- **A1** Bookers can receive an SMS on a basic phone
  - Would confirm by asking: Can your regulars get text messages?
- **A2** The desk computer has reliable internet
  - Would confirm by asking: Does the desk ever lose internet?

## Decisions
- **D1** One shared online calendar is the only record; the book and sticky notes are retired
  - Because: [R1](#R1), [R4](#R4)
  - Instead of: keep the paper book and add a phone log
  - Trade-off: staff need to be online to book (A2)
  - Quality: reliability
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
- **D2** Staff enter phone and walk-in bookings directly while the booker is still there
  - Because: [R3](#R3), [R4](#R4), [R5](#R5), [R7](#R7)
  - Instead of: let bookers book online themselves
  - Trade-off: calls take a little longer
  - Quality: interaction-capability
  ${FENCE}mermaid
  flowchart LR
    Resident["Resident [person]"] -->|"calls or walks in"| Staff["Front-desk staff [person]"]
    Staff -->|"enters booking during the call"| Desk["Desk computer [system]"]
    Desk -->|"saves booking"| Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
- **D3** A taken slot blocks any second booking for the same room and time
  - Because: [R1](#R1), [R8](#R8)
  - Instead of: staff check the calendar by eye before saving
  - Trade-off: none significant
  - Quality: reliability
  ${FENCE}mermaid
  flowchart LR
    Desk["Desk computer [system]"] -->|"request slot"| Calendar[("Shared booking calendar [datastore]")]
    Calendar -->|"slot taken: refuse"| Desk
  ${FENCE}
- **D4** Bookers get an SMS confirmation
  - Because: [R3](#R3)
  - Instead of: an email or app notification
  - Trade-off: small SMS cost; depends on A1
  - Quality: interaction-capability
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar [datastore]")] -->|"sends confirmation"| SMS["SMS confirmation [external]"]
    SMS -->|"texts booker"| Resident["Resident [person]"]
  ${FENCE}
- **D5** Use a hosted calendar with a conflict check; no custom server
  - Because: [R2](#R2), [R6](#R6)
  - Instead of: a booking app with its own database
  - Trade-off: fewer custom features
  - Quality: maintainability
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
`;

// ---------------------------------------------------------------------------------------------

/** The flawed sample attempt, loaded by the Flawed example button. */
export const COMMUNITY_ROOM_SEED = buildSeed(CASE, {
  messages: SAMPLE_MESSAGES,
  doc: SAMPLE_DOC,
  finalDiagram: SAMPLE_FINAL_DIAGRAM,
  interviewEnd: { at: Date.parse("2026-09-30T08:40:00+08:00"), how: "button", reason: "I think I've covered everything" },
  // R3 (no citation), R4 (its quote isn't in the chat), D1 (no Instead of:), D4 (no requirement),
  // D5 (no Instead of:) and the missing sketches of D3 and D5 fail lint, so they are not judged.
  justify: {
    R1: { verdict: "sound", reason: "Restates the brief's problem without adding to it.", quote: fromDoc("Bookings live in one paper book") },
    R2: { verdict: "sound", reason: "Faithful to the quote about bookers without smartphones.", quote: fromChat("some of them don't have smartphones") },
    R5: { verdict: "weak", reason: "Faithful to Mei's words, but it says again what R1 already says.", quote: fromDoc("Two groups sometimes turn up for the same room") },
    "D1-sketch": { verdict: "sound", reason: "Shows only the shared calendar the decision introduces.", quote: fromDoc("One shared online calendar is the only record") },
    D2: {
      verdict: "sound",
      runs: ["sound", "sound", "weak"],
      reason: "SMS reaches bookers without smartphones; the dependency on A1 is stated.",
      quote: fromDoc("Bookers get an SMS confirmation"),
    },
    "D2-sketch": { verdict: "sound", reason: "Shows the confirmation going from the calendar to the resident by SMS.", quote: fromDoc("Bookers get an SMS confirmation") },
    D3: { verdict: "sound", reason: "Blocking a taken slot directly prevents the double bookings in R1.", quote: fromDoc("A taken slot blocks any second booking") },
    "D4-sketch": {
      verdict: "unsound",
      reason: "A message queue for a community centre's bookings: the volume argues against it.",
      quote: fromDoc("Send every booking through a message queue"),
    },
    D6: { verdict: "weak", reason: "Follows from R1, but it is the same choice as D3.", quote: fromDoc("The calendar refuses a booking for a room and time that is already taken") },
    "D6-sketch": { verdict: "weak", reason: "Draws only the calendar; the refusal D6 is about isn't shown.", quote: fromDoc("already taken") },
  },
  answers: [
    {
      scenarioId: "sc.clash",
      pickedDecisionIds: ["D3", "D6"],
      pickedNodeIds: ["Calendar"],
      oneLiner: "The calendar refuses a second booking for a taken slot.",
      notHandled: false,
    },
    { scenarioId: "sc.no-smartphone", pickedDecisionIds: ["D2"], pickedNodeIds: ["SMS", "Resident"], oneLiner: "She gets an SMS confirmation.", notHandled: false },
    { scenarioId: "sc.right-size", pickedDecisionIds: [], pickedNodeIds: [], oneLiner: "", notHandled: true },
  ],
  fit: {
    "sc.clash": { verdict: "partly", reason: "The slot is refused, but nothing says how the other person is told.", quote: fromAnswer("refuses a second booking") },
    "sc.no-smartphone": { verdict: "partly", reason: "The SMS reaches her, but nothing gets a phone booking into the record.", quote: fromAnswer("an SMS confirmation") },
  },
  diagramPrompt:
    "Residents call or walk in to the front-desk staff, who type the booking on the desk computer. Bookings go through a message queue into a shared booking calendar, which sends the resident an SMS confirmation and prints a weekly schedule.",
});

/** The complete example practice mode opens with: the golden interview and the model answer, and its review. */
export const COMMUNITY_ROOM_COMPLETE_SEED = buildSeed(CASE, {
  messages: COMPLETE_MESSAGES,
  doc: COMPLETE_DOC,
  finalDiagram: CASE.modelAnswerFinalDiagram,
  interviewEnd: { at: Date.parse("2026-09-30T08:40:00+08:00"), how: "button", reason: "I have enough to start designing" },
  justify: {
    R1: { verdict: "sound", reason: "Restates the brief's problem without adding to it.", quote: fromDoc("Bookings live in one paper book") },
    R2: { verdict: "weak", reason: "Leaves out the school-holiday peak Mei mentioned in the same answer.", quote: fromDoc("Three rooms, about 30 bookings a week") },
    R3: { verdict: "sound", reason: "Faithful to the quote about bookers without smartphones.", quote: fromChat("some of them don't have smartphones, so they call or just walk in") },
    R4: { verdict: "sound", reason: "Captures the real cause: phone bookings bypass the book.", quote: fromDoc("Phone bookings on sticky notes don't always reach the book") },
    R5: { verdict: "sound", reason: "Faithful: two staff on shifts sharing one computer.", quote: fromDoc("Two staff on shifts share one desk computer") },
    R6: { verdict: "sound", reason: "Faithful to the school-holiday peak Mei mentioned.", quote: fromDoc("Bookings rise during the school holidays") },
    R7: { verdict: "sound", reason: "Follows from the weekend volunteers; the simplicity it asks for is a fair reading.", quote: fromDoc("Weekend volunteers take bookings too") },
    R8: { verdict: "sound", reason: "Faithful to what a double booking costs the people who book.", quote: fromDoc("a booking must never be lost or doubled") },
    D1: { verdict: "sound", reason: "One record removes the gap where sticky notes get lost (R4).", quote: fromDoc("the book and sticky notes are retired") },
    "D1-sketch": { verdict: "sound", reason: "Shows only the shared calendar the decision introduces.", quote: fromDoc("One shared online calendar is the only record") },
    D2: { verdict: "sound", reason: "Entering bookings during the call closes the phone-booking gap for staff on one computer.", quote: fromDoc("Staff enter phone and walk-in bookings directly") },
    "D2-sketch": { verdict: "sound", reason: "Shows the resident, staff, desk computer and calendar the decision names.", quote: fromDoc("Staff enter phone and walk-in bookings directly") },
    D3: { verdict: "weak", reason: "\"Trade-off: none significant\" hides a real cost: a refused caller must be offered another slot.", quote: fromDoc("Trade-off: none significant") },
    "D3-sketch": { verdict: "sound", reason: "Shows the request and the refusal of a taken slot.", quote: fromDoc("A taken slot blocks any second booking") },
    D4: { verdict: "sound", reason: "SMS reaches bookers without smartphones; the dependency on A1 is stated.", quote: fromDoc("Bookers get an SMS confirmation") },
    "D4-sketch": { verdict: "sound", reason: "Shows the confirmation going from the calendar to the resident by SMS.", quote: fromDoc("Bookers get an SMS confirmation") },
    D5: { verdict: "sound", reason: "A hosted calendar is right-sized for about 30 bookings a week.", quote: fromDoc("Use a hosted calendar with a conflict check") },
    "D5-sketch": { verdict: "weak", reason: "Draws only the calendar, so it doesn't show what D5 adds over D1.", quote: fromDoc("no custom server") },
  },
  answers: [
    {
      scenarioId: "sc.clash",
      pickedDecisionIds: ["D1", "D3"],
      pickedNodeIds: ["Calendar", "Desk"],
      oneLiner: "The calendar refuses the second booking for a taken slot, so whoever saves second is told it's taken.",
      notHandled: false,
    },
    {
      scenarioId: "sc.no-smartphone",
      pickedDecisionIds: ["D2", "D4"],
      pickedNodeIds: ["Resident", "Staff", "Desk", "Calendar", "SMS"],
      oneLiner: "She phones, staff enter the booking during the call, and she gets an SMS confirmation.",
      notHandled: false,
    },
    {
      scenarioId: "sc.right-size",
      pickedDecisionIds: ["D5"],
      pickedNodeIds: ["Calendar"],
      oneLiner: "A hosted calendar with a conflict check, so there's no server to maintain.",
      notHandled: false,
    },
  ],
  fit: {
    "sc.clash": { verdict: "handled", reason: "One record that refuses a taken slot, and the second person is told.", quote: fromAnswer("refuses the second booking for a taken slot") },
    "sc.no-smartphone": { verdict: "handled", reason: "Staff enter phone bookings live, and SMS reaches a basic phone.", quote: fromAnswer("staff enter the booking during the call") },
    "sc.right-size": { verdict: "handled", reason: "A hosted calendar with a conflict check fits 30 bookings a week.", quote: fromAnswer("no server to maintain") },
  },
  diagramPrompt:
    "Residents call or walk in to the front-desk staff, who enter the booking on the desk computer into a shared booking calendar. The calendar refuses a slot that is already taken, and sends the resident an SMS confirmation.",
});
