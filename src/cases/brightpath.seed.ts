// The two examples /demo can load in practice mode, each with its walkthrough answers and review:
// - the complete example it opens with: an interview that surfaces every fact, and the model answer
//   with one requirement added that restates another, plus three most alert designs share
//   (reliability, speed, traceability), each quoting the brief or the chat. Every fact is carried
//   through; Justify still finds a decision whose time limit nobody gave;
// - the flawed sample attempt, which gives every check in the report something to show. Its facts end
//   up at every link of the chain: one carried through to the diagram, one decided but not drawn, one
//   required but never decided, one dropped after the chat, one assumed openly, and one the client
//   failed to give. It also has a failed reply, an invented specific, uncited requirements, an
//   unsupported and oversized decision, undrawn decisions, an unexplained box and connections, skipped
//   and uncertain Justify items, weak and unsound verdicts, and scenarios not or only partly handled.
// Each review is assembled by the same code as a live one, so every quote in it is verified.
import type { ChatMessage } from "../shared/lib/types";
import { BRIGHTPATH_CASE as CASE } from "./brightpath";
import { buildSeed, fromAnswer, fromChat, fromDoc } from "./seed";

const FENCE = "```";

const WHATSAPP_REPLY =
  "Of course! Right now, when a field worker visits a child and notices something concerning - signs of neglect, an unsafe home, anything like that - they send a message in a WhatsApp group. The problem is the group has too many people, messages get buried, and there's no way to know if the right case manager actually saw it or is taking action. Sometimes alerts go unnoticed for a whole day. On top of that, when our NGO director has to report to donors or the government, we have no proper records - just old chat messages. It's really not working for us anymore.";

const SCALE_REPLY =
  "We have about 40 field workers spread across three districts, and 12 case managers - each case manager is responsible for a group of field workers and their assigned children. On top of that, there are 3 supervisors who oversee everything and need to be looped in on high-severity incidents. On a busy day we might get 15 to 20 incident reports. It's not a huge volume, but the problem is that even one missed alert can have serious consequences for a child.";

// ---------------------------------------------------------------------------------------------
// The flawed sample attempt

// Message indexes matter: the doc's citations and the review's evidence use them.
const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: "assistant", content: CASE.openingMessage },
  { role: "user", content: "Hi Sarah! Can you walk me through the main problem you're trying to solve?" },
  { role: "assistant", content: WHATSAPP_REPLY },
  {
    role: "user",
    content:
      "How many field workers and case managers are we dealing with? I need to understand the scale before proposing a design.",
  },
  { role: "assistant", content: SCALE_REPLY },
  { role: "user", content: "What phones do your field workers use?" },
  // Level 0 session check: a reply that timed out.
  { role: "assistant", content: "Request failed: The server took too long to respond." },
  { role: "user", content: "Sorry - what phones do your field workers use?" },
  {
    role: "assistant",
    content:
      // Level 0 client failure: asked about phones, but the reply says nothing about them.
      // The last sentence is a level 0 invented fact: it is in none of the case facts.
      "Oh, all sorts, really - whatever they bring. I honestly couldn't tell you. We're also hoping to open an office in a fourth district next year.",
  },
  { role: "user", content: "Who needs to know when an incident is reported?" },
  {
    role: "assistant",
    content:
      "The assigned case manager, straight away - and the supervisor as well if it's serious. Right now nobody can tell whether the case manager has even seen it.",
  },
];

