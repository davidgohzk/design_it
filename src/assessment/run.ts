// The review after Review: Gate, Ask and Keep by code (AI only for borderline Ask questions), Justify by
// AI (several runs, quotes verified), Fit by code plus one AI check. Progress also tracks the checks
// needed by the five summary sections.
import { assembleReview, funnelQuestions, parseReviewDoc, referenceableIds } from "./assemble";
import type { JudgeReplies, ReviewInput } from "./assemble";
import { BANO_RUNS, banoEvidence } from "./bano";
import { tagMessages } from "./questionTags";
import { turnEvidence } from "./elicitation";
import { QUALITIES, QUALITY_COVERS, QUALITY_LABEL } from "../designDoc/parse";
import { rationaleEvidence } from "./summaryReview";
import { fitEvidence } from "./fit";
import { JUSTIFY_RUNS, justifyEvidence, justifyInputs } from "./justify";
import { requestAssessSections } from "./request";
import type { AssessTask } from "./request";
import type { AssessmentResult, Level } from "./types";


export type LevelStatus = "waiting" | "running" | "done" | "skipped";
export type LevelProgress = { level: Level; status: LevelStatus; ms?: number };

/**
 * Additional work used by the summary sections without changing the five measured levels. Bano is
 * teaching feedback, so it must never appear as a sixth level or in a level's outcome.
 */
export type ExtraCheck = "bano" | "rationale" | "iso";
export type ExtraProgress = { check: ExtraCheck; status: LevelStatus; ms?: number };

/** How many interviewer turns one turns-judge call classifies. */
const TURNS_PER_CALL = 30;

const asArray = (section: string) => (value: unknown) => {
  if (!Array.isArray(value)) throw new Error(`${section} must be an array.`);
  return value;
};

