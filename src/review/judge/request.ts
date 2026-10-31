import { postJson } from "@/lib/api";
import type { CaseFact } from "@/cases";
import { isRecord, parseReviewJson } from "@/lib/evidence";
import contract from "./tasks.json";

/**
 * The /api/assess contract. tasks.json is owned by the backend (app/assess/tasks.json) and copied
 * here; a test on each side compares the two, so a task added on one side cannot go missing on the
 * other. The type is derived from the runtime list rather than written twice.
 */
export const ASSESS_TASKS = contract.tasks.map((entry) => entry.task) as readonly AssessTaskName[];
type AssessTaskName =
  "match" | "assertion" | "justify" | "fit" | "suggest" | "bano" | "turns" | "scenario_adequacy" | "iso" | "rationale";
export type AssessTask = AssessTaskName;

/** The tasks whose prompt is versioned, so a stored review records which prompt produced it. */
export const VERSIONED_TASKS = contract.tasks
  .filter((entry) => entry.promptVersion !== null)
  .map((entry) => entry.task) as readonly AssessTaskName[];

/** `promptVersion` is set only for the tasks whose prompt is versioned. */
type AssessResponse = { content: string; model: string; promptVersion?: string | null };

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
}): Promise<{ sections: T; model: string; promptVersion?: string }> {
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
      return { sections: accepted as T, model: response.model, ...(response.promptVersion ? { promptVersion: response.promptVersion } : {}) };
    }
  }
  throw new Error(`The review's ${task} step failed after ${MAX_ASSESS_ATTEMPTS} attempts. ${lastError}`);
}
