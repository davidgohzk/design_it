// Level 2 — links (§6). Deterministic, except the fact → requirement match when a citation
// points at the right message but quotes a different part of it (resolved by one AI call).
import type { CaseFact } from "../cases";
import type { ConsistencyResult } from "../designDoc/consistency";
import { usableSketches } from "../designDoc/consistency";
import type { ParsedDesignDoc } from "../designDoc/parse";
import { normalizeEvidence } from "../review";
import type { AssessmentLinks, Evidence, FoundFact, FunnelState } from "./types";

export type AmbiguousMatch = {
  factId: string;
  requirementId: string;
  /** The verified client quote that surfaced the fact. */
  factQuote: string;
  /** The requirement's verified citation quote, from the same message. */
  citationQuote: string;
  requirementText: string;
};

export const matchKey = (factId: string, requirementId: string) => `${factId}|${requirementId}`;

const tokens = (text: string) => new Set(normalizeEvidence(text).match(/[a-z0-9']{3,}/g) ?? []);

/** Two quotes overlap when one contains the other, or they share at least half the smaller one's words. */
export function quotesOverlap(a: string, b: string) {
  const left = normalizeEvidence(a);
  const right = normalizeEvidence(b);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  const smaller = Math.min(leftTokens.size, rightTokens.size);
  if (smaller === 0) return false;
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared += 1;
  return shared / smaller >= 0.5;
}

const surfacedEvidence = (found: FoundFact[]) => {
  const evidence = new Map<string, Evidence>();
  for (const fact of found) {
    if (fact.state === "surfaced" && fact.messageIndex !== undefined && fact.quote) {
      evidence.set(fact.factId, { messageIndex: fact.messageIndex, quote: fact.quote });
    }
  }
  return evidence;
};

/**
 * Which requirements cite each surfaced fact. A requirement matches when a verified citation targets
 * the message that surfaced the fact and its quote overlaps the fact's quote. A citation of the same
 * message that doesn't overlap is ambiguous; its verdict comes from `factMatches`.
 */
export function matchFactsToRequirements(
  doc: ParsedDesignDoc,
  found: FoundFact[],
  factMatches: Record<string, boolean> = {},
) {
  const matched: Record<string, string[]> = {};
  const ambiguous: AmbiguousMatch[] = [];
  for (const [factId, evidence] of surfacedEvidence(found)) {
    const ids: string[] = [];
    for (const requirement of doc.requirements) {
      const sameMessage = requirement.citations.filter(
        (citation) => citation.valid && citation.source === "chat" && citation.messageIndex === evidence.messageIndex,
      );
      if (sameMessage.length === 0) continue;
      if (sameMessage.some((citation) => quotesOverlap(citation.excerpt, evidence.quote))) {
        ids.push(requirement.id);
        continue;
      }
      const verdict = factMatches[matchKey(factId, requirement.id)];
      if (verdict === undefined) {
        ambiguous.push({
          factId,
          requirementId: requirement.id,
          factQuote: evidence.quote,
          citationQuote: sameMessage[0].excerpt,
          requirementText: requirement.text,
        });
      } else if (verdict) {
        ids.push(requirement.id);
      }
    }
    matched[factId] = [...new Set(ids)];
  }
  return { matched, ambiguous };
}

/** Decisions that reach the final diagram: a usable sketch that passes C1 and C2. */
export function drawnDecisions(doc: ParsedDesignDoc, consistency: ConsistencyResult) {
  if (doc.final.parseError || doc.final.nodes.length === 0) return new Set<string>();
  const inconsistent = new Set(consistency.inconsistentDecisions);
  return new Set(
    usableSketches(doc.decisions)
      .map((decision) => decision.id)
      .filter((id) => !inconsistent.has(id)),
  );
}

export function computeLinks({
  doc,
  consistency,
  facts,
  found,
  factMatches = {},
}: {
  doc: ParsedDesignDoc;
  consistency: ConsistencyResult;
  facts: readonly CaseFact[];
  found: FoundFact[];
  factMatches?: Record<string, boolean>;
}): AssessmentLinks {
  const requirementIds = new Set(doc.requirements.map((requirement) => requirement.id));
  const drawn = drawnDecisions(doc, consistency);
  const { matched } = matchFactsToRequirements(doc, found, factMatches);
  const stateOf = new Map(found.map((fact) => [fact.factId, fact.state]));

  const funnel: Record<string, FunnelState> = {};
  for (const fact of facts) {
    const state = fact.disclosure === "given" ? "given" : (stateOf.get(fact.id) ?? "missed");
    if (state !== "surfaced") {
      funnel[fact.id] = state;
      continue;
    }
    const requirements = new Set(matched[fact.id] ?? []);
    const decisions = doc.decisions.filter((decision) =>
      decision.requirementIds.some((id) => requirements.has(id)),
    );
    funnel[fact.id] =
      requirements.size === 0
        ? "dropped"
        : decisions.length === 0
          ? "unused"
          : decisions.some((decision) => drawn.has(decision.id))
            ? "carried_through"
            : "not_drawn";
  }

  const withText = doc.requirements.filter((requirement) => requirement.text.trim());
  const referenced = new Set(doc.decisions.flatMap((decision) => decision.requirementIds));

  return {
    funnel,
    dropped: facts.filter((fact) => funnel[fact.id] === "dropped").map((fact) => fact.id),
    uncited: withText
      .filter((requirement) => requirement.citations.length > 0 && !requirement.citations.some((c) => c.valid))
      .map((requirement) => requirement.id),
    hiddenAssumptions: withText
      .filter((requirement) => requirement.citations.length === 0)
      .map((requirement) => requirement.id),
    unused: withText.filter((requirement) => !referenced.has(requirement.id)).map((requirement) => requirement.id),
    unsupported: doc.decisions
      .filter((decision) => !decision.requirementIds.some((id) => requirementIds.has(id)))
      .map((decision) => decision.id),
    notDrawn: doc.decisions.filter((decision) => !drawn.has(decision.id)).map((decision) => decision.id),
    unjustified: [...consistency.unjustifiedNodes],
    unexplainedEdges: [...consistency.unexplainedEdges],
  };
}
