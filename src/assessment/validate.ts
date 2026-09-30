// Validators for /api/assess sections. A malformed section throws and is retried; a quote that
// doesn't match its source by string is discarded (never retried, never shown).
import { isRecord, normalizeEvidence } from "../shared/lib/evidence";
import type { ChatMessage } from "../shared/lib/types";
import type { Evidence, ExpectedDecisionRating, Rating, SoundnessRating } from "./types";

class SectionError extends Error {}

/** Counts quotes that failed verification, so research mode can show how often the model misquotes. */
export type DiscardCounter = { count: number };

const quoteIn = (text: string, quote: string) => {
  const needle = normalizeEvidence(quote);
  return needle.length > 0 && normalizeEvidence(text).includes(needle);
};

const requireArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) throw new SectionError(`The AI response must include a ${field} array.`);
  return value;
};

const requireString = (value: unknown, field: string) => {
  if (typeof value !== "string" || !value.trim()) throw new SectionError(`The AI response is missing ${field}.`);
  return value.trim();
};

/** A {messageIndex, quote} claim, kept only if the quote is in a message with the given role. */
function messageEvidence(
  value: unknown,
  field: string,
  messages: ChatMessage[],
  role: ChatMessage["role"],
  discarded: DiscardCounter,
): Evidence | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new SectionError(`${field} must be an object or null.`);
  const { messageIndex } = value;
  if (!Number.isInteger(messageIndex)) throw new SectionError(`${field} has an invalid messageIndex.`);
  const quote = requireString(value.quote, `${field}.quote`);
  const message = messages[messageIndex as number];
  if (!message || message.role !== role || !quoteIn(message.content, quote)) {
    discarded.count += 1;
    return null;
  }
  return { messageIndex: messageIndex as number, quote };
}

export type FactEvidence = {
  factId: string;
  surfaced: Evidence | null;
  askedInArea: Evidence | null;
  docQuote: string | null;
};

export function validateFactEvidence(
  value: unknown,
  {
    factIds,
    checkSurfaced,
    messages,
    docMarkdown,
    discarded,
  }: {
    factIds: string[];
    checkSurfaced: Record<string, boolean>;
    messages: ChatMessage[];
    docMarkdown: string;
    discarded: DiscardCounter;
  },
): FactEvidence[] {
  const byId = new Map<string, FactEvidence>();
  for (const [index, item] of requireArray(value, "facts").entries()) {
    if (!isRecord(item)) throw new SectionError(`Fact item ${index + 1} is invalid.`);
    const factId = requireString(item.factId, `facts[${index}].factId`);
    if (!factIds.includes(factId)) throw new SectionError(`The AI returned unknown fact ${factId}.`);
    if (byId.has(factId)) throw new SectionError(`Fact ${factId} was returned more than once.`);
    const surfaced = messageEvidence(item.surfaced, `${factId}.surfaced`, messages, "assistant", discarded);
    const askedInArea = messageEvidence(item.askedInArea, `${factId}.askedInArea`, messages, "user", discarded);
    let docQuote: string | null = null;
    if (item.docAssertion !== null && item.docAssertion !== undefined) {
      if (!isRecord(item.docAssertion)) throw new SectionError(`${factId}.docAssertion must be an object or null.`);
      const quote = requireString(item.docAssertion.quote, `${factId}.docAssertion.quote`);
      if (quoteIn(docMarkdown, quote)) docQuote = quote;
      else discarded.count += 1;
    }
    byId.set(factId, {
      factId,
      // The cue prefilter wins: a fact with no cue in any client message can't be surfaced.
      surfaced: checkSurfaced[factId] ? surfaced : null,
      askedInArea,
      docQuote,
    });
  }
  return factIds.map((factId) => {
    const found = byId.get(factId);
    if (!found) throw new SectionError(`The AI omitted fact ${factId}.`);
    return found;
  });
}

