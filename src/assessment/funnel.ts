// Ask and Keep by code (WP7): each fact ends in exactly one state, scored once, where it started.
//   given → client_failed → found (from the client's checked fact ids) or missed / assumed_silently
//   → dropped → unused → not_drawn → carried_through.
// AI is used only for two narrow, borderline questions, returned as `pending`; the caller asks them,
// verifies each quote, and runs the funnel again with the verdicts.
import type { CaseDefinition, CaseFact } from "../cases";
import type { ConsistencyResult } from "../designDoc/consistency";
import { usableSketches } from "../designDoc/consistency";
import type { ParsedDesignDoc } from "../designDoc/parse";
import type { ChatMessage } from "../shared/lib/types";
import type { ClientFailure } from "./fairness";
import { askedInArea, containsPhrase, containsTerm, disclosedIn } from "./matching";

export type Method = "code" | "ai_verified_quote" | "ai_judgment";
export type FactState =
  | "given"
  | "client_failed"
  | "missed"
  | "assumed_silently"
  | "dropped"
  | "unused"
  | "not_drawn"
  | "carried_through";

/** States that mean the engineer found the fact in the interview. */
export const FOUND_STATES: readonly FactState[] = ["dropped", "unused", "not_drawn", "carried_through"];

export type AskFact = { factId: string; state: FactState; messageIndex?: number; method: Method; evidence?: string };
export type FactTrace = { factId: string; requirementIds: string[]; decisionIds: string[]; drawn: boolean; state: FactState };

export type AskResult = {
  facts: AskFact[];
  onProbe: { found: number; eligible: number };
  onAsk: { found: number; eligible: number };
  timeToFirstProbeSec?: number;
};

export type KeepResult = {
  traces: FactTrace[];
  givenCarried: { carried: number; total: number };
  uncitedRequirements: string[];
  unsupportedDecisions: string[];
  unjustifiedNodes: string[];
  unexplainedEdges: { from: string; to: string }[];
};

/** "Does the doc assert this fact?" for a single-keyword hit, answered with a quote from the doc. */
export type AssertionQuestion = { factId: string; itemId: string; itemText: string; keyword: string };
/** "Does this requirement state the fact?" when it cites the disclosing message but has no keyword. */
export type MatchQuestion = {
  factId: string;
  requirementId: string;
  factQuote: string;
  citationQuote: string;
  requirementText: string;
};

export type FunnelVerdicts = {
  /** factId → the verified doc quote that asserts it, or null when the AI found none. */
  assertions?: Record<string, string | null>;
  /** `${factId}|${requirementId}` → true when the AI (with a verified quote) says the requirement states the fact. */
  matches?: Record<string, boolean>;
};

export const matchKey = (factId: string, requirementId: string) => `${factId}|${requirementId}`;

