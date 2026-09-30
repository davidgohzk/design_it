import type { CaseDefinition } from "./types";

// The /demo case. Fact ids and details match PERSONAS["brightpath"] in
// design_it_backend/app/prompts.py: id "brightpath.<i>" is PERSONA_FACTS[i], in order.
// Sarah's persona states any fact she is asked about, so none of them is on-probe.

const FENCE = "```";

const BRIEF_MARKDOWN = `# Child Alert System

Sarah is a program director at BrightPath, an NGO that supports vulnerable children. When a field worker sees something worrying on a visit, they report it in a WhatsApp group, where messages get buried and alerts can go unnoticed. Nobody can tell whether the right case manager saw an alert, and old chat messages are no record for donor or government reporting.

Sarah wants a system where:
- field workers submit incident reports from the field
- the assigned case manager and supervisor are notified immediately
- alerts are tracked, and an alert nobody acknowledges is escalated
- every incident and response is stored for audit and reporting

Interview Sarah to find out what her teams really work with, then write a short design doc and a final diagram.

Your design doc has three sections, plus a final diagram:
- **Requirements** — what you learned, each with a citation to the chat or this brief
- **Assumptions** — what you believe but haven't confirmed
- **Decisions** — what you chose, *because* of which requirements, and the trade-off. Each decision has a small sketch of the part of the system it adds
- **Final diagram** — the whole system. It must include everything in your sketches, and nothing that no decision explains
`;

const MODEL_ANSWER_MARKDOWN = `## Requirements
- **R1** Incidents reported in WhatsApp get buried and can go unnoticed — [Brief](#cs "messages get buried and alerts can go unnoticed")
- **R2** About 40 field workers in three districts file 15 to 20 reports on a busy day — [Chat #4](#chat-msg-4 "about 40 field workers spread across three districts") [Chat #4](#chat-msg-4 "On a busy day we might get 15 to 20 incident reports")
- **R3** Each child has one case manager: 12 case managers each own a group of children — [Chat #4](#chat-msg-4 "each case manager is responsible for a group of field workers and their assigned children")
- **R4** Supervisors must be looped in on high-severity incidents — [Chat #4](#chat-msg-4 "3 supervisors who oversee everything and need to be looped in on high-severity incidents")
- **R5** Field workers carry low-end Android phones — [Chat #6](#chat-msg-6 "low-end Android phones")
- **R6** Reports can't assume a connection in the field — [Chat #8](#chat-msg-8 "Out in the field the connection comes and goes")
- **R7** An alert nobody acknowledges must be escalated — [Brief](#cs "an alert nobody acknowledges is escalated")
- **R8** Every incident and response is kept for donor and government reporting — [Brief](#cs "every incident and response is stored for audit and reporting")

## Assumptions
- **A1** Case managers and supervisors can receive a push notification or an SMS (not asked)
- **A2** The field worker can judge the severity on the report form (not asked)

## Decisions
- **D1** Field workers report through a lightweight Android app that saves the report on the phone and sends it when there is signal — because [R5](#R5), [R6](#R6). Trade-off: a report can arrive late if the worker stays offline.
  ${FENCE}mermaid
  flowchart TD
    Worker["Field worker (actor)"] -->|"fills in report"| App["Offline-first report app"]
    App -->|"sends when online"| Server["Incident service"]
  ${FENCE}
- **D2** One hosted incident service and database hold every incident, alert and acknowledgement — because [R1](#R1), [R2](#R2), [R8](#R8). Instead of: an API gateway, a message queue and separate services. Trade-off: less room to scale, which 15 to 20 reports a day doesn't need.
  ${FENCE}mermaid
  flowchart TD
    Server["Incident service"] -->|"stores"| DB[("Incident database")]
  ${FENCE}
- **D3** Each incident notifies the child's assigned case manager directly, and a supervisor as well when it is high severity — because [R3](#R3), [R4](#R4). Trade-off: the list of which case manager owns which child must be kept up to date; depends on A1 and A2.
  ${FENCE}mermaid
  flowchart TD
    Server["Incident service"] -->|"sends alert"| Notify["Push / SMS notifier"]
    Notify --> CaseManager["Case manager (actor)"]
    Notify -->|"high severity"| Supervisor["Supervisor (actor)"]
  ${FENCE}
- **D4** The case manager acknowledges in the app; with no acknowledgement in 30 minutes, the alert escalates to a supervisor — because [R4](#R4), [R7](#R7). Trade-off: supervisors may get alerts a busy case manager would have seen later.
  ${FENCE}mermaid
  flowchart TD
    CaseManager["Case manager (actor)"] -->|"acknowledges"| Server["Incident service"]
    Server -->|"no ack in 30 min"| Escalation["Escalation check"]
    Escalation -->|"alerts supervisor"| Notify["Push / SMS notifier"]
  ${FENCE}
- **D5** Donor and government reports are exported from the incident database — because [R8](#R8). Trade-off: the reports are only as complete as what workers record.
  ${FENCE}mermaid
  flowchart TD
    DB[("Incident database")] -->|"exports"| Reports["Donor and government reports"]
  ${FENCE}
`;