export function validateInvented(value: unknown, messages: ChatMessage[], discarded: DiscardCounter): Evidence[] {
  return requireArray(value, "invented")
    .map((item, index) => messageEvidence(item, `invented[${index}]`, messages, "assistant", discarded))
    .filter((item): item is Evidence => item !== null);
}

export function validateMatches(value: unknown, pairIds: string[]): Record<string, boolean> {
  const verdicts: Record<string, boolean> = {};
  for (const [index, item] of requireArray(value, "matches").entries()) {
    if (!isRecord(item)) throw new SectionError(`Match ${index + 1} is invalid.`);
    const pairId = requireString(item.pairId, `matches[${index}].pairId`);
    if (!pairIds.includes(pairId)) throw new SectionError(`The AI returned unknown pair ${pairId}.`);
    if (typeof item.statesFact !== "boolean") throw new SectionError(`Match ${pairId} is missing statesFact.`);
    verdicts[pairId] = item.statesFact;
  }
  const missing = pairIds.find((pairId) => !(pairId in verdicts));
  if (missing) throw new SectionError(`The AI omitted pair ${missing}.`);
  return verdicts;
}

const SOUNDNESS = new Set<SoundnessRating>(["sound", "weak", "unsound"]);
const COVERAGE = new Set<ExpectedDecisionRating["rating"]>(["well", "weakly", "not_addressed"]);

export function validateRatings(value: unknown, ids: string[], field: string): Rating[] {
  const byId = new Map<string, Rating>();
  for (const [index, item] of requireArray(value, field).entries()) {
    if (!isRecord(item)) throw new SectionError(`${field}[${index}] is invalid.`);
    const id = requireString(item.id, `${field}[${index}].id`);
    if (!ids.includes(id)) throw new SectionError(`${field} rates unknown item ${id}.`);
    if (byId.has(id)) throw new SectionError(`${field} rates ${id} more than once.`);
    if (typeof item.rating !== "string" || !SOUNDNESS.has(item.rating as SoundnessRating)) {
      throw new SectionError(`${field} gives ${id} an invalid rating.`);
    }
    byId.set(id, { id, rating: item.rating as SoundnessRating, reason: requireString(item.reason, `${field}.${id}.reason`) });
  }
  return ids.map((id) => {
    const rating = byId.get(id);
    if (!rating) throw new SectionError(`${field} omitted ${id}.`);
    return rating;
  });
}

export function validateExpectedDecisions(
  value: unknown,
  expectedIds: string[],
  decisionIds: string[],
): ExpectedDecisionRating[] {
  const byId = new Map<string, ExpectedDecisionRating>();
  for (const [index, item] of requireArray(value, "expectedDecisions").entries()) {
    if (!isRecord(item)) throw new SectionError(`expectedDecisions[${index}] is invalid.`);
    const id = requireString(item.id, `expectedDecisions[${index}].id`);
    if (!expectedIds.includes(id)) throw new SectionError(`expectedDecisions has unknown item ${id}.`);
    // Models sometimes borrow "weak" from the soundness scale; it means "weakly" here.
    const raw = item.rating === "weak" ? "weakly" : item.rating;
    if (typeof raw !== "string" || !COVERAGE.has(raw as ExpectedDecisionRating["rating"])) {
      throw new SectionError(`expectedDecisions gives ${id} an invalid rating.`);
    }
    const rating = raw as ExpectedDecisionRating["rating"];
    if (!Array.isArray(item.decisionIds)) throw new SectionError(`expectedDecisions.${id} is missing decisionIds.`);
    // Only decisions that exist; an unknown id is dropped rather than shown.
    const addressedBy = rating === "not_addressed"
      ? []
      : [...new Set(item.decisionIds.filter((ref): ref is string => typeof ref === "string" && decisionIds.includes(ref)))];
    byId.set(id, { id, rating, decisionIds: addressedBy, reason: requireString(item.reason, `expectedDecisions.${id}.reason`) });
  }
  return expectedIds.map((id) => {
    const rating = byId.get(id);
    if (!rating) throw new SectionError(`expectedDecisions omitted ${id}.`);
    return rating;
  });
}
