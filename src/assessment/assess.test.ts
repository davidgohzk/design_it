import { beforeEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../shared/lib/api";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import {
  GOLDEN_DOC,
  GOLDEN_EVIDENCE_REPLY,
  GOLDEN_FINAL,
  GOLDEN_SOUNDNESS_REPLY,
  GOLDEN_TRANSCRIPT,
} from "../cases/community-room.fixtures";
import type { ChatMessage } from "../shared/lib/types";
import { runAssessment } from "./run";
import { summarize } from "./summary";

vi.mock("../shared/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/lib/api")>()),
  postJson: vi.fn(),
}));
const mockedPostJson = vi.mocked(postJson);

type Body = { task: string; retrySections?: string[]; evidence: Record<string, unknown>; facts: { id: string }[] };

/** Replies to /api/assess by task; each value may be a list of successive replies. */
function mockAssess(replies: Record<string, unknown | unknown[]>) {
  const queues = Object.fromEntries(
    Object.entries(replies).map(([task, reply]) => [task, Array.isArray(reply) ? [...reply] : [reply]]),
  );
  mockedPostJson.mockImplementation(async (_path, body) => {
    const { task } = body as Body;
    const queue = queues[task];
    if (!queue?.length) throw new Error(`Unexpected ${task} call`);
    const reply = queue.length > 1 ? queue.shift() : queue[0];
    return { content: JSON.stringify(reply), model: "test-model" } as never;
  });
}

const bodies = () => mockedPostJson.mock.calls.map(([, body]) => body as Body);

const run = (messages: ChatMessage[] = GOLDEN_TRANSCRIPT, docMarkdown = GOLDEN_DOC, finalCode = GOLDEN_FINAL) =>
  runAssessment({ caseDefinition: COMMUNITY_ROOM_CASE, messages, docMarkdown, finalCode });

const evidenceWith = (factId: string, patch: Record<string, unknown>) => ({
  ...GOLDEN_EVIDENCE_REPLY,
  facts: GOLDEN_EVIDENCE_REPLY.facts.map((fact) => (fact.factId === factId ? { ...fact, ...patch } : fact)),
});

beforeEach(() => {
  mockedPostJson.mockReset();
});