// Assumes a signal in the field instead of asking (the connectivity fact is assumed), drops the team
// size, writes the volume down but never uses it, and so oversizes the design. R5 restates R4's volume
// (and contradicts it), and D7 repeats D2 with a sketch that is a slice of D2's.
const SAMPLE_DOC = `## Requirements
- **R1** WhatsApp alerts get buried and nobody knows whether the case manager saw them — [Chat #2](#chat-msg-2 "there's no way to know if the right case manager actually saw it or is taking action")
- **R2** Each case manager is responsible for their own group of children — [Chat #4](#chat-msg-4 "each case manager is responsible for a group of field workers and their assigned children")
- **R3** Supervisors are looped in on high-severity incidents — [Chat #4](#chat-msg-4 "need to be looped in on high-severity incidents")
- **R4** The team gets 15 to 20 incident reports on a busy day — [Chat #4](#chat-msg-4 "On a busy day we might get 15 to 20 incident reports")
- **R5** The system must handle thousands of incident reports a day without losing one
- **R6** Field workers need a full-featured smartphone app — [Chat #8](#chat-msg-8 "they all have modern smartphones")

## Assumptions
- **A1** Case managers can receive push notifications (not asked)
- **A2** Field workers always have a mobile signal, so reports go straight through (not asked)

## Decisions
- **D1** Field workers submit incidents through a mobile app
  - Because: [R1](#R1), [R6](#R6)
  - Instead of: reporting in WhatsApp
  - Trade-off: relies on A2
  - Quality: functional-suitability
  ${FENCE}mermaid
  flowchart TD
    Worker["Field worker [person]"] -->|"submits incident"| App["Field worker app [container]"]
  ${FENCE}
- **D2** The incident server notifies the child's assigned case manager
  - Because: [R2](#R2)
  - Instead of: a group message
  - Trade-off: depends on A1
  - Quality: functional-suitability
  ${FENCE}mermaid
  flowchart TD
    Server["Incident server [container]"] -->|"sends alert"| Notify["Notification server [container]"]
    Notify --> CaseManager["Case manager [person]"]
  ${FENCE}
- **D3** A high-severity incident, or an alert nobody acknowledges within 30 minutes, goes to a supervisor
  - Because: [R3](#R3)
  - Instead of: alerting supervisors for every incident
  - Trade-off: supervisors get more alerts
  - Quality: safety
- **D4** Put an API gateway and an alert queue in front of the incident server so no report is ever lost
  - Because: reliability matters
  - Quality: speed
  ${FENCE}mermaid
  flowchart TD
    App["Field worker app [container]"] --> Gateway["API gateway"]
    Gateway --> Queue["Alert queue"]
    Queue --> Server["Incident server [container]"]
  ${FENCE}
- **D5** Monthly donor reports are exported from the incident database
  - Because: [R1](#R1)
  - Instead of: reports by hand
  - Trade-off: the reports are only as good as what workers record
  - Quality: functional-suitability
  ${FENCE}mermaid
  flowchart TD
    DB[("Incident database [datastore]")] -->|"monthly export"| Reports["Donor reports [external]"]
  ${FENCE}
- **D6** — because [R2](#R2). Trade-off: none.
- **D7** Each new incident sends a push notification to the child's case manager
  - Because: [R2](#R2)
  - Instead of: email
  - Trade-off: depends on A1
  - Quality: functional-suitability
  ${FENCE}mermaid
  flowchart TD
    Notify["Notification server [container]"] --> CaseManager["Case manager [person]"]
  ${FENCE}
`;

// D5's sketch draws donor reports the final diagram leaves out; the dashboard and the supervisor alert
// are in no sketch.
const SAMPLE_FINAL_DIAGRAM = `flowchart TD
  Worker["Field worker [person]"] -->|"submits incident"| App["Field worker app [container]"]
  App --> Gateway["API gateway"]
  Gateway --> Queue["Alert queue"]
  Queue --> Server["Incident server [container]"]
  Server -->|"stores"| DB[("Incident database [datastore]")]
  Server -->|"sends alert"| Notify["Notification server [container]"]
  Notify --> CaseManager["Case manager [person]"]
  Notify -->|"high severity"| Supervisor["Supervisor [person]"]
  DB --> Dashboard["Director dashboard"]`;

// ---------------------------------------------------------------------------------------------
// The complete example: every fact comes up and is carried through to the final diagram.

