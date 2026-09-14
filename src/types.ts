export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type DesignTurn = {
  prompt: string;
  code: string;
};

export type TimelineEntryType = "chat" | "editor" | "design" | "quote";

export type TimelineEntry = {
  id: string;
  at: number;
  type: TimelineEntryType;
  summary: string;
  detail: string;
  /** Quotes only: the report section the quote was inserted into. */
  target?: string;
  /** Editor entries only: a unified diff patch, rendered by diff2html. */
  diff?: string;
};

export type CaseReviewFact = {
  id: string;
  label: string;
  description: string;
  personaFact: string;
};

export type CoverageStatus = "elicited" | "assumed" | "missed";

export type CoverageFinding = {
  factId: string;
  status: CoverageStatus;
  rationale: string;
  transcriptExcerpt?: string;
  reportExcerpt?: string;
  chatMessageIndexes: number[];
  reportClaimIds: string[];
};

export type GroundingIssue =
  | "missing_reference"
  | "invalid_reference"
  | "unsupported_reference";

export type ReviewReference = {
  id: string;
  target: string;
  label: string;
  excerpt: string;
  source: "brief" | "chat";
  messageIndex?: number;
  valid: boolean;
  invalidReason?: string;
};

export type ClaimAudit = {
  id: string;
  claim: string;
  reportExcerpt: string;
  grounded: boolean;
  issue?: GroundingIssue;
  rationale: string;
  reference?: ReviewReference;
};

export type OmittedFact = {
  fact: string;
  clientExcerpt: string;
  rationale: string;
  messageIndex: number;
  reportExcerpt?: string;
};

export type ReasoningKind = "assessment" | "plan" | "justification" | "architecture";

export type ReasoningFinding = {
  id: string;
  kind: ReasoningKind;
  statement: string;
  reportExcerpt: string;
  section: string;
  rationale: string;
  dependsOnClaimIds: string[];
  dependsOnReasoningIds: string[];
};

export type AIReviewResult = {
  coverage: CoverageFinding[];
  grounding: {
    claims: ClaimAudit[];
    omissions: OmittedFact[];
  };
  reasoning: ReasoningFinding[];
  reviewedAt: number;
  fingerprint: string;
};

export type AIReviewStatus = "idle" | "loading" | "success" | "error";

export type LogicNodeKind = "source" | "chat" | "report" | "logic";
export type LogicStage =
  | "source"
  | "chat"
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "design";
export type LogicHealth = "grounded" | "assumed" | "gap" | "neutral";
export type LogicRelation =
  | "elicited_as"
  | "cited_by"
  | "appears_as"
  | "informs"
  | "develops_into";

export type LogicGraphNode = {
  id: string;
  kind: LogicNodeKind;
  stage: LogicStage;
  health: LogicHealth;
  label: string;
  text: string;
  detail: string;
  sourceLabel?: string;
  fx: number;
  fy: number;
  x: number;
  y: number;
};

export type LogicGraphLink = {
  id: string;
  source: string;
  target: string;
  relation: LogicRelation;
  health: LogicHealth;
  detail: string;
  curvature?: number;
};

export type LogicGraphData = {
  nodes: LogicGraphNode[];
  links: LogicGraphLink[];
};

export type FloatingQuote = {
  text: string;
  top: number;
  left: number;
};

export type ChatFloatingQuote = FloatingQuote & {
  index: number;
};

export type PanelWidths = [number, number, number];

export type LandingSlide = {
  problem: string;
  country: string;
  image: string;
  alt: string;
  backgroundPosition?: string;
  introColor: string;
  verbColor: string;
  problemColor: string;
  countryColor: string;
};

export type ResizeState = {
  view: "client" | "admin";
  handleIndex: 0 | 1;
  startX: number;
  startWidths: PanelWidths;
  containerWidth: number;
};