export async function runAssessment(
  input: ReviewInput,
  {
    onProgress,
    onExtraProgress,
    justifyRuns = JUSTIFY_RUNS,
    banoRuns = BANO_RUNS,
    suggest = true,
  }: {
    onProgress?: (progress: LevelProgress) => void;
    onExtraProgress?: (progress: ExtraProgress) => void;
    justifyRuns?: number;
    banoRuns?: number;
    suggest?: boolean;
  } = {},
): Promise<AssessmentResult> {
  const { caseDefinition } = input;
  const doc = parseReviewDoc(input);
  const facts = caseDefinition.facts.map(({ id, label, detail, disclosure }) => ({ id, label, detail, disclosure }));
  const replies: JudgeReplies = { justifyRuns: [], models: [], judgeVersions: {} };

  const ask = async <T>(task: AssessTask, section: string, evidence: Record<string, unknown>) => {
    const response = await requestAssessSections<Record<string, unknown>>({
      caseId: caseDefinition.id,
      task,
      facts,
      evidence,
      validators: { [section]: asArray(section) },
    });
    replies.models.push(response.model);
    if (task === "bano" && response.promptVersion) replies.banoPromptVersion = response.promptVersion;
    if (task === "turns" && response.promptVersion) replies.turnPromptVersion = response.promptVersion;
    if (response.promptVersion && (task === "turns" || task === "scenario_adequacy" || task === "rationale" || task === "iso")) {
      replies.judgeVersions![task] = response.promptVersion;
    }
    return response.sections[section] as T;
  };
  const timed = async (report: (status: LevelStatus, ms?: number) => void, work: () => Promise<boolean>) => {
    const started = performance.now();
    report("running");
    const ran = await work();
    report(ran ? "done" : "skipped", Math.round(performance.now() - started));
  };
  const step = (level: Level, work: () => Promise<boolean>) =>
    timed((status, ms) => onProgress?.({ level, status, ...(ms === undefined ? {} : { ms }) }), work);
  const extraStep = (check: ExtraCheck, work: () => Promise<boolean>) =>
    timed((status, ms) => onExtraProgress?.({ check, status, ...(ms === undefined ? {} : { ms }) }), work);

  await step("gate", async () => true);

  await step("ask", async () => {
    const turns = turnEvidence(caseDefinition, input.messages);
    if (turns.turns.length) {
      const labels: unknown[] = [];
      const errors: string[] = [];
      // One call per TURNS_PER_CALL interviewer turns. The transcript is sent once per call rather
      // than per turn, so a whole interview usually needs a single call: more calls than that risk
      // the server's per-minute limit, and a rejected call used to lose every label silently.
      for (let offset = 0; offset < turns.turns.length; offset += TURNS_PER_CALL) {
        try {
          labels.push(...await ask<unknown[]>("turns", "turns", {
            initialRequirements: turns.initialRequirements,
            transcript: turns.transcript,
            turns: turns.turns.slice(offset, offset + TURNS_PER_CALL),
          }));
        } catch (error) {
          // Coverage stays measurable, but the review now says the strategy labels are missing.
          errors.push(error instanceof Error ? error.message : "The turns judge failed.");
        }
      }
      replies.turnLabels = labels;
      if (errors.length) replies.turnLabelErrors = errors;
    }
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
    if (evidence.length) {
      try {
        replies.scenarioAdequacy = await ask("scenario_adequacy", "scenarios", { scenarios: evidence });
      } catch {
        // The existing Fit check remains available.
      }
    }
    return true;
  });

  await extraStep("rationale", async () => {
    const links = rationaleEvidence(doc);
    if (!links.length) return false;
    try {
      replies.rationale = await ask("rationale", "links", { links });
      return true;
    } catch {
      // The traceability graph still renders from code-checked references.
      return false;
    }
  });

  // The interview-mistake check, after the levels and before the coaching: its findings must never
  // reach `suggest`, which is why it is not in suggestionEvidence. A failure here costs the engineer
  // nothing either — the seventeen code rules still produce a report, with the judged items left
  // uncertain — so everything is caught, including an older server that doesn't know the task.
  await extraStep("bano", async () => {
    if (banoRuns < 1) return false;
    const evidence = banoEvidence({ caseDefinition, messages: input.messages, tags: tagMessages(input.messages).tags });
    if (evidence.transcript.length === 0) return false;
    try {
      const runs: unknown[] = [];
      for (let run = 0; run < banoRuns; run += 1) runs.push(await ask("bano", "items", evidence));
      replies.banoRuns = runs;
      return true;
    } catch {
      return false;
    }
  });

  // The coaching line per stage. It reads the finished levels, so it goes last, and a failure here
  // costs the engineer nothing: the review is complete without it.
  if (suggest) {
    const measured = assembleReview(input, replies);
    try {
      replies.suggestions = await ask("suggest", "suggestions", {
        findings: suggestionEvidence(measured, caseDefinition),
        ids: [...referenceableIds(caseDefinition, doc)],
      });
    } catch {
      // Leave the review without advice rather than failing it.
    }
  }

  // The critique of the whole design against ISO/IEC 25010. Optional: a failure here leaves every
  // characteristic unjudged and never invalidates the measured checks.
  await extraStep("iso", async () => {
    try {
      const measured = assembleReview(input, replies);
      replies.iso = await ask("iso", "characteristics", {
        characteristics: QUALITIES.map((id) => ({ id, label: QUALITY_LABEL[id], covers: QUALITY_COVERS[id] })),
        submittedWork: { doc: input.docMarkdown, finalDiagram: input.finalCode },
        findings: suggestionEvidence(measured, caseDefinition),
        ids: [...referenceableIds(caseDefinition, doc)],
      });
      return true;
    } catch {
      return false;
    }
  });

  return assembleReview(input, replies);
}

/** What the coach is shown: the findings of each level, small enough to send in one call. */
function suggestionEvidence(result: AssessmentResult, caseDefinition: ReviewInput["caseDefinition"]) {
  const label = (id: string) => caseDefinition.facts.find((fact) => fact.id === id)?.label ?? id;
  return {
    gate: {
      clientFailed: result.gate.clientFailed.map((failure) => ({ factId: failure.factId, topic: label(failure.factId) })),
      sessionComplete: result.gate.sessionComplete,
    },
    ask: result.ask.facts.map((fact) => ({ factId: fact.factId, topic: label(fact.factId), state: fact.state })),
    keep: {
      traces: result.keep.traces.map((trace) => ({ factId: trace.factId, state: trace.state, requirementIds: trace.requirementIds, decisionIds: trace.decisionIds })),
      uncitedRequirements: result.keep.uncitedRequirements,
      unsupportedDecisions: result.keep.unsupportedDecisions,
      unjustifiedNodes: result.keep.unjustifiedNodes,
      unexplainedEdges: result.keep.unexplainedEdges,
    },
    justify: result.justify.items.map((item) => ({ itemId: item.itemId, verdict: item.verdict, reason: item.reason })),
    fit: result.fit.scenarios.map((scenario) => ({ scenarioId: scenario.scenarioId, verdict: scenario.verdict, codeFlags: scenario.codeFlags })),
  };
}
