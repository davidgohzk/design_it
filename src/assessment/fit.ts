// Fit (WP10): does the design handle the case? The engineer answers each scenario while working,
// picking the decisions and diagram boxes that handle it and writing one line on how. Code checks the
// picks; one AI call (with verified quotes) checks the one-liner against the expected decisions.
import type { CaseDefinition, NodeType, Scenario } from "../cases";
import type { GraphNode, ParsedDesignDoc } from "../designDoc/parse";
import { plainNodeLabel } from "../designDoc/parse";
import { isRecord } from "../shared/lib/evidence";
import type { Method } from "./funnel";
import { quoteFound } from "./quotes";

export type ScenarioAnswer = {
  scenarioId: string;
  pickedDecisionIds: string[];
  pickedNodeIds: string[];
  oneLiner: string;
  /** The engineer ticked "Not handled". */
  notHandled: boolean;
};

/** Save one scenario without dropping answers already entered for other scenarios. */
export function upsertScenarioAnswer(answers: readonly ScenarioAnswer[], next: ScenarioAnswer): ScenarioAnswer[] {
  return answers.some((answer) => answer.scenarioId === next.scenarioId)
    ? answers.map((answer) => answer.scenarioId === next.scenarioId ? next : answer)
    : [...answers, next];
}

/** Review can start from the work screen; incomplete answers count as explicitly not handled. */
export function normalizeScenarioAnswers(scenarios: readonly Scenario[], answers: readonly ScenarioAnswer[]): ScenarioAnswer[] {
  return scenarios.map((scenario) => {
    const answer = answers.find((item) => item.scenarioId === scenario.id);
    if (!answer) return { scenarioId: scenario.id, pickedDecisionIds: [], pickedNodeIds: [], oneLiner: "", notHandled: true };
    return {
      ...answer,
      pickedDecisionIds: [...answer.pickedDecisionIds],
      pickedNodeIds: [...answer.pickedNodeIds],
      notHandled: answer.notHandled || answer.pickedDecisionIds.length === 0 || !answer.oneLiner.trim(),
    };
  });
}

export type FitVerdict = "handled" | "partly" | "not_handled" | "uncertain";

export type FitResult = {
  scenarioId: string;
  pickedDecisionIds: string[];
  pickedNodeIds: string[];
  oneLiner: string;
  codeFlags: string[];
  verdict: FitVerdict;
  reason?: string;
  quotes?: string[];
  method: Method;
};

/** Every box in the doc: the final diagram's, then any that appear only in a sketch. */
function allNodes(doc: ParsedDesignDoc) {
  const nodes = new Map<string, GraphNode>(doc.final.nodes.map((node) => [node.id, node]));
  for (const decision of doc.decisions) for (const node of decision.sketch?.nodes ?? []) if (!nodes.has(node.id)) nodes.set(node.id, node);
  return nodes;
}

/** The code checks on one answer's picks (empty when everything adds up). */
export function fitCodeFlags(scenario: Scenario, answer: ScenarioAnswer, doc: ParsedDesignDoc): string[] {
  if (answer.notHandled) return [];
  const flags: string[] = [];
  const decisions = new Map(doc.decisions.map((decision) => [decision.id, decision]));
  const nodes = allNodes(doc);
  for (const id of answer.pickedDecisionIds) if (!decisions.has(id)) flags.push(`${id} isn't a decision in the doc.`);
  for (const id of answer.pickedNodeIds) if (!nodes.has(id)) flags.push(`\`${id}\` isn't a box in the diagram.`);
  if (answer.pickedDecisionIds.length === 0) flags.push("No decision was picked.");
  const sketched = new Set(
    answer.pickedDecisionIds.flatMap((id) => decisions.get(id)?.sketch?.nodes.map((node) => node.id) ?? []),
  );
  for (const id of answer.pickedNodeIds) {
    if (nodes.has(id) && !sketched.has(id)) flags.push(`\`${id}\` isn't in the sketch of any decision picked for this scenario.`);
  }
  const types = new Set(answer.pickedNodeIds.map((id) => nodes.get(id)?.type).filter((type): type is NodeType => Boolean(type)));
  for (const type of scenario.expectedNodeTypes) {
    if (!types.has(type)) flags.push(`No picked box is a [${type}].`);
  }
  return flags;
}

