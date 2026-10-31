// The shape of an interview-mistake report. Kept apart from the rules and the entry point so
// AssessmentResult can name it without pulling the rule engine in.
import type { CaseDefinition } from "@/cases";
import type { ChatMessage, InterviewEnd } from "@/lib/types";
import type { Method } from "@/review/levels/funnel";
import type { QuestionTag } from "@/review/levels/questionTags";
import type { BanoTheme } from "./checklist";
import type { BanoConfig } from "./config";

export type BanoStatus =
  /** The mistake happened. */
  | "observed"
  /** It was checked for and didn't happen. */
  | "not_observed"
  /** It couldn't be decided: the evidence a rule needs is missing, or the judge's runs disagreed. */
  | "uncertain"
  /** The Ask check already measures this; it isn't judged twice. */
  | "see_ask"
  /** A solo text chat can't show this. */
  | "not_applicable"
  /** Reported for interest only, never as a mistake. */
  | "info";

/** One place in the chat the finding points at. `quote` is verbatim, or absent. */
export type BanoEvidence = { messageIndex: number; quote?: string };

export type BanoItemResult = {
  id: string;
  theme: BanoTheme;
  status: BanoStatus;
  method: Method;
  /** AB1-AB4: tone and attitude, hard to read from text. */
  weak?: boolean;
  /** How many messages, for the per-message items. */
  count?: number;
  evidence: BanoEvidence[];
  /** What was found, or what was absent, in a line. */
  note?: string;
  /** AI items: each run's status, in order. */
  runs?: BanoStatus[];
};

/** Counts for display only. `checked` leaves out see_ask, not_applicable and info. Never added up. */
export type BanoThemeCount = { theme: BanoTheme; observed: number; checked: number };

export type BanoReport = {
  checklistVersion: string;
  configHash: string;
  /** The judge prompt's version; absent when no AI call was made. */
  promptVersion?: string;
  /** One entry per checklist item, in checklist order. */
  items: BanoItemResult[];
  themes: BanoThemeCount[];
  /** AI items dropped because their quote didn't verify. */
  discardedAiItems: number;
};

export type BanoInput = {
  caseDefinition: CaseDefinition;
  messages: readonly ChatMessage[];
  interviewEnd?: InterviewEnd | null;
  /** The question tags the review already computed, so the two views can't disagree. */
  tags: readonly { messageIndex: number; tags: QuestionTag[] }[];
  config?: Partial<BanoConfig>;
};
