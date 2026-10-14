// The review after Submit: Gate, Ask and Keep by code (AI only for borderline Ask questions), Justify by
// AI (several runs, quotes verified), Fit by code plus one AI check. Progress is reported per level for
// the "Checks running" list.
import { assembleReview, funnelQuestions, parseReviewDoc } from "./assemble";
import type { JudgeReplies, ReviewInput } from "./assemble";
import { fitEvidence } from "./fit";
import { JUSTIFY_RUNS, justifyEvidence, justifyInputs } from "./justify";
import { requestAssessSections } from "./request";
import type { AssessTask } from "./request";
import type { AssessmentResult, Level } from "./types";

export type LevelStatus = "waiting" | "running" | "done" | "skipped";
export type LevelProgress = { level: Level; status: LevelStatus; ms?: number };

const asArray = (section: string) => (value: unknown) => {
  if (!Array.isArray(value)) throw new Error(`${section} must be an array.`);
  return value;
};

export async function runAssessment(
  input: ReviewInput,
  { onProgress, justifyRuns = JUSTIFY_RUNS }: { onProgress?: (progress: LevelProgress) => void; justifyRuns?: number } = {},
): Promise<AssessmentResult> {
  const { caseDefinition } = input;
  const doc = parseReviewDoc(input);
  const facts = caseDefinition.facts.map(({ id, label, detail, disclosure }) => ({ id, label, detail, disclosure }));
  const replies: JudgeReplies = { justifyRuns: [], models: [] };

  const ask = async <T>(task: AssessTask, section: string, evidence: Record<string, unknown>) => {
    const response = await requestAssessSections<Record<string, unknown>>({
      caseId: caseDefinition.id,
      task,
      facts,
      evidence,
      validators: { [section]: asArray(section) },
    });
    replies.models.push(response.model);
    return response.sections[section] as T;
  };
  const step = async (level: Level, work: () => Promise<boolean>) => {
    const started = performance.now();
    onProgress?.({ level, status: "running" });
    const ran = await work();
    onProgress?.({ level, status: ran ? "done" : "skipped", ms: Math.round(performance.now() - started) });
  };

  await step("gate", async () => true);

  await step("ask", async () => {
    const pending = funnelQuestions(input, doc);
    if (pending.assertions.length) {
      replies.assertions = await ask("assertion", "facts", {
        items: pending.assertions.map(({ factId, itemId, itemText }) => ({
          factId,
          fact: caseDefinition.facts.find((fact) => fact.id === factId)?.detail,
          item: { id: itemId, text: itemText },
        })),
      });
    }
    if (pending.matches.length) {
      replies.matches = await ask("match", "matches", {
        pairs: pending.matches.map((pair, index) => ({ pairId: `p${index + 1}`, ...pair })),
      });
    }
    return true;
  });

  await step("keep", async () => true);

  await step("justify", async () => {
    const { send } = justifyInputs(doc);
    if (send.length === 0) return false;
    for (let run = 0; run < justifyRuns; run += 1) {
      replies.justifyRuns.push(await ask("justify", "items", justifyEvidence(caseDefinition, send)));
    }
    return true;
  });

  await step("fit", async () => {
    if (caseDefinition.scenarios.length === 0) return false;
    const evidence = fitEvidence(caseDefinition, input.answers, doc);
    if (evidence.length) replies.fit = await ask("fit", "scenarios", { scenarios: evidence });
    return true;
  });

  return assembleReview(input, replies);
}
