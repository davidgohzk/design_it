import { postJson } from "./api";
import type {
  AIReviewProgress,
  AIReviewResult,
  CaseReviewFact,
  ChatMessage,
  ClaimAudit,
  CoverageFinding,
  CoverageStatus,
  DesignCritique,
  OmittedFact,
  ReasoningFinding,
  ReasoningKind,
  ReviewReference,
  ReviewSection,
} from "./types";

export type AIReviewInput = {
  facts: readonly CaseReviewFact[];
  messages: ChatMessage[];
  briefMarkdown: string;
  reportMarkdown: string;
};

type RawClaimAudit = {
  claim: string;
  reportExcerpt: string;
  referenceId: string | null;
  supportsClaim: boolean;
  rationale: string;
};

const COVERAGE_STATUSES = new Set<CoverageStatus>([
  "elicited",
  "assumed",
  "missed",
]);

const REASONING_KINDS = new Set<ReasoningKind>([
  "assessment",
  "plan",
  "justification",
  "architecture",
]);

const normalizeEvidence = (value: string) =>
  value
    .replace(/\\(["\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`AI review response is missing ${field}.`);
  }
  return value.trim();
};

const optionalString = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredString(value, field);
};

const indexArray = (value: unknown, field: string) => {
  if (!Array.isArray(value) || value.some((item) => !Number.isInteger(item) || item < 0)) {
    throw new Error(`AI review response has an invalid ${field} array.`);
  }
  return value as number[];
};