/** The words an engineer wrote, with citation quotes reduced to their labels. */
export const ownWords = (markdown: string) =>
  markdown.replace(/\[([^\]]+)\]\((?:[^()"]|"(?:[^"\\]|\\.)*")*\)/g, "$1").replace(/\*\*|__|`/g, "");

const phraseHit = (fact: CaseFact, text: string) => fact.signaturePhrases.some((phrase) => containsPhrase(text, phrase));
const keywordHits = (fact: CaseFact, text: string) =>
  [...new Set(fact.keywords.filter((keyword) => containsTerm(text, keyword)))];

/** First message index where the client gave each fact, and every message that gave it. */
function disclosures(facts: readonly CaseFact[], messages: ChatMessage[]) {
  const first = new Map<string, number>();
  const all = new Map<string, number[]>();
  messages.forEach((message, index) => {
    for (const id of disclosedIn(facts, message)) {
      if (!first.has(id)) first.set(id, index);
      all.set(id, [...(all.get(id) ?? []), index]);
    }
  });
  return { first, all };
}

/** Decisions whose sketch reaches the final diagram: a usable sketch that passes C1 and C2. */
function drawnDecisions(doc: ParsedDesignDoc, consistency: ConsistencyResult) {
  if (doc.final.parseError || doc.final.nodes.length === 0) return new Set<string>();
  const inconsistent = new Set(consistency.inconsistentDecisions);
  return new Set(usableSketches(doc.decisions).map((d) => d.id).filter((id) => !inconsistent.has(id)));
}

export function computeFunnel({
  caseDefinition,
  messages,
  doc,
  consistency,
  clientFailed,
  verdicts = {},
}: {
  caseDefinition: CaseDefinition;
  messages: ChatMessage[];
  doc: ParsedDesignDoc;
  consistency: ConsistencyResult;
  clientFailed: ClientFailure[];
  verdicts?: FunnelVerdicts;
}): { ask: AskResult; keep: KeepResult; pending: { assertions: AssertionQuestion[]; matches: MatchQuestion[] } } {
  const { facts } = caseDefinition;
  const failed = new Map(clientFailed.map((failure) => [failure.factId, failure]));
  const { first, all } = disclosures(facts, messages);
  const drawn = drawnDecisions(doc, consistency);
  const requirements = doc.requirements.filter((requirement) => requirement.text.trim());
  const pending = { assertions: [] as AssertionQuestion[], matches: [] as MatchQuestion[] };

  const askFacts: AskFact[] = [];
  const traces: FactTrace[] = [];

  for (const fact of facts) {
    // 1–2. Given facts and client failures.
    if (fact.disclosure === "given") {
      askFacts.push({ factId: fact.id, state: "given", method: "code" });
      continue;
    }
    const failure = failed.get(fact.id);
    if (failure) {
      askFacts.push({ factId: fact.id, state: "client_failed", messageIndex: failure.messageIndex, method: "code", evidence: failure.quote });
      continue;
    }

    // 3. Not found: asserted in an R# or D# without having been asked about, or missed.
    const foundAt = first.get(fact.id);
    if (foundAt === undefined) {
      const stated = [
        ...requirements.map((item) => ({ id: item.id, text: ownWords(item.text) })),
        ...doc.decisions.map((item) => ({ id: item.id, text: ownWords(item.text) })),
      ];
      const strong = stated.find((item) => phraseHit(fact, item.text) || keywordHits(fact, item.text).length >= 2);
      if (strong) {
        askFacts.push({ factId: fact.id, state: "assumed_silently", method: "code", evidence: `${strong.id}: ${strong.text.trim()}` });
        continue;
      }
      const borderline = stated.find((item) => keywordHits(fact, item.text).length === 1);
      const verdict = verdicts.assertions?.[fact.id];
      if (borderline && verdict) {
        askFacts.push({ factId: fact.id, state: "assumed_silently", method: "ai_verified_quote", evidence: verdict });
        continue;
      }
      if (borderline && verdict === undefined) {
        pending.assertions.push({
          factId: fact.id,
          itemId: borderline.id,
          itemText: borderline.text.trim(),
          keyword: keywordHits(fact, borderline.text)[0],
        });
      }
      // An AI answer without a verified quote leaves the fact missed (when unsure, under-report).
      askFacts.push({ factId: fact.id, state: "missed", method: "code" });
      continue;
    }

    // 5. Found → requirement: an R# cites a message that disclosed the fact, in words about the fact.
    const disclosingMessages = new Set(all.get(fact.id) ?? []);
    let method: Method = "code";
    const requirementIds: string[] = [];
    for (const requirement of requirements) {
      const cites = requirement.citations.filter(
        (citation) => citation.valid && citation.source === "chat" && citation.messageIndex !== undefined && disclosingMessages.has(citation.messageIndex),
      );
      if (cites.length === 0) continue;
      const words = ownWords(requirement.text);
      if (phraseHit(fact, words) || keywordHits(fact, words).length > 0) {
        requirementIds.push(requirement.id);
        continue;
      }
      const verdict = verdicts.matches?.[matchKey(fact.id, requirement.id)];
      if (verdict === undefined) {
        pending.matches.push({
          factId: fact.id,
          requirementId: requirement.id,
          factQuote: messages[cites[0].messageIndex!].content,
          citationQuote: cites[0].excerpt,
          requirementText: words.trim(),
        });
      } else if (verdict) {
        requirementIds.push(requirement.id);
        method = "ai_verified_quote";
      }
    }

    // 6–7. Requirement → decision → diagram.
    const decisions = doc.decisions.filter((decision) => decision.because.some((id) => requirementIds.includes(id)));
    const isDrawn = decisions.some((decision) => drawn.has(decision.id));
    const state: FactState =
      requirementIds.length === 0 ? "dropped" : decisions.length === 0 ? "unused" : isDrawn ? "carried_through" : "not_drawn";
    askFacts.push({ factId: fact.id, state, messageIndex: foundAt, method, evidence: messages[foundAt]?.content });
    traces.push({
      factId: fact.id,
      requirementIds,
      decisionIds: decisions.map((decision) => decision.id),
      drawn: isDrawn,
      state,
    });
  }

  // The primary measure: on-probe facts found ÷ on-probe facts the client didn't fail on.
  const rate = (disclosure: CaseFact["disclosure"]) => {
    const relevant = facts.filter((fact) => fact.disclosure === disclosure);
    const states = new Map(askFacts.map((fact) => [fact.factId, fact.state]));
    const eligible = relevant.filter((fact) => states.get(fact.id) !== "client_failed");
    return { found: eligible.filter((fact) => FOUND_STATES.includes(states.get(fact.id)!)).length, eligible: eligible.length };
  };

  // Given facts carried: of the facts in the brief or opening, how many reach an R#? (discriminant check)
  const given = facts.filter((fact) => fact.disclosure === "given");
  const carried = given.filter((fact) =>
    requirements.some((requirement) => {
      const words = ownWords(requirement.text);
      return requirement.citations.some((citation) => citation.valid) && (phraseHit(fact, words) || keywordHits(fact, words).length >= 2);
    }),
  );

  const requirementIdSet = new Set(doc.requirements.map((requirement) => requirement.id));
  return {
    ask: {
      facts: askFacts,
      onProbe: rate("on-probe"),
      onAsk: rate("on-ask"),
      ...timeToFirstProbe(facts, messages),
    },
    keep: {
      traces,
      givenCarried: { carried: carried.length, total: given.length },
      uncitedRequirements: requirements.filter((r) => !r.citations.some((c) => c.valid)).map((r) => r.id),
      unsupportedDecisions: doc.decisions
        .filter((decision) => decision.because.length === 0 || decision.because.some((id) => !requirementIdSet.has(id)))
        .map((decision) => decision.id),
      unjustifiedNodes: [...consistency.unjustifiedNodes],
      unexplainedEdges: [...consistency.unexplainedEdges],
    },
    pending,
  };
}

/** Seconds from the first message to the first engineer message that probes for an on-probe fact. */
function timeToFirstProbe(facts: readonly CaseFact[], messages: ChatMessage[]): { timeToFirstProbeSec?: number } {
  const start = messages[0]?.ts;
  if (start === undefined) return {};
  const disclosed = new Set(facts.filter((fact) => fact.disclosure === "given").map((fact) => fact.id));
  for (const message of messages) {
    if (message.role === "assistant") {
      for (const id of disclosedIn(facts, message)) disclosed.add(id);
      continue;
    }
    const probes = facts.some((fact) => fact.disclosure === "on-probe" && askedInArea(fact, message.content, disclosed, facts));
    if (probes && message.ts !== undefined) return { timeToFirstProbeSec: Math.round((message.ts - start) / 1000) };
  }
  return {};
}
