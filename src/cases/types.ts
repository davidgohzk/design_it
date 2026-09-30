export type Disclosure = "given" | "on-ask" | "on-probe";

export type CaseFact = {
  /** Stable, e.g. "cr.root-cause". Must match the backend persona registry. */
  id: string;
  /** Shown in the report. */
  label: string;
  /** The fact, plainly. */
  detail: string;
  disclosure: Disclosure;
  /** Lowercase substrings for a cheap prefilter (generous). */
  cues: string[];
  /** Shown only for missed / assumed facts, after review. */
  whyItMatters: string;
};

export type ExpectedDecision = {
  /** e.g. "ed.single-source" */
  id: string;
  /** The design question any good answer must address. */
  question: string;
  goodAnswerNotes: string;
};

export type CaseDefinition = {
  id: string;
  /** Bump on any content change; stored with every review. */
  version: number;
  title: string;
  clientName: string;
  clientRole: string;
  scored: boolean;
  /** What the engineer sees. No instructions for the AI in here. */
  briefMarkdown: string;
  openingMessage: string;
  facts: CaseFact[];
  expectedDecisions: ExpectedDecision[];
  /** Reviewers' reference; never shown before review. */
  modelAnswerMarkdown: string;
  /** Mermaid. */
  modelAnswerFinalDiagram: string;
  // trap?: CaseTrap;  // planned for a later version — do not build now
};
