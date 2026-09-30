import type { CaseDefinition } from "./types";

// TODO(assessment-mode): serve facts from backend only
// The facts below ship in the frontend bundle, so an engineer could read them in devtools.
// Acceptable for this unscored case. Keep the ids in sync with COMMUNITY_ROOM_FACTS in
// design_it_backend/app/prompts.py.

const FENCE = "```";

const BRIEF_MARKDOWN = `# Community Room Booking

Mei runs the front desk at Bukit Cahaya Community Centre. People book the centre's rooms in a paper book at the front desk, and double bookings keep happening. She'd like something better.

Interview Mei to find out what's really going on, then write a short design doc and a final diagram.

Your design doc has three sections, plus a final diagram:
- **Requirements** — what you learned, each with a citation to the chat or this brief
- **Assumptions** — what you believe but haven't confirmed
- **Decisions** — what you chose, *because* of which requirements, and the trade-off. Each decision has a small sketch of the part of the system it adds
- **Final diagram** — the whole system. It must include everything in your sketches, and nothing that no decision explains
`;

const MODEL_ANSWER_MARKDOWN = `## Requirements
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
  flowchart LR
    Calendar[("Shared booking calendar")]
  ${FENCE}
- **D2** Staff enter phone and walk-in bookings directly while the booker is still there — because [R3](#R3), [R4](#R4), [R5](#R5). Trade-off: calls take a little longer.
  ${FENCE}mermaid
  flowchart LR
    Resident["Resident (actor)"] -->|"calls or walks in"| Staff["Front-desk staff (actor)"]
    Staff -->|"enters booking during the call"| Desk["Desk computer"]
    Desk --> Calendar[("Shared booking calendar")]
  ${FENCE}
- **D3** A taken slot blocks any second booking for the same room and time — because [R1](#R1). Trade-off: none significant.
  ${FENCE}mermaid
  flowchart LR
    Desk["Desk computer"] -->|"request slot"| Calendar[("Shared booking calendar")]
    Calendar -->|"slot taken: refuse"| Desk
  ${FENCE}
- **D4** Bookers get an SMS confirmation — because [R3](#R3). Trade-off: small SMS cost; depends on A1.
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar")] -->|"sends confirmation"| SMS["SMS confirmation"]
    SMS --> Resident["Resident (actor)"]
  ${FENCE}
- **D5** Use a hosted calendar with a conflict check; no custom server — because [R2](#R2). Instead of: a booking app with its own database. Trade-off: fewer custom features.
  ${FENCE}mermaid
  flowchart LR
    Calendar[("Shared booking calendar")]
  ${FENCE}
`;

const MODEL_ANSWER_FINAL_DIAGRAM = `flowchart LR
  Resident["Resident (actor)"] -->|"calls or walks in"| Staff["Front-desk staff (actor)"]
  Staff -->|"enters booking during the call"| Desk["Desk computer"]
  Desk -->|"request slot"| Calendar[("Shared booking calendar")]
  Calendar -->|"slot taken: refuse"| Desk
  Calendar -->|"sends confirmation"| SMS["SMS confirmation"]
  SMS --> Resident`;

export const EMPTY_DESIGN_DOC_TEMPLATE = `## Requirements
- **R1**

## Assumptions
- **A1**

## Decisions
- **D1**  — because [R1](#R1). Trade-off:
  ${FENCE}mermaid
  flowchart LR
  ${FENCE}

## Final diagram
${FENCE}mermaid
flowchart LR
${FENCE}
`;

export const COMMUNITY_ROOM_CASE: CaseDefinition = {
  id: "community-room",
  version: 1,
  title: "Community Room Booking",
  clientName: "Mei",
  clientRole: "Front desk, Bukit Cahaya Community Centre (fictional)",
  scored: false,
  briefMarkdown: BRIEF_MARKDOWN,
  openingMessage:
    "Hi, I'm Mei — I run the front desk here at Bukit Cahaya Community Centre. Our room bookings have become a bit of a headache. Ask me anything!",
  facts: [
    {
      id: "cr.current",
      label: "Current process and problem",
      detail: "Bookings go in one paper book at the front desk; double bookings keep happening",
      disclosure: "given",
      cues: ["book", "paper", "double"],
      whyItMatters: "",
    },
    {
      id: "cr.scale",
      label: "Rooms and volume",
      detail:
        "3 rooms (activity hall, meeting room, dance studio); about 30 bookings a week, more in school holidays",
      disclosure: "on-ask",
      cues: ["room", "rooms", "30", "week", "how many"],
      whyItMatters:
        "Volume decides how much system you need — 30 a week needs no custom infrastructure",
    },
    {
      id: "cr.bookers",
      label: "Who books",
      detail:
        "Mostly residents' groups; many regulars are elderly, some have no smartphone, so they phone or walk in",
      disclosure: "on-ask",
      cues: ["elderly", "smartphone", "phone", "walk in", "seniors"],
      whyItMatters: "An online-only system would shut out the centre's main users",
    },
    {
      id: "cr.root-cause",
      label: "Real cause of double bookings",
      detail:
        "Phone bookings are written on sticky notes by whoever answers; some notes never reach the book",
      disclosure: "on-probe",
      cues: ["sticky", "note", "phone booking", "copied"],
      whyItMatters:
        "Without it you fix the wrong problem — a new tool fails if phone bookings still bypass it",
    },
    {
      id: "cr.staff",
      label: "Who runs the desk",
      detail:
        "Two staff on alternating shifts, volunteers at weekends; one shared desk computer",
      disclosure: "on-ask",
      cues: ["staff", "shift", "volunteer", "computer", "desk"],
      whyItMatters: "Shapes who enters bookings and on what device",
    },
  ],
  expectedDecisions: [
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
  ],
  modelAnswerMarkdown: MODEL_ANSWER_MARKDOWN,
  modelAnswerFinalDiagram: MODEL_ANSWER_FINAL_DIAGRAM,
};
