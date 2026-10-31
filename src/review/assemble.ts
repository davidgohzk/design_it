// Puts a review together from the code checks and the judge's raw replies. Live reviews (run.ts) and
// the seeded examples both go through here, so a seeded review is verified exactly like a live one.
import type { CaseDefinition } from "@/cases";
import { checkConsistency } from "@/designDoc/consistency";
import { parseDesignDoc } from "@/designDoc/parse";
import type { ParsedDesignDoc } from "@/designDoc/parse";
import { isRecord } from "@/lib/evidence";
import type { ChatMessage, InterviewEnd } from "@/lib/types";
import { runBanoCheck } from "./bano";
import { computeElicitation, readTurnLabels } from "@/review/levels/elicitation";
import { rationaleEvidence, readIsoCritique, readRationale, readScenarioAdequacy } from "@/review/judge/summaryReview";
import { checkFairness } from "@/review/levels/fairness";
import type { ScenarioAnswer } from "@/review/levels/fit";
import { fitResults } from "@/review/levels/fit";
import type { AssertionQuestion, FunnelVerdicts, MatchQuestion } from "@/review/levels/funnel";
import { computeFunnel, matchKey } from "@/review/levels/funnel";
import { combineJustifyRuns, justifyInputs, readJustifyRun } from "@/review/levels/justify";
import { quoteFound } from "@/review/judge/quotes";
import { stopBucket, tagMessages } from "@/review/levels/questionTags";
import { sessionCompletion } from "@/review/session/session";
import { LEVELS } from "./types";
import type { AssessmentResult, GateResult, Level, SessionMode, Suggestion } from "./types";

export type ReviewInput = {
  caseDefinition: CaseDefinition;
  messages: ChatMessage[];
  docMarkdown: string;
  finalCode: string;
  mode: SessionMode;
  interviewEnd?: InterviewEnd | null;
  answers: ScenarioAnswer[];
};

/** The judge's raw replies, before any checking. */
export type JudgeReplies = {
  /** The `assertion` task's `facts` section, if it was asked. */
  assertions?: unknown;
  /** The `match` task's `matches` section, if it was asked. */
  matches?: unknown;
  /** One `items` section per justify run. */
  justifyRuns: unknown[];
  /** The `fit` task's `scenarios` section, if it was asked. */
  fit?: unknown;
  /** The `suggest` task's `suggestions` section, if it was asked. */
  suggestions?: unknown;
  /** One `items` section per run of the interview-mistake check. */
  banoRuns?: unknown[];
  /** The version of the judge prompt that answered the interview-mistake check. */
  banoPromptVersion?: string;
  turnLabels?: unknown;
  /** Why the turns judge could not label some turns, so the review can say so. */
  turnLabelErrors?: string[];
  turnPromptVersion?: string;
  scenarioAdequacy?: unknown;
  rationale?: unknown;
  iso?: unknown;
  judgeVersions?: AssessmentResult["judgeVersions"];
  models: string[];
};

export const parseReviewDoc = (input: ReviewInput) =>
  parseDesignDoc(input.docMarkdown, input.finalCode, input.caseDefinition.briefMarkdown, input.messages);

/** Leaks and phantoms the server's guard logged on each client reply. */
function guardLog(messages: ChatMessage[]): Pick<GateResult, "leaks" | "phantoms"> {
  const leaks: GateResult["leaks"] = [];
  const phantoms: GateResult["phantoms"] = [];
  messages.forEach((message, index) => {
    for (const factId of message.guard?.leaks ?? []) leaks.push({ messageIndex: index, factId });
    for (const factId of message.guard?.phantoms ?? []) phantoms.push({ messageIndex: index, factId });
  });
  return { leaks, phantoms };
}

/** Checks the borderline assertion answers: a quote counts only if it is in the item's own words. */
export function readAssertions(value: unknown, questions: AssertionQuestion[], discarded: { count: number }) {
  const verdicts: Record<string, string | null> = Object.fromEntries(questions.map((question) => [question.factId, null]));
  for (const raw of Array.isArray(value) ? value : []) {
    if (!isRecord(raw) || typeof raw.factId !== "string") continue;
    const question = questions.find((item) => item.factId === raw.factId);
    const quote = isRecord(raw.docAssertion) && typeof raw.docAssertion.quote === "string" ? raw.docAssertion.quote : null;
    if (!question || !quote) continue;
    if (quoteFound(question.itemText, quote)) verdicts[question.factId] = quote;
    else discarded.count += 1;
  }
  return verdicts;
}

