/**
 * The four areas the example review covers, with illustrative Community Room results. Every
 * headline is derived from these rows, so a card's number cannot disagree with its detail.
 */

import { FACTS, summarize } from "./traceMap";

export type FeedbackArea =
  | { id: "interview"; title: string; facts: { label: string; found: boolean }[] }
  | { id: "traceability"; title: string }
  | { id: "decisions"; title: string; scenarios: { label: string; holds: boolean; note: string }[] }
  | { id: "quality"; title: string; notes: { quality: string; note: string; level: 1 | 2 | 3 }[] };

export type FeedbackAreaId = FeedbackArea["id"];

export const FEEDBACK_AREAS: FeedbackArea[] = [
  {
    id: "interview",
    title: "Interview",
    // Every fact the trace map follows was heard, walk-ins included, so it counts as found here.
    facts: [
      ...FACTS.map((f) => ({ label: f.label, found: true })),
      { label: "Bookings open two weeks ahead", found: true },
      { label: "Staff check the calendar by hand", found: true },
      { label: "Hall B holds 20 people", found: false },
      { label: "Seniors’ club has priority on Mondays", found: false },
      { label: "Cancellations are by phone only", found: false },
    ],
  },
  { id: "traceability", title: "Traceability" },
  {
    id: "decisions",
    title: "Decisions & scenarios",
    scenarios: [
      { label: "A phone booking during a busy call", holds: true, note: "Staff enter it in the shared calendar before hanging up." },
      { label: "Two online requests for the same slot", holds: true, note: "The availability check rejects the second request." },
      { label: "A walk-in on Saturday morning", holds: false, note: "No decision covers walk-ins." },
    ],
  },
  {
    id: "quality",
    title: "Overall quality",
    notes: [
      { quality: "Usability", level: 2, note: "Staff entry is quick, but residents without smartphones still depend on staff." },
      { quality: "Reliability", level: 1, note: "A walk-in booking can still clash with an online one." },
      { quality: "Maintainability", level: 3, note: "One shared calendar keeps every booking in a single place." },
    ],
  },
];

export const INITIAL_AREA: FeedbackAreaId = "traceability";

/** The one number a card leads with. */
export function headline(area: FeedbackArea): string {
  switch (area.id) {
    case "interview": {
      const found = area.facts.filter((f) => f.found).length;
      return `${found} of ${area.facts.length} facts found`;
    }
    case "traceability":
      return `${summarize().dropped} dropped`;
    case "decisions": {
      const fails = area.scenarios.filter((s) => !s.holds).length;
      return `${fails} of ${area.scenarios.length} scenarios ${fails === 1 ? "fails" : "fail"}`;
    }
    case "quality":
      return `${area.notes.length} notes`;
  }
}
