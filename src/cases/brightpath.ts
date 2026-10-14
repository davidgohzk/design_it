import brightpathFacts from "./brightpath.facts.json";
import { caseFacts } from "./facts";
import { goodAnswerNotesFor } from "./scenarios";
import type { CaseDefinition, ExpectedDecision } from "./types";

// The /demo case. Each fact's shared fields (detail, disclosure, keywords, phrases, cues) come from
// brightpath.facts.json, which has an identical copy in design_it_backend/app/cases/.
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
- **A1** Case managers and supervisors can receive a push notification or an SMS
  - Would confirm by asking: How do your case managers and supervisors get urgent messages today?
- **A2** The field worker can judge the severity on the report form
  - Would confirm by asking: Who decides how serious an incident is?

## Decisions
- **D1** Field workers report through a lightweight Android app that saves the report on the phone and sends it when there is signal
  - Because: [R5](#R5), [R6](#R6)
  - Instead of: an online-only web form
  - Trade-off: a report can arrive late if the worker stays offline
  - Quality: reliability
  ${FENCE}mermaid
  flowchart LR
    Worker["Field worker [person]"] -->|"fills in report"| App["Offline-first report app [container]"]
    App -->|"sends when online"| Server["Incident service [container]"]
  ${FENCE}
- **D2** One hosted incident service and database hold every incident, alert and acknowledgement
  - Because: [R1](#R1), [R2](#R2), [R8](#R8)
  - Instead of: an API gateway, a message queue and separate services
  - Trade-off: less room to scale, which 15 to 20 reports a day doesn't need
  - Quality: maintainability
  ${FENCE}mermaid
  flowchart LR
    Server["Incident service [container]"] -->|"stores"| DB[("Incident database [datastore]")]
  ${FENCE}
- **D3** Each incident notifies the child's assigned case manager directly, and a supervisor as well when it is high severity
  - Because: [R3](#R3), [R4](#R4)
  - Instead of: posting every alert to a group channel
  - Trade-off: the list of which case manager owns which child must be kept up to date; depends on A1 and A2
  - Quality: functional-suitability
  ${FENCE}mermaid
  flowchart LR
    Server["Incident service [container]"] -->|"sends alert"| Notify["Push / SMS notifier [external]"]
    Notify -->|"alerts"| CaseManager["Case manager [person]"]
    Notify -->|"high severity"| Supervisor["Supervisor [person]"]
  ${FENCE}
- **D4** The case manager acknowledges in the app; with no acknowledgement in 30 minutes, the alert escalates to a supervisor
  - Because: [R4](#R4), [R7](#R7)
  - Instead of: relying on case managers to check the app
  - Trade-off: supervisors may get alerts a busy case manager would have seen later
  - Quality: safety
  ${FENCE}mermaid
  flowchart LR
    CaseManager["Case manager [person]"] -->|"acknowledges"| Server["Incident service [container]"]
    Server -->|"no ack in 30 min"| Escalation["Escalation check [container]"]
    Escalation -->|"alerts supervisor"| Notify["Push / SMS notifier [external]"]
  ${FENCE}
- **D5** Donor and government reports are exported from the incident database
  - Because: [R8](#R8)
  - Instead of: compiling reports by hand from chat history
  - Trade-off: the reports are only as complete as what workers record
  - Quality: functional-suitability
  ${FENCE}mermaid
  flowchart LR
    DB[("Incident database [datastore]")] -->|"exports"| Reports["Donor and government reports [external]"]
  ${FENCE}
`;

const MODEL_ANSWER_FINAL_DIAGRAM = `flowchart LR
  Worker["Field worker [person]"] -->|"fills in report"| App["Offline-first report app [container]"]
  App -->|"sends when online"| Server["Incident service [container]"]
  Server -->|"stores"| DB[("Incident database [datastore]")]
  Server -->|"sends alert"| Notify["Push / SMS notifier [external]"]
  Notify -->|"alerts"| CaseManager["Case manager [person]"]
  Notify -->|"high severity"| Supervisor["Supervisor [person]"]
  CaseManager -->|"acknowledges"| Server
  Server -->|"no ack in 30 min"| Escalation["Escalation check [container]"]
  Escalation -->|"alerts supervisor"| Notify
  DB -->|"exports"| Reports["Donor and government reports [external]"]`;

const EXPECTED_DECISIONS: ExpectedDecision[] = [
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
];

export const BRIGHTPATH_CASE: CaseDefinition = {
  id: "brightpath",
  title: "Child Alert System",
  clientName: "Sarah",
  clientRole: "Program director, BrightPath NGO (fictional)",
  scored: false,
  briefMarkdown: BRIEF_MARKDOWN,
  openingMessage:
    "Hi! I'm Sarah, program director at BrightPath NGO. We work with at-risk children and I'm hoping you can help us design a better system for our field teams. Feel free to ask me about the problem we're facing.",
  facts: caseFacts(brightpathFacts, {
    "brightpath.0": {
      label: "Current reporting failure",
      whyItMatters: "",
      exampleQuestions: ["How do field workers report an incident today?"],
    },
    "brightpath.1": {
      label: "Field team scale",
      whyItMatters: "Forty users is a small system: it sizes everything else",
      exampleQuestions: ["How many field workers do you have, and where do they work?"],
    },
    "brightpath.2": {
      label: "Case manager ownership",
      whyItMatters: "Each alert must reach the one case manager who owns the child, not a whole group",
      exampleQuestions: ["Who is responsible for each child, and how is that split up?"],
    },
    "brightpath.3": {
      label: "Supervisor oversight",
      whyItMatters: "Severity decides who else is alerted, and who an unacknowledged alert escalates to",
      exampleQuestions: ["Who oversees the case managers, and when do they need to be told?"],
    },
    "brightpath.4": {
      label: "Incident volume",
      whyItMatters: "Volume decides how much system you need — 15 to 20 reports a day needs no queue, gateway or microservices",
      exampleQuestions: ["How many incident reports do you get on a busy day?"],
    },
    "brightpath.5": {
      label: "Device constraints",
      whyItMatters: "A heavy app won't run well on the phones field workers actually carry",
      exampleQuestions: ["What phones do your field workers carry?"],
    },
    "brightpath.6": {
      label: "Connectivity constraints",
      whyItMatters: "An online-only form loses reports in the field; they must survive a dropped connection",
      exampleQuestions: ["What's the mobile signal like where they visit families?"],
    },
    "brightpath.7": {
      label: "Submission and notification routing",
      whyItMatters: "",
      exampleQuestions: ["When an incident is reported, who needs to know?"],
    },
    "brightpath.8": {
      label: "Acknowledgement and escalation",
      whyItMatters: "",
      exampleQuestions: ["What should happen if nobody responds to an alert?"],
    },
    "brightpath.9": {
      label: "Audit and reporting record",
      whyItMatters: "",
      exampleQuestions: ["What records do you need to keep, and who reads them?"],
    },
  }),
  expectedDecisions: EXPECTED_DECISIONS,
  // Drafted for review: scenarios and anchors for this case were not in the handover.
  scenarios: [
    {
      id: "sc.no-signal",
      given: "a field worker on a home visit with no mobile signal",
      when: "she files an incident report",
      then: "the report is kept on her phone and reaches the system as soon as she has signal",
      quality: "reliability",
      linkedFactIds: ["brightpath.5", "brightpath.6"],
      expectedDecisionKeys: ["ed.submission"],
      expectedNodeTypes: ["person", "container"],
      goodAnswerNotes: goodAnswerNotesFor(EXPECTED_DECISIONS, ["ed.submission"]),
    },
    {
      id: "sc.unacknowledged",
      given: "a high-severity incident about a child",
      when: "the child's case manager doesn't acknowledge the alert in time",
      then: "a supervisor is alerted, and the alert, the escalation and any response are all on record",
      quality: "safety",
      linkedFactIds: ["brightpath.2", "brightpath.3", "brightpath.8", "brightpath.9"],
      expectedDecisionKeys: ["ed.routing", "ed.escalation", "ed.record"],
      expectedNodeTypes: ["person", "system", "datastore"],
      goodAnswerNotes: goodAnswerNotesFor(EXPECTED_DECISIONS, ["ed.routing", "ed.escalation", "ed.record"]),
    },
    {
      id: "sc.right-size",
      given: "about 40 field workers and 15 to 20 incident reports on a busy day",
      when: "the system is set up",
      then: "it runs without a gateway, queue or microservices for anyone to maintain",
      quality: "maintainability",
      linkedFactIds: ["brightpath.1", "brightpath.4"],
      expectedDecisionKeys: ["ed.right-size"],
      expectedNodeTypes: ["system", "datastore"],
      goodAnswerNotes: goodAnswerNotesFor(EXPECTED_DECISIONS, ["ed.right-size"]),
    },
  ],
  rubricAnchors: [
    {
      item: "decision",
      verdict: "unsound",
      example: "Add an API gateway, a message queue and microservices because of 15 to 20 reports a day",
      why: "The volume argues against them",
    },
    {
      item: "decision",
      verdict: "sound",
      example: "Reports are saved on the phone and sent when there is signal, because R5, R6",
      why: "Follows directly from the cited facts",
    },
    {
      item: "requirement",
      verdict: "weak",
      example: "\"Field workers have no internet in the field\", cited to \"Out in the field the connection comes and goes\"",
      why: "Overstates the quote: the signal is patchy, not absent",
    },
    {
      item: "sketch",
      verdict: "weak",
      example: "D3's sketch adds a donor dashboard that D3 never mentions",
      why: "The sketch shows more than the decision",
    },
  ],
  modelAnswerMarkdown: MODEL_ANSWER_MARKDOWN,
  modelAnswerFinalDiagram: MODEL_ANSWER_FINAL_DIAGRAM,
};
