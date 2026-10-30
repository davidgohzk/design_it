import type { CaseDefinition } from "../cases";
import { QUALITIES } from "../designDoc/parse";
import type { ParsedDesignDoc } from "../designDoc/parse";
import type { Quality } from "../cases/types";
import { isRecord } from "../shared/lib/evidence";
import { quoteFound } from "./quotes";
import { fitCodeFlags } from "./fit";
import type { ScenarioAnswer } from "./fit";

export type ReviewVerdict = "sound" | "weak" | "unsound" | "uncertain";
export type RationaleLink = { id: string; from: string; to: string; verdict: ReviewVerdict; reason: string; quote?: string };
export type ScenarioAdequacy = {
  scenarioId: string;
  outcome: "handled" | "partly" | "not_handled" | "uncertain";
  decision: ReviewVerdict;
  diagram: ReviewVerdict;
  justification: ReviewVerdict;
  reasons: { decision: string; diagram: string; justification: string };
  quotes: string[];
};

const verdict = (value: unknown): ReviewVerdict => value === "sound" || value === "weak" || value === "unsound" ? value : "uncertain";

export function rationaleEvidence(doc: ParsedDesignDoc) {
  const requirements = new Map(doc.requirements.map((item) => [item.id, item]));
  const finalNodes = new Map(doc.final.nodes.map((item) => [item.id, item]));
  const links: { id: string; from: string; to: string; sourceText: string; targetText: string }[] = [];
  for (const requirement of doc.requirements) {
    for (const citation of requirement.citations.filter((item) => item.valid)) {
      const from = citation.source === "brief" ? "brief" : `chat:${citation.messageIndex}`;
      links.push({ id: `${from}>${requirement.id}`, from, to: requirement.id, sourceText: citation.excerpt, targetText: requirement.text });
    }
  }
  for (const decision of doc.decisions) {
    for (const id of decision.because) {
      links.push({ id: `${id}>${decision.id}`, from: id, to: decision.id, sourceText: requirements.get(id)?.text ?? "", targetText: decision.text });
    }
    if (decision.sketchCode) links.push({ id: `${decision.id}>${decision.id}-sketch`, from: decision.id, to: `${decision.id}-sketch`, sourceText: decision.text, targetText: decision.sketchCode });
    for (const node of decision.sketch?.nodes ?? []) {
      if (!node.isActor && finalNodes.has(node.id)) links.push({ id: `${decision.id}-sketch>${node.id}`, from: `${decision.id}-sketch`, to: node.id, sourceText: decision.sketchCode ?? "", targetText: finalNodes.get(node.id)?.label ?? "" });
    }
  }
  return links;
}

export function readRationale(raw: unknown, links: ReturnType<typeof rationaleEvidence>): RationaleLink[] {
  const answers = new Map<string, Record<string, unknown>>();
  for (const item of Array.isArray(raw) ? raw : []) if (isRecord(item) && typeof item.id === "string" && !answers.has(item.id)) answers.set(item.id, item);
  return links.map((link) => {
    const answer = answers.get(link.id);
    const quote = typeof answer?.quote === "string" && quoteFound(`${link.sourceText}\n${link.targetText}`, answer.quote) ? answer.quote : undefined;
    return { id: link.id, from: link.from, to: link.to, verdict: quote ? verdict(answer?.verdict) : "uncertain", reason: typeof answer?.reason === "string" ? answer.reason.slice(0, 240) : "No verified judgment available.", ...(quote ? { quote } : {}) };
  });
}

