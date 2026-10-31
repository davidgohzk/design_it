// The code rules of the interview-mistake check: pure functions over a prepared context, no React,
// no DOM, no clock.
//
// Two rules the whole file obeys:
// - When unsure, under-report. A rule that needs timestamps or the disclosure log and doesn't have
//   them returns `uncertain`, never `observed`. That guard runs once, in the driver.
// - Question tags are reused, never recomputed: they arrive with the input.
import type { CaseFact } from "@/cases";
import type { ChatMessage } from "@/lib/types";
import { askedInArea, containsPhrase, containsTerm, contentWordOverlap, disclosedIn, normalise } from "@/review/levels/matching";
import type { QuestionTag } from "@/review/levels/questionTags";
import { withoutGreeting } from "@/review/levels/questionTags";
import { BANO_CODE_IDS } from "./checklist";
import { BANO_CONFIG } from "./config";
import type { BanoConfig } from "./config";
import type { BanoEvidence, BanoInput } from "./types";

/** One engineer message, with everything the rules need about it worked out once. */
export type BanoQuestion = {
  /** Its position in the whole transcript, which is what the UI links to. */
  index: number;
  /** Its position among the engineer's messages, counting from 1. */
  ordinal: number;
  text: string;
  /** The message without a leading greeting, so "Hi Mei! What…" starts at "what". */
  body: string;
  tags: readonly QuestionTag[];
  ts?: number;
  /** The client message just before it, if any. */
  previousReplyIndex?: number;
  /** The client message that answered it, if any. */
  answerIndex?: number;
  words: number;
  questionMarks: number;
};

export type BanoContext = {
  readonly caseId: string;
  readonly facts: readonly CaseFact[];
  readonly messages: readonly ChatMessage[];
  readonly questions: readonly BanoQuestion[];
  /** Message index → the facts the client had already given before it. */
  readonly disclosedBefore: readonly ReadonlySet<string>[];
  readonly endedHow?: "button" | "time_cap";
  readonly clock: { start: number; end: number; spanMs: number } | null;
  readonly hasTimestamps: boolean;
  readonly hasDisclosureLog: boolean;
  readonly config: BanoConfig;
};

/** What a rule found. `null` means it looked and there was nothing to report. */
export type RuleOutcome =
  | { status: "observed"; note: string; evidence?: BanoEvidence[]; count?: number }
  | { status: "uncertain"; note: string }
  | { status: "info"; note: string; evidence?: BanoEvidence[]; count?: number }
  | null;

export type BanoRule = {
  /** Must be a `source: "code"` item in the checklist. */
  id: string;
  /** False means the evidence this rule needs is missing, so it reports `uncertain`. */
  needs?: (ctx: BanoContext) => boolean;
  /** Why it couldn't be decided, shown to the engineer. */
  needsNote?: string;
  run: (ctx: BanoContext) => RuleOutcome;
};

const ENGINEER = "user";
const CLIENT = "assistant";

/** A phrase of several words is matched whole; a single word is matched as a word, so "this" isn't "hi". */
const hit = (text: string, phrase: string) =>
  phrase.trim().includes(" ") ? containsPhrase(text, phrase) : containsTerm(text, phrase);

/** Every phrase from the list that appears in the text. */
const hits = (text: string, phrases: readonly string[]) => phrases.filter((phrase) => hit(text, phrase));

const anyHit = (text: string, phrases: readonly string[]) => phrases.some((phrase) => hit(text, phrase));

