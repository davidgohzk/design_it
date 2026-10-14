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
  /** The area an engineer has to ask about to find this fact. */
  topicArea: string;
  /** Lowercase; an engineer message that contains one counts as "asked in area". */
  keywords: string[];
  /** Lowercase strings unique to this fact; a client reply that contains one states it (leaks, phantoms). */
  signaturePhrases: string[];
  /** A teaching hint, and a matching source. Never shown in research mode. */
  exampleQuestions: string[];
  /** On-probe only: the fact that must come out first. */
  parentFactId?: string;
  /** On-probe only: the follow-up words that unlock it. */
  probeCues?: string[];
};

/** ISO/IEC 25010:2023 product quality characteristics. */
export type Quality =
  | "functional-suitability"
  | "performance-efficiency"
  | "compatibility"
  | "interaction-capability"
  | "reliability"
  | "security"
  | "maintainability"
  | "flexibility"
  | "safety";

/** C4-style box types for diagram nodes. */
export type NodeType = "person" | "system" | "container" | "datastore" | "external";

/** A Given / When / Then situation the design must handle (the walkthrough after Submit). */
export type Scenario = {
  /** e.g. "sc.clash" */
  id: string;
  given: string;
  when: string;
  then: string;
  quality: Quality;
  linkedFactIds: string[];
  /** Ids from expectedDecisions. */
  expectedDecisionKeys: string[];
  expectedNodeTypes: NodeType[];
  /** Shown only after the walkthrough. */
  goodAnswerNotes: string;
};

/** A worked example for the Justify judge. */
export type RubricAnchor = {
  item: "requirement" | "decision" | "sketch";
  verdict: "sound" | "weak" | "unsound";
  example: string;
  why: string;
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
  title: string;
  clientName: string;
  clientRole: string;
  scored: boolean;
  /** What the engineer sees. No instructions for the AI in here. */
  briefMarkdown: string;
  openingMessage: string;
  facts: CaseFact[];
  /** The dictionary the scenarios point at. */
  expectedDecisions: ExpectedDecision[];
  scenarios: Scenario[];
  rubricAnchors: RubricAnchor[];
  /** Reviewers' reference; never shown before review. */
  modelAnswerMarkdown: string;
  /** Mermaid. */
  modelAnswerFinalDiagram: string;
  // trap?: CaseTrap;  // planned for a later version — do not build now
};