// The model answer, plus R9 (Sarah's own words for what R1 already says) and the requirements most
// alert designs share, each quoting the brief or what Sarah said. Written out in full so a change to
// the model answer can't silently skip an edit.
const COMPLETE_DOC = `## Requirements
- **R1** Incidents reported in WhatsApp get buried and can go unnoticed — [Brief](#cs "messages get buried and alerts can go unnoticed")
- **R2** About 40 field workers in three districts file 15 to 20 reports on a busy day — [Chat #4](#chat-msg-4 "about 40 field workers spread across three districts") [Chat #4](#chat-msg-4 "On a busy day we might get 15 to 20 incident reports")
- **R3** Each child has one case manager: 12 case managers each own a group of children — [Chat #4](#chat-msg-4 "each case manager is responsible for a group of field workers and their assigned children")
- **R4** Supervisors must be looped in on high-severity incidents — [Chat #4](#chat-msg-4 "3 supervisors who oversee everything and need to be looped in on high-severity incidents")
- **R5** Field workers carry low-end Android phones — [Chat #6](#chat-msg-6 "low-end Android phones")
- **R6** Reports can't assume a connection in the field — [Chat #8](#chat-msg-8 "Out in the field the connection comes and goes")
- **R7** An alert nobody acknowledges must be escalated — [Brief](#cs "an alert nobody acknowledges is escalated")
- **R8** Every incident and response is kept for donor and government reporting — [Brief](#cs "every incident and response is stored for audit and reporting")
- **R9** An alert can sit unnoticed for a whole day — [Chat #2](#chat-msg-2 "Sometimes alerts go unnoticed for a whole day")
- **R10** No report or alert may be lost: one missed alert can harm a child — [Chat #4](#chat-msg-4 "even one missed alert can have serious consequences for a child")
- **R11** The case manager and supervisor are notified immediately — [Brief](#cs "the assigned case manager and supervisor are notified immediately")
- **R12** Every alert is tracked, so anyone can see whether the right case manager saw it — [Brief](#cs "alerts are tracked") [Chat #2](#chat-msg-2 "there's no way to know if the right case manager actually saw it")

## Assumptions
- **A1** Case managers and supervisors can receive a push notification or an SMS
  - Would confirm by asking: How do your case managers and supervisors get urgent messages today?
- **A2** The field worker can judge the severity on the report form
  - Would confirm by asking: Who decides how serious an incident is?

## Decisions
- **D1** Field workers report through a lightweight Android app that saves the report on the phone and sends it when there is signal
  - Because: [R5](#R5), [R6](#R6), [R10](#R10)
  - Instead of: an online-only web form
  - Trade-off: a report can arrive late if the worker stays offline
  - Quality: reliability
  ${FENCE}mermaid
  flowchart TD
    Worker["Field worker [person]"] -->|"fills in report"| App["Offline-first report app [container]"]
    App -->|"sends when online"| Server["Incident service [container]"]
  ${FENCE}
- **D2** One hosted incident service and database hold every incident, alert and acknowledgement
  - Because: [R1](#R1), [R2](#R2), [R8](#R8)
  - Instead of: an API gateway, a message queue and separate services
  - Trade-off: less room to scale, which 15 to 20 reports a day doesn't need
  - Quality: maintainability
  ${FENCE}mermaid
  flowchart TD
    Server["Incident service [container]"] -->|"stores"| DB[("Incident database [datastore]")]
  ${FENCE}
- **D3** Each incident notifies the child's assigned case manager directly, and a supervisor as well when it is high severity
  - Because: [R3](#R3), [R4](#R4), [R9](#R9), [R11](#R11)
  - Instead of: posting every alert to a group channel
  - Trade-off: the list of which case manager owns which child must be kept up to date; depends on A1 and A2
  - Quality: functional-suitability
  ${FENCE}mermaid
  flowchart TD
    Server["Incident service [container]"] -->|"sends alert"| Notify["Push / SMS notifier [external]"]
    Notify -->|"alerts"| CaseManager["Case manager [person]"]
    Notify -->|"high severity"| Supervisor["Supervisor [person]"]
  ${FENCE}
- **D4** The case manager acknowledges in the app; with no acknowledgement in 30 minutes, the alert escalates to a supervisor
  - Because: [R4](#R4), [R7](#R7), [R10](#R10), [R12](#R12)
  - Instead of: relying on case managers to check the app
  - Trade-off: supervisors may get alerts a busy case manager would have seen later
  - Quality: safety
  ${FENCE}mermaid
  flowchart TD
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
  flowchart TD
    DB[("Incident database [datastore]")] -->|"exports"| Reports["Donor and government reports [external]"]
  ${FENCE}
`;

