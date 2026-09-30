// The /simple review (§6): level 0 + 1A (one "evidence" call), level 2 (deterministic, plus one
// "match" call only when a fact ↔ requirement match is ambiguous), then level 3 ("soundness").
import type { CaseDefinition } from "../cases";
import { checkConsistency, usableSketches } from "../designDoc/consistency";
import { parseDesignDoc } from "../designDoc/parse";
import type { ChatMessage } from "../types";
import { computeLinks, matchFactsToRequirements, matchKey } from "./links";
import { requestAssessSections } from "./request";
import type { AssessTask } from "./request";
import type { AssessmentResult, Evidence, ExpectedDecisionRating, FoundFact, Rating } from "./types";
import {
  validateExpectedDecisions,
  validateFactEvidence,
  validateInvented,
  validateMatches,
  validateRatings,
} from "./validate";
import type { DiscardCounter, FactEvidence } from "./validate";

export type AssessmentInput = {
  caseDefinition: CaseDefinition;
  messages: ChatMessage[];
  docMarkdown: string;
  finalCode: string;
};

export type AssessmentProgress = { stage: AssessTask; attempt: number; retrySections?: string[] };

/** Facts whose cues appear in no client message skip the "surfaced" check (§6 1A). */
export function cuePrefilter(caseDefinition: CaseDefinition, messages: ChatMessage[]) {
  const clientText = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content.toLowerCase())
    .join("\n");
  return Object.fromEntries(
    caseDefinition.facts.map((fact) => [
      fact.id,
      fact.disclosure !== "given" && fact.cues.some((cue) => clientText.includes(cue.toLowerCase())),
    ]),
  );
}

/** One state per fact: given → surfaced → client_failed → assumed → missed. */
export function foundFromEvidence(caseDefinition: CaseDefinition, evidence: FactEvidence[]): FoundFact[] {
  const byId = new Map(evidence.map((item) => [item.factId, item]));
  return caseDefinition.facts.map((fact): FoundFact => {
    if (fact.disclosure === "given") return { factId: fact.id, state: "given" };
    const item = byId.get(fact.id);
    if (item?.surfaced) return { factId: fact.id, state: "surfaced", ...item.surfaced };
    if (item?.askedInArea) return { factId: fact.id, state: "client_failed", ...item.askedInArea };
    if (item?.docQuote) return { factId: fact.id, state: "assumed", quote: item.docQuote };
    return { factId: fact.id, state: "missed" };
  });
}

const joinDistinct = (values: string[]) => [...new Set(values.filter(Boolean))].join(", ");

