// Every word list and threshold the interview-mistake rules use, in one place so they can be tuned
// against hand-labelled transcripts. All entries are lowercase; matching is whole-word or whole-phrase.
//
// The lists the question tags already own are imported, never copied, so a tuning pass on one check
// cannot silently disagree with the other.
import { fingerprint } from "../fingerprint";
import { GREETINGS, JARGON_WORDS, LEADING_PHRASES, SOLUTION_PHRASES, STOPWORDS } from "../questionTags.config";
import { BANO_CODE_IDS } from "./checklist";

/** QF2: technical words a non-technical client can't answer. The tag list, plus the ones this check adds. */
export const TECH_WORDS: readonly string[] = [
  ...JARGON_WORDS,
  "mvp",
  "tech stack",
  "framework",
  "integration",
  "uptime",
  "encryption",
  "oauth",
];

/** QF4: asking the client to pick the solution. The tag list, plus the ones this check adds. */
export const SOLUTION_ASKING_PHRASES: readonly string[] = [
  ...SOLUTION_PHRASES,
  "would you like a",
  "should the system",
  "do you want a website",
];

/** CI2: steering the client towards an answer. The tag list, plus the ones this check adds. */
export const STEERING_PHRASES: readonly string[] = [
  ...LEADING_PHRASES,
  "wouldn't you agree",
  "surely",
  "you should",
  "you'd want",
];

/** QO1: asking who else is involved or affected. */
export const STAKEHOLDER_PHRASES: readonly string[] = [
  "who else",
  "anyone else",
  "other staff",
  "other people",
  "who uses",
  "who is involved",
  "who would be affected",
  // Asking who does the work is asking who is involved, so these count too.
  "who books",
  "who makes",
  "who takes",
  "who works",
  "who answers",
];

/** QO3: asking how things work today. */
export const CURRENT_PROCESS_PHRASES: readonly string[] = [
  "currently",
  "today",
  "right now",
  "at the moment",
  "how do you",
  "walk me through",
  "what happens when",
  "existing",
];

/** QO4: asking what matters most. */
export const PRIORITY_PHRASES: readonly string[] = [
  "priority",
  "most important",
  "matters most",
  "must have",
  "if you could only",
  "biggest problem",
  "rank",
];

/** QO6: asking about goals or success. */
export const GOAL_PHRASES: readonly string[] = [
  "goal",
  "success",
  "what would good look like",
  "how will you know",
  "ideal",
  "outcome",
  "achieve",
];

/** TP2: a question that is about the problem rather than about anything at all. */
export const PROBLEM_PHRASES: readonly string[] = [
  "problem",
  "issue",
  "pain",
  "goes wrong",
  "go wrong",
  "wrong",
  "currently",
  "today",
  "at the moment",
  "happens",
];

/** CI1: an opening that builds some rapport. */
export const RAPPORT_PHRASES: readonly string[] = [
  "hi",
  "hello",
  "thanks for",
  "thank you for",
  "nice to meet",
  "my name",
  "good morning",
  "good afternoon",
  "appreciate your time",
];

/**
 * QF5: the words a question is asked with. Two or more in one message means two or more questions,
 * which is what makes "How many rooms, who books them, and what times are busiest?" overloaded even
 * though it has one question mark.
 */
export const QUESTION_STEMS: readonly string[] = [
  "what",
  "who",
  "how",
  "when",
  "where",
  "which",
  "why",
  "whose",
];

/** IO2: naming the thing to build before understanding the problem. */
export const ARTEFACT_WORDS: readonly string[] = ["app", "system", "website", "feature"];

