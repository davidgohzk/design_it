import { describe, expect, it } from "vitest";
import {
  coverageScore,
  createReviewFingerprint,
  extractReviewReferences,
  groundingScore,
  parseReviewResponse,
  validateReviewPayload,
} from "./review";
import type { AIReviewInput } from "./review";
import type { CaseReviewFact } from "./types";
import { INITIAL_AI_REVIEW_RESULT, INITIAL_REVIEW_INPUT } from "./reviewSeed";

const facts: CaseReviewFact[] = [
  { id: "scale", label: "Scale", description: "40 workers", personaFact: "40 workers" },
  { id: "signal", label: "Signal", description: "Patchy signal", personaFact: "Patchy signal" },
  { id: "audit", label: "Audit", description: "Durable records", personaFact: "Durable records" },
];

const input: AIReviewInput = {
  facts,
  briefMarkdown: "The team has 40 field workers.",
  messages: [
    { role: "user", content: "How is connectivity?" },
    { role: "assistant", content: "The phone signal is patchy in the field." },
  ],
  reportMarkdown: [
    "The team has [40 field workers](#cs \"40 field workers\").",
    "[Signal is patchy](#chat-msg-1 \"phone signal is patchy\").",
    "[This target is broken](#chat-msg-99 \"missing response\").",
  ].join("\n"),
};

const payload = {
  coverage: [
    { factId: "scale", status: "assumed", rationale: "Only the report states it.", reportExcerpt: "40 field workers", chatMessageIndexes: [], reportClaimIndexes: [0] },
    { factId: "signal", status: "elicited", rationale: "The client stated it.", transcriptExcerpt: "phone signal is patchy", chatMessageIndexes: [1], reportClaimIndexes: [3] },
    { factId: "audit", status: "missed", rationale: "It appears nowhere.", chatMessageIndexes: [], reportClaimIndexes: [] },
  ],
  grounding: {
    claims: [
      { claim: "The team has 40 workers", reportExcerpt: "40 field workers", referenceId: "ref-0", supportsClaim: true, rationale: "The brief supports it." },
      { claim: "Alerts take an hour", reportExcerpt: "Alerts take an hour", referenceId: null, supportsClaim: false, rationale: "There is no citation." },
      { claim: "The broken target is factual", reportExcerpt: "This target is broken", referenceId: "ref-2", supportsClaim: true, rationale: "The target is missing." },
      { claim: "Signal never works", reportExcerpt: "Signal is patchy", referenceId: "ref-1", supportsClaim: false, rationale: "Patchy does not mean never." },
    ],
    omissions: [
      { fact: "Signal is patchy", clientExcerpt: "phone signal is patchy", messageIndex: 1, rationale: "Example omission." },
    ],
  },
  reasoning: [
    { kind: "assessment", statement: "Use the known scale", reportExcerpt: "40 field workers", section: "Assessment", rationale: "Scale informs the design.", dependsOnClaimIndexes: [0], dependsOnReasoningIndexes: [] as number[] },
  ],
};

describe("review references", () => {
  it("validates brief and client references and rejects a missing chat target", () => {
    const references = extractReviewReferences(
      input.reportMarkdown,
      input.briefMarkdown,
      input.messages,
    );
    expect(references).toHaveLength(3);
    expect(references[0]).toMatchObject({ id: "ref-0", source: "brief", valid: true });
    expect(references[1]).toMatchObject({ id: "ref-1", source: "chat", messageIndex: 1, valid: true });
    expect(references[2]).toMatchObject({ id: "ref-2", source: "chat", valid: false });
  });

  it("does not treat a user message as client evidence", () => {
    const references = extractReviewReferences(
      "[Question](#chat-msg-0 \"How is connectivity?\")",
      input.briefMarkdown,
      input.messages,
    );
    expect(references[0]).toMatchObject({ valid: false });
    expect(references[0].invalidReason).toContain("not a client response");
  });
});