describe("runAssessment", () => {
  it("never marks a fact surfaced on a fabricated quote, and drops every unverified quote (§9 test 8)", async () => {
    const fabricated = "I write every booking on a sticky note and then lose them all";
    mockAssess({
      evidence: {
        ...evidenceWith("cr.root-cause", {
          surfaced: { messageIndex: 8, quote: fabricated },
          askedInArea: null,
          docAssertion: { quote: "Sticky notes are lost every single day" },
        }),
        invented: [{ messageIndex: 4, quote: "We also have a rooftop garden" }],
      },
      soundness: GOLDEN_SOUNDNESS_REPLY,
    });

    const result = await run();

    const rootCause = result.found.facts.find((fact) => fact.factId === "cr.root-cause")!;
    expect(rootCause.state).not.toBe("surfaced");
    expect(rootCause).toEqual({ factId: "cr.root-cause", state: "missed" });
    expect(result.fairness.inventedStatements).toEqual([]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(fabricated);
    expect(serialized).not.toContain("rooftop garden");
    expect(serialized).not.toContain("lost every single day");
    expect(result.verification).toEqual({ discardedQuotes: 3 });
  });

  it("rejects quotes attributed to the wrong speaker", async () => {
    mockAssess({
      evidence: evidenceWith("cr.scale", {
        // The engineer's question, passed off as the client stating the fact.
        surfaced: { messageIndex: 3, quote: "how many bookings do you get?" },
        askedInArea: { messageIndex: 4, quote: "We get about 30 bookings a week" },
      }),
      soundness: GOLDEN_SOUNDNESS_REPLY,
    });

    const result = await run();

    expect(result.found.facts.find((fact) => fact.factId === "cr.scale")).toEqual({ factId: "cr.scale", state: "missed" });
  });

  it("marks a fact the client failed to give when asked as client_failed and excludes it (§9 test 9)", async () => {
    const transcript = GOLDEN_TRANSCRIPT.map((message, index) =>
      index === 8 ? { ...message, content: "Oh, people just forget to check the book, I think." } : message,
    );
    const docWithoutR4 = GOLDEN_DOC.split("\n")
      .filter((line) => !line.startsWith("- **R4**"))
      .join("\n");
    mockAssess({
      evidence: evidenceWith("cr.root-cause", {
        surfaced: null,
        askedInArea: { messageIndex: 7, quote: "Why do you think the double bookings happen?" },
      }),
      soundness: {
        ...GOLDEN_SOUNDNESS_REPLY,
        requirements: GOLDEN_SOUNDNESS_REPLY.requirements.filter((item) => item.id !== "R4"),
        requirementsMet: GOLDEN_SOUNDNESS_REPLY.requirementsMet.filter((item) => item.id !== "R4"),
        requirementItems: GOLDEN_SOUNDNESS_REPLY.requirementItems.filter((item) => item.id !== "R4"),
      },
    });

    const result = await run(transcript, docWithoutR4);

    expect(result.found.facts.find((fact) => fact.factId === "cr.root-cause")).toEqual({
      factId: "cr.root-cause",
      state: "client_failed",
      messageIndex: 7,
      quote: "Why do you think the double bookings happen?",
    });
    expect(result.fairness.clientFailed).toEqual(["cr.root-cause"]);
    expect(result.links.funnel["cr.root-cause"]).toBe("client_failed");
    expect(result.links.dropped).toEqual([]);
    const summary = summarize(result, COMMUNITY_ROOM_CASE.facts);
    expect(summary.excludedFacts).toEqual(["cr.root-cause"]);
    expect(summary.factsFound).toEqual({ found: 3, total: 3 });
    expect(summary.onProbeFound).toEqual({ found: 0, total: 0 });
  });

  it("produces a valid result for the golden run", async () => {
    mockAssess({ evidence: GOLDEN_EVIDENCE_REPLY, soundness: GOLDEN_SOUNDNESS_REPLY });

    const result = await run();

    expect(result).toMatchObject({
      caseId: "community-room",
      model: "test-model",
      fairness: { clientFailed: [], inventedStatements: [] },
      links: {
        funnel: {
          "cr.current": "given",
          "cr.scale": "carried_through",
          "cr.bookers": "carried_through",
          "cr.root-cause": "carried_through",
          "cr.staff": "carried_through",
        },
        dropped: [],
        notDrawn: [],
        unjustified: [],
      },
    });
    expect(result.soundness.expectedDecisions.every((item) => item.rating === "well")).toBe(true);
    expect(result.soundness.requirementsMet.map((item) => item.id)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    expect(result.soundness.similar).toEqual([]);
    expect(result.soundness.requirementItems.map((item) => item.id)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    expect(result.soundness.decisionItems).toHaveLength(5);
    expect(result.soundness.sketchItems).toHaveLength(5);
    expect(result.soundness.sketchIntegration.map((item) => item.id)).toEqual(["D1", "D2", "D3", "D4", "D5"]);
    expect(summarize(result, COMMUNITY_ROOM_CASE.facts)).toMatchObject({
      factsFound: { found: 4, total: 4 },
      onProbeFound: { found: 1, total: 1 },
      carriedThrough: { found: 4, total: 4 },
      unexplainedBoxes: 0,
      expectedAddressed: { found: 5, total: 5 },
    });
    expect(bodies().map((body) => body.task)).toEqual(["evidence", "soundness"]);
    expect(bodies()[0].facts.map((fact) => fact.id)).toEqual(COMMUNITY_ROOM_CASE.facts.map((fact) => fact.id));
  });

  it("retries only the section that failed validation", async () => {
    mockAssess({
      evidence: [{ facts: GOLDEN_EVIDENCE_REPLY.facts }, { invented: [] }],
      soundness: [
        { ...GOLDEN_SOUNDNESS_REPLY, sketches: [{ id: "D9", rating: "sound", reason: "?" }] },
        { sketches: GOLDEN_SOUNDNESS_REPLY.sketches },
      ],
    });

    const result = await run();

    expect(bodies().map((body) => [body.task, body.retrySections])).toEqual([
      ["evidence", undefined],
      ["evidence", ["invented"]],
      ["soundness", undefined],
      ["soundness", ["sketches"]],
    ]);
    expect(result.links.funnel["cr.staff"]).toBe("carried_through");
    expect(result.soundness.sketches).toHaveLength(5);
  });

  it("drops unknown ids from similar groups, and groups left with fewer than two", async () => {
    mockAssess({
      evidence: GOLDEN_EVIDENCE_REPLY,
      soundness: {
        ...GOLDEN_SOUNDNESS_REPLY,
        similar: [
          { kind: "decisions", ids: ["D1", "D5", "D9"], reason: "Both are about the calendar." },
          { kind: "requirements", ids: ["R1", "R9"], reason: "Only one of these exists." },
          { kind: "sketches", ids: ["D2", "D2"], reason: "The same sketch twice." },
        ],
      },
    });

    const result = await run();

    expect(result.soundness.similar).toEqual([
      { kind: "decisions", ids: ["D1", "D5"], reason: "Both are about the calendar." },
    ]);
  });

  it("retries requirementsMet when it rates a requirement that doesn't exist, and drops unknown boxes", async () => {
    const met = GOLDEN_SOUNDNESS_REPLY.requirementsMet;
    mockAssess({
      evidence: GOLDEN_EVIDENCE_REPLY,
      soundness: [
        { ...GOLDEN_SOUNDNESS_REPLY, requirementsMet: [...met, { id: "R9", rating: "met", nodeIds: [], reason: "?" }] },
        { requirementsMet: met.map((item) => ({ ...item, nodeIds: ["Calendar", "Nowhere"] })) },
      ],
    });

    const result = await run();

    expect(bodies().map((body) => [body.task, body.retrySections])).toEqual([
      ["evidence", undefined],
      ["soundness", undefined],
      ["soundness", ["requirementsMet"]],
    ]);
    expect(result.soundness.requirementsMet.every((item) => item.nodeIds.join() === "Calendar")).toBe(true);
  });

  it("retries only the per-item section that rates a sketch that doesn't exist", async () => {
    mockAssess({
      evidence: GOLDEN_EVIDENCE_REPLY,
      soundness: [
        { ...GOLDEN_SOUNDNESS_REPLY, sketchItems: [...GOLDEN_SOUNDNESS_REPLY.sketchItems, { id: "D9", rating: "sound", reason: "?" }] },
        { sketchItems: GOLDEN_SOUNDNESS_REPLY.sketchItems },
      ],
    });

    const result = await run();

    expect(bodies().map((body) => [body.task, body.retrySections])).toEqual([
      ["evidence", undefined],
      ["soundness", undefined],
      ["soundness", ["sketchItems"]],
    ]);
    expect(result.soundness.sketchItems.map((item) => item.id)).toEqual(["D1", "D2", "D3", "D4", "D5"]);
  });

  it("retries only the integration section when it rates a sketch that doesn't exist", async () => {
    const integration = GOLDEN_SOUNDNESS_REPLY.sketchIntegration;
    mockAssess({
      evidence: GOLDEN_EVIDENCE_REPLY,
      soundness: [
        { ...GOLDEN_SOUNDNESS_REPLY, sketchIntegration: [...integration, { id: "D9", rating: "sound", reason: "?" }] },
        { sketchIntegration: integration },
      ],
    });

    const result = await run();

    expect(bodies().map((body) => [body.task, body.retrySections])).toEqual([
      ["evidence", undefined],
      ["soundness", undefined],
      ["soundness", ["sketchIntegration"]],
    ]);
    expect(result.soundness.sketchIntegration).toHaveLength(5);
  });

  it("asks the AI about an ambiguous fact ↔ requirement pair and uses its verdict", async () => {
    mockAssess({
      evidence: evidenceWith("cr.staff", {
        surfaced: { messageIndex: 10, quote: "Just me and one other staff member, on alternating shifts" },
      }),
      match: { matches: [{ pairId: "p1", statesFact: true, reason: "R5 states who runs the desk." }] },
      soundness: GOLDEN_SOUNDNESS_REPLY,
    });

    const result = await run();

    const matchBody = bodies().find((body) => body.task === "match")!;
    expect(matchBody.evidence.pairs).toEqual([
      expect.objectContaining({ pairId: "p1", factId: "cr.staff", requirementId: "R5" }),
    ]);
    expect(result.links.funnel["cr.staff"]).toBe("carried_through");
  });

  it("skips the surfaced check for facts with no cue in any client message", async () => {
    const transcript = GOLDEN_TRANSCRIPT.slice(0, 7);
    mockAssess({ evidence: GOLDEN_EVIDENCE_REPLY, soundness: GOLDEN_SOUNDNESS_REPLY });

    const result = await run(transcript);

    const evidenceBody = bodies()[0];
    const rootCause = evidenceBody.facts.find((fact) => fact.id === "cr.root-cause") as { checkSurfaced?: boolean };
    expect(rootCause.checkSurfaced).toBe(false);
    // The mocked reply claims message 8, which isn't in this transcript: never surfaced.
    expect(result.found.facts.find((fact) => fact.factId === "cr.root-cause")?.state).not.toBe("surfaced");
  });

  it("skips the soundness call when the doc has no requirements or decisions", async () => {
    mockAssess({ evidence: { facts: GOLDEN_EVIDENCE_REPLY.facts.map((fact) => ({ ...fact, surfaced: null, askedInArea: null })), invented: [] } });

    const result = await run(GOLDEN_TRANSCRIPT.slice(0, 1), "", "");

    expect(bodies().map((body) => body.task)).toEqual(["evidence"]);
    expect(result.soundness.expectedDecisions.every((item) => item.rating === "not_addressed")).toBe(true);
    expect(result.soundness).toMatchObject({
      requirementsMet: [],
      similar: [],
      requirementItems: [],
      decisionItems: [],
      sketchItems: [],
      sketchIntegration: [],
    });
    expect(result.found.facts.filter((fact) => fact.state === "missed")).toHaveLength(4);
  });

  it("throws after three invalid replies", async () => {
    mockAssess({ evidence: { facts: "nope", invented: [] } });

    await expect(run()).rejects.toThrow(/evidence step failed after 3 attempts/);
  });
});
