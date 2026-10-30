// The two examples /demo can load in practice mode, each with its scenario answers and review:
// - the complete example it opens with: the golden interview and the model answer, plus three
//   requirements most booking designs share (peak load, ease of use, reliability), each quoting the
//   chat. Every fact is carried through; Justify still finds a few small things (a requirement that
//   blurs its quote, a trade-off that hides a cost, a sketch that adds nothing);
// - the flawed sample attempt, which gives every check in the report something to show (a client
//   failure, an invented price, a failed reply, a missed on-probe fact, a dropped fact, uncited
//   requirements, an unsupported decision, undrawn decisions, an unexplained box, skipped and
//   uncertain Justify items, weak and unsound verdicts, and scenarios only partly handled).
// Each review is assembled by the same code as a live one, so every quote in it is verified.
import type { ChatMessage } from "../../shared/lib/types";
import { COMMUNITY_ROOM_CASE as CASE } from "./index";
import { buildSeed, fromAnswer, fromChat, fromDoc } from "../seed";

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

## Decisions
- **D1** One shared online calendar is the only record; the paper book is retired
  - Because: [R1](#R1)
  - Trade-off: staff need to be online to book
  - Quality: reliability
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
- **D2** Bookers get an SMS confirmation
  - Because: [R2](#R2)
  - Instead of: an app notification
  - Trade-off: a small cost per message
  - Quality: interaction-capability
  ${FENCE}mermaid
  flowchart TD
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
  flowchart TD
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
  flowchart TD
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
`;

const SAMPLE_FINAL_DIAGRAM = `flowchart TD
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

## Decisions
- **D1** One shared online calendar is the only record; the book and sticky notes are retired
  - Because: [R1](#R1), [R4](#R4)
  - Instead of: keep the paper book and add a phone log
  - Trade-off: staff need to be online to book
  - Quality: reliability
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
- **D2** Staff enter phone and walk-in bookings directly while the booker is still there
  - Because: [R3](#R3), [R4](#R4), [R5](#R5), [R7](#R7)
  - Instead of: let bookers book online themselves
  - Trade-off: calls take a little longer
  - Quality: interaction-capability
  ${FENCE}mermaid
  flowchart TD
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
  flowchart TD
    Desk["Desk computer [system]"] -->|"request slot"| Calendar[("Shared booking calendar [datastore]")]
    Calendar -->|"slot taken: refuse"| Desk
  ${FENCE}
- **D4** Bookers get an SMS confirmation
  - Because: [R3](#R3)
  - Instead of: an email or app notification
  - Trade-off: a small cost per message
  - Quality: interaction-capability
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar [datastore]")] -->|"sends confirmation"| SMS["SMS confirmation [external]"]
    SMS -->|"texts booker"| Resident["Resident [person]"]
  ${FENCE}
- **D5** Use a hosted calendar with a conflict check; no custom server
  - Because: [R2](#R2), [R6](#R6)
  - Instead of: a booking app with its own database
  - Trade-off: fewer custom features
  - Quality: maintainability
  ${FENCE}mermaid
  flowchart TD
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
  // The interview on a clock, so the timed rules can run. The pause before #7 is the engineer
  // waiting after a reply failed.
  interviewStart: Date.parse("2026-09-30T08:12:00+08:00"),
  gapsMin: { 7: 5 },
  scenarioAdequacy: {
    "sc.clash": {
      decision: "sound",
      diagram: "weak",
      justification: "weak",
      reasons: {
        decision: "D3 and D6 both refuse a taken slot, which is what the clash needs.",
        diagram: "Only the calendar is picked, so nothing shows where the refusal is seen.",
        justification: "Says the slot is refused, but not how the second person finds out.",
      },
      quote: fromAnswer("refuses a second booking"),
    },
    "sc.no-smartphone": {
      decision: "weak",
      diagram: "weak",
      justification: "weak",
      reasons: {
        decision: "An SMS tells her afterwards; nothing gets her phone booking into the record.",
        diagram: "The picked boxes carry the confirmation out, not the booking in.",
        justification: "Explains the confirmation and skips the booking itself.",
      },
      quote: fromAnswer("an SMS confirmation"),
    },
    "sc.right-size": {
      decision: "unsound",
      diagram: "unsound",
      justification: "unsound",
      reasons: {
        decision: "No decision sizes the solution to the centre.",
        diagram: "Nothing is picked.",
        justification: "No answer was written.",
      },
      quote: { source: "doc" as const, text: "Shared booking calendar" },
    },
  },
  // The characteristics this attempt touches. Everything left out is reported as not addressed.
  iso: {
    "functional-suitability": {
      verdict: "adequate",
      summary: "Bookings are recorded and clashes refused, but nothing takes a booking made by phone.",
      strengths: [{ point: "A taken slot is refused, which is the problem the brief names.", refs: ["D3"], quote: "A taken slot blocks any second booking for the same room and time" }],
      weaknesses: [{ point: "No decision says how a phone or walk-in booking reaches the record.", refs: ["R2"] }],
      improvements: [{ point: "Add a decision for staff entering a booking while the caller is on the line.", refs: ["R2"], quote: "Many bookers have no smartphone and book by phone or in person" }],
    },
    reliability: {
      verdict: "weak",
      summary: "One record removes the paper book, but a queue is added that nothing asked for.",
      strengths: [{ point: "Retiring the paper book removes the place bookings were lost.", refs: ["D1"], quote: "the paper book is retired" }],
      weaknesses: [{ point: "A message queue adds a component, and a failure mode, with no requirement behind it.", refs: ["D4"], quote: "Send every booking through a message queue so none get lost" }],
      improvements: [{ point: "Drop the queue, or write the requirement that justifies it.", refs: ["D4"] }],
    },
    "interaction-capability": {
      verdict: "weak",
      summary: "The only confirmation is an SMS, which the bookers who matter most may not be able to read.",
      weaknesses: [{ point: "An SMS confirmation assumes a phone the elderly regulars may not have.", refs: ["D2", "R2"], quote: "Bookers get an SMS confirmation" }],
      improvements: [{ point: "Offer a confirmation at the desk for bookers without a mobile.", refs: ["R2"] }],
    },
  },
  // The links worth attention; every other link of the chain is sound.
  rationale: {
    "R4>D5": { verdict: "unsound", reason: "D5 has no text, so nothing follows from R4." },
  },
  // One label per question Mei was asked. #5 and #7 go after the same requirement, so the repeat
  // earns no new key-question credit, and #3's target is one the client never answers.
  turns: {
    1: { action: "clarify", reasoning: "Opens by asking Mei to describe the booking she already told us about." },
    3: { action: "probe", targets: ["cr.scale"], reasoning: "Goes after how much booking there is, which the brief leaves out." },
    5: { action: "probe", targets: ["cr.bookers"], reasoning: "Goes after who books the rooms." },
    7: { action: "clarify", targets: ["cr.bookers"], reasoning: "Asks the same question again after the reply failed." },
    9: { action: "probe", targets: ["cr.staff"], reasoning: "Goes after who is at the desk to take a booking." },
  },
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
      reason: "SMS reaches bookers without smartphones, which is what R3 asks for.",
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
  suggestions: [
    { stage: "gate", text: "Mei never gave you the numbers you asked for, so the rooms and volume fact is left out of your scores. Ask again in another way when a reply dodges the question.", refs: ["cr.scale"] },
    { stage: "ask", text: "You never asked why the double bookings happen, so you missed the sticky notes behind them. Follow a problem with a why question before you design for it.", refs: ["cr.root-cause"] },
    { stage: "keep", text: "You learned who runs the desk but wrote no requirement for it, so it reached nothing. Write a requirement the moment a fact lands.", refs: ["cr.staff"] },
    { stage: "justify", text: "D4 adds a message queue nothing asked for, and R3 states a need Mei never mentioned. Keep each decision to what its requirements support.", refs: ["D4", "R3"] },
    { stage: "fit", text: "Nothing in your design gets a phone booking into the record, so both scenarios are only partly handled. Add a decision for how staff enter a call.", refs: ["sc.clash", "sc.no-smartphone"] },
  ],
  diagramPrompt:
    "Residents call or walk in to the front-desk staff, who type the booking on the desk computer. Bookings go through a message queue into a shared booking calendar, which sends the resident an SMS confirmation and prints a weekly schedule.",
});

/** The complete example practice mode opens with: the golden interview and the model answer, and its review. */
export const COMMUNITY_ROOM_COMPLETE_SEED = buildSeed(CASE, {
  messages: COMPLETE_MESSAGES,
  doc: COMPLETE_DOC,
  finalDiagram: CASE.modelAnswerFinalDiagram,
  interviewEnd: { at: Date.parse("2026-09-30T08:40:00+08:00"), how: "button", reason: "I have enough to start designing" },
  // The interview on a clock, so the timed rules can run. The pause before #7 is the engineer
  // stopping to think before asking why the double bookings happen.
  interviewStart: Date.parse("2026-09-30T08:12:00+08:00"),
  gapsMin: { 7: 6 },
  scenarioAdequacy: {
    "sc.clash": {
      decision: "sound",
      diagram: "sound",
      justification: "sound",
      reasons: {
        decision: "One record that refuses a taken slot is exactly what the clash needs.",
        diagram: "The desk computer and the calendar are the boxes the refusal happens between.",
        justification: "Says who is told, and when.",
      },
      quote: fromAnswer("refuses the second booking for a taken slot"),
    },
    "sc.no-smartphone": {
      decision: "sound",
      diagram: "sound",
      justification: "sound",
      reasons: {
        decision: "Staff entering the booking during the call covers a booker with no smartphone.",
        diagram: "Resident, staff, desk and calendar carry the booking in; SMS carries the confirmation out.",
        justification: "Follows the call from the phone to the confirmation.",
      },
      quote: fromAnswer("staff enter the booking during the call"),
    },
    "sc.right-size": {
      decision: "sound",
      diagram: "weak",
      justification: "sound",
      reasons: {
        decision: "A hosted calendar is sized to 30 bookings a week.",
        diagram: "Only the calendar is picked, so the sizing rests on one box.",
        justification: "Names the cost it avoids: no server to maintain.",
      },
      quote: fromAnswer("no server to maintain"),
    },
  },
  // The characteristics the model answer touches. Compatibility, security and safety are left out,
  // so the review reports them as not addressed rather than inventing a verdict.
  iso: {
    "functional-suitability": {
      verdict: "strong",
      summary: "The design does the job the brief asks for: every booking recorded once, and clashes refused.",
      strengths: [
        { point: "A taken slot is blocked, which removes the double bookings themselves.", refs: ["D3", "R8"], quote: "A taken slot blocks any second booking for the same room and time" },
        { point: "Staff entry covers the bookers who cannot book online.", refs: ["D2", "R3"], quote: "Staff enter phone and walk-in bookings directly" },
      ],
    },
    "performance-efficiency": {
      verdict: "adequate",
      summary: "A hosted calendar suits the volume, but the holiday peak is named and never sized.",
      strengths: [{ point: "A hosted calendar is right for 30 bookings a week.", refs: ["D5", "R2"], quote: "Use a hosted calendar with a conflict check; no custom server" }],
      weaknesses: [{ point: "Nothing says the calendar still holds up at the holiday peak." }],
      improvements: [{ point: "Check the hosted calendar against the busiest week, not the average one.", refs: ["R6"], quote: "Bookings rise during the school holidays" }],
    },
    "interaction-capability": {
      verdict: "weak",
      summary: "Staff entry serves bookers without a smartphone; the SMS confirmation then assumes one.",
      strengths: [{ point: "A booker can call or walk in and still be booked in on the spot.", refs: ["D2", "R3"], quote: "Staff enter phone and walk-in bookings directly" }],
      weaknesses: [{ point: "The only confirmation is an SMS, which contradicts the bookers R3 describes.", refs: ["D4", "R3"], quote: "Bookers get an SMS confirmation" }],
      improvements: [{ point: "Confirm at the desk as well, for a booker with no mobile.", refs: ["R3"], quote: "Many bookers have no smartphone and book by phone or in person" }],
    },
    reliability: {
      verdict: "strong",
      summary: "The place bookings were lost is gone, and the record refuses to contradict itself.",
      strengths: [
        { point: "Retiring the book and the sticky notes removes the gap bookings fell through.", refs: ["D1", "R4"], quote: "the book and sticky notes are retired" },
        { point: "A booking can no longer be doubled, which is what R8 asks for.", refs: ["D3", "R8"], quote: "a booking must never be lost or doubled" },
      ],
    },
    maintainability: {
      verdict: "strong",
      summary: "Nothing custom is built, so there is little to maintain.",
      strengths: [{ point: "No custom server means no code for the centre to look after.", refs: ["D5"], quote: "no custom server" }],
    },
    flexibility: {
      verdict: "adequate",
      summary: "A hosted calendar absorbs a busier week; growing past three rooms is not considered.",
      strengths: [{ point: "A hosted calendar takes the holiday rise without being resized.", refs: ["D5", "R6"], quote: "Bookings rise during the school holidays" }],
      improvements: [{ point: "Say what changes if the centre adds a room.", refs: ["R2"], quote: "Three rooms, about 30 bookings a week" }],
    },
  },
  // The links worth attention; every other link of the chain is sound.
  rationale: {
    "R2>D5": { verdict: "weak", reason: "R2 gives the volume, but the holiday peak behind the sizing is in R6." },
  },
  // One label per question Mei was asked: an opening clarification, then a probe per hidden
  // requirement, each one the first to go after its target.
  turns: {
    1: { action: "clarify", reasoning: "Opens by asking Mei to describe the booking she already told us about." },
    3: { action: "probe", targets: ["cr.scale"], reasoning: "Goes after how many rooms and bookings there are." },
    5: { action: "probe", targets: ["cr.bookers"], reasoning: "Goes after who books the rooms." },
    7: { action: "probe", targets: ["cr.root-cause"], reasoning: "Goes past the symptom to why the double bookings happen." },
    9: { action: "probe", targets: ["cr.staff"], reasoning: "Goes after who is at the desk to take a booking." },
  },
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
    D4: { verdict: "sound", reason: "SMS reaches bookers without smartphones, which is what R3 asks for.", quote: fromDoc("Bookers get an SMS confirmation") },
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
  suggestions: [
    { stage: "justify", text: "R2 leaves out the school-holiday peak Mei mentioned in the same breath, and D3 claims no real trade-off. Say what refusing a caller costs.", refs: ["R2", "D3"] },
  ],
  diagramPrompt:
    "Residents call or walk in to the front-desk staff, who enter the booking on the desk computer into a shared booking calendar. The calendar refuses a slot that is already taken, and sends the resident an SMS confirmation.",
});