const stableTextToken = (value: string) => {
  let hash = 0x811c9dc5;
  const normalized = normalizeEvidence(value);
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

export function extractReviewReferences(
  reportMarkdown: string,
  briefMarkdown: string,
  messages: ChatMessage[],
): ReviewReference[] {
  const references: ReviewReference[] = [];
  const linkPattern =
    /\[([^\]]+)]\((#(?:cs|chat-msg-(\d+)))\s+"((?:\\.|[^"\\])*)"\)/g;

  for (const match of reportMarkdown.matchAll(linkPattern)) {
    const [, label, target, messageIndexText, rawExcerpt] = match;
    const excerpt = rawExcerpt.replace(/\\(["\\])/g, "$1");
    const normalizedExcerpt = normalizeEvidence(excerpt);
    let valid = Boolean(normalizedExcerpt);
    let invalidReason: string | undefined;
    let source: ReviewReference["source"] = "brief";
    let messageIndex: number | undefined;

    if (target === "#cs") {
      if (!normalizedExcerpt || !normalizeEvidence(briefMarkdown).includes(normalizedExcerpt)) {
        valid = false;
        invalidReason = "The quoted excerpt was not found in the case brief.";
      }
    } else {
      source = "chat";
      messageIndex = Number(messageIndexText);
      const message = messages[messageIndex];
      if (!message) {
        valid = false;
        invalidReason = "The referenced chat message does not exist.";
      } else if (message.role !== "assistant") {
        valid = false;
        invalidReason = "The referenced chat message is not a client response.";
      } else if (
        !normalizedExcerpt ||
        !normalizeEvidence(message.content).includes(normalizedExcerpt)
      ) {
        valid = false;
        invalidReason = "The quoted excerpt was not found in the client response.";
      }
    }

    references.push({
      id: `ref-${references.length}`,
      target,
      label,
      excerpt,
      source,
      messageIndex,
      valid,
      invalidReason,
    });
  }

  return references;
}

export function createReviewFingerprint(input: AIReviewInput) {
  const serialized = JSON.stringify({
    facts: input.facts,
    messages: input.messages.map(({ role, content }) => ({ role, content })),
    briefMarkdown: input.briefMarkdown,
    reportMarkdown: input.reportMarkdown,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function coverageScore(findings: CoverageFinding[]) {
  const elicited = findings.filter((finding) => finding.status === "elicited").length;
  return { elicited, total: findings.length };
}

export function groundingScore(claims: ClaimAudit[]) {
  const grounded = claims.filter((claim) => claim.grounded).length;
  return { grounded, total: claims.length };
}

function validateCoverage(
  value: unknown,
  facts: readonly CaseReviewFact[],
  claims: ClaimAudit[],
  messages: ChatMessage[],
): CoverageFinding[] {
  if (!Array.isArray(value)) {
    throw new Error("AI review response must include a coverage array.");
  }

  const byFactId = new Map<string, CoverageFinding>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) throw new Error(`Coverage item ${index + 1} is invalid.`);
    const factId = requiredString(item.factId, `coverage[${index}].factId`);
    const status = item.status;
    if (typeof status !== "string" || !COVERAGE_STATUSES.has(status as CoverageStatus)) {
      throw new Error(`Coverage item ${factId} has an invalid status.`);
    }
    if (byFactId.has(factId)) {
      throw new Error(`Coverage fact ${factId} was returned more than once.`);
    }
    const chatMessageIndexes = indexArray(
      item.chatMessageIndexes,
      `coverage[${index}].chatMessageIndexes`,
    );
    for (const messageIndex of chatMessageIndexes) {
      if (messages[messageIndex]?.role !== "assistant") {
        throw new Error(`Coverage fact ${factId} references a non-client chat message.`);
      }
    }
    const reportClaimIndexes = indexArray(
      item.reportClaimIndexes,
      `coverage[${index}].reportClaimIndexes`,
    );
    const reportClaimIds = reportClaimIndexes.map((claimIndex) => {
      const claim = claims[claimIndex];
      if (!claim) throw new Error(`Coverage fact ${factId} references an unknown report claim.`);
      return claim.id;
    });
    byFactId.set(factId, {
      factId,
      status: status as CoverageStatus,
      rationale: requiredString(item.rationale, `coverage[${index}].rationale`),
      transcriptExcerpt: optionalString(
        item.transcriptExcerpt,
        `coverage[${index}].transcriptExcerpt`,
      ),
      reportExcerpt: optionalString(item.reportExcerpt, `coverage[${index}].reportExcerpt`),
      chatMessageIndexes,
      reportClaimIds,
    });
  }

  const expectedIds = new Set(facts.map((fact) => fact.id));
  const unknownId = [...byFactId.keys()].find((factId) => !expectedIds.has(factId));
  if (unknownId) throw new Error(`AI review returned unknown coverage fact ${unknownId}.`);

  return facts.map((fact) => {
    const finding = byFactId.get(fact.id);
    if (!finding) throw new Error(`AI review omitted coverage fact ${fact.id}.`);
    return finding;
  });
}

function validateClaims(
  value: unknown,
  references: ReviewReference[],
): ClaimAudit[] {
  if (!Array.isArray(value)) {
    throw new Error("AI review response must include a grounding claims array.");
  }

  const referenceById = new Map(references.map((reference) => [reference.id, reference]));
  const idOccurrences = new Map<string, number>();
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Grounding claim ${index + 1} is invalid.`);
    const raw: RawClaimAudit = {
      claim: requiredString(item.claim, `grounding.claims[${index}].claim`),
      reportExcerpt: requiredString(
        item.reportExcerpt,
        `grounding.claims[${index}].reportExcerpt`,
      ),
      referenceId:
        item.referenceId === null
          ? null
          : requiredString(item.referenceId, `grounding.claims[${index}].referenceId`),
      supportsClaim:
        typeof item.supportsClaim === "boolean"
          ? item.supportsClaim
          : (() => {
              throw new Error(
                `Grounding claim ${index + 1} is missing supportsClaim.`,
              );
            })(),
      rationale: requiredString(item.rationale, `grounding.claims[${index}].rationale`),
    };

    const token = stableTextToken(raw.reportExcerpt);
    const occurrence = idOccurrences.get(token) ?? 0;
    idOccurrences.set(token, occurrence + 1);
    const id = `report-${token}-${occurrence}`;

    const reference = raw.referenceId ? referenceById.get(raw.referenceId) : undefined;
    if (!raw.referenceId) {
      return { ...raw, id, grounded: false, issue: "missing_reference" };
    }
    if (!reference || !reference.valid) {
      return {
        ...raw,
        id,
        grounded: false,
        issue: "invalid_reference",
        reference,
        rationale: reference?.invalidReason ?? raw.rationale,
      };
    }
    if (!raw.supportsClaim) {
      return {
        ...raw,
        id,
        grounded: false,
        issue: "unsupported_reference",
        reference,
      };
    }
    return { ...raw, id, grounded: true, reference };
  });
}

function validateOmissions(value: unknown, messages: ChatMessage[]): OmittedFact[] {
  if (!Array.isArray(value)) {
    throw new Error("AI review response must include a grounding omissions array.");
  }
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Omitted fact ${index + 1} is invalid.`);
    const messageIndex = item.messageIndex;
    if (!Number.isInteger(messageIndex) || !messages[messageIndex as number]) {
      throw new Error(`Omitted fact ${index + 1} has an invalid messageIndex.`);
    }
    if (messages[messageIndex as number].role !== "assistant") {
      throw new Error(`Omitted fact ${index + 1} does not reference a client response.`);
    }
    const clientExcerpt = requiredString(
      item.clientExcerpt,
      `grounding.omissions[${index}].clientExcerpt`,
    );
    if (!normalizeEvidence(messages[messageIndex as number].content).includes(normalizeEvidence(clientExcerpt))) {
      throw new Error(`Omitted fact ${index + 1} quotes text outside its client response.`);
    }
    return {
      fact: requiredString(item.fact, `grounding.omissions[${index}].fact`),
      clientExcerpt,
      rationale: requiredString(item.rationale, `grounding.omissions[${index}].rationale`),
      messageIndex: messageIndex as number,
      reportExcerpt: optionalString(
        item.reportExcerpt,
        `grounding.omissions[${index}].reportExcerpt`,
      ),
    };
  });
}

function validateReasoning(
  value: unknown,
  claims: ClaimAudit[],
  reportMarkdown: string,
): ReasoningFinding[] {
  if (!Array.isArray(value)) {
    throw new Error("AI review response must include a reasoning array.");
  }
  const idOccurrences = new Map<string, number>();
  const prepared = value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Reasoning item ${index + 1} is invalid.`);
    const kind = item.kind;
    if (typeof kind !== "string" || !REASONING_KINDS.has(kind as ReasoningKind)) {
      throw new Error(`Reasoning item ${index + 1} has an invalid kind.`);
    }
    const reportExcerpt = requiredString(item.reportExcerpt, `reasoning[${index}].reportExcerpt`);
    if (!normalizeEvidence(reportMarkdown).includes(normalizeEvidence(reportExcerpt))) {
      throw new Error(`Reasoning item ${index + 1} quotes text outside the report.`);
    }
    const claimDependencyIndexes = indexArray(
      item.dependsOnClaimIndexes,
      `reasoning[${index}].dependsOnClaimIndexes`,
    );
    const dependsOnClaimIds = claimDependencyIndexes.map((claimIndex) => {
      const claim = claims[claimIndex];
      if (!claim) throw new Error(`Reasoning item ${index + 1} references an unknown report claim.`);
      return claim.id;
    });
    const reasoningDependencyIndexes = indexArray(
      item.dependsOnReasoningIndexes,
      `reasoning[${index}].dependsOnReasoningIndexes`,
    );
    const token = stableTextToken(reportExcerpt);
    const occurrence = idOccurrences.get(token) ?? 0;
    idOccurrences.set(token, occurrence + 1);
    return {
      id: `logic-${token}-${occurrence}`,
      kind: kind as ReasoningKind,
      statement: requiredString(item.statement, `reasoning[${index}].statement`),
      reportExcerpt,
      section: requiredString(item.section, `reasoning[${index}].section`),
      rationale: requiredString(item.rationale, `reasoning[${index}].rationale`),
      dependsOnClaimIds,
      reasoningDependencyIndexes,
    };
  });
  return prepared.map(({ reasoningDependencyIndexes, ...finding }, index) => ({
    ...finding,
    dependsOnReasoningIds: reasoningDependencyIndexes.map((dependencyIndex) => {
      if (dependencyIndex >= index || !prepared[dependencyIndex]) {
        throw new Error(
          `Reasoning item ${index + 1} references an unknown or later reasoning item.`,
        );
      }
      return prepared[dependencyIndex].id;
    }),
  }));
}

const CRITIQUE_LIST_SIZE = 3;
const CRITIQUE_SUMMARY_WORD_LIMIT = 100;

function critiqueList(value: unknown, field: string, label: string) {
  if (!Array.isArray(value) || value.length !== CRITIQUE_LIST_SIZE) {
    throw new Error(`AI review critique must include exactly ${CRITIQUE_LIST_SIZE} ${label}.`);
  }
  return value.map((item, index) => requiredString(item, `critique.${field}[${index}]`));
}

function validateCritique(value: unknown): DesignCritique {
  if (!isRecord(value)) {
    throw new Error("AI review response must include a design critique.");
  }
  const summary = requiredString(value.summary, "critique.summary");
  if (summary.split(/\s+/).length >= CRITIQUE_SUMMARY_WORD_LIMIT) {
    throw new Error(`AI review critique summary must be under ${CRITIQUE_SUMMARY_WORD_LIMIT} words.`);
  }
  return {
    summary,
    strengths: critiqueList(value.strengths, "strengths", "strengths"),
    weaknesses: critiqueList(value.weaknesses, "weaknesses", "weaknesses"),
    followUpQuestions: critiqueList(value.followUpQuestions, "followUpQuestions", "follow-up questions"),
  };
}

export function validateReviewPayload(
  value: unknown,
  input: AIReviewInput,
  references = extractReviewReferences(
    input.reportMarkdown,
    input.briefMarkdown,
    input.messages,
  ),
): AIReviewResult {
  const { accepted, failures } = validateReviewSections(value, input, references, REVIEW_SECTIONS);
  if (failures.length > 0 || !isCompleteReview(accepted)) {
    throw new Error(failures[0]?.message ?? "AI review response is incomplete.");
  }
  return assembleReview(accepted, input);
}

/** Validation order: claims first, because coverage and reasoning cite claims by index. */
export const REVIEW_SECTIONS: readonly ReviewSection[] = [
  "claims",
  "omissions",
  "coverage",
  "reasoning",
  "critique",
];

export const REVIEW_SECTION_LABELS: Record<ReviewSection, string> = {
  claims: "grounding claims",
  omissions: "missing client facts",
  coverage: "coverage",
  reasoning: "reasoning",
  critique: "design critique",
};

export function formatSectionList(sections: readonly ReviewSection[]) {
  const labels = sections.map((section) => REVIEW_SECTION_LABELS[section]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

type ReviewSections = {
  claims: ClaimAudit[];
  omissions: OmittedFact[];
  coverage: CoverageFinding[];
  reasoning: ReasoningFinding[];
  critique: DesignCritique;
};

type SectionFailure = { section: ReviewSection; message: string };

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "The section was invalid.";

/** Validates each requested section on its own, so one bad section doesn't discard the others. */
function validateReviewSections(
  value: unknown,
  input: AIReviewInput,
  references: ReviewReference[],
  sections: readonly ReviewSection[],
  acceptedClaims?: ClaimAudit[],
): { accepted: Partial<ReviewSections>; failures: SectionFailure[] } {
  const accepted: Partial<ReviewSections> = {};
  const failures: SectionFailure[] = [];
  if (!isRecord(value)) {
    const message = "AI review response is not a valid review object.";
    return { accepted, failures: sections.map((section) => ({ section, message })) };
  }

  const wanted = new Set(sections);
  const run = <K extends ReviewSection>(section: K, validate: () => ReviewSections[K]) => {
    if (!wanted.has(section)) return;
    try {
      accepted[section] = validate();
    } catch (error) {
      failures.push({ section, message: errorMessage(error) });
    }
  };
  const grounding: Record<string, unknown> = isRecord(value.grounding) ? value.grounding : {};

  run("claims", () => validateClaims(grounding.claims, references));
  run("omissions", () => validateOmissions(grounding.omissions, input.messages));
  const claims = accepted.claims ?? acceptedClaims;
  if (claims) {
    run("coverage", () => validateCoverage(value.coverage, input.facts, claims, input.messages));
    run("reasoning", () => validateReasoning(value.reasoning, claims, input.reportMarkdown));
  } else {
    for (const section of ["coverage", "reasoning"] as const) {
      if (wanted.has(section)) {
        failures.push({ section, message: "It cites grounding claims, which were rejected." });
      }
    }
  }
  run("critique", () => validateCritique(value.critique));
  return { accepted, failures };
}

const isCompleteReview = (sections: Partial<ReviewSections>): sections is ReviewSections =>
  REVIEW_SECTIONS.every((section) => sections[section] !== undefined);

function assembleReview(sections: ReviewSections, input: AIReviewInput): AIReviewResult {
  return {
    coverage: sections.coverage,
    grounding: { claims: sections.claims, omissions: sections.omissions },
    reasoning: sections.reasoning,
    critique: sections.critique,
    reviewedAt: Date.now(),
    fingerprint: createReviewFingerprint(input),
  };
}

function parseReviewJson(content: string): unknown {
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("The AI returned malformed review JSON. Please retry.");
  }
}

export function parseReviewResponse(
  content: string,
  input: AIReviewInput,
  references?: ReviewReference[],
) {
  return validateReviewPayload(parseReviewJson(content), input, references);
}

const MAX_REVIEW_ATTEMPTS = 3;

export async function requestAIReview(
  input: AIReviewInput,
  {
    apiKey,
    onProgress,
  }: { apiKey?: string; onProgress?: (progress: AIReviewProgress) => void } = {},
) {
  const progress: AIReviewProgress = {
    stage: "gathering",
    attempt: 1,
    maxAttempts: MAX_REVIEW_ATTEMPTS,
    stageStartedAt: Date.now(),
    messageCount: input.messages.length,
    citationCount: 0,
  };
  const report = (update: Partial<AIReviewProgress>) => {
    Object.assign(progress, update);
    onProgress?.({ ...progress });
  };
  report({});

  const references = extractReviewReferences(
    input.reportMarkdown,
    input.briefMarkdown,
    input.messages,
  );
  const transcript = input.messages.map((message, index) => ({
    id: `chat-msg-${index}`,
    role: message.role,
    content: message.content,
  }));
  // The backend (design_it_backend/app/prompts.py) adds the review prompt and model settings.
  const payload = {
    coverageChecklist: input.facts.map(({ id, label, description }) => ({
      id,
      label,
      description,
    })),
    caseBrief: input.briefMarkdown,
    transcript,
    soapReport: input.reportMarkdown,
    extractedReferences: references,
  };

  // Sections that pass are kept across attempts; each retry asks the model only for what is still missing.
  const accepted: Partial<ReviewSections> = {};
  let pending: ReviewSection[] = [...REVIEW_SECTIONS];
  let validationError: unknown;
  for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt++) {
    const retrySections = pending.length < REVIEW_SECTIONS.length ? pending : undefined;
    report({
      stage: "reviewing",
      attempt,
      stageStartedAt: Date.now(),
      citationCount: references.length,
      retrySections,
    });
    const needsAcceptedClaims =
      accepted.claims && (pending.includes("coverage") || pending.includes("reasoning"));
    const body = retrySections
      ? {
          ...payload,
          retrySections,
          ...(needsAcceptedClaims
            ? {
                acceptedClaims: accepted.claims?.map((claim, index) => ({
                  index,
                  claim: claim.claim,
                  reportExcerpt: claim.reportExcerpt,
                  referenceId: claim.reference?.id ?? null,
                })),
              }
            : {}),
        }
      : payload;

    // Request failures (network, 4xx/5xx) are thrown straight away; only invalid model output is retried.
    const { content } = await postJson<{ content: string }>("/api/review", body, { apiKey });
    report({ stage: "validating", stageStartedAt: Date.now() });

    let failures: SectionFailure[];
    try {
      if (!content) throw new Error("The AI returned an empty review. Please retry.");
      const result = validateReviewSections(
        parseReviewJson(content),
        input,
        references,
        pending,
        accepted.claims,
      );
      Object.assign(accepted, result.accepted);
      failures = result.failures;
    } catch (error) {
      failures = pending.map((section) => ({ section, message: errorMessage(error) }));
    }

    if (isCompleteReview(accepted)) return assembleReview(accepted, input);
    // The model sometimes cites a message or claim that doesn't exist; a fresh sample usually passes.
    pending = REVIEW_SECTIONS.filter((section) => accepted[section] === undefined);
    validationError = new Error(failures[0]?.message ?? "AI review response is incomplete.");
    progress.lastRejection = failures
      .map(({ section, message }) => `${REVIEW_SECTION_LABELS[section]}: ${message}`)
      .join(" ");
  }
  throw validationError;
}