/** Checks the match answers: a match counts only with a quote found in the requirement's own words. */
export function readMatches(value: unknown, questions: MatchQuestion[], discarded: { count: number }) {
  const verdicts: Record<string, boolean> = Object.fromEntries(questions.map((q) => [matchKey(q.factId, q.requirementId), false]));
  for (const raw of Array.isArray(value) ? value : []) {
    if (!isRecord(raw) || typeof raw.pairId !== "string" || raw.statesFact !== true) continue;
    const question = questions[Number(raw.pairId.replace(/^p/, "")) - 1];
    if (!question) continue;
    if (typeof raw.quote === "string" && quoteFound(question.requirementText, raw.quote)) {
      verdicts[matchKey(question.factId, question.requirementId)] = true;
    } else {
      discarded.count += 1;
    }
  }
  return verdicts;
}

/** Every id a suggestion is allowed to name: the facts, the doc's items, the boxes and the scenarios. */
export function referenceableIds(caseDefinition: CaseDefinition, doc: ParsedDesignDoc): Set<string> {
  return new Set([
    ...caseDefinition.facts.map((fact) => fact.id),
    ...caseDefinition.scenarios.map((scenario) => scenario.id),
    ...doc.requirements.map((item) => item.id),
    ...doc.decisions.map((item) => item.id),
    ...doc.final.nodes.map((node) => node.id),
    ...doc.decisions.flatMap((decision) => decision.sketch?.nodes.map((node) => node.id) ?? []),
  ]);
}

/** What a suggestion is checked against: the ids it may name, the facts' plain labels, and the work. */
export type SuggestionSources = { known: Set<string>; labels: Map<string, string>; text: string };

/** Each `'...'` or `"..."` span of more than three words. Shorter ones are turns of phrase, not quotes. */
const quotedSpans = (text: string) =>
  [...text.matchAll(/["“']([^"”']{12,})["”']/g)].map((match) => match[1]).filter((span) => span.trim().split(/\s+/).length > 3);

/**
 * Checks the per-stage advice: one per level at most, at most 40 words, and every id it names must be
 * in the engineer's own work. A suggestion that names anything else is dropped whole — the same
 * "when unsure, under-report" rule the quotes follow. So is one that quotes words nobody wrote.
 *
 * A fact id is the engineer's to read, not to decode, so one left in the prose is swapped for the
 * fact's own label. That is a lookup in the case, not a rewrite of what the AI judged.
 */
export function readSuggestions(value: unknown, sources: SuggestionSources, discarded: { count: number }): Suggestion[] {
  const { known, labels, text: work } = sources;
  const kept = new Map<Level, Suggestion>();
  for (const raw of Array.isArray(value) ? value : []) {
    if (!isRecord(raw) || typeof raw.text !== "string") continue;
    const level = raw.stage ?? raw.level;
    if (typeof level !== "string" || !(LEVELS as readonly string[]).includes(level) || kept.has(level as Level)) continue;
    const refs = (Array.isArray(raw.refs) ? raw.refs : []).filter((ref): ref is string => typeof ref === "string");
    if (refs.some((ref) => !known.has(ref))) {
      discarded.count += 1;
      continue;
    }
    let text = raw.text.trim().split(/\s+/).slice(0, 40).join(" ");
    for (const [factId, label] of labels) {
      // A fact id has a dot in it, so it is escaped before it becomes a pattern.
      const pattern = factId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (text.includes(factId)) text = text.replace(new RegExp(`["'‘“]?${pattern}["'’”]?`, "g"), label.toLowerCase());
    }
    // Advice may quote the work, but only words that are really in it.
    if (quotedSpans(text).some((span) => !quoteFound(work, span))) {
      discarded.count += 1;
      continue;
    }
    if (text) kept.set(level as Level, { level: level as Level, text, refs });
  }
  return LEVELS.flatMap((level) => kept.get(level) ?? []);
}

/** The funnel's questions for the AI, before any are answered. */
export function funnelQuestions(input: ReviewInput, doc: ParsedDesignDoc = parseReviewDoc(input)) {
  const fairness = checkFairness(input.caseDefinition, input.messages, input.interviewEnd);
  return computeFunnel({
    caseDefinition: input.caseDefinition,
    messages: input.messages,
    doc,
    consistency: checkConsistency(doc),
    clientFailed: fairness.clientFailed,
  }).pending;
}

