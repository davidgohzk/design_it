import { postJson } from "./api";
import type {
  AIReviewResult,
  CaseReviewFact,
  ChatMessage,
  ClaimAudit,
  CoverageFinding,
  CoverageStatus,
  OmittedFact,
  ReasoningFinding,
  ReasoningKind,
  ReviewReference,
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

export function validateReviewPayload(
  value: unknown,
  input: AIReviewInput,
  references = extractReviewReferences(
    input.reportMarkdown,
    input.briefMarkdown,
    input.messages,
  ),
): AIReviewResult {
  if (!isRecord(value) || !isRecord(value.grounding)) {
    throw new Error("AI review response is not a valid review object.");
  }
  const claims = validateClaims(value.grounding.claims, references);
  return {
    coverage: validateCoverage(value.coverage, input.facts, claims, input.messages),
    grounding: {
      claims,
      omissions: validateOmissions(value.grounding.omissions, input.messages),
    },
    reasoning: validateReasoning(value.reasoning, claims, input.reportMarkdown),
    reviewedAt: Date.now(),
    fingerprint: createReviewFingerprint(input),
  };
}

export function parseReviewResponse(
  content: string,
  input: AIReviewInput,
  references?: ReviewReference[],
) {
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("The AI returned malformed review JSON. Please retry.");
  }
  return validateReviewPayload(parsed, input, references);
}

export async function requestAIReview(input: AIReviewInput, { apiKey }: { apiKey?: string } = {}) {
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
  const { content } = await postJson<{ content: string }>(
    "/api/review",
    {
      coverageChecklist: input.facts.map(({ id, label, description }) => ({
        id,
        label,
        description,
      })),
      caseBrief: input.briefMarkdown,
      transcript,
      soapReport: input.reportMarkdown,
      extractedReferences: references,
    },
    { apiKey },
  );
  if (!content) throw new Error("The AI returned an empty review. Please retry.");
  return parseReviewResponse(content, input, references);
}
