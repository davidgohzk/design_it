// Non-component helpers for the report (kept out of the .tsx files for fast refresh).
import type { FlowStatus } from "../../../assessment/flow";
import type { ReportSnapshot } from "./reportTypes";

const FEEDBACK_STORAGE_KEY = "design_it.assessmentFeedback";

export type FeedbackEntry = { caseId: string; item: string; verdict: "right" | "wrong"; timestamp: number };

export function readFeedback(): FeedbackEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function saveFeedback(entry: FeedbackEntry) {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([...readFeedback(), entry]));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the buttons still show the choice.
  }
}

/** Real empty states, so an untouched attempt reads as such rather than as a row of zeros. */
export function emptyStateNotes(snapshot: ReportSnapshot, template: string) {
  const notes: string[] = [];
  if (!snapshot.messages.some((message) => message.role === "user")) {
    notes.push("You haven't asked the client anything yet, so no facts could come up in the chat.");
  }
  if (snapshot.docMarkdown.trim() === template.trim()) {
    notes.push("Your design doc is still the empty template.");
  } else if (!snapshot.parsed.requirements.some((requirement) => requirement.citations.length > 0)) {
    notes.push("None of your requirements cite the chat or the brief, so nothing can be traced back to the client.");
  }
  if (snapshot.parsed.final.nodes.length === 0) notes.push("There is no final diagram yet, so no decision reaches it.");
  return notes;
}

/** Level 1B's flow: where each requirement's chain of references stops. */
export const FLOW_LABELS: Record<FlowStatus, string> = {
  carried_through: "Carried through",
  not_drawn: "Not drawn",
  no_decision: "No decision",
  no_source: "No source",
};

/** Every rating scale's words: soundness (2), requirements met (3.2) and expected decisions (3.3). */
export const RATING_LABEL: Record<string, string> = {
  sound: "sound",
  weak: "weak",
  unsound: "unsound",
  well: "well",
  weakly: "weakly",
  not_addressed: "not addressed",
  met: "met",
  partly: "partly",
  not_met: "not met",
};
