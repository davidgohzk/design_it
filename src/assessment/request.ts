import { postJson } from "../shared/lib/api";
import type { CaseFact } from "../cases";
import { isRecord, parseReviewJson } from "../shared/lib/evidence";

export type AssessTask = "evidence" | "match" | "soundness";

type AssessResponse = { content: string; model: string };

const MAX_ASSESS_ATTEMPTS = 3;

type Validators<T> = { [K in keyof T]: (value: unknown) => T[K] };

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "The section was invalid.");

/**
 * Calls /api/assess for one task and validates each section on its own. Sections that pass are
 * kept; a retry asks only for the ones that failed (the requestAIReview pattern).
 * Request failures (network, 4xx/5xx) are thrown straight away; only invalid output is retried.
 */
export async function requestAssessSections<T extends Record<string, unknown>>({
  caseId,
  task,
  facts,
  evidence,
  validators,
  onAttempt,
}: {
  caseId: string;
  task: AssessTask;
  facts: Record<string, unknown>[] | readonly CaseFact[];
  evidence: Record<string, unknown>;
  validators: Validators<T>;
  onAttempt?: (attempt: number, retrySections?: string[]) => void;
}): Promise<{ sections: T; model: string }> {
  const all = Object.keys(validators) as (keyof T & string)[];
  const accepted: Partial<T> = {};
  let pending = all;
  let lastError = "The AI response was incomplete.";

  for (let attempt = 1; attempt <= MAX_ASSESS_ATTEMPTS; attempt += 1) {
    const retrySections = pending.length < all.length ? pending : undefined;
    onAttempt?.(attempt, retrySections);
    const response = await postJson<AssessResponse>("/api/assess", {
      caseId,
      task,
      facts,
      evidence,
      ...(retrySections ? { retrySections } : {}),
    });
    let parsed: unknown;
    try {
      parsed = parseReviewJson(response.content ?? "");
    } catch (error) {
      lastError = errorMessage(error);
      continue;
    }
    if (!isRecord(parsed)) {
      lastError = "The AI response is not a JSON object.";
      continue;
    }
    for (const section of pending) {
      try {
        accepted[section] = validators[section](parsed[section]);
      } catch (error) {
        lastError = `${section}: ${errorMessage(error)}`;
      }
    }
    pending = all.filter((section) => !(section in accepted));
    if (pending.length === 0) {
      return { sections: accepted as T, model: response.model };
    }
  }
  throw new Error(`The review's ${task} step failed after ${MAX_ASSESS_ATTEMPTS} attempts. ${lastError}`);
}