export function assembleReview(input: ReviewInput, replies: JudgeReplies, reviewedAt = Date.now()): AssessmentResult {
  const { caseDefinition, messages, docMarkdown, mode, interviewEnd, answers } = input;
  const doc = parseReviewDoc(input);
  const consistency = checkConsistency(doc);
  const discarded = { count: 0 };

  // Gate (code).
  const fairness = checkFairness(caseDefinition, messages, interviewEnd);
  const gate: GateResult = {
    clientFailed: fairness.clientFailed,
    ...guardLog(messages),
    inventedSpecifics: fairness.inventedSpecifics,
    sessionComplete: fairness.sessionComplete,
    failedReplies: sessionCompletion(messages).failedReplies,
  };

  // Ask and Keep (code; AI only for the borderline questions, kept only with verified quotes).
  const pending = computeFunnel({ caseDefinition, messages, doc, consistency, clientFailed: fairness.clientFailed }).pending;
  const verdicts: FunnelVerdicts = {
    assertions: pending.assertions.length ? readAssertions(replies.assertions, pending.assertions, discarded) : {},
    matches: pending.matches.length ? readMatches(replies.matches, pending.matches, discarded) : {},
  };
  const { ask, keep } = computeFunnel({ caseDefinition, messages, doc, consistency, clientFailed: fairness.clientFailed, verdicts });

  // Justify (AI, every quote verified, unanimous runs only).
  const { send, skipped } = justifyInputs(doc);
  const sources = { doc: docMarkdown, brief: caseDefinition.briefMarkdown, messages };
  const runs = replies.justifyRuns.map((run) => {
    try {
      return readJustifyRun(run, send, sources, discarded);
    } catch {
      return new Map();
    }
  });
  const justify = { items: combineJustifyRuns(send, runs, skipped) };

  // Fit (code for the picks, AI with a verified quote for the one-liner).
  const fit = { scenarios: fitResults({ caseDefinition, answers, doc, docMarkdown, judged: replies.fit, discarded }) };

  // How you worked (rules only).
  const tagged = tagMessages(messages);

  return {
    caseId: caseDefinition.id,
    model: [...new Set(replies.models.filter(Boolean))].join(", "),
    reviewedAt,
    mode,
    gate,
    ask,
    keep,
    justify,
    fit,
    scenarioAdequacy: readScenarioAdequacy(replies.scenarioAdequacy, caseDefinition, answers, doc, docMarkdown),
    rationale: readRationale(replies.rationale, rationaleEvidence(doc)),
    isoCritique: readIsoCritique(replies.iso, referenceableIds(caseDefinition, doc), [docMarkdown, input.finalCode, ...messages.map((message) => message.content)].join("\n")),
    judgeVersions: replies.judgeVersions,
    process: {
      tags: tagged.tags,
      counts: tagged.counts,
      elicitation: {
        ...computeElicitation(caseDefinition, messages, readTurnLabels(replies.turnLabels, caseDefinition, messages), interviewEnd, replies.turnLabelErrors ?? []),
        ...(replies.turnPromptVersion ? { promptVersion: replies.turnPromptVersion } : {}),
      },
      ...(interviewEnd ? { stopReason: interviewEnd.reason, stopBucket: stopBucket(interviewEnd.reason) } : {}),
      // The interview-mistake checklist. It reads the tags above rather than re-tagging, and shares the
      // `discarded` counter, so an unverified Bano quote is counted like any other.
      bano: runBanoCheck(
        { caseDefinition, messages, interviewEnd, tags: tagged.tags },
        { replies: replies.banoRuns ?? [], ...(replies.banoPromptVersion ? { promptVersion: replies.banoPromptVersion } : {}), discarded },
      ),
    },
    suggestions: readSuggestions(
      replies.suggestions,
      {
        known: referenceableIds(caseDefinition, doc),
        labels: new Map(caseDefinition.facts.map((fact) => [fact.id, fact.label])),
        text: [docMarkdown, caseDefinition.briefMarkdown, ...messages.map((message) => message.content)].join(" "),
      },
      discarded,
    ),
    verification: { discardedQuotes: discarded.count },
  };
}
