// How you worked (WP8): rule-based tags on the engineer's messages, and the bucket for why the
// interview was stopped. Teaching only: shown in the Activity tab, never mixed into Ask. Every word
// list is in questionTags.config.ts.
import type { ChatMessage } from "../shared/lib/types";
import { containsPhrase, containsTerm, normalise, sharedContentWords } from "./matching";
import {
  CLOSED_STARTS,
  GREETINGS,
  JARGON_WORDS,
  LEADING_PHRASES,
  OPEN_STARTS,
  SOLUTION_PHRASES,
  STOP_BUCKETS,
  SUMMARISE_PHRASES,
} from "./questionTags.config";

export type QuestionTag =
  | "open"
  | "closed"
  | "multi_question"
  | "leading"
  | "solution_asking"
  | "jargon"
  | "follow_up"
  | "summarise_back";

export const QUESTION_TAGS: readonly QuestionTag[] = [
  "open",
  "closed",
  "multi_question",
  "leading",
  "solution_asking",
  "jargon",
  "follow_up",
  "summarise_back",
];

export type StopBucket = "time" | "covered" | "enough_to_start" | "client_ran_out" | "other";

/** The message without a leading greeting or name ("Hi Mei! What…" → "what…"). */
export function withoutGreeting(text: string) {
  let rest = normalise(text).trim();
  for (let guard = 0; guard < 3; guard += 1) {
    const greeting = GREETINGS.find((word) => new RegExp(`^${word}(?![a-z])`).test(rest));
    if (!greeting) break;
    // Drop the greeting, then a name or short aside up to the first ! , . or - (at most 3 words).
    rest = rest.slice(greeting.length).replace(/^\s*(?:[a-z']+\s*){0,3}?[!,.:;-]+\s*/, "").trimStart();
  }
  return rest;
}

const startsWithAny = (text: string, starts: string[]) => starts.some((start) => new RegExp(`^${start}(?![a-z])`).test(text));

/** The tags one engineer message gets; `previousReply` is the client message just before it. */
export function tagMessage(text: string, previousReply?: string): QuestionTag[] {
  const body = withoutGreeting(text);
  const tags: QuestionTag[] = [];
  if (startsWithAny(body, OPEN_STARTS)) tags.push("open");
  else if (startsWithAny(body, CLOSED_STARTS)) tags.push("closed");
  if ((text.match(/\?/g) ?? []).length >= 2) tags.push("multi_question");
  if (LEADING_PHRASES.some((phrase) => containsPhrase(text, phrase))) tags.push("leading");
  if (SOLUTION_PHRASES.some((phrase) => containsPhrase(text, phrase))) tags.push("solution_asking");
  if (JARGON_WORDS.some((word) => containsTerm(text, word))) tags.push("jargon");
  if (previousReply && sharedContentWords(text, previousReply) >= 2) tags.push("follow_up");
  if (SUMMARISE_PHRASES.some((phrase) => containsPhrase(text, phrase))) tags.push("summarise_back");
  return tags;
}

/** Tags for every engineer message, plus how often each tag occurs. */
export function tagMessages(messages: ChatMessage[]) {
  const tags: { messageIndex: number; tags: QuestionTag[] }[] = [];
  messages.forEach((message, index) => {
    if (message.role !== "user") return;
    const previous = messages
      .slice(0, index)
      .reverse()
      .find((earlier) => earlier.role === "assistant");
    tags.push({ messageIndex: index, tags: tagMessage(message.content, previous?.content) });
  });
  const counts = Object.fromEntries(QUESTION_TAGS.map((tag) => [tag, 0])) as Record<QuestionTag, number>;
  for (const entry of tags) for (const tag of entry.tags) counts[tag] += 1;
  return { tags, counts };
}

/** The End-interview reason, bucketed by keywords. */
export function stopBucket(reason: string | undefined | null): StopBucket {
  if (!reason?.trim()) return "other";
  for (const [bucket, words] of STOP_BUCKETS) {
    if (words.some((word) => containsPhrase(reason, word))) return bucket;
  }
  return "other";
}