export function readScenarioAdequacy(raw: unknown, caseDefinition: CaseDefinition, answers: ScenarioAnswer[], doc: ParsedDesignDoc, docMarkdown: string): ScenarioAdequacy[] {
  const judged = new Map<string, Record<string, unknown>>();
  for (const item of Array.isArray(raw) ? raw : []) if (isRecord(item) && typeof item.scenarioId === "string" && !judged.has(item.scenarioId)) judged.set(item.scenarioId, item);
  return caseDefinition.scenarios.map((scenario) => {
    const answer = answers.find((item) => item.scenarioId === scenario.id);
    const rawItem = judged.get(scenario.id);
    const empty = { decision: "No verified judgment available.", diagram: "No verified judgment available.", justification: "No verified judgment available." };
    const reason = isRecord(rawItem?.reasons) ? rawItem.reasons : {};
    const reasons = Object.fromEntries((Object.keys(empty) as (keyof typeof empty)[]).map((key) => [key, typeof reason[key] === "string" ? reason[key].slice(0, 240) : empty[key]])) as typeof empty;
    const quotes = (Array.isArray(rawItem?.quotes) ? rawItem.quotes : []).flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.text !== "string") return [];
      const source = entry.source === "answer" ? answer?.oneLiner ?? "" : docMarkdown;
      return quoteFound(source, entry.text) ? [entry.text] : [];
    });
    if (answer?.notHandled) return { scenarioId: scenario.id, outcome: "not_handled", decision: "unsound", diagram: "unsound", justification: "unsound", reasons: { decision: "Marked not handled.", diagram: "Marked not handled.", justification: "Marked not handled." }, quotes: [] };
    const flags = answer ? fitCodeFlags(scenario, answer, doc) : [];
    const invalidLink = flags.some((flag) => flag.includes("isn't a box") || flag.includes("isn't in the sketch") || flag.includes("isn't a decision"));
    const missingType = flags.some((flag) => flag.startsWith("No picked box"));
    const judgedDiagram = quotes.length ? verdict(rawItem?.diagram) : "uncertain";
    const diagram = invalidLink ? "unsound" : missingType && judgedDiagram === "sound" ? "weak" : judgedDiagram;
    if (invalidLink || missingType) reasons.diagram = flags.join(" ");
    const decision = quotes.length ? verdict(rawItem?.decision) : "uncertain";
    const justification = quotes.length ? verdict(rawItem?.justification) : "uncertain";
    const dimensions = [decision, diagram, justification];
    const outcome = dimensions.every((item) => item === "sound") ? "handled"
      : dimensions.every((item) => item === "unsound") ? "not_handled"
      : dimensions.includes("uncertain") ? "uncertain" : "partly";
    return { scenarioId: scenario.id, outcome, decision, diagram, justification, reasons, quotes };
  });
}

const POINT_KINDS = ["strengths", "weaknesses", "improvements"] as const;

/**
 * The critique of one ISO/IEC 25010 characteristic. A point whose quote could not be found in the
 * submitted work is kept but marked unquoted, so a reader sees the judgment and how well it is
 * grounded instead of the point silently disappearing.
 */
export type CritiquePoint = { point: string; refs: string[]; quote?: string };
export type IsoVerdict = "strong" | "adequate" | "weak" | "not_addressed";
export type IsoCharacteristic = {
  id: Quality;
  verdict: IsoVerdict;
  summary: string;
  strengths: CritiquePoint[];
  weaknesses: CritiquePoint[];
  improvements: CritiquePoint[];
};

const isoVerdict = (value: unknown): IsoVerdict =>
  value === "strong" || value === "adequate" || value === "weak" ? value : "not_addressed";

function readPoints(raw: unknown, knownIds: Set<string>, submittedText: string): CritiquePoint[] {
  const points: CritiquePoint[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    if (points.length >= 2) break;
    if (!isRecord(item) || typeof item.point !== "string" || !item.point.trim()) continue;
    const refs = Array.isArray(item.refs) ? item.refs.filter((id): id is string => typeof id === "string" && knownIds.has(id)) : [];
    const quote = typeof item.quote === "string" && quoteFound(submittedText, item.quote) ? item.quote : undefined;
    points.push({ point: item.point.slice(0, 400), refs, ...(quote ? { quote } : {}) });
  }
  return points;
}

/** One entry per ISO 25010 characteristic, in the order the standard lists them. */
export function readIsoCritique(raw: unknown, knownIds: Set<string>, submittedText: string): IsoCharacteristic[] {
  const judged = new Map<string, Record<string, unknown>>();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (isRecord(item) && typeof item.id === "string" && !judged.has(item.id)) judged.set(item.id, item);
  }
  return QUALITIES.map((id) => {
    const entry = judged.get(id);
    const points = Object.fromEntries(POINT_KINDS.map((kind) => [kind, readPoints(entry?.[kind], knownIds, submittedText)])) as Record<
      (typeof POINT_KINDS)[number],
      CritiquePoint[]
    >;
    return {
      id,
      verdict: entry ? isoVerdict(entry.verdict) : "not_addressed",
      summary: typeof entry?.summary === "string" && entry.summary.trim() ? entry.summary.slice(0, 300) : "Not judged in this review.",
      ...points,
    };
  });
}