describe("review payload validation and scoring", () => {
  it("accepts all coverage states and derives every grounding failure reason", () => {
    const result = validateReviewPayload(payload, input);
    expect(result.coverage.map((finding) => finding.status)).toEqual([
      "assumed",
      "elicited",
      "missed",
    ]);
    expect(coverageScore(result.coverage)).toEqual({ elicited: 1, total: 3 });
    expect(groundingScore(result.grounding.claims)).toEqual({ grounded: 1, total: 4 });
    expect(result.grounding.claims.map((claim) => claim.issue)).toEqual([
      undefined,
      "missing_reference",
      "invalid_reference",
      "unsupported_reference",
    ]);
    expect(result.coverage[0].reportClaimIds).toEqual([result.grounding.claims[0].id]);
    expect(result.reasoning[0].dependsOnClaimIds).toEqual([result.grounding.claims[0].id]);
  });

  it("rejects duplicate and missing checklist facts", () => {
    const duplicate = structuredClone(payload);
    duplicate.coverage[2].factId = "scale";
    expect(() => validateReviewPayload(duplicate, input)).toThrow(/more than once/);

    const missing = structuredClone(payload);
    missing.coverage.pop();
    expect(() => validateReviewPayload(missing, input)).toThrow(/omitted coverage fact audit/);
  });

  it("reports a zero-claim grounding result without inventing a denominator", () => {
    expect(groundingScore([])).toEqual({ grounded: 0, total: 0 });
  });

  it("rejects invalid chat, claim, and reasoning dependencies", () => {
    const badChat = structuredClone(payload);
    badChat.coverage[0].chatMessageIndexes = [0];
    expect(() => validateReviewPayload(badChat, input)).toThrow(/non-client chat message/);

    const badClaim = structuredClone(payload);
    badClaim.coverage[0].reportClaimIndexes = [99];
    expect(() => validateReviewPayload(badClaim, input)).toThrow(/unknown report claim/);

    const badReasoning = structuredClone(payload);
    badReasoning.reasoning[0].dependsOnClaimIndexes = [99];
    expect(() => validateReviewPayload(badReasoning, input)).toThrow(/unknown report claim/);

    const forwardReasoning = structuredClone(payload);
    forwardReasoning.reasoning[0].dependsOnReasoningIndexes = [0];
    expect(() => validateReviewPayload(forwardReasoning, input)).toThrow(/unknown or later reasoning/);
  });

  it("parses fenced JSON and rejects malformed JSON", () => {
    const parsed = parseReviewResponse(`\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``, input);
    expect(parsed.coverage).toHaveLength(3);
    expect(() => parseReviewResponse("not json", input)).toThrow(/malformed review JSON/);
  });
});

describe("review fingerprint", () => {
  it("is stable for one snapshot and changes with chat or report edits", () => {
    const original = createReviewFingerprint(input);
    expect(createReviewFingerprint(structuredClone(input))).toBe(original);
    expect(createReviewFingerprint({ ...input, reportMarkdown: `${input.reportMarkdown}\nEdit` })).not.toBe(original);
    expect(createReviewFingerprint({
      ...input,
      messages: [...input.messages, { role: "assistant", content: "Another fact" }],
    })).not.toBe(original);
  });
});

describe("pre-populated review", () => {
  it("matches the seeded transcript and report and includes both audits", () => {
    expect(INITIAL_AI_REVIEW_RESULT.fingerprint).toBe(
      createReviewFingerprint(INITIAL_REVIEW_INPUT),
    );
    expect(coverageScore(INITIAL_AI_REVIEW_RESULT.coverage)).toEqual({
      elicited: 6,
      total: 10,
    });
    expect(groundingScore(INITIAL_AI_REVIEW_RESULT.grounding.claims)).toEqual({
      grounded: 13,
      total: 19,
    });
    expect(INITIAL_AI_REVIEW_RESULT.grounding.omissions).toHaveLength(3);
  });
});
