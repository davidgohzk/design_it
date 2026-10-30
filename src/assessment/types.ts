// The review result (WP7): one section per level, Gate → Ask → Keep → Justify → Fit, plus How you
// worked. Every number says how it was made (Method). No composite score: a profile of measures.
import type { BanoReport } from "./bano/types";
import type { ElicitationResult } from "./elicitation";
import type { IsoCharacteristic, RationaleLink, ScenarioAdequacy } from "./summaryReview";
import type { AskResult, KeepResult, Method } from "./funnel";
import type { FitResult } from "./fit";
import type { JustifyItem } from "./justify";
import type { QuestionTag, StopBucket } from "./questionTags";

export type { FactState, Method } from "./funnel";

export type SessionMode = "practice" | "assessment" | "research";

export const MODE_LABEL: Record<SessionMode, string> = {
  practice: "Practice",
  assessment: "Assessment",
  research: "Research",
};

/** A connection in a diagram, by its two box ids. */
export type EdgeRef = { from: string; to: string };

export type GateResult = {
  clientFailed: { factId: string; messageIndex: number; quote: string }[];
  leaks: { messageIndex: number; factId: string }[];
  phantoms: { messageIndex: number; factId: string }[];
  inventedSpecifics: { messageIndex: number; text: string }[];
  sessionComplete: boolean;
  /** Client replies that failed or came back empty (why a session isn't complete). */
  failedReplies: number[];
};

export type ProcessResult = {
  elicitation?: ElicitationResult;
  tags: { messageIndex: number; tags: QuestionTag[] }[];
  counts: Record<string, number>;
  stopReason?: string;
  stopBucket?: StopBucket;
  /**
   * The interview-mistake checklist (Bano et al. 2019). Teaching feedback and an exploratory research
   * measure: never scored, never summed, and not one of the levels. Optional, because a seeded review
   * and an older stored result have none.
   */
  bano?: BanoReport;
};

/**
 * One stage's coaching line. Teaching material only: never a measure, never scored, and every id in
 * `refs` was checked against the engineer's own work before it was kept.
 */
export type Suggestion = { level: Level; text: string; refs: string[] };

export type AssessmentResult = {
  caseId: string;
  /** Every model that answered a judge call, comma-separated ("" when no AI call was needed). */
  model: string;
  reviewedAt: number;
  mode: SessionMode;
  gate: GateResult;
  ask: AskResult;
  keep: KeepResult;
  justify: { items: JustifyItem[] };
  fit: { scenarios: FitResult[] };
  scenarioAdequacy?: ScenarioAdequacy[];
  rationale?: RationaleLink[];
  /** The critique of the whole design against ISO/IEC 25010, one entry per characteristic. */
  isoCritique?: IsoCharacteristic[];
  judgeVersions?: Partial<Record<"turns" | "scenario_adequacy" | "rationale" | "iso", string>>;
  process: ProcessResult;
  /** At most one per level; a level with nothing worth saying has none. */
  suggestions: Suggestion[];
  /** How many AI quotes failed verification and were dropped (rule 2). */
  verification: { discardedQuotes: number };
};

/** The five levels, in order. */
export const LEVELS = ["gate", "ask", "keep", "justify", "fit"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  gate: "Gate",
  ask: "Ask",
  keep: "Keep",
  justify: "Justify",
  fit: "Fit",
};

export const LEVEL_QUESTION: Record<Level, string> = {
  gate: "Did the client play fair?",
  ask: "Did you find out what the client knew?",
  keep: "Did each found fact reach the diagram?",
  justify: "Does each step follow from the last?",
  fit: "Does the design handle the case?",
};

export const METHOD_LABEL: Record<Method, string> = {
  code: "code",
  ai_verified_quote: "verified quote",
  ai_judgment: "AI judgment",
};
