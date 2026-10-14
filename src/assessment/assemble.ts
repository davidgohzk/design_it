// Puts a review together from the code checks and the judge's raw replies. Live reviews (run.ts) and
// the seeded examples both go through here, so a seeded review is verified exactly like a live one.
import type { CaseDefinition } from "../cases";
import { checkConsistency } from "../designDoc/consistency";
import { parseDesignDoc } from "../designDoc/parse";
import type { ParsedDesignDoc } from "../designDoc/parse";
import { isRecord } from "../shared/lib/evidence";
import type { ChatMessage, InterviewEnd } from "../shared/lib/types";
import { checkFairness } from "./fairness";
import type { ScenarioAnswer } from "./fit";
import { fitResults } from "./fit";
import type { AssertionQuestion, FunnelVerdicts, MatchQuestion } from "./funnel";
import { computeFunnel, matchKey } from "./funnel";
import { combineJustifyRuns, justifyInputs, readJustifyRun } from "./justify";
import { quoteFound } from "./quotes";
import { stopBucket, tagMessages } from "./questionTags";
import { sessionCompletion } from "./session";
import type { AssessmentResult, GateResult, SessionMode } from "./types";

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
    process: {
      tags: tagged.tags,
      counts: tagged.counts,
      ...(interviewEnd ? { stopReason: interviewEnd.reason, stopBucket: stopBucket(interviewEnd.reason) } : {}),
    },
    verification: { discardedQuotes: discarded.count },
  };
}
