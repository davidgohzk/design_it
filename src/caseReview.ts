import type { CaseReviewFact } from "./types";

// personaFact values are also the facts in Sarah's chat prompt.
// Keep them in sync with PERSONA_FACTS in design_it_backend/app/prompts.py.
export const CASE_REVIEW_FACTS = [
  {
    id: "current-reporting-failure",
    label: "Current reporting failure",
    description:
      "Incident reports are sent through WhatsApp, where messages get buried and alerts can remain unnoticed for a day.",
    personaFact:
      "Field workers report incidents through WhatsApp; messages get buried and an alert can sit unnoticed for a whole day.",
  },
  {
    id: "field-team-scale",
    label: "Field team scale",
    description: "BrightPath has about 40 field workers spread across three districts.",
    personaFact: "About 40 field workers are spread across three districts.",
  },
  {
    id: "case-manager-ownership",
    label: "Case manager ownership",
    description:
      "There are 12 case managers, each responsible for a group of field workers and their assigned children.",
    personaFact:
      "There are 12 case managers; each is responsible for a group of field workers and the children assigned to them.",
  },
  {
    id: "supervisor-oversight",
    label: "Supervisor oversight",
    description:
      "Three supervisors oversee the operation and need to join high-severity incidents.",
    personaFact:
      "Three supervisors oversee everything and need to be looped in on high-severity incidents.",
  },
  {
    id: "incident-volume",
    label: "Incident volume",
    description: "A busy day produces roughly 15 to 20 incident reports.",
    personaFact: "On a busy day, the team receives roughly 15 to 20 incident reports.",
  },
  {
    id: "device-constraints",
    label: "Device constraints",
    description: "Field workers often use low-end Android phones.",
    personaFact: "Field workers often use low-end Android phones.",
  },
  {
    id: "connectivity-constraints",
    label: "Connectivity constraints",
    description: "Field connectivity is patchy and cannot be assumed to be continuous.",
    personaFact: "Field workers often have patchy connectivity in the field.",
  },
  {
    id: "notification-routing",
    label: "Submission and notification routing",
    description:
      "Field workers should submit incidents digitally and the assigned case manager and supervisor should be notified immediately.",
    personaFact:
      "The system should accept incident submissions from the field and immediately notify the assigned case manager and supervisor.",
  },
  {
    id: "acknowledgement-escalation",
    label: "Acknowledgement and escalation",
    description:
      "Alerts need acknowledgement tracking and escalation when nobody responds.",
    personaFact:
      "Alerts need acknowledgement tracking with escalation when nobody responds.",
  },
  {
    id: "audit-and-reporting",
    label: "Audit and reporting record",
    description:
      "Every incident and response needs a durable record because old chat messages make donor and government reporting difficult.",
    personaFact:
      "Every incident and response needs a durable record; old chat messages make donor and government reporting difficult.",
  },
] as const satisfies readonly CaseReviewFact[];
