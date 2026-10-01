// Types for the /simple assessment pipeline (§6).

/** Level 3.1 (and level 0) state of one fact. */
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

/** Level 3.2: does the final design satisfy one requirement, and which boxes do it. */
export type RequirementMet = {
  id: string;
  rating: "met" | "partly" | "not_met";
  nodeIds: string[];
  reason: string;
};

export type SimilarKind = "requirements" | "decisions" | "sketches";
/** Level 2 "within": items of one kind that say, choose or draw essentially the same thing. */
export type SimilarGroup = { kind: SimilarKind; ids: string[]; reason: string };

export type EdgeRef = { from: string; to: string };

/** How far one surfaced fact got: requirements citing it, decisions citing those, and which of those are drawn. */
export type FactPath = { requirements: string[]; decisions: string[]; drawn: string[] };

export type AssessmentLinks = {
  funnel: Record<string, FunnelState>;
  /** Surfaced facts only, keyed by fact id; the ids are in design-doc order. */
  paths: Record<string, FactPath>;
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
  model: string;
  reviewedAt: number;
  fairness: { clientFailed: string[]; inventedStatements: Evidence[] };
  found: { facts: FoundFact[] };
  links: AssessmentLinks;
  soundness: {
    requirements: Rating[];
    decisions: Rating[];
    sketches: Rating[];
    expectedDecisions: ExpectedDecisionRating[];
    requirementsMet: RequirementMet[];
    similar: SimilarGroup[];
    /** Level 2A: each item judged on its own, apart from what it cites or draws from. */
    requirementItems: Rating[];
    decisionItems: Rating[];
    sketchItems: Rating[];
    /** Level 2: does each sketch make sense placed into the final diagram? */
    sketchIntegration: Rating[];
  };
  /** How many quotes from the AI failed string-match verification and were discarded. */
  verification?: { discardedQuotes: number };
};