/** What one scenario sends to the judge (only scenarios not ticked "Not handled"). */
export function fitEvidence(caseDefinition: CaseDefinition, answers: ScenarioAnswer[], doc: ParsedDesignDoc) {
  const decisions = new Map(doc.decisions.map((decision) => [decision.id, decision]));
  const nodes = allNodes(doc);
  return answers
    .filter((answer) => !answer.notHandled)
    .map((answer) => {
      const scenario = caseDefinition.scenarios.find((item) => item.id === answer.scenarioId)!;
      return {
        scenarioId: scenario.id,
        given: scenario.given,
        when: scenario.when,
        then: scenario.then,
        expectedDecisions: scenario.expectedDecisionKeys.map((key) => caseDefinition.expectedDecisions.find((item) => item.id === key)),
        goodAnswerNotes: scenario.goodAnswerNotes,
        pickedDecisions: answer.pickedDecisionIds.map((id) => ({ id, text: decisions.get(id)?.title ?? "" })),
        pickedBoxes: answer.pickedNodeIds.map((id) => plainNodeLabel(nodes.get(id)?.label ?? id)),
        selectedDecisionSketches: answer.pickedDecisionIds.map((id) => ({ id, sketch: decisions.get(id)?.sketchCode ?? "" })),
        finalDiagram: { nodes: doc.final.nodes, edges: doc.final.edges },
        oneLiner: answer.oneLiner,
      };
    });
}

/**
 * Combines the answers with the judge's reply: "Not handled" is not_handled by code; otherwise the
 * judge's verdict stands only with a quote found in the one-liner or the doc, else uncertain.
 */
export function fitResults({
  caseDefinition,
  answers,
  doc,
  docMarkdown,
  judged,
  discarded = { count: 0 },
}: {
  caseDefinition: CaseDefinition;
  answers: ScenarioAnswer[];
  doc: ParsedDesignDoc;
  docMarkdown: string;
  /** The judge's `scenarios` section, or undefined when no call was needed. */
  judged?: unknown;
  discarded?: { count: number };
}): FitResult[] {
  const replies = new Map<string, Record<string, unknown>>();
  for (const raw of Array.isArray(judged) ? judged : []) {
    if (isRecord(raw) && typeof raw.scenarioId === "string" && !replies.has(raw.scenarioId)) replies.set(raw.scenarioId, raw);
  }
  return caseDefinition.scenarios.map((scenario): FitResult => {
    const answer = answers.find((item) => item.scenarioId === scenario.id) ?? {
      scenarioId: scenario.id,
      pickedDecisionIds: [],
      pickedNodeIds: [],
      oneLiner: "",
      notHandled: true,
    };
    const base = {
      scenarioId: scenario.id,
      pickedDecisionIds: answer.pickedDecisionIds,
      pickedNodeIds: answer.pickedNodeIds,
      oneLiner: answer.oneLiner,
      codeFlags: fitCodeFlags(scenario, answer, doc),
    };
    if (answer.notHandled) return { ...base, verdict: "not_handled", reason: "Marked as not handled.", method: "code" };
    const reply = replies.get(scenario.id);
    const verdict = reply?.verdict;
    if (verdict !== "handled" && verdict !== "partly" && verdict !== "not_handled") {
      return { ...base, verdict: "uncertain", method: "ai_judgment" };
    }
    const quotes: string[] = [];
    for (const quote of Array.isArray(reply!.quotes) ? reply!.quotes : []) {
      if (!isRecord(quote) || typeof quote.text !== "string") continue;
      const source = quote.source === "answer" ? answer.oneLiner : docMarkdown;
      if (quoteFound(source, quote.text)) quotes.push(quote.text);
      else discarded.count += 1;
    }
    const reason = typeof reply!.reason === "string" ? reply!.reason.split(/\s+/).slice(0, 25).join(" ") : undefined;
    return quotes.length
      ? { ...base, verdict, reason, quotes, method: "ai_verified_quote" }
      : { ...base, verdict: "uncertain", reason, quotes: [], method: "ai_judgment" };
  });
}
