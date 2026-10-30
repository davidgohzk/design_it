import communityRoomFacts from "./facts.json";
import { caseFacts } from "../facts";
import { goodAnswerNotesFor } from "../scenarios";
import type { CaseDefinition, ExpectedDecision } from "../types";

// TODO(assessment-mode): serve facts from backend only
// The facts below ship in the frontend bundle, so an engineer could read them in devtools.
// Acceptable for this unscored case. Each fact's shared fields (detail, disclosure, keywords, phrases,
// cues) come from facts.json, which has an identical copy in design_it_backend/app/cases/.

const FENCE = "```";

const BRIEF_MARKDOWN = `# Community Room Booking

Mei runs the front desk at Bukit Cahaya Community Centre. People book the centre's rooms in a paper book at the front desk, and double bookings keep happening. She'd like something better.

Interview Mei to find out what's really going on, then write a short design doc and a final diagram.

Your design doc has two sections, plus a final diagram:
- **Requirements** — what you learned, each with a citation to the chat or this brief
- **Decisions** — what you chose, *because* of which requirements, and the trade-off. Each decision has a small sketch of the part of the system it adds
- **Final diagram** — the whole system. It must include everything in your sketches, and nothing that no decision explains
`;

const MODEL_ANSWER_MARKDOWN = `## Requirements
- **R1** Bookings live in one paper book and double bookings keep happening — [Brief](#cs "double bookings keep happening")
- **R2** Three rooms, about 30 bookings a week — [Chat #4](#chat-msg-4 "We get about 30 bookings a week")
- **R3** Many bookers have no smartphone and book by phone or in person — [Chat #6](#chat-msg-6 "some of them don't have smartphones, so they call or just walk in")
- **R4** Phone bookings on sticky notes don't always reach the book — [Chat #8](#chat-msg-8 "sometimes the note never makes it into the book")
- **R5** Two staff on shifts share one desk computer — [Chat #10](#chat-msg-10 "We share the one computer at the desk.")

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
  - Because: [R3](#R3), [R4](#R4), [R5](#R5)
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
  - Because: [R1](#R1)
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
  - Because: [R2](#R2)
  - Instead of: a booking app with its own database
  - Trade-off: fewer custom features
  - Quality: maintainability
  ${FENCE}mermaid
  flowchart TD
    Calendar[("Shared booking calendar [datastore]")]
  ${FENCE}
`;

const MODEL_ANSWER_FINAL_DIAGRAM = `flowchart TD
  Resident["Resident [person]"] -->|"calls or walks in"| Staff["Front-desk staff [person]"]
  Staff -->|"enters booking during the call"| Desk["Desk computer [system]"]
  Desk -->|"request slot"| Calendar[("Shared booking calendar [datastore]")]
  Calendar -->|"slot taken: refuse"| Desk
  Calendar -->|"sends confirmation"| SMS["SMS confirmation [external]"]
  SMS -->|"texts booker"| Resident`;

const EXPECTED_DECISIONS: ExpectedDecision[] = [
  {
    id: "ed.single-source",
    question: "Where do bookings live?",
    goodAnswerNotes: "One shared place; the paper book and sticky notes are retired",
  },
  {
    id: "ed.phone-walkin",
    question: "How do phone and walk-in bookings get in?",
    goodAnswerNotes:
      "Staff enter them directly while the booker is still on the phone or at the desk",
  },
  {
    id: "ed.no-smartphone",
    question: "How do bookers without smartphones get confirmation?",
    goodAnswerNotes: "SMS, a call-back or a printed slip — not app-only",
  },
  {
    id: "ed.conflicts",
    question: "How are double bookings prevented?",
    goodAnswerNotes: "A taken slot blocks further bookings for that room and time",
  },
  {
    id: "ed.right-size",
    question: "Is the system sized to the evidence?",
    goodAnswerNotes:
      "A hosted calendar with a conflict check; no custom server, queue or microservices for 30 bookings a week",
  },
];