const COMPLETE_MESSAGES: ChatMessage[] = [
  { role: "assistant", content: CASE.openingMessage },
  { role: "user", content: "Hi Sarah! Can you walk me through the main problem you're trying to solve?" },
  { role: "assistant", content: WHATSAPP_REPLY },
  {
    role: "user",
    content:
      "How many field workers and case managers are we dealing with? I need to understand the scale before proposing a design.",
  },
  { role: "assistant", content: SCALE_REPLY },
  { role: "user", content: "What phones do your field workers carry?" },
  { role: "assistant", content: "Mostly low-end Android phones - nothing fancy." },
  { role: "user", content: "And what's the mobile signal like where they visit families?" },
  {
    role: "assistant",
    content:
      "Patchy, honestly. Out in the field the connection comes and goes, so they can't count on being online when they're with a family.",
  },
  { role: "user", content: "When an alert goes out, who needs to see it, and what should happen if nobody responds?" },
  {
    role: "assistant",
    content:
      "The assigned case manager should get it straight away, and the supervisor too if it's serious. If nobody acknowledges it, it needs to be escalated - we can't have an alert just sitting there.",
  },
];

// ---------------------------------------------------------------------------------------------

/** The flawed sample attempt, loaded by the Flawed example button. */
export const BRIGHTPATH_SEED = buildSeed(CASE, {
  messages: SAMPLE_MESSAGES,
  doc: SAMPLE_DOC,
  finalDiagram: SAMPLE_FINAL_DIAGRAM,
  interviewEnd: { at: Date.parse("2026-09-30T08:40:00+08:00"), how: "time_cap", reason: "" },
  // R5 (no citation), R6 (its quote isn't in the chat), D4 (no requirement), D6 (no Instead of:) and
  // the missing sketches of D3 and D6 fail lint, so they are not judged.
  justify: {
    R1: { verdict: "sound", reason: "Faithful to Sarah's point that nobody can tell who saw an alert.", quote: fromChat("there's no way to know if the right case manager actually saw it") },
    R2: { verdict: "sound", reason: "Faithful to how case managers own their children.", quote: fromDoc("Each case manager is responsible for their own group of children") },
    R3: { verdict: "sound", reason: "Faithful to the quote about supervisors.", quote: fromDoc("Supervisors are looped in on high-severity incidents") },
    R4: { verdict: "sound", reason: "Faithful to the volume Sarah gave.", quote: fromDoc("The team gets 15 to 20 incident reports on a busy day") },
    D1: { verdict: "weak", reason: "R6 rests on a quote Sarah never said, and R1 alone doesn't call for an app.", quote: fromDoc("Field workers submit incidents through a mobile app") },
    "D1-sketch": { verdict: "sound", reason: "Shows the field worker submitting through the app.", quote: fromDoc("Field workers submit incidents through a mobile app") },
    D2: { verdict: "sound", reason: "Notifying the assigned case manager follows from R2.", quote: fromDoc("The incident server notifies the child's assigned case manager") },
    "D2-sketch": { verdict: "sound", reason: "Shows the alert reaching the case manager.", quote: fromDoc("notifies the child's assigned case manager") },
    D3: { verdict: "sound", reason: "Escalating high-severity and unacknowledged alerts follows from R3.", quote: fromDoc("goes to a supervisor") },
    "D4-sketch": {
      verdict: "unsound",
      reason: "A gateway and a queue for 15 to 20 reports a day: the volume argues against them.",
      quote: fromDoc("Put an API gateway and an alert queue in front of the incident server"),
    },
    D5: { verdict: "weak", reason: "Donor reports don't follow from R1, which is about buried alerts.", quote: fromDoc("Monthly donor reports are exported from the incident database") },
    "D5-sketch": { verdict: "sound", reason: "Shows the monthly export from the database.", quote: fromDoc("Monthly donor reports are exported") },
    D7: {
      verdict: "weak",
      runs: ["weak", "weak", "sound"],
      reason: "It repeats D2's notification of the case manager.",
      quote: fromDoc("Each new incident sends a push notification"),
    },
    "D7-sketch": { verdict: "weak", reason: "A slice of D2's sketch; it adds nothing.", quote: fromDoc("push notification") },
  },
  answers: [
    { scenarioId: "sc.no-signal", pickedDecisionIds: ["D1"], pickedNodeIds: ["Worker", "App"], oneLiner: "Workers submit incidents through the app.", notHandled: false },
    {
      scenarioId: "sc.unacknowledged",
      pickedDecisionIds: ["D2", "D3"],
      pickedNodeIds: ["CaseManager", "Supervisor"],
      oneLiner: "The server notifies the case manager, and a supervisor for serious ones.",
      notHandled: false,
    },
    { scenarioId: "sc.right-size", pickedDecisionIds: ["D4"], pickedNodeIds: ["Gateway", "Queue", "Server"], oneLiner: "A gateway and a queue so no report is lost.", notHandled: false },
  ],
  fit: {
    "sc.no-signal": { verdict: "not_handled", reason: "Nothing keeps a report when there is no signal; A2 assumes there always is.", quote: fromAnswer("submit incidents through the app") },
    "sc.unacknowledged": { verdict: "partly", reason: "It routes the alert, but nothing escalates one nobody acknowledges.", quote: fromAnswer("notifies the case manager") },
    "sc.right-size": { verdict: "not_handled", reason: "A gateway and a queue are the opposite of right-sized for this volume.", quote: fromAnswer("A gateway and a queue") },
  },
  diagramPrompt:
    "Field workers submit incidents in a mobile app. Reports go through an API gateway and an alert queue to the incident server, which stores them in a database and sends alerts through a notification server to the case manager, and to a supervisor for high-severity incidents. The director sees a dashboard from the database.",
});

