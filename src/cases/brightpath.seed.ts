// The two examples /demo can load in practice mode, each with its review:
// - the complete example it opens with: an interview that surfaces every fact, and the model answer
//   with one requirement added that restates another, plus three most alert designs share
//   (reliability, speed, traceability), each quoting the brief or the chat. Every fact is carried
//   through; the review still finds a few small things (two requirements too alike, a decision whose
//   time limit nobody gave, one requirement only partly met by the final design);
// - the flawed sample attempt, which gives every check in the report something to show. Its facts end
//   up at every link of the chain: one carried through to the diagram, one decided but not drawn, one
//   required but never decided, one dropped after the chat, one assumed without asking, and one the
//   client failed to give. It also has a failed reply, an invented fact, hidden and unverified
//   requirements, an unsupported and oversized decision, undrawn decisions (no sketch, and a sketch the
//   final diagram leaves out), an unexplained box and connections, a requirement, a decision and a
//   sketch that repeat others, and weak or unsound ratings.
import type { ChatMessage } from "../shared/lib/types";
import { BRIGHTPATH_CASE as CASE } from "./brightpath";
import { buildSeed } from "./seed";
import type { SeedSoundness } from "./seed";

const FENCE = "```";

/** Evidence that the engineer asked in a fact's area: their whole message. */
const asked = (messages: ChatMessage[], messageIndex: number) => ({ messageIndex, quote: messages[messageIndex].content });

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
- **D1** Field workers submit incidents through a mobile app — because [R1](#R1), [R6](#R6). Trade-off: relies on A2.
  ${FENCE}mermaid
  flowchart TD
    Worker["Field worker (actor)"] -->|"submits incident"| App["Field worker app"]
  ${FENCE}
- **D2** The incident server notifies the child's assigned case manager — because [R2](#R2). Trade-off: depends on A1.
  ${FENCE}mermaid
  flowchart TD
    Server["Incident server"] -->|"sends alert"| Notify["Notification server"]
    Notify --> CaseManager["Case manager (actor)"]
  ${FENCE}
- **D3** A high-severity incident, or an alert nobody acknowledges within 30 minutes, goes to a supervisor — because [R3](#R3). Trade-off: supervisors get more alerts.
- **D4** Put an API gateway and an alert queue in front of the incident server so no report is ever lost — because reliability matters.
  ${FENCE}mermaid
  flowchart TD
    App["Field worker app"] --> Gateway["API gateway"]
    Gateway --> Queue["Alert queue"]
    Queue --> Server["Incident server"]
  ${FENCE}
- **D5** Monthly donor reports are exported from the incident database — because [R1](#R1). Trade-off: the reports are only as good as what workers record.
  ${FENCE}mermaid
  flowchart TD
    DB[("Incident database")] -->|"monthly export"| Reports["Donor reports"]
  ${FENCE}
- **D6** — because [R2](#R2). Trade-off: none.
- **D7** Each new incident sends a push notification to the child's case manager — because [R2](#R2). Trade-off: depends on A1.
  ${FENCE}mermaid
  flowchart TD
    Notify["Notification server"] --> CaseManager["Case manager (actor)"]
  ${FENCE}
`;

// D5's sketch draws donor reports the final diagram leaves out; the dashboard and the supervisor alert
// are in no sketch.
const SAMPLE_FINAL_DIAGRAM = `flowchart TD
  Worker["Field worker (actor)"] -->|"submits incident"| App["Field worker app"]
  App --> Gateway["API gateway"]
  Gateway --> Queue["Alert queue"]
  Queue --> Server["Incident server"]
  Server -->|"stores"| DB[("Incident database")]
  Server -->|"sends alert"| Notify["Notification server"]
  Notify --> CaseManager["Case manager (actor)"]
  Notify -->|"high severity"| Supervisor["Supervisor (actor)"]
  DB --> Dashboard["Director dashboard"]`;

/** Level 0 + 3.1 for the sample, in the shape /api/assess returns. */
const SAMPLE_EVIDENCE = [
  {
    factId: "brightpath.1",
    surfaced: { messageIndex: 4, quote: "We have about 40 field workers spread across three districts" },
    askedInArea: asked(SAMPLE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "brightpath.2",
    surfaced: {
      messageIndex: 4,
      quote: "12 case managers - each case manager is responsible for a group of field workers and their assigned children",
    },
    askedInArea: asked(SAMPLE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "brightpath.3",
    surfaced: { messageIndex: 4, quote: "3 supervisors who oversee everything and need to be looped in on high-severity incidents" },
    askedInArea: asked(SAMPLE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "brightpath.4",
    surfaced: { messageIndex: 4, quote: "On a busy day we might get 15 to 20 incident reports" },
    askedInArea: asked(SAMPLE_MESSAGES, 3),
    docAssertion: null,
  },
  // Asked in #7, but the reply said nothing about the phones: client failed, excluded from scores.
  { factId: "brightpath.5", surfaced: null, askedInArea: asked(SAMPLE_MESSAGES, 7), docAssertion: null },
  // Never asked, but the doc takes a position on it (A2): assumed.
  {
    factId: "brightpath.6",
    surfaced: null,
    askedInArea: null,
    docAssertion: { quote: "Field workers always have a mobile signal" },
  },
];

const SAMPLE_INVENTED = [{ messageIndex: 8, quote: "We're also hoping to open an office in a fourth district next year." }];

/** Level 3 for the sample, in the shape /api/assess returns. */
const SAMPLE_SOUNDNESS: SeedSoundness = {
  requirements: [
    { id: "R1", rating: "sound", reason: "Faithful to Sarah's complaint that nobody knows whether the case manager saw an alert." },
    { id: "R2", rating: "sound", reason: "Restates the quote about case managers owning a group of children." },
    { id: "R3", rating: "sound", reason: "Faithful to the quote about supervisors and high-severity incidents." },
    { id: "R4", rating: "sound", reason: "Matches Sarah's numbers exactly." },
    {
      id: "R5",
      rating: "unsound",
      reason: "Contradicts R4: Sarah said 15 to 20 reports on a busy day; nothing suggests thousands.",
    },
    {
      id: "R6",
      rating: "unsound",
      reason: "Sarah never said the phones were modern; the quoted words aren't in her reply.",
    },
  ],
  decisions: [
    {
      id: "D1",
      rating: "weak",
      reason: "An app suits field reporting, but it rests on A2, a signal nobody checked is there.",
    },
    { id: "D2", rating: "sound", reason: "Alerting the assigned case manager directly, not a group, follows from R2." },
    { id: "D3", rating: "sound", reason: "Bringing in a supervisor for high severity and missed acknowledgements follows from R3." },
    {
      id: "D4",
      rating: "unsound",
      reason: "A gateway and queue are built for high volume; R4 says 15 to 20 reports a day, and no requirement asks for them.",
    },
    {
      id: "D5",
      rating: "weak",
      reason: "Donor reporting is a real need from the brief, but R1 is about missed alerts, so the because doesn't support it.",
    },
    { id: "D6", rating: "unsound", reason: "States no choice, so there is nothing to follow from R2." },
    { id: "D7", rating: "weak", reason: "Follows from R2, but it is the same alert to the case manager that D2 already sends." },
  ],
  sketches: [
    { id: "D1", rating: "sound", reason: "Shows only the field worker and the app the decision introduces." },
    {
      id: "D2",
      rating: "weak",
      reason: "Shows the case manager alert, but not the supervisor alert the final diagram draws from the same box.",
    },
    {
      id: "D4",
      rating: "weak",
      reason: "The decision is about not losing reports, but a report without a signal never reaches the queue.",
    },
    { id: "D5", rating: "sound", reason: "Shows the reports coming out of the database, as the decision says." },
    { id: "D7", rating: "weak", reason: "Draws only part of what D2's sketch already shows." },
  ],
  expectedDecisions: [
    {
      id: "ed.submission",
      rating: "weakly",
      decisionIds: ["D1"],
      reason: "D1 adds an app, but it assumes a signal (A2); the signal in the field was never asked about.",
    },
    {
      id: "ed.routing",
      rating: "well",
      decisionIds: ["D2", "D3"],
      reason: "D2 alerts the assigned case manager; D3 brings in a supervisor for high severity.",
    },
    {
      id: "ed.escalation",
      rating: "weakly",
      decisionIds: ["D3"],
      reason: "D3 escalates, but it has no sketch, so the final diagram doesn't show where acknowledgements are tracked.",
    },
    {
      id: "ed.record",
      rating: "weakly",
      decisionIds: ["D5"],
      reason: "D5 exports reports from the database, but no decision says it keeps every incident and response, and the export isn't in the final diagram.",
    },
    {
      id: "ed.right-size",
      rating: "not_addressed",
      decisionIds: [],
      reason: "No decision sizes the system to R4's 15 to 20 reports a day; D4 builds a gateway and queue for the thousands in R5.",
    },
  ],
  requirementsMet: [
    {
      id: "R1",
      rating: "partly",
      nodeIds: ["Notify", "CaseManager"],
      reason: "Alerts go straight to the case manager instead of a group, but nothing shows whether they saw it.",
    },
    { id: "R2", rating: "met", nodeIds: ["Notify", "CaseManager"], reason: "The notification server alerts the child's own case manager." },
    { id: "R3", rating: "met", nodeIds: ["Notify", "Supervisor"], reason: "High-severity alerts also go to a supervisor." },
    { id: "R4", rating: "met", nodeIds: ["Server"], reason: "One incident server easily handles 15 to 20 reports a day." },
    {
      id: "R5",
      rating: "partly",
      nodeIds: ["Gateway", "Queue"],
      reason: "The gateway and queue are built for volume, but a report made without a signal never reaches them.",
    },
    { id: "R6", rating: "met", nodeIds: ["App"], reason: "Field workers get a smartphone app to submit incidents." },
  ],
  similar: [
    {
      kind: "requirements",
      ids: ["R4", "R5"],
      reason: "Both state how many reports arrive a day, and they disagree; keep the one Sarah said.",
    },
    { kind: "decisions", ids: ["D2", "D7"], reason: "Both alert the child's case manager when an incident comes in." },
    {
      kind: "sketches",
      ids: ["D2", "D7"],
      reason: "D7's sketch is a slice of D2's: the notification server alerting the case manager.",
    },
  ],
  requirementItems: [
    { id: "R1", rating: "sound", reason: "A specific, observable problem." },
    { id: "R2", rating: "sound", reason: "A clear ownership rule alerts can be routed by." },
    { id: "R3", rating: "sound", reason: "A clear rule for who else is alerted." },
    { id: "R4", rating: "sound", reason: "Concrete numbers a design can be sized against." },
    { id: "R5", rating: "sound", reason: "Specific and testable, however oversized." },
    { id: "R6", rating: "unsound", reason: "A solution (a full-featured app) written as a requirement." },
  ],
  decisionItems: [
    { id: "D1", rating: "weak", reason: "The trade-off names a dependency (A2), not what the app costs." },
    { id: "D2", rating: "weak", reason: "The trade-off names a dependency (A1), not a cost." },
    { id: "D3", rating: "sound", reason: "A clear rule whose trade-off names a real cost: more alerts for supervisors." },
    { id: "D4", rating: "weak", reason: "Names no trade-off, though a gateway and a queue are two more parts to run." },
    { id: "D5", rating: "sound", reason: "A clear choice with an honest limit." },
    { id: "D6", rating: "unsound", reason: "There is no choice here to judge." },
    { id: "D7", rating: "weak", reason: "The trade-off names a dependency (A1), not a cost." },
  ],
  sketchItems: [
    { id: "D1", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D2", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D4", rating: "weak", reason: "Unlabelled connections: nothing says what flows from the gateway to the queue to the server." },
    { id: "D5", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D7", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
  ],
  sketchIntegration: [
    { id: "D1", rating: "sound", reason: "The app feeds the rest of the system, so reports enter as sketched." },
    { id: "D2", rating: "weak", reason: "In the final diagram the notification server also alerts the supervisor, a role this sketch never gave it." },
    { id: "D4", rating: "sound", reason: "The gateway and queue sit in front of the incident server, as sketched." },
    { id: "D5", rating: "unsound", reason: "Its donor reports are left out of the final diagram, so it never made it into the design." },
    { id: "D7", rating: "sound", reason: "The case-manager alert joins the diagram on D2's path." },
  ],
};

// ---------------------------------------------------------------------------------------------
// The complete example: every fact comes up and is carried through to the final diagram.

// The model answer, plus R9 (Sarah's own words for what R1 already says) and the requirements most
// alert designs share, each quoting the brief or what Sarah said.
const COMPLETE_DOC = CASE.modelAnswerMarkdown
  .replace(
    "\n\n## Assumptions",
    [
      "",
      '- **R9** An alert can sit unnoticed for a whole day — [Chat #2](#chat-msg-2 "Sometimes alerts go unnoticed for a whole day")',
      '- **R10** No report or alert may be lost: one missed alert can harm a child — [Chat #4](#chat-msg-4 "even one missed alert can have serious consequences for a child")',
      '- **R11** The case manager and supervisor are notified immediately — [Brief](#cs "the assigned case manager and supervisor are notified immediately")',
      '- **R12** Every alert is tracked, so anyone can see whether the right case manager saw it — [Brief](#cs "alerts are tracked") [Chat #2](#chat-msg-2 "there\'s no way to know if the right case manager actually saw it")',
      "",
      "## Assumptions",
    ].join("\n"),
  )
  .replace("because [R5](#R5), [R6](#R6).", "because [R5](#R5), [R6](#R6), [R10](#R10).")
  .replace("because [R3](#R3), [R4](#R4).", "because [R3](#R3), [R4](#R4), [R9](#R9), [R11](#R11).")
  .replace("because [R4](#R4), [R7](#R7).", "because [R4](#R4), [R7](#R7), [R10](#R10), [R12](#R12).");

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

/** Level 0 + 3.1 for the complete example. */
const COMPLETE_EVIDENCE = [
  {
    factId: "brightpath.1",
    surfaced: { messageIndex: 4, quote: "We have about 40 field workers spread across three districts" },
    askedInArea: asked(COMPLETE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "brightpath.2",
    surfaced: {
      messageIndex: 4,
      quote: "12 case managers - each case manager is responsible for a group of field workers and their assigned children",
    },
    askedInArea: asked(COMPLETE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "brightpath.3",
    surfaced: { messageIndex: 4, quote: "3 supervisors who oversee everything and need to be looped in on high-severity incidents" },
    askedInArea: asked(COMPLETE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "brightpath.4",
    surfaced: { messageIndex: 4, quote: "On a busy day we might get 15 to 20 incident reports" },
    askedInArea: asked(COMPLETE_MESSAGES, 3),
    docAssertion: null,
  },
  {
    factId: "brightpath.5",
    surfaced: { messageIndex: 6, quote: "Mostly low-end Android phones" },
    askedInArea: asked(COMPLETE_MESSAGES, 5),
    docAssertion: null,
  },
  {
    factId: "brightpath.6",
    surfaced: { messageIndex: 8, quote: "Out in the field the connection comes and goes" },
    askedInArea: asked(COMPLETE_MESSAGES, 7),
    docAssertion: null,
  },
];

/** Level 3 for the complete example. */
const COMPLETE_SOUNDNESS: SeedSoundness = {
  requirements: [
    { id: "R1", rating: "sound", reason: "Restates the brief's problem without adding to it." },
    { id: "R2", rating: "sound", reason: "Both numbers match Sarah's reply." },
    { id: "R3", rating: "sound", reason: "Faithful: each case manager owns a group of children." },
    { id: "R4", rating: "sound", reason: "Faithful to the quote about supervisors and high-severity incidents." },
    { id: "R5", rating: "sound", reason: "Matches the quote about low-end Android phones." },
    { id: "R6", rating: "sound", reason: "Captures that the connection in the field comes and goes." },
    { id: "R7", rating: "sound", reason: "Restates the brief's escalation need." },
    { id: "R8", rating: "sound", reason: "Restates the brief's audit and reporting need." },
    { id: "R9", rating: "sound", reason: "Faithful to Sarah's words about alerts sitting unnoticed." },
    { id: "R10", rating: "sound", reason: "Faithful to Sarah's point that even one missed alert matters." },
    { id: "R11", rating: "sound", reason: "Restates the brief's immediate notification." },
    { id: "R12", rating: "sound", reason: "Joins the brief's tracking need to Sarah's complaint that nobody knows who saw an alert." },
  ],
  decisions: [
    { id: "D1", rating: "sound", reason: "Saving reports on the phone until there is signal answers R6; a light app suits R5." },
    { id: "D2", rating: "sound", reason: "One service and database is right-sized for 15 to 20 reports a day (R2)." },
    { id: "D3", rating: "sound", reason: "Alerting the owning case manager directly, plus a supervisor for high severity, follows R3 and R4." },
    {
      id: "D4",
      rating: "weak",
      reason: "Escalating answers R7, but Sarah never gave the 30-minute window; it belongs under Assumptions.",
    },
    { id: "D5", rating: "sound", reason: "Exporting from the one record meets the reporting need in R8." },
  ],
  sketches: [
    { id: "D1", rating: "sound", reason: "Shows the worker, the offline-first app and where it sends reports." },
    { id: "D2", rating: "sound", reason: "Shows the service storing into the one database." },
    { id: "D3", rating: "sound", reason: "Shows the alert reaching the case manager, and the supervisor for high severity." },
    { id: "D4", rating: "sound", reason: "Shows the acknowledgement and the escalation path." },
    { id: "D5", rating: "sound", reason: "Shows the reports coming out of the database." },
  ],
  expectedDecisions: [
    { id: "ed.submission", rating: "well", decisionIds: ["D1"], reason: "D1 keeps reports on the phone until there is signal." },
    { id: "ed.routing", rating: "well", decisionIds: ["D3"], reason: "D3 alerts the assigned case manager, and a supervisor for high severity." },
    { id: "ed.escalation", rating: "well", decisionIds: ["D4"], reason: "D4 tracks acknowledgements and escalates after 30 minutes." },
    { id: "ed.record", rating: "well", decisionIds: ["D2", "D5"], reason: "D2 keeps one record of everything; D5 reports from it." },
    { id: "ed.right-size", rating: "well", decisionIds: ["D2"], reason: "D2 chooses one hosted service instead of a gateway, queue and separate services." },
  ],
  requirementsMet: [
    {
      id: "R1",
      rating: "met",
      nodeIds: ["Server", "Notify", "CaseManager"],
      reason: "Every report becomes a direct alert to a named case manager, not a group message.",
    },
    { id: "R2", rating: "met", nodeIds: ["Server", "DB"], reason: "One service and database is right-sized for 15 to 20 reports a day." },
    {
      id: "R3",
      rating: "partly",
      nodeIds: ["Notify", "CaseManager"],
      reason: "Alerts go to the child's case manager, but the final diagram doesn't show where the list of who owns which child is kept.",
    },
    { id: "R4", rating: "met", nodeIds: ["Notify", "Supervisor"], reason: "High-severity alerts also reach a supervisor." },
    { id: "R5", rating: "met", nodeIds: ["App"], reason: "A lightweight Android app suits low-end phones." },
    { id: "R6", rating: "met", nodeIds: ["App"], reason: "The app keeps reports on the phone and sends them when there is signal." },
    { id: "R7", rating: "met", nodeIds: ["Escalation"], reason: "An unacknowledged alert escalates to a supervisor after 30 minutes." },
    { id: "R8", rating: "met", nodeIds: ["DB", "Reports"], reason: "Every incident is kept in one database, and reports are exported from it." },
    { id: "R9", rating: "met", nodeIds: ["Notify", "CaseManager", "Escalation"], reason: "Alerts go straight to a person and escalate if nobody acknowledges them." },
    {
      id: "R10",
      rating: "met",
      nodeIds: ["App", "Escalation"],
      reason: "Reports wait on the phone until there is signal, and an alert nobody acknowledges escalates.",
    },
    { id: "R11", rating: "met", nodeIds: ["Notify"], reason: "The notifier pushes each alert to the case manager, and the supervisor too when it is serious." },
    {
      id: "R12",
      rating: "met",
      nodeIds: ["Server", "Escalation"],
      reason: "Acknowledgements go back to the service, which knows which alerts nobody has seen.",
    },
  ],
  similar: [
    { kind: "requirements", ids: ["R1", "R9"], reason: "Both say alerts go unnoticed; R9 is Sarah's own words for R1." },
  ],
  requirementItems: [
    { id: "R1", rating: "sound", reason: "A specific, observable problem." },
    { id: "R2", rating: "sound", reason: "Concrete numbers a design can be sized against." },
    { id: "R3", rating: "sound", reason: "A clear ownership rule alerts can be routed by." },
    { id: "R4", rating: "sound", reason: "A clear rule for who else is alerted." },
    { id: "R5", rating: "sound", reason: "A concrete device constraint." },
    { id: "R6", rating: "sound", reason: "A clear constraint any design can be checked against." },
    { id: "R7", rating: "weak", reason: "Says an alert must escalate, but not after how long or to whom." },
    { id: "R8", rating: "sound", reason: "A clear record-keeping need." },
    { id: "R9", rating: "sound", reason: "A specific, observable problem." },
    { id: "R10", rating: "sound", reason: "A clear, testable reliability need." },
    { id: "R11", rating: "sound", reason: "Clear about who is notified and when." },
    { id: "R12", rating: "sound", reason: "A clear, checkable tracking need." },
  ],
  decisionItems: [
    { id: "D1", rating: "sound", reason: "A clear choice with an honest cost: late reports." },
    { id: "D2", rating: "sound", reason: "A clear choice, the alternative named, and an honest cost." },
    { id: "D3", rating: "sound", reason: "A clear rule whose trade-off names a real upkeep cost." },
    { id: "D4", rating: "sound", reason: "A clear rule with an honest cost to supervisors." },
    { id: "D5", rating: "sound", reason: "A clear choice with an honest limit." },
  ],
  sketchItems: [
    { id: "D1", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D2", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D3", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D4", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
    { id: "D5", rating: "sound", reason: "Labelled boxes and connections that read clearly on their own." },
  ],
  sketchIntegration: [
    { id: "D1", rating: "sound", reason: "The app sends reports to the incident service, as sketched." },
    { id: "D2", rating: "sound", reason: "The service stores into the one database every other part reads from." },
    { id: "D3", rating: "sound", reason: "The notifier fans out from the service to the case manager and the supervisor, as sketched." },
    { id: "D4", rating: "sound", reason: "Acknowledgements return to the service, and the escalation check reuses the notifier." },
    { id: "D5", rating: "sound", reason: "Reports come out of the same database the service stores into." },
  ],
};

// ---------------------------------------------------------------------------------------------

/** The flawed sample attempt, loaded by the Flawed example button. */
export const BRIGHTPATH_SEED = buildSeed(CASE, {
  messages: SAMPLE_MESSAGES,
  doc: SAMPLE_DOC,
  finalDiagram: SAMPLE_FINAL_DIAGRAM,
  evidence: SAMPLE_EVIDENCE,
  invented: SAMPLE_INVENTED,
  soundness: SAMPLE_SOUNDNESS,
  diagramPrompt:
    "Field workers submit incidents in a mobile app. Reports go through an API gateway and an alert queue to the incident server, which stores them in a database and sends alerts through a notification server to the case manager, and to a supervisor for high-severity incidents. The director sees a dashboard from the database.",
});

/** The complete example practice mode opens with: an interview that surfaces every fact, a strong doc, and its review. */
export const BRIGHTPATH_COMPLETE_SEED = buildSeed(CASE, {
  messages: COMPLETE_MESSAGES,
  doc: COMPLETE_DOC,
  finalDiagram: CASE.modelAnswerFinalDiagram,
  evidence: COMPLETE_EVIDENCE,
  invented: [],
  soundness: COMPLETE_SOUNDNESS,
  diagramPrompt:
    "Field workers fill in reports in an offline-first app that sends them to the incident service when online. The service stores everything in the incident database, which exports donor and government reports, and sends alerts through a push/SMS notifier to the case manager, and to the supervisor for high severity. Case managers acknowledge back to the service; with no acknowledgement in 30 minutes an escalation check alerts the supervisor.",
});