export const COMMUNITY_ROOM_CASE: CaseDefinition = {
  id: "community-room",
  title: "Community Room Booking",
  clientName: "Mei",
  clientRole: "Front desk, Bukit Cahaya Community Centre (fictional)",
  scored: false,
  briefMarkdown: BRIEF_MARKDOWN,
  openingMessage:
    "Hi, I'm Mei — I run the front desk here at Bukit Cahaya Community Centre. Our room bookings have become a bit of a headache. Ask me anything!",
  facts: caseFacts(communityRoomFacts, {
    "cr.current": {
      label: "Current process and problem",
      whyItMatters: "",
      exampleQuestions: ["What happens today when someone books a room?"],
    },
    "cr.scale": {
      label: "Rooms and volume",
      whyItMatters: "Volume decides how much system you need — 30 a week needs no custom infrastructure",
      exampleQuestions: ["How many rooms do you have, and how many bookings a week?"],
    },
    "cr.bookers": {
      label: "Who books",
      whyItMatters: "An online-only system would shut out the centre's main users",
      exampleQuestions: ["Who usually makes the bookings, and how do they reach you?"],
    },
    "cr.root-cause": {
      label: "Real cause of double bookings",
      whyItMatters: "Without it you fix the wrong problem — a new tool fails if phone bookings still bypass it",
      exampleQuestions: [
        "Why do you think the double bookings happen?",
        "How do phone bookings get into the book?",
      ],
    },
    "cr.staff": {
      label: "Who runs the desk",
      whyItMatters: "Shapes who enters bookings and on what device",
      exampleQuestions: ["Who works at the desk, and what do they use?"],
    },
  }),
  expectedDecisions: EXPECTED_DECISIONS,
  scenarios: [
    {
      id: "sc.clash",
      given: "a volunteer takes a phone booking while staff take a walk-in for the same room and time",
      when: "both save it",
      then: "only one booking is kept and the other person is told the slot is taken",
      quality: "reliability",
      linkedFactIds: ["cr.current", "cr.root-cause", "cr.staff"],
      expectedDecisionKeys: ["ed.conflicts", "ed.single-source"],
      expectedNodeTypes: ["datastore"],
      goodAnswerNotes: goodAnswerNotesFor(EXPECTED_DECISIONS, ["ed.conflicts", "ed.single-source"]),
    },
    {
      id: "sc.no-smartphone",
      given: "a senior with no smartphone",
      when: "she phones to book the meeting room",
      then: "her booking goes straight into the record and she gets a confirmation she can receive",
      quality: "interaction-capability",
      linkedFactIds: ["cr.bookers", "cr.root-cause"],
      expectedDecisionKeys: ["ed.phone-walkin", "ed.no-smartphone"],
      expectedNodeTypes: ["person", "datastore"],
      goodAnswerNotes: goodAnswerNotesFor(EXPECTED_DECISIONS, ["ed.phone-walkin", "ed.no-smartphone"]),
    },
    {
      id: "sc.right-size",
      given: "about 30 bookings a week, two staff and one shared computer",
      when: "the system is set up",
      then: "it runs with no custom server for anyone to maintain",
      quality: "maintainability",
      linkedFactIds: ["cr.scale", "cr.staff"],
      expectedDecisionKeys: ["ed.right-size"],
      expectedNodeTypes: ["datastore"],
      goodAnswerNotes: goodAnswerNotesFor(EXPECTED_DECISIONS, ["ed.right-size"]),
    },
  ],
  rubricAnchors: [
    {
      item: "decision",
      verdict: "unsound",
      example: "Use a message queue because of 30 bookings a week",
      why: "The volume argues against a queue",
    },
    {
      item: "decision",
      verdict: "sound",
      example: "Staff enter phone bookings during the call, because R3, R4",
      why: "Follows directly from the cited facts",
    },
    {
      item: "requirement",
      verdict: "weak",
      example: "\"Elderly bookers can't use technology\", cited to \"some of them don't have smartphones\"",
      why: "Overstates the quote",
    },
    {
      item: "sketch",
      verdict: "weak",
      example: "D4's sketch adds a payment service that D4 never mentions",
      why: "The sketch shows more than the decision",
    },
  ],
  modelAnswerMarkdown: MODEL_ANSWER_MARKDOWN,
  modelAnswerFinalDiagram: MODEL_ANSWER_FINAL_DIAGRAM,
};
