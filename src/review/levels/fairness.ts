// Gate: did the client play fair? (WP3). Code only. Client failures exclude a fact from the engineer's
// scores; invented specifics are flagged for a human to audit and change no score.
import type { CaseDefinition, CaseFact } from "@/cases";
import type { ChatMessage, InterviewEnd } from "@/lib/types";
import { askedInArea, disclosedIn, normalise } from "./matching";
import { sessionCompletion } from "@/review/session/session";

export type ClientFailure = { factId: string; messageIndex: number; quote: string };
export type InventedSpecific = { messageIndex: number; text: string };

const isFailedReply = (message: ChatMessage | undefined) =>
  !message || message.role !== "assistant" || sessionCompletion([message]).failedReplies.length > 0;

/** Every fact the client gave in the session, with the first message that gave it. */
export function firstDisclosures(facts: readonly CaseFact[], messages: ChatMessage[]) {
  const first = new Map<string, number>();
  messages.forEach((message, index) => {
    for (const id of disclosedIn(facts, message)) if (!first.has(id)) first.set(id, index);
  });
  return first;
}

/**
 * A client failure: the engineer asked in a fact's area, the next client reply didn't give it, and the
 * fact never came out later either. Records the latest such question, the strongest evidence.
 */
export function clientFailures(facts: readonly CaseFact[], messages: ChatMessage[]): ClientFailure[] {
  const everDisclosed = firstDisclosures(facts, messages);
  const disclosedSoFar = new Set(facts.filter((fact) => fact.disclosure === "given").map((fact) => fact.id));
  const failures = new Map<string, ClientFailure>();
  messages.forEach((message, index) => {
    if (message.role === "assistant") {
      for (const id of disclosedIn(facts, message)) disclosedSoFar.add(id);
      return;
    }
    const reply = messages[index + 1];
    if (isFailedReply(reply)) return; // a crashed reply is a session problem, not a client failure
    const replyGave = new Set(disclosedIn(facts, reply));
    for (const fact of facts) {
      if (everDisclosed.has(fact.id) || replyGave.has(fact.id)) continue;
      if (askedInArea(fact, message.content, disclosedSoFar, facts)) {
        failures.set(fact.id, { factId: fact.id, messageIndex: index, quote: message.content });
      }
    }
  });
  return facts.flatMap((fact) => failures.get(fact.id) ?? []);
}

const NUMBER_WORDS: Record<string, string> = {
  two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30", forty: "40", fifty: "50",
  hundred: "100", thousand: "1000",
};
const ORDINAL_WORDS = ["third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

/** Text made comparable for specifics: lowercase, number words as digits, thousands separators removed. */
const comparable = (text: string) =>
  normalise(text)
    .replace(/\b[a-z]+\b/g, (word) => NUMBER_WORDS[word] ?? word)
    .replace(/(\d),(\d{3})\b/g, "$1$2");

const SPECIFIC_PATTERNS = [
  /[$£€]\s?\d[\d,]*(?:\.\d+)?/g, // prices
  /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi, // times
  /\b\d{1,2}:\d{2}\b/g, // times
  /\b\d[\d,]*(?:\.\d+)?%?/g, // numbers
  new RegExp(`\\b(?:${Object.keys(NUMBER_WORDS).join("|")})\\b`, "gi"), // numbers in words
  new RegExp(`\\b(?:${ORDINAL_WORDS.join("|")})\\b`, "gi"),
];

/** Capitalised words that don't start a sentence, e.g. names of places, people or products. */
function capitalisedNames(text: string) {
  const names: string[] = [];
  const pattern = /(^|[.!?]\s+|\n)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g;
  for (const match of text.matchAll(pattern)) {
    const sentenceStart = match[1] !== undefined || match.index === 0;
    const words = match[2].split(/\s+/);
    // At a sentence start, only the words after the first can be a name.
    const name = (sentenceStart ? words.slice(1) : words).join(" ");
    if (name && name !== "I") names.push(name);
  }
  return names;
}

/** A number, time, price or name in a client reply that appears nowhere in the case's facts, brief or opening. */
export function inventedSpecifics(caseDefinition: CaseDefinition, messages: ChatMessage[]): InventedSpecific[] {
  const corpus = comparable(
    [caseDefinition.briefMarkdown, caseDefinition.openingMessage, ...caseDefinition.facts.map((fact) => fact.detail)].join(
      "\n",
    ),
  );
  const known = (specific: string) => {
    const target = comparable(specific).trim();
    return new RegExp(`(?<![a-z0-9])${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`).test(corpus);
  };
  const found: InventedSpecific[] = [];
  messages.forEach((message, index) => {
    if (index === 0 || message.role !== "assistant" || isFailedReply(message)) return;
    const seen = new Set<string>();
    const candidates = [
      ...SPECIFIC_PATTERNS.flatMap((pattern) => message.content.match(pattern) ?? []),
      ...capitalisedNames(message.content),
    ];
    for (const raw of candidates) {
      const text = raw.trim();
      const key = comparable(text);
      if (seen.has(key) || known(text)) continue;
      // A number inside an already-flagged price or time isn't flagged twice.
      if ([...seen].some((other) => other.includes(key))) continue;
      seen.add(key);
      found.push({ messageIndex: index, text });
    }
  });
  return found;
}

/** Session complete: no failed replies, and the interview ended by the button or the time cap. */
export function sessionComplete(messages: ChatMessage[], interviewEnd: InterviewEnd | null | undefined) {
  return sessionCompletion(messages).completed && Boolean(interviewEnd);
}

export function checkFairness(
  caseDefinition: CaseDefinition,
  messages: ChatMessage[],
  interviewEnd?: InterviewEnd | null,
) {
  return {
    clientFailed: clientFailures(caseDefinition.facts, messages),
    inventedSpecifics: inventedSpecifics(caseDefinition, messages),
    sessionComplete: sessionComplete(messages, interviewEnd),
  };
}