const countWords = (text: string) => (normalise(text).match(/[a-z0-9']+/g) ?? []).length;

const at = (index: number, quote?: string): BanoEvidence => (quote === undefined ? { messageIndex: index } : { messageIndex: index, quote });

/** The engineer messages that no rule can do without. */
const askedAnything = (ctx: BanoContext) => ctx.questions.length > 0;

/** Prepares everything the rules read. Pure: it never looks at the real clock. */
export function buildBanoContext(input: BanoInput): BanoContext {
  const config = { ...BANO_CONFIG, ...input.config };
  const { messages, caseDefinition } = input;
  const facts = caseDefinition.facts;
  const tagsByIndex = new Map(input.tags.map((entry) => [entry.messageIndex, entry.tags]));

  // The facts the client had already given, message by message.
  const disclosedBefore: ReadonlySet<string>[] = [];
  const running = new Set<string>();
  messages.forEach((message, index) => {
    disclosedBefore[index] = new Set(running);
    for (const factId of disclosedIn(facts, message)) running.add(factId);
  });

  const questions: BanoQuestion[] = [];
  messages.forEach((message, index) => {
    if (message.role !== ENGINEER) return;
    const previousReplyIndex = messages.findLastIndex((earlier, position) => position < index && earlier.role === CLIENT);
    const answerOffset = messages.slice(index + 1).findIndex((later) => later.role === CLIENT);
    questions.push({
      index,
      ordinal: questions.length + 1,
      text: message.content,
      body: withoutGreeting(message.content),
      tags: tagsByIndex.get(index) ?? [],
      ts: message.ts,
      ...(previousReplyIndex >= 0 ? { previousReplyIndex } : {}),
      ...(answerOffset >= 0 ? { answerIndex: index + 1 + answerOffset } : {}),
      words: countWords(message.content),
      questionMarks: (message.content.match(/\?/g) ?? []).length,
    });
  });

  const times = messages.map((message) => message.ts).filter((ts): ts is number => typeof ts === "number");
  const hasTimestamps = times.length > 0 && messages.every((message) => typeof message.ts === "number");
  const start = times.length ? Math.min(...times) : undefined;
  const end = input.interviewEnd?.at ?? (times.length ? Math.max(...times) : undefined);
  const spanMs = start !== undefined && end !== undefined ? end - start : 0;
  const clock = start !== undefined && end !== undefined && spanMs >= config.minClockSpanMs ? { start, end, spanMs } : null;

  return {
    caseId: caseDefinition.id,
    facts,
    messages,
    questions,
    disclosedBefore,
    ...(input.interviewEnd ? { endedHow: input.interviewEnd.how } : {}),
    clock,
    hasTimestamps,
    // Seeded and legacy replies carry no checked ids; `disclosedIn` then falls back to a phrase scan,
    // which is a guess, so the rules that depend on the log treat its absence as "can't tell".
    hasDisclosureLog: messages.some((message) => message.role === CLIENT && message.disclosedFactIds !== undefined),
    config,
  };
}

/** The engineer messages that are questions: the denominator for the rate rules. */
const asked = (ctx: BanoContext) => ctx.questions.filter((question) => question.questionMarks > 0);

/** One rule for each of the session-wide omissions: observed when nothing the engineer asked matches. */
const omission = (id: string, phrases: (config: BanoConfig) => readonly string[], note: string): BanoRule => ({
  id,
  run: (ctx) =>
    ctx.questions.some((question) => anyHit(question.text, phrases(ctx.config))) ? null : { status: "observed", note },
});

export const BANO_RULES: readonly BanoRule[] = [
  {
    id: "QF2",
    run: (ctx) => {
      const found = ctx.questions
        .map((question) => ({ question, words: hits(question.text, ctx.config.techWords) }))
        .filter((entry) => entry.words.length > 0 || entry.question.tags.includes("jargon"));
      if (found.length === 0) return null;
      return {
        status: "observed",
        note: `Technical words the client can't be expected to answer: ${[...new Set(found.flatMap((entry) => entry.words))].join(", ")}.`,
        count: found.length,
        evidence: found.map((entry) => at(entry.question.index, entry.words[0])),
      };
    },
  },
  {
    id: "QF4",
    run: (ctx) => {
      const found = ctx.questions.filter(
        (question) => question.tags.includes("solution_asking") || anyHit(question.text, ctx.config.solutionAskingPhrases),
      );
      if (found.length === 0) return null;
      return {
        status: "observed",
        note: "These questions ask the client to choose the solution.",
        count: found.length,
        evidence: found.map((question) => at(question.index)),
      };
    },
  },
  {
    id: "QF5",
    run: (ctx) => {
      // Three ways a message asks too much at once: it is long, it has several question marks, or it
      // stacks several question words into one sentence ("How many rooms, who books them, and when?").
      const reason = (question: BanoQuestion) => {
        if (question.questionMarks >= 2) return `${question.questionMarks} questions in one message`;
        if (question.questionMarks === 0) return null;
        if (question.words > ctx.config.longQuestionWords) return `${question.words} words`;
        const stems = hits(question.body, ctx.config.questionStems);
        return stems.length > ctx.config.maxQuestionStems ? `asks ${stems.length} things at once` : null;
      };
      const found = ctx.questions
        .map((question) => ({ question, reason: reason(question) }))
        .filter((entry): entry is { question: BanoQuestion; reason: string } => entry.reason !== null);
      if (found.length === 0) return null;
      return {
        status: "observed",
        note: found.map((entry) => `#${entry.question.index}: ${entry.reason}`).join("; "),
        count: found.length,
        evidence: found.map((entry) => at(entry.question.index)),
      };
    },
  },

  omission("QO1", (config) => config.stakeholderPhrases, "No message asked about other people involved."),
  {
    id: "QO2",
    needs: (ctx) => asked(ctx).length >= ctx.config.followUpMinQuestions,
    needsNote: "Too few questions to work out a follow-up rate.",
    run: (ctx) => {
      const questions = asked(ctx);
      const followUps = questions.filter((question) => question.tags.includes("follow_up"));
      const rate = followUps.length / questions.length;
      if (rate >= ctx.config.followUpMinRate) return null;
      // The client replies that were left where they were.
      const unfollowed = ctx.messages
        .map((message, index) => ({ message, index }))
        .filter(({ message, index }) => {
          if (message.role !== CLIENT) return false;
          const next = ctx.questions.find((question) => question.index > index);
          return next !== undefined && !next.tags.includes("follow_up");
        });
      return {
        status: "observed",
        note: `Only ${followUps.length} of ${questions.length} questions followed up on an answer.`,
        count: followUps.length,
        evidence: unfollowed.map(({ index }) => at(index)),
      };
    },
  },
  omission("QO3", (config) => config.currentProcessPhrases, "No message asked how things work today."),
  omission("QO4", (config) => config.priorityPhrases, "No message asked what matters most."),
  omission("QO6", (config) => config.goalPhrases, "No message asked about goals or success."),

  {
    id: "IO1",
    run: (ctx) => {
      const last = ctx.questions.slice(-ctx.config.summaryWindow);
      if (last.some((question) => question.tags.includes("summarise_back"))) return null;
      return {
        status: "observed",
        note: "The interview ended without playing back what you heard.",
        evidence: last.map((question) => at(question.index)),
      };
    },
  },
  {
    id: "IO2",
    run: (ctx) => {
      const first = ctx.questions[0];
      if (!first) return null;
      const named = hits(first.text, ctx.config.artefactWords);
      const opensOnBuild =
        first.tags.includes("jargon") ||
        first.tags.includes("solution_asking") ||
        anyHit(first.text, ctx.config.techWords) ||
        anyHit(first.text, ctx.config.solutionAskingPhrases);
      const namesArtefact = named.length > 0 && !first.tags.includes("open");
      if (!opensOnBuild && !namesArtefact) return null;
      return {
        status: "observed",
        note: namesArtefact
          ? `The first message opened on the thing to build ("${named[0]}") rather than the problem.`
          : "The first message opened on the system rather than the problem.",
        evidence: [at(first.index)],
      };
    },
  },
  {
    id: "IO4",
    run: (ctx) => {
      const pairs: BanoEvidence[] = [];
      for (let i = 0; i < ctx.questions.length; i += 1) {
        for (let j = i + 1; j < ctx.questions.length; j += 1) {
          const [earlier, later] = [ctx.questions[i], ctx.questions[j]];
          if (earlier.answerIndex === undefined || later.index <= earlier.answerIndex) continue;
          if (contentWordOverlap(earlier.text, later.text) < ctx.config.repeatJaccard) continue;
          pairs.push(at(earlier.index), at(later.index));
        }
      }
      if (pairs.length === 0) return null;
      return {
        status: "observed",
        note: "A question was asked again after the client had answered it.",
        count: pairs.length / 2,
        evidence: pairs,
      };
    },
  },

  {
    id: "CS3",
    needs: (ctx) => ctx.hasDisclosureLog,
    needsNote: "This session has no record of what the client gave away, so this can't be checked.",
    run: (ctx) => {
      const evidence: BanoEvidence[] = [];
      const notes: string[] = [];
      for (const question of ctx.questions) {
        if (question.tags.includes("follow_up")) continue;
        for (const factId of ctx.disclosedBefore[question.index] ?? []) {
          const fact = ctx.facts.find((candidate) => candidate.id === factId);
          if (!fact) continue;
          if (!anyHit(question.text, fact.keywords)) continue;
          if (anyHit(question.text, fact.probeCues ?? [])) continue;
          const answeredAt = ctx.messages.findIndex(
            (message, index) => index < question.index && message.role === CLIENT && disclosedIn(ctx.facts, message).includes(factId),
          );
          evidence.push(at(question.index));
          if (answeredAt >= 0) evidence.push(at(answeredAt));
          notes.push(fact.topicArea);
          break;
        }
      }
      if (evidence.length === 0) return null;
      return {
        status: "observed",
        note: `Asked again about something the client had already covered: ${[...new Set(notes)].join(", ")}.`,
        count: notes.length,
        evidence,
      };
    },
  },

  {
    id: "CI1",
    run: (ctx) => {
      const first = ctx.questions[0];
      if (!first) return null;
      if (anyHit(first.text, ctx.config.rapportPhrases)) return null;
      return { status: "observed", note: "The first message opened without a greeting.", evidence: [at(first.index)] };
    },
  },
  {
    id: "CI2",
    run: (ctx) => {
      const found = ctx.questions.filter(
        (question) => question.tags.includes("leading") || anyHit(question.text, ctx.config.steeringPhrases),
      );
      if (found.length === 0) return null;
      return {
        status: "observed",
        note: "These questions suggested their own answer.",
        count: found.length,
        evidence: found.map((question) => at(question.index)),
      };
    },
  },

  {
    id: "TP2",
    // The time cap alone settles it, so the clock is only needed for the second half of the rule.
    needs: (ctx) => ctx.endedHow === "time_cap" || (ctx.hasTimestamps && ctx.clock !== null),
    needsNote: "This session has no timestamps, so when you asked what can't be worked out.",
    run: (ctx) => {
      if (ctx.endedHow === "time_cap") {
        return { status: "observed", note: "The interview ran out of time rather than being ended by you." };
      }
      const { clock, config } = ctx;
      if (!clock) return null;
      const firstProblem = ctx.questions.find(
        (question) =>
          question.tags.includes("open") &&
          question.ts !== undefined &&
          (anyHit(question.text, config.problemPhrases) ||
            ctx.facts.some(
              (fact) => fact.disclosure !== "given" && askedInArea(fact, question.text, ctx.disclosedBefore[question.index] ?? new Set(), ctx.facts),
            )),
      );
      if (!firstProblem?.ts) return null;
      const share = (firstProblem.ts - clock.start) / clock.spanMs;
      if (share <= config.lateStartShare) return null;
      return {
        status: "observed",
        note: `The first open question about the problem came ${Math.round((firstProblem.ts - clock.start) / 60000)} min in, ${Math.round(share * 100)}% of the way through.`,
        evidence: [at(firstProblem.index)],
      };
    },
  },
  {
    id: "TP3",
    run: (ctx) => {
      const given = ctx.facts.filter((fact) => fact.disclosure === "given");
      const evidence: BanoEvidence[] = [];
      const lines: string[] = [];
      for (const question of ctx.questions) {
        if (question.tags.includes("follow_up") || question.tags.includes("summarise_back")) continue;
        const repeated = given.find((fact) => hits(question.text, fact.keywords).length >= ctx.config.givenFactKeywordHits);
        if (!repeated) continue;
        // Asking what lies beneath a brief fact is the opposite of showing no preparation, so a
        // question that probes one of its hidden children is not re-asking the brief.
        const probesDeeper = ctx.facts.some(
          (fact) => fact.parentFactId === repeated.id && (fact.probeCues ?? []).some((cue) => hit(question.text, cue)),
        );
        if (probesDeeper) continue;
        evidence.push(at(question.index));
        lines.push(repeated.detail);
      }
      if (evidence.length === 0) return null;
      return {
        status: "observed",
        note: `These questions asked what the brief already said: ${[...new Set(lines)].join("; ")}.`,
        count: evidence.length,
        evidence,
      };
    },
  },
  {
    id: "TP5",
    needs: (ctx) => ctx.hasTimestamps,
    needsNote: "This session has no timestamps, so pauses can't be measured.",
    run: (ctx) => {
      const gaps: { index: number; minutes: number }[] = [];
      for (const question of ctx.questions) {
        if (question.previousReplyIndex === undefined || question.ts === undefined) continue;
        const replyAt = ctx.messages[question.previousReplyIndex]?.ts;
        if (replyAt === undefined) continue;
        const minutes = (question.ts - replyAt) / 60000;
        if (minutes > ctx.config.pauseMinutes) gaps.push({ index: question.index, minutes });
      }
      if (gaps.length === 0) return null;
      // Never a mistake: the engineer may have been thinking or writing notes.
      return {
        status: "info",
        note: gaps.map((gap) => `#${gap.index}: ${Math.round(gap.minutes)} min`).join(", "),
        count: gaps.length,
        evidence: gaps.map((gap) => at(gap.index)),
      };
    },
  },
];

/**
 * Runs every code rule, with the two under-reporting guards applied once here: nothing is `observed`
 * when the engineer asked nothing, or when the rule's own evidence is missing.
 */
export function runBanoRules(ctx: BanoContext): Map<string, RuleOutcome> {
  const outcomes = new Map<string, RuleOutcome>();
  for (const rule of BANO_RULES) {
    if (!askedAnything(ctx)) {
      outcomes.set(rule.id, { status: "uncertain", note: "You didn't ask the client anything." });
      continue;
    }
    if (rule.needs && !rule.needs(ctx)) {
      outcomes.set(rule.id, { status: "uncertain", note: rule.needsNote ?? "The evidence for this check is missing." });
      continue;
    }
    outcomes.set(rule.id, rule.run(ctx));
  }
  return outcomes;
}

/** Every code item in the checklist has a rule, and every rule is a code item. Asserted by the tests. */
export const RULE_IDS: readonly string[] = BANO_RULES.map((rule) => rule.id);
export const CODE_IDS_WITHOUT_RULES = BANO_CODE_IDS.filter((id) => !RULE_IDS.includes(id));
