// Non-component helpers for the report (kept out of the .tsx files for fast refresh).
import type { FunnelState } from "../../assessment/types";
import type { ReportSnapshot } from "./reportTypes";

export const FEEDBACK_STORAGE_KEY = "design_it.assessmentFeedback";

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

export const FUNNEL_LABELS: Record<FunnelState, string> = {
  carried_through: "Carried through",
  not_drawn: "Not drawn",
  unused: "Unused",
  dropped: "Dropped",
  assumed: "Assumed",
  missed: "Missed",
  client_failed: "Excluded",
  given: "Given",
};