const MODEL_ANSWER_FINAL_DIAGRAM = `flowchart TD
  Worker["Field worker (actor)"] -->|"fills in report"| App["Offline-first report app"]
  App -->|"sends when online"| Server["Incident service"]
  Server -->|"stores"| DB[("Incident database")]
  Server -->|"sends alert"| Notify["Push / SMS notifier"]
  Notify --> CaseManager["Case manager (actor)"]
  Notify -->|"high severity"| Supervisor["Supervisor (actor)"]
  CaseManager -->|"acknowledges"| Server
  Server -->|"no ack in 30 min"| Escalation["Escalation check"]
  Escalation -->|"alerts supervisor"| Notify
  DB -->|"exports"| Reports["Donor and government reports"]`;

export const BRIGHTPATH_CASE: CaseDefinition = {
  id: "brightpath",
  version: 1,
  title: "Child Alert System",
  clientName: "Sarah",
  clientRole: "Program director, BrightPath NGO (fictional)",
  scored: false,
  briefMarkdown: BRIEF_MARKDOWN,
  openingMessage:
    "Hi! I'm Sarah, program director at BrightPath NGO. We work with at-risk children and I'm hoping you can help us design a better system for our field teams. Feel free to ask me about the problem we're facing.",
  facts: [
    {
      id: "brightpath.0",
      label: "Current reporting failure",
      detail:
        "Field workers report incidents through WhatsApp; messages get buried and an alert can sit unnoticed for a whole day.",
      disclosure: "given",
      cues: ["whatsapp", "buried", "unnoticed"],
      whyItMatters: "",
    },
    {
      id: "brightpath.1",
      label: "Field team scale",
      detail: "About 40 field workers are spread across three districts.",
      disclosure: "on-ask",
      cues: ["40", "forty", "district"],
      whyItMatters: "Forty users is a small system: it sizes everything else",
    },
    {
      id: "brightpath.2",
      label: "Case manager ownership",
      detail:
        "There are 12 case managers; each is responsible for a group of field workers and the children assigned to them.",
      disclosure: "on-ask",
      cues: ["12", "twelve", "responsible for", "assigned"],
      whyItMatters: "Each alert must reach the one case manager who owns the child, not a whole group",
    },
    {
      id: "brightpath.3",
      label: "Supervisor oversight",
      detail: "Three supervisors oversee everything and need to be looped in on high-severity incidents.",
      disclosure: "on-ask",
      cues: ["supervisor", "high-severity", "high severity"],
      whyItMatters: "Severity decides who else is alerted, and who an unacknowledged alert escalates to",
    },
    {
      id: "brightpath.4",
      label: "Incident volume",
      detail: "On a busy day, the team receives roughly 15 to 20 incident reports.",
      disclosure: "on-ask",
      cues: ["15", "20", "busy day", "per day"],
      whyItMatters:
        "Volume decides how much system you need — 15 to 20 reports a day needs no queue, gateway or microservices",
    },
    {
      id: "brightpath.5",
      label: "Device constraints",
      detail: "Field workers often use low-end Android phones.",
      disclosure: "on-ask",
      cues: ["android", "low-end", "cheap phone"],
      whyItMatters: "A heavy app won't run well on the phones field workers actually carry",
    },
    {
      id: "brightpath.6",
      label: "Connectivity constraints",
      detail: "Field workers often have patchy connectivity in the field.",
      disclosure: "on-ask",
      cues: ["signal", "connection", "connectivity", "offline", "patchy", "reception"],
      whyItMatters: "An online-only form loses reports in the field; they must survive a dropped connection",
    },
    {
      id: "brightpath.7",
      label: "Submission and notification routing",
      detail:
        "The system should accept incident submissions from the field and immediately notify the assigned case manager and supervisor.",
      disclosure: "given",
      cues: ["notify", "notified"],
      whyItMatters: "",
    },
    {
      id: "brightpath.8",
      label: "Acknowledgement and escalation",
      detail: "Alerts need acknowledgement tracking with escalation when nobody responds.",
      disclosure: "given",
      cues: ["acknowledge", "escalat"],
      whyItMatters: "",
    },
    {
      id: "brightpath.9",
      label: "Audit and reporting record",
      detail:
        "Every incident and response needs a durable record; old chat messages make donor and government reporting difficult.",
      disclosure: "given",
      cues: ["record", "donor", "government"],
      whyItMatters: "",
    },
  ],
  expectedDecisions: [
    {
      id: "ed.submission",
      question: "How do field workers submit an incident?",
      goodAnswerNotes:
        "A lightweight app or form that runs on low-end Android and keeps a report until there is signal",
    },
    {
      id: "ed.routing",
      question: "Who is notified, and how?",
      goodAnswerNotes:
        "The child's assigned case manager directly, not a group; a supervisor as well for high-severity incidents",
    },
    {
      id: "ed.escalation",
      question: "What happens when nobody acknowledges an alert?",
      goodAnswerNotes: "Acknowledgements are tracked; an unacknowledged alert escalates to a supervisor after a set time",
    },
    {
      id: "ed.record",
      question: "Where do incidents and responses live?",
      goodAnswerNotes:
        "One durable record of every incident, acknowledgement and action, usable for donor and government reports",
    },
    {
      id: "ed.right-size",
      question: "Is the system sized to the evidence?",
      goodAnswerNotes:
        "One hosted service with a database and a notifier; no API gateway, message queue or microservices for 15 to 20 reports a day",
    },
  ],
  modelAnswerMarkdown: MODEL_ANSWER_MARKDOWN,
  modelAnswerFinalDiagram: MODEL_ANSWER_FINAL_DIAGRAM,
};
