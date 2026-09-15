import sourceMarkdown from "./assets/test.md?raw";
import type { ChatMessage, DesignTurn, TimelineEntry } from "./types";
import { makePatch, patchStats } from "./utils";

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content: "Hi! I'm Sarah, program director at BrightPath NGO. We work with at-risk children and I'm hoping you can help us design a better system for our field teams. Feel free to ask me about the problem we're facing.",
  },
  {
    role: "user",
    content: "Hi Sarah! Can you walk me through the main problem you're trying to solve?",
  },
  {
    role: "assistant",
    content: "Of course! Right now, when a field worker visits a child and notices something concerning - signs of neglect, an unsafe home, anything like that - they send a message in a WhatsApp group. The problem is the group has too many people, messages get buried, and there's no way to know if the right case manager actually saw it or is taking action. Sometimes alerts go unnoticed for a whole day. On top of that, when our NGO director has to report to donors or the government, we have no proper records - just old chat messages. It's really not working for us anymore.",
  },
  {
    role: "user",
    content: "How many field workers and case managers are we dealing with? I need to understand the scale before proposing a design.",
  },
  {
    role: "assistant",
    content: "We have about 40 field workers spread across three districts, and 12 case managers - each case manager is responsible for a group of field workers and their assigned children. On top of that, there are 3 supervisors who oversee everything and need to be looped in on high-severity incidents. On a busy day we might get 15 to 20 incident reports. It's not a huge volume, but the problem is that even one missed alert can have serious consequences for a child.",
  },
];

export const INITIAL_DESIGN_TURNS: DesignTurn[] = [
  {
    prompt:
      "Field workers submit incident reports from a mobile app. An API gateway passes them to an incident server, which stores each incident in a database and publishes an alert onto a queue. A notification server picks up the alert and notifies the assigned case manager.",
    code: [
      "flowchart TD",
      '  FieldApp["Field Worker App"] -->|"submits incident"| Gateway["API Gateway"]',
      '  Gateway --> Incident["Incident Server"]',
      '  Incident -->|"stores"| DB[("Incident DB")]',
      '  Incident -->|"publishes alert"| Queue["Alert Queue"]',
      '  Queue --> Notifier["Notification Server"]',
      '  Notifier -->|"notifies"| CaseManager["Case Manager"]',
    ].join("\n"),
  },
  {
    prompt:
      "Add acknowledgement tracking. If a case manager does not acknowledge an alert within 30 minutes, escalate it to a supervisor. Record every acknowledgement in the incident database.",
    code: [
      "flowchart TD",
      '  FieldApp["Field Worker App"] -->|"submits incident"| Gateway["API Gateway"]',
      '  Gateway --> Incident["Incident Server"]',
      '  Incident -->|"stores"| DB[("Incident DB")]',
      '  Incident -->|"publishes alert"| Queue["Alert Queue"]',
      '  Queue --> Notifier["Notification Server"]',
      '  Notifier -->|"notifies"| CaseManager["Case Manager"]',
      '  Notifier --> Escalation["Escalation Timer"]',
      '  CaseManager -->|"acknowledges"| Gateway',
      '  Gateway -->|"logs acknowledgement"| DB',
      '  Escalation -->|"no ack in 30 min"| Supervisor["Supervisor"]',
    ].join("\n"),
  },
];

// Timestamps are built at call time so the seeded log always reads as "the last ~18 minutes".
export const createInitialTimeline = (): TimelineEntry[] => {
  const now = Date.now();
  const ago = (minutes: number) => now - minutes * 60_000;

  // Stages are sliced out of the real document, so replaying the patches below
  // reproduces EDITOR_INITIAL exactly instead of approximating it.
  const upTo = (heading: string) =>
    EDITOR_LINES.slice(0, EDITOR_LINES.indexOf(heading)).join("\n").trimEnd();

  const stages = ["", upTo("### O - Objective"), upTo("### A - Assessment"), EDITOR_INITIAL];

  const seed: (Omit<TimelineEntry, "id" | "at"> & { minutes: number })[] = [
    {
      minutes: 18,
      type: "chat",
      summary: "Message to Sarah",
      detail: "Hi Sarah! Can you walk me through the main problem you're trying to solve?",
    },
    {
      minutes: 16,
      type: "chat",
      summary: "Message to Sarah",
      detail:
        "How many field workers and case managers are we dealing with? I need to understand the scale before proposing a design.",
    },
    {
      minutes: 14,
      type: "quote",
      summary: "Context panel",
      target: "S - Subjective",
      detail:
        "Alerts go unacknowledged, messages get buried, and there is no audit trail for donor or government reporting.",
    },
    {
      minutes: 13,
      type: "quote",
      summary: "Chat #2",
      target: "S - Subjective",
      detail: "Sometimes alerts go unnoticed for a whole day.",
    },
    {
      minutes: 12,
      type: "editor",
      summary: "",
      detail: "",
      diff: makePatch(stages[0], stages[1]),
    },
    {
      minutes: 10,
      type: "quote",
      summary: "Chat #4",
      target: "O - Objective",
      detail: "We have about 40 field workers spread across three districts, and 12 case managers",
    },
    {
      minutes: 9,
      type: "editor",
      summary: "",
      detail: "",
      diff: makePatch(stages[1], stages[2]),
    },
    {
      minutes: 5,
      type: "design",
      summary: "Diagram update",
      detail: INITIAL_DESIGN_TURNS[0].prompt,
    },
    {
      minutes: 3,
      type: "editor",
      summary: "",
      detail: "",
      diff: makePatch(stages[2], stages[3]),
    },
    {
      minutes: 1,
      type: "design",
      summary: "Diagram update",
      detail: INITIAL_DESIGN_TURNS[1].prompt,
    },
  ];

  return seed.map(({ minutes, ...entry }, index) => ({
    ...entry,
    id: `seed-${index}`,
    at: ago(minutes),
    summary: entry.diff ? patchStats(entry.diff) : entry.summary,
  }));
};