/** The complete example practice mode opens with: an interview that surfaces every fact, a strong doc, and its review. */
export const BRIGHTPATH_COMPLETE_SEED = buildSeed(CASE, {
  messages: COMPLETE_MESSAGES,
  doc: COMPLETE_DOC,
  finalDiagram: CASE.modelAnswerFinalDiagram,
  interviewEnd: { at: Date.parse("2026-09-30T08:40:00+08:00"), how: "button", reason: "I have enough to start designing" },
  justify: {
    R1: { verdict: "sound", reason: "Restates the brief's problem.", quote: fromDoc("Incidents reported in WhatsApp get buried") },
    R2: { verdict: "sound", reason: "Faithful to the team size and volume Sarah gave.", quote: fromDoc("About 40 field workers in three districts") },
    R3: { verdict: "sound", reason: "Faithful to how case managers own their children.", quote: fromDoc("12 case managers each own a group of children") },
    R4: { verdict: "sound", reason: "Faithful to the quote about supervisors.", quote: fromDoc("Supervisors must be looped in on high-severity incidents") },
    R5: { verdict: "sound", reason: "Faithful to the phones Sarah described.", quote: fromDoc("Field workers carry low-end Android phones") },
    R6: { verdict: "sound", reason: "Faithful to the patchy signal.", quote: fromDoc("Reports can't assume a connection in the field") },
    R7: { verdict: "sound", reason: "Restates the brief.", quote: fromDoc("An alert nobody acknowledges must be escalated") },
    R8: { verdict: "sound", reason: "Restates the brief.", quote: fromDoc("Every incident and response is kept") },
    R9: { verdict: "sound", reason: "Faithful to Sarah's words.", quote: fromDoc("An alert can sit unnoticed for a whole day") },
    R10: { verdict: "sound", reason: "Faithful to what one missed alert can cost.", quote: fromDoc("No report or alert may be lost") },
    R11: { verdict: "sound", reason: "Restates the brief.", quote: fromDoc("notified immediately") },
    R12: { verdict: "sound", reason: "Follows from the brief and Sarah's words.", quote: fromDoc("Every alert is tracked") },
    D1: { verdict: "sound", reason: "Low-end phones and patchy signal call for an offline-first app.", quote: fromDoc("saves the report on the phone and sends it when there is signal") },
    "D1-sketch": { verdict: "sound", reason: "Shows the report saved on the phone and sent when online.", quote: fromDoc("saves the report on the phone") },
    D2: { verdict: "sound", reason: "One service and database is right for 15 to 20 reports a day.", quote: fromDoc("One hosted incident service and database") },
    "D2-sketch": { verdict: "sound", reason: "Shows the service storing to one database.", quote: fromDoc("One hosted incident service and database") },
    D3: { verdict: "sound", reason: "Alerting the assigned case manager directly follows from R3 and R4.", quote: fromDoc("notifies the child's assigned case manager directly") },
    "D3-sketch": { verdict: "sound", reason: "Shows the alert to the case manager, and to a supervisor for high severity.", quote: fromDoc("notifies the child's assigned case manager directly") },
    D4: { verdict: "weak", reason: "The 30-minute limit isn't something Sarah gave.", quote: fromDoc("with no acknowledgement in 30 minutes") },
    "D4-sketch": { verdict: "sound", reason: "Shows the acknowledgement and the escalation check.", quote: fromDoc("the alert escalates to a supervisor") },
    D5: { verdict: "sound", reason: "Reports from the one database follow from R8.", quote: fromDoc("Donor and government reports are exported") },
    "D5-sketch": { verdict: "sound", reason: "Shows the export from the database.", quote: fromDoc("Donor and government reports are exported") },
  },
  answers: [
    {
      scenarioId: "sc.no-signal",
      pickedDecisionIds: ["D1"],
      pickedNodeIds: ["Worker", "App"],
      oneLiner: "The app saves the report on the phone and sends it when there is signal.",
      notHandled: false,
    },
    {
      scenarioId: "sc.unacknowledged",
      pickedDecisionIds: ["D2", "D3", "D4"],
      pickedNodeIds: ["CaseManager", "Supervisor", "Escalation", "DB"],
      oneLiner: "The case manager is alerted; with no acknowledgement in 30 minutes the escalation check alerts a supervisor, and it is all stored in the incident database.",
      notHandled: false,
    },
    {
      scenarioId: "sc.right-size",
      pickedDecisionIds: ["D2"],
      pickedNodeIds: ["Server", "DB"],
      oneLiner: "One hosted incident service and database, with no gateway or queue.",
      notHandled: false,
    },
  ],
  fit: {
    "sc.no-signal": { verdict: "handled", reason: "The report survives a lost signal.", quote: fromAnswer("sends it when there is signal") },
    "sc.unacknowledged": { verdict: "handled", reason: "Routing, escalation and the record are all covered.", quote: fromAnswer("the escalation check alerts a supervisor") },
    "sc.right-size": { verdict: "handled", reason: "One service and database, nothing extra.", quote: fromAnswer("with no gateway or queue") },
  },
  diagramPrompt:
    "Field workers fill in reports in an offline-first app that sends them to the incident service when online. The service stores everything in the incident database, which exports donor and government reports, and sends alerts through a push/SMS notifier to the case manager, and to the supervisor for high severity. Case managers acknowledge back to the service; with no acknowledgement in 30 minutes an escalation check alerts the supervisor.",
});
