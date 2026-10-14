// Text matching shared by the code checks: whole-word terms, signature phrases, and the facts a
// client message states. Mirrors design_it_backend/app/guard.py, so both sides agree on "asked in
// area" and "stated".
import type { CaseFact } from "../cases";
import type { ChatMessage } from "../shared/lib/types";
import { STOPWORDS } from "./questionTags.config";

/** Lowercase, curly quotes made straight, and hyphens and dashes read as spaces ("walk-in" = "walk in"). */
export const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[-–—―]/g, " ")
    .replace(/[ \t]+/g, " ");

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when `term` appears in `text` as whole words; a plural ("smartphones") counts. */
export const containsTerm = (text: string, term: string) =>
  new RegExp(`(?<![a-z0-9])${escapeRegExp(normalise(term).trim())}(?:s|es)?(?![a-z0-9])`).test(normalise(text));

/** True when `phrase` appears anywhere in `text`. */
export const containsPhrase = (text: string, phrase: string) => normalise(text).includes(normalise(phrase));

/** The words that say what a text is about: lowercase, stopwords and very short words removed. */
export const contentWords = (text: string) =>
  new Set((normalise(text).match(/[a-z0-9']+/g) ?? []).filter((word) => word.length > 2 && !STOPWORDS.has(word)));

/** How many content words two texts share. */
export const sharedContentWords = (a: string, b: string) => {
  const right = contentWords(b);
  return [...contentWords(a)].filter((word) => right.has(word)).length;
};

/** Facts whose signature phrases appear in `text`, in case order. */
export const statedFacts = (facts: readonly CaseFact[], text: string) =>
  facts.filter((fact) => fact.signaturePhrases.some((phrase) => containsPhrase(text, phrase))).map((fact) => fact.id);

/**
 * The facts a client message gives. Structured replies carry the server's checked ids; older or seeded
 * replies without them fall back to a signature-phrase scan.
 */
export const disclosedIn = (facts: readonly CaseFact[], message: ChatMessage) =>
  message.role !== "assistant" ? [] : (message.disclosedFactIds ?? statedFacts(facts, message.content));

/** Content words of a fact's example questions that no other fact's example questions use. */
export function distinctiveExampleWords(fact: CaseFact, facts: readonly CaseFact[]) {
  const others = new Set(
    facts.filter((other) => other.id !== fact.id).flatMap((other) => other.exampleQuestions.flatMap((q) => [...contentWords(q)])),
  );
  return new Set(fact.exampleQuestions.flatMap((question) => [...contentWords(question)]).filter((word) => !others.has(word)));
}

/**
 * Did this engineer message ask in the fact's area? On-ask: a keyword or cue, or two content words
 * distinctive to its example questions. On-probe: the parent fact is already out and a probe cue is used.
 */
export function askedInArea(
  fact: CaseFact,
  text: string,
  disclosedEarlier: ReadonlySet<string>,
  facts: readonly CaseFact[] = [fact],
) {
  if (fact.disclosure === "given") return false;
  if (fact.disclosure === "on-probe") {
    const parentOut = !fact.parentFactId || disclosedEarlier.has(fact.parentFactId);
    return parentOut && (fact.probeCues ?? []).some((cue) => containsTerm(text, cue));
  }
  if ([...fact.keywords, ...fact.cues].some((term) => containsTerm(text, term))) return true;
  const distinctive = distinctiveExampleWords(fact, facts);
  return [...contentWords(text)].filter((word) => distinctive.has(word)).length >= 2;
}