const EDITOR_LINES = [
  "## SOAP Notes - Child Alert System",
  "",
  "### S - Subjective",
  "BrightPath needs a replacement for [WhatsApp group messages](#cs \"Alerts go unacknowledged, messages get buried, and there is no audit trail for donor or government reporting.\") because the current reporting flow is unreliable and hard to audit.",
  "",
  "In the client interview, Sarah explained that [alerts can go unnoticed for a whole day](#chat-msg-2 \"Sometimes alerts go unnoticed for a whole day.\") and that the team is left with [no proper records - just old chat messages](#chat-msg-2 \"we have no proper records - just old chat messages.\").",
  "",
  "The desired outcome is a system where field workers can submit incidents, the right staff are notified immediately, and every action is tracked for follow-up and reporting.",
  "",
  "### O - Objective",
  "- Mobile-friendly incident submission for field workers",
  "- Automatic notification to the assigned case manager and supervisor",
  "- Acknowledgement tracking with escalation when alerts are missed",
  "- Persistent audit log of incidents and responses",
  "- Scale reference: [about 40 field workers spread across three districts, and 12 case managers](#chat-msg-4 \"We have about 40 field workers spread across three districts, and 12 case managers\")",
  "- Device constraint: Field workers may have low-end Android devices and intermittent connectivity",
  "- Process constraint: Sarah needs us to [start simple, then gradually improve the design](#cs \"Start simple, then gradually improve the design\")",
  "",
  "### A - Assessment",
  "An event-driven alert pipeline is a good fit here because one submitted incident needs to fan out to multiple recipients while keeping an audit trail.",
  "",
  "That recommendation is grounded in the requirement that [the system immediately notifies the assigned case manager and supervisor](#cs \"The system immediately notifies the assigned case manager and supervisor\") and the fact that [even one missed alert can have serious consequences for a child](#chat-msg-4 \"even one missed alert can have serious consequences for a child.\")",
  "",
  "A queue is worth the extra moving part because delivery reliability matters more than shaving off a small amount of latency.",
  "",
  "### P - Plan",
  "1. Define the incident submission API endpoint and payload schema",
  "2. Design the notification broadcast flow (Broadcast -> Queue -> Notification Server)",
  "3. Store acknowledgements and escalation timestamps alongside each incident",
  "4. Confirm delivery channels for the first release",
  "",
  "### System Design",
  "```mermaid",
  "flowchart TD",
  "  A[Field Worker App] --> B[API Gateway]",
  "  B --> C[Incident Server]",
  "  C --> D[(Incident DB)]",
  "  C --> E[Alert Queue]",
  "  E --> F[Notification Server]",
  "  F --> D",
  "```",
  "",
  "### Design Justification",
  "This flow directly replaces the unreliable [WhatsApp group messages](#cs \"Alerts go unacknowledged, messages get buried, and there is no audit trail for donor or government reporting.\") process with a structured submission path from the field worker app into the incident system.",
  "",
  "The API Gateway and Incident Server give staff one clear way to log an incident, which is a better fit for Sarah's concern that [there's no way to know if the right case manager actually saw it or is taking action](#chat-msg-2 \"there's no way to know if the right case manager actually saw it or is taking action.\").",
  "",
  "The Alert Queue and Notification Server help the design fan alerts out reliably so the system can [immediately notify the assigned case manager and supervisor](#cs \"The system immediately notifies the assigned case manager and supervisor\") instead of leaving important updates buried in chat where [alerts go unnoticed for a whole day](#chat-msg-2 \"Sometimes alerts go unnoticed for a whole day.\").",
  "",
  "The Incident DB gives BrightPath a durable record of the incident, acknowledgement, and follow-up history, which addresses both the need for [all incidents and responses to be stored for audit and reporting](#cs \"All incidents and responses are stored for audit and reporting\") and Sarah's frustration that they currently have [no proper records - just old chat messages](#chat-msg-2 \"we have no proper records - just old chat messages.\").",
];

export const EDITOR_INITIAL = EDITOR_LINES.join("\n");

export const renderedSourceMarkdown = (() => {
  const trimmed = sourceMarkdown.trim();
  const match = trimmed.match(/^```(?:md|markdown)?\n([\s\S]*?)\n```$/i);
  return (match ? match[1] : sourceMarkdown)
    .replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, "")
    .trim();
})();