export type BanoConfig = {
  /** QF5: a question longer than this many words is overloaded. */
  longQuestionWords: number;
  /** QF5: how many question words one message may use before it is asking several things. */
  maxQuestionStems: number;
  /** QO2: the share of questions that must be follow-ups. */
  followUpMinRate: number;
  /** QO2: below this many questions a rate means nothing. */
  followUpMinQuestions: number;
  /** IO1: how many of the last engineer messages are checked for a summary. */
  summaryWindow: number;
  /** IO4: content-word overlap at which two questions are the same question. */
  repeatJaccard: number;
  /** TP2: the share of the session by which the first problem question should have been asked. */
  lateStartShare: number;
  /** TP3: how many keywords of a brief fact a question must hit to count as re-asking it. */
  givenFactKeywordHits: number;
  /** TP5: a gap longer than this many minutes is a long pause. */
  pauseMinutes: number;
  /** TP2: a session shorter than this can't support a share-of-time measure. */
  minClockSpanMs: number;
  techWords: readonly string[];
  solutionAskingPhrases: readonly string[];
  steeringPhrases: readonly string[];
  stakeholderPhrases: readonly string[];
  currentProcessPhrases: readonly string[];
  priorityPhrases: readonly string[];
  goalPhrases: readonly string[];
  problemPhrases: readonly string[];
  rapportPhrases: readonly string[];
  artefactWords: readonly string[];
  questionStems: readonly string[];
};

export const BANO_CONFIG: BanoConfig = {
  longQuestionWords: 40,
  maxQuestionStems: 1,
  followUpMinRate: 0.2,
  followUpMinQuestions: 3,
  summaryWindow: 3,
  repeatJaccard: 0.6,
  lateStartShare: 0.3,
  givenFactKeywordHits: 2,
  pauseMinutes: 3,
  minClockSpanMs: 60_000,
  techWords: TECH_WORDS,
  solutionAskingPhrases: SOLUTION_ASKING_PHRASES,
  steeringPhrases: STEERING_PHRASES,
  stakeholderPhrases: STAKEHOLDER_PHRASES,
  currentProcessPhrases: CURRENT_PROCESS_PHRASES,
  priorityPhrases: PRIORITY_PHRASES,
  goalPhrases: GOAL_PHRASES,
  problemPhrases: PROBLEM_PHRASES,
  rapportPhrases: RAPPORT_PHRASES,
  artefactWords: ARTEFACT_WORDS,
  questionStems: QUESTION_STEMS,
};

/** Bumped by hand when the shape of the config changes, so an old hash is never mistaken for a new one. */
export const BANO_CONFIG_VERSION = "bano-config-1";

const sorted = (words: readonly string[]) => [...words].sort();

/**
 * The config in a fixed key order, with every list sorted, so the hash depends on the values and not
 * on how they were written. The borrowed question-tag lists are in here too: the rules read them, so
 * editing a stopword must move the hash. So does adding or removing a rule.
 */
export const canonicalConfig = (config: BanoConfig = BANO_CONFIG) => ({
  version: BANO_CONFIG_VERSION,
  longQuestionWords: config.longQuestionWords,
  maxQuestionStems: config.maxQuestionStems,
  followUpMinRate: config.followUpMinRate,
  followUpMinQuestions: config.followUpMinQuestions,
  summaryWindow: config.summaryWindow,
  repeatJaccard: config.repeatJaccard,
  lateStartShare: config.lateStartShare,
  givenFactKeywordHits: config.givenFactKeywordHits,
  pauseMinutes: config.pauseMinutes,
  minClockSpanMs: config.minClockSpanMs,
  techWords: sorted(config.techWords),
  solutionAskingPhrases: sorted(config.solutionAskingPhrases),
  steeringPhrases: sorted(config.steeringPhrases),
  stakeholderPhrases: sorted(config.stakeholderPhrases),
  currentProcessPhrases: sorted(config.currentProcessPhrases),
  priorityPhrases: sorted(config.priorityPhrases),
  goalPhrases: sorted(config.goalPhrases),
  problemPhrases: sorted(config.problemPhrases),
  rapportPhrases: sorted(config.rapportPhrases),
  artefactWords: sorted(config.artefactWords),
  questionStems: sorted(config.questionStems),
  greetings: sorted(GREETINGS),
  stopwords: sorted([...STOPWORDS]),
  rules: sorted(BANO_CODE_IDS),
});

/**
 * A tag for "which config produced this result", stored on every report so a tuned threshold is
 * visible in the research data. It is FNV-1a, so it is not collision-resistant and is not meant to
 * be: it answers "did the config change between these two sessions", nothing more.
 */
export const configHash = (config: BanoConfig = BANO_CONFIG) => `fnv1a32:${fingerprint(canonicalConfig(config))}`;
