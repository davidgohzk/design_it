// A prepopulated example for a case: its interview, design doc, final diagram and review.
// The review goes through the same verification as a live one, so every quote in it is checked
// against the transcript and every link is computed from the doc.
import { computeLinks } from "../assessment/links";
import { cuePrefilter, foundFromEvidence } from "../assessment/run";
import type { AssessmentResult } from "../assessment/types";
import {
  validateExpectedDecisions,
  validateFactEvidence,
  validateInvented,
  validateRatings,
  validateRequirementsMet,
  validateSimilar,
} from "../assessment/validate";
import { checkConsistency, usableSketches } from "../designDoc/consistency";
import { extractFinalDiagram, setFinalDiagram } from "../designDoc/finalSection";
import { parseDesignDoc } from "../designDoc/parse";
import type { ChatMessage } from "../shared/lib/types";
import type { CaseDefinition } from "./types";

type Rating = { id: string; rating: string; reason: string };

/** Levels 2 (soundness) and 3 (overall design) of a seed review, in the shape /api/assess returns. */
export type SeedSoundness = {
  requirements: Rating[];
  decisions: Rating[];
  sketches: Rating[];
  expectedDecisions: (Rating & { decisionIds: string[] })[];
  requirementsMet: (Rating & { nodeIds: string[] })[];
  similar: { kind: string; ids: string[]; reason: string }[];
  requirementItems: Rating[];
  decisionItems: Rating[];
  sketchItems: Rating[];
  sketchIntegration: Rating[];
};

type SeedInput = {
  messages: ChatMessage[];
  /** The design doc before its "## Final diagram" section. */
  doc: string;
  finalDiagram: string;
  /** Level 0 + 3.1, and levels 2 and 3, in the shapes /api/assess returns. */
  evidence: unknown;
  invented: unknown;
  soundness: SeedSoundness;
  /** How the final diagram was drafted in the diagram helper, before being copied into the doc. */
  diagramPrompt: string;
};

export function buildSeed(
  CASE: CaseDefinition,
  { messages, doc: docBody, finalDiagram, evidence: rawEvidence, invented, soundness, diagramPrompt }: SeedInput,
) {
  // The design doc ends with its final diagram, as a Mermaid block under "## Final diagram".
  const docMarkdown = setFinalDiagram(docBody, finalDiagram);
  const finalCode = extractFinalDiagram(docMarkdown);
  const doc = parseDesignDoc(docMarkdown, finalCode, CASE.briefMarkdown, messages);
  const discarded = { count: 0 };
  const evidence = validateFactEvidence(rawEvidence, {
    factIds: CASE.facts.filter((fact) => fact.disclosure !== "given").map((fact) => fact.id),
    checkSurfaced: cuePrefilter(CASE, messages),
    messages,
    docMarkdown,
    discarded,
  });
  const inventedStatements = validateInvented(invented, messages, discarded);
  if (discarded.count > 0) throw new Error(`A quote in a ${CASE.id} seed review doesn't verify.`);
  const found = foundFromEvidence(CASE, evidence);
  const decisionIds = doc.decisions.map((decision) => decision.id);
  const requirementIds = doc.requirements.filter((item) => item.text.trim()).map((item) => item.id);
  const sketchIds = usableSketches(doc.decisions).map((item) => item.id);
  const review: AssessmentResult = {
    caseId: CASE.id,
    model: "prepopulated example",
    reviewedAt: Date.parse("2026-09-30T09:00:00+08:00"),
    fairness: {
      clientFailed: found.filter((fact) => fact.state === "client_failed").map((fact) => fact.factId),
      inventedStatements,
    },
    found: { facts: found },
    links: computeLinks({ doc, consistency: checkConsistency(doc), facts: CASE.facts, found }),
    soundness: {
      requirements: validateRatings(soundness.requirements, requirementIds, "requirements"),
      decisions: validateRatings(soundness.decisions, decisionIds, "decisions"),
      sketches: validateRatings(soundness.sketches, sketchIds, "sketches"),
      expectedDecisions: validateExpectedDecisions(
        soundness.expectedDecisions,
        CASE.expectedDecisions.map((item) => item.id),
        decisionIds,
      ),
      requirementsMet: validateRequirementsMet(
        soundness.requirementsMet,
        requirementIds,
        doc.final.nodes.map((node) => node.id),
      ),
      similar: validateSimilar(soundness.similar, { requirements: requirementIds, decisions: decisionIds, sketches: sketchIds }),
      requirementItems: validateRatings(soundness.requirementItems, requirementIds, "requirementItems"),
      decisionItems: validateRatings(soundness.decisionItems, decisionIds, "decisionItems"),
      sketchItems: validateRatings(soundness.sketchItems, sketchIds, "sketchItems"),
      sketchIntegration: validateRatings(soundness.sketchIntegration, sketchIds, "sketchIntegration"),
    },
    verification: { discardedQuotes: 0 },
  };
  const diagramTurns = [{ prompt: diagramPrompt, code: finalCode, at: Date.parse("2026-09-30T08:50:00+08:00") }];
  return { messages, docMarkdown, finalCode, diagramTurns, review };
}

export type CaseSeed = ReturnType<typeof buildSeed>;