export async function runAssessment(
  { caseDefinition, messages, docMarkdown, finalCode }: AssessmentInput,
  { apiKey, onProgress }: { apiKey?: string; onProgress?: (progress: AssessmentProgress) => void } = {},
): Promise<AssessmentResult> {
  const brief = caseDefinition.briefMarkdown;
  const doc = parseDesignDoc(docMarkdown, finalCode, brief, messages);
  const consistency = checkConsistency(doc);
  const transcript = messages.map((message, index) => ({ index, role: message.role, content: message.content }));
  const checkSurfaced = cuePrefilter(caseDefinition, messages);
  const discarded: DiscardCounter = { count: 0 };
  const models: string[] = [];
  const promptVersions: string[] = [];
  const baseFacts = caseDefinition.facts.map(({ id, label, detail, disclosure }) => ({ id, label, detail, disclosure }));
  const call = async <T extends Record<string, unknown>>(
    task: AssessTask,
    evidence: Record<string, unknown>,
    validators: { [K in keyof T]: (value: unknown) => T[K] },
    facts: Record<string, unknown>[] = baseFacts,
  ) => {
    const response = await requestAssessSections<T>({
      caseId: caseDefinition.id,
      task,
      facts,
      evidence,
      validators,
      apiKey,
      onAttempt: (attempt, retrySections) => onProgress?.({ stage: task, attempt, retrySections }),
    });
    models.push(response.model);
    promptVersions.push(response.promptVersion);
    return response.sections;
  };

  // Level 0 + 1A.
  const checkedIds = caseDefinition.facts.filter((fact) => fact.disclosure !== "given").map((fact) => fact.id);
  const evidence = await call<{ facts: FactEvidence[]; invented: Evidence[] }>(
    "evidence",
    { caseBrief: brief, transcript, designDoc: docMarkdown },
    {
      facts: (value) => validateFactEvidence(value, { factIds: checkedIds, checkSurfaced, messages, docMarkdown, discarded }),
      invented: (value) => validateInvented(value, messages, discarded),
    },
    baseFacts.map((fact) => (fact.disclosure === "given" ? fact : { ...fact, checkSurfaced: checkSurfaced[fact.id] })),
  );
  const found = foundFromEvidence(caseDefinition, evidence.facts);

  // Level 2.
  const factMatches: Record<string, boolean> = {};
  const { ambiguous } = matchFactsToRequirements(doc, found);
  if (ambiguous.length > 0) {
    const pairs = ambiguous.map((pair, index) => ({ pairId: `p${index + 1}`, ...pair }));
    const { matches } = await call<{ matches: Record<string, boolean> }>(
      "match",
      { pairs },
      { matches: (value) => validateMatches(value, pairs.map((pair) => pair.pairId)) },
    );
    for (const pair of pairs) factMatches[matchKey(pair.factId, pair.requirementId)] = matches[pair.pairId];
  }
  const links = computeLinks({ doc, consistency, facts: caseDefinition.facts, found, factMatches });

  // Level 3.
  const unique = (ids: string[]) => [...new Set(ids)];
  const requirementIds = unique(doc.requirements.filter((item) => item.text.trim()).map((item) => item.id));
  const decisionIds = unique(doc.decisions.map((item) => item.id));
  const sketchIds = unique(usableSketches(doc.decisions).map((item) => item.id));
  const expectedIds = caseDefinition.expectedDecisions.map((item) => item.id);
  let soundness: AssessmentResult["soundness"];
  if (requirementIds.length + decisionIds.length === 0) {
    soundness = {
      requirements: [],
      decisions: [],
      sketches: [],
      expectedDecisions: expectedIds.map((id) => ({
        id,
        rating: "not_addressed",
        decisionIds: [],
        reason: "The design doc has no requirements or decisions yet.",
      })),
    };
  } else {
    soundness = await call<{
      requirements: Rating[];
      decisions: Rating[];
      sketches: Rating[];
      expectedDecisions: ExpectedDecisionRating[];
    }>(
      "soundness",
      {
        caseBrief: brief,
        transcript,
        designDoc: docMarkdown,
        finalDiagram: finalCode,
        requirements: doc.requirements
          .filter((item) => requirementIds.includes(item.id))
          .map(({ id, text, citations }) => ({
            id,
            text,
            citations: citations.map(({ source, messageIndex, excerpt, valid }) => ({
              source,
              messageIndex,
              quote: excerpt,
              verified: valid,
            })),
          })),
        decisions: doc.decisions.map(({ id, text, requirementIds: refs, sketchCode }) => ({
          id,
          text,
          requirementIds: refs,
          sketch: sketchIds.includes(id) ? sketchCode : null,
        })),
        expectedDecisions: caseDefinition.expectedDecisions,
      },
      {
        requirements: (value) => validateRatings(value, requirementIds, "requirements"),
        decisions: (value) => validateRatings(value, decisionIds, "decisions"),
        sketches: (value) => validateRatings(value, sketchIds, "sketches"),
        expectedDecisions: (value) => validateExpectedDecisions(value, expectedIds, decisionIds),
      },
    );
  }

  return {
    caseId: caseDefinition.id,
    caseVersion: caseDefinition.version,
    model: joinDistinct(models),
    promptVersion: joinDistinct(promptVersions),
    reviewedAt: Date.now(),
    fairness: {
      clientFailed: found.filter((fact) => fact.state === "client_failed").map((fact) => fact.factId),
      inventedStatements: evidence.invented,
    },
    found: { facts: found },
    links,
    soundness,
    verification: { discardedQuotes: discarded.count },
  };
}
