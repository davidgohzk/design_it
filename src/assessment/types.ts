// Types for the /simple assessment pipeline (§6).

/** Level 1A (and level 0) state of one fact. */
export type FactState = "given" | "surfaced" | "assumed" | "missed" | "client_failed";

/** The single final state of each fact in the funnel; each problem is scored once, where it started. */
export type FunnelState =
  | "given"
  | "client_failed"
  | "missed"
  | "assumed"
  | "dropped"
  | "unused"
  | "not_drawn"
  | "carried_through";

export const FUNNEL_ORDER: readonly FunnelState[] = [
  "carried_through",
  "not_drawn",
  "unused",
  "dropped",
  "assumed",
  "missed",
  "client_failed",
  "given",
];

/** A verbatim quote from a chat message, already verified by string match. */
export type Evidence = { messageIndex: number; quote: string };

export type FoundFact = {
  factId: string;
  state: FactState;
  /**
   * surfaced: the client message and quote that state the fact.
   * client_failed: the engineer's question in that fact's area.
   */
  messageIndex?: number;
  /** surfaced / client_failed: the chat quote. assumed: the quote from the design doc. */
  quote?: string;
};

export type SoundnessRating = "sound" | "weak" | "unsound";
export type Rating = { id: string; rating: SoundnessRating; reason: string };
export type ExpectedDecisionRating = {
  id: string;
  rating: "well" | "weakly" | "not_addressed";
  decisionIds: string[];
  reason: string;
};

export type EdgeRef = { from: string; to: string };

export type AssessmentLinks = {
  funnel: Record<string, FunnelState>;
  dropped: string[];
  uncited: string[];
  hiddenAssumptions: string[];
  unused: string[];
  unsupported: string[];
  notDrawn: string[];
  unjustified: string[];
  unexplainedEdges: EdgeRef[];
};

export type AssessmentResult = {
  caseId: string;
  caseVersion: number;
  model: string;
  promptVersion: string;
  reviewedAt: number;
  fairness: { clientFailed: string[]; inventedStatements: Evidence[] };
  found: { facts: FoundFact[] };
  links: AssessmentLinks;
  soundness: {
    requirements: Rating[];
    decisions: Rating[];
    sketches: Rating[];
    expectedDecisions: ExpectedDecisionRating[];
  };
  /** How many quotes from the AI failed string-match verification and were discarded. */
  verification?: { discardedQuotes: number };
};
