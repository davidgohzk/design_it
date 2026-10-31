import type { ExpectedDecision } from "./types";

/** A scenario's good-answer notes: the notes of the expected decisions it points at, in order. */
export function goodAnswerNotesFor(decisions: readonly ExpectedDecision[], keys: readonly string[]): string {
  return keys
    .map((key) => {
      const decision = decisions.find((item) => item.id === key);
      if (!decision) throw new Error(`Unknown expected decision: ${key}`);
      return `${decision.goodAnswerNotes}.`;
    })
    .join(" ");
}
