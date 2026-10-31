import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMMUNITY_ROOM_CASE } from "@/cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED } from "@/examples/community-room/seed";
import { GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "@/examples/community-room/fixtures";
import type { ChatMessage } from "@/lib/types";
import { runAssessment } from "./run";
import type { ExtraProgress, LevelProgress } from "./run";

const postJson = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ postJson }));

type Body = { task: string; evidence: Record<string, unknown> };

/** The versioned judge prompts, so a fake reply carries the version the real server would send. */
const PROMPT_VERSIONS: Record<string, string> = { turns: "turns-1", bano: "bano-1", scenario_adequacy: "scenario-adequacy-1", rationale: "rationale-1", iso: "iso-25010-1" };

/** A fake judge: every justify item is sound with a quote from its own text; every scenario handled. */
function fakeJudge(overrides: Partial<Record<string, (body: Body) => unknown>> = {}) {
  postJson.mockImplementation(async (_path: string, body: Body) => {
    const custom = overrides[body.task];
    if (custom) {
      const version = PROMPT_VERSIONS[body.task];
      return { content: JSON.stringify(custom(body)), model: "judge-model", ...(version ? { promptVersion: version } : {}) };
    }
    if (body.task === "justify") {
      const items = (body.evidence.items as { itemId: string; text: string }[]).map((item) => ({
        itemId: item.itemId,
        verdict: "sound",
        reason: "Follows.",
        quotes: [{ source: "doc", text: item.text.split(" ").slice(0, 3).join(" ") }],
      }));
      return { content: JSON.stringify({ items }), model: "judge-model" };
    }
    if (body.task === "fit") {
      const scenarios = (body.evidence.scenarios as { scenarioId: string; oneLiner: string }[]).map((scenario) => ({
        scenarioId: scenario.scenarioId,
        verdict: "handled",
        reason: "Covered.",
        quotes: [{ source: "answer", text: scenario.oneLiner }],
      }));
      return { content: JSON.stringify({ scenarios }), model: "judge-model" };
    }
    if (body.task === "assertion") return { content: JSON.stringify({ facts: [] }), model: "judge-model" };
    if (body.task === "match") return { content: JSON.stringify({ matches: [] }), model: "judge-model" };
    if (body.task === "suggest") return { content: JSON.stringify({ suggestions: [] }), model: "judge-model" };
    if (body.task === "turns") return { content: JSON.stringify({ turns: [] }), model: "judge-model", promptVersion: "turns-1" };
    if (body.task === "scenario_adequacy") return { content: JSON.stringify({ scenarios: [] }), model: "judge-model" };
    if (body.task === "rationale") return { content: JSON.stringify({ links: [] }), model: "judge-model" };
    if (body.task === "iso") return { content: JSON.stringify({ characteristics: [] }), model: "judge-model", promptVersion: "iso-25010-1" };
    if (body.task === "bano") {
      const items = (body.evidence.items as { id: string }[]).map((item) => ({ id: item.id, observed: false, evidence: [] }));
      return { content: JSON.stringify({ items }), model: "judge-model", promptVersion: "bano-1" };
    }
    throw new Error(`unexpected task ${body.task}`);
  });
}

const tasks = () => postJson.mock.calls.map(([, body]) => (body as Body).task);
const ended = { at: 1, how: "button" as const, reason: "I have enough to start" };

// A block body: a function returned from beforeEach would be run as a cleanup hook.
beforeEach(() => {
  postJson.mockReset();
});

describe("runAssessment", () => {
  it("runs Justify three times and Fit once, then assembles a verified review", async () => {
    fakeJudge();
    const progress: LevelProgress[] = [];
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment(
      {
        caseDefinition: COMMUNITY_ROOM_CASE,
        messages: seed.messages,
        docMarkdown: seed.docMarkdown,
        finalCode: seed.finalCode,
        mode: "practice",
        interviewEnd: ended,
        answers: seed.answers,
      },
      { onProgress: (update) => progress.push(update) },
    );
    // R6 cites the message that gave the scale fact without naming it, so Ask asks the match question.
    expect(tasks()).toEqual(["turns", "match", "justify", "justify", "justify", "fit", "scenario_adequacy", "rationale", "bano", "bano", "bano", "suggest", "iso"]);
    expect(result.justify.items.every((item) => item.verdict === "sound" && item.runs.length === 3)).toBe(true);
    expect(result.fit.scenarios.every((scenario) => scenario.verdict === "handled")).toBe(true);
    expect(result.verification.discardedQuotes).toBe(0);
    expect(result.model).toBe("judge-model");
    expect(result.mode).toBe("practice");
    expect(progress.filter((step) => step.status !== "running").map((step) => [step.level, step.status])).toEqual([
      ["gate", "done"],
      ["ask", "done"],
      ["keep", "done"],
      ["justify", "done"],
      ["fit", "done"],
    ]);
    // The rubric anchors go to the judge with the items.
    const justifyBody = postJson.mock.calls.find(([, body]) => (body as Body).task === "justify")![1] as Body;
    expect(justifyBody.evidence.rubricAnchors).toEqual(COMMUNITY_ROOM_CASE.rubricAnchors);
  });

  it("reports rationale, Bano and ISO critique progress beside the levels", async () => {
    fakeJudge();
    const progress: LevelProgress[] = [];
    const extra: ExtraProgress[] = [];
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment(
      {
        caseDefinition: COMMUNITY_ROOM_CASE,
        messages: seed.messages,
        docMarkdown: seed.docMarkdown,
        finalCode: seed.finalCode,
        mode: "practice",
        interviewEnd: ended,
        answers: seed.answers,
      },
      { onProgress: (update) => progress.push(update), onExtraProgress: (update) => extra.push(update) },
    );
    expect(progress.map((step) => step.level)).not.toContain("bano");
    expect(progress.map((step) => step.level)).not.toContain("rationale");
    expect(progress.map((step) => step.level)).not.toContain("iso");
    expect(extra.map((step) => [step.check, step.status])).toEqual([
      ["rationale", "running"],
      ["rationale", "done"],
      ["bano", "running"],
      ["bano", "done"],
      ["iso", "running"],
      ["iso", "done"],
    ]);
    expect(result.process.bano?.items).toHaveLength(33);
    expect(result.process.bano?.promptVersion).toBe("bano-1");
    // The judge said no to every item it was asked about, three times over.
    expect(result.process.bano?.items.find((item) => item.id === "QF1")?.status).toBe("not_observed");
  });

  it("still reports the code rules when the interview-mistake judge fails", async () => {
    fakeJudge({
      bano: () => {
        throw new Error("the server doesn't know this task");
      },
    });
    const extra: ExtraProgress[] = [];
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment(
      {
        caseDefinition: COMMUNITY_ROOM_CASE,
        messages: seed.messages,
        docMarkdown: seed.docMarkdown,
        finalCode: seed.finalCode,
        mode: "practice",
        interviewEnd: ended,
        answers: seed.answers,
      },
      { onExtraProgress: (update) => extra.push(update) },
    );
    expect(extra.findLast((step) => step.check === "bano")).toMatchObject({ check: "bano", status: "skipped" });
    // The code rules are unaffected; only the judged items are left undecided.
    expect(result.process.bano?.items.find((item) => item.id === "CI1")?.status).toBe("not_observed");
    expect(result.process.bano?.items.find((item) => item.id === "QF1")?.status).toBe("uncertain");
    expect(result.process.bano?.promptVersion).toBeUndefined();
  });

  it("carries the turns judge's labels into the elicitation measures", async () => {
    // Label each interviewer turn probe/clarify/finish in turn, targeting whatever was still hidden,
    // so the strategy measures have something behind them rather than falling back to unclassified.
    fakeJudge({
      turns: (body) => ({
        turns: (body.evidence.turns as { messageIndex: number; remainingRequirements: { id: string }[] }[]).map((turn, index) => ({
          messageIndex: turn.messageIndex,
          action_type: index === 0 ? "clarify" : "probe",
          is_relevant_to_implicit_requirements: turn.remainingRequirements.length > 0,
          relevant_implicit_requirement_ids: turn.remainingRequirements.slice(0, 1).map((fact) => fact.id),
          reasoning: "Targets what the client has not said yet.",
        })),
      }),
    });
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: seed.messages,
      docMarkdown: seed.docMarkdown,
      finalCode: seed.finalCode,
      mode: "practice",
      interviewEnd: ended,
      answers: seed.answers,
    });

    const elicitation = result.process.elicitation!;
    expect(elicitation.labelsAvailable).toBe(true);
    expect(elicitation.labelErrors).toBeUndefined();
    expect(elicitation.promptVersion).toBe("turns-1");
    // Every interviewer turn is classified, so the Action column is never blank.
    expect(elicitation.turns.filter((turn) => turn.actionType === "unclassified")).toEqual([]);
    expect(elicitation.turns.some((turn) => turn.actionType === "clarify")).toBe(true);
    expect(elicitation.turns.some((turn) => turn.actionType === "probe")).toBe(true);
    // Targets survive the allow-list filter, so questioning turns, ESR and TKQR all have denominators.
    expect(elicitation.turns.some((turn) => turn.targetIds.length > 0)).toBe(true);
    expect(elicitation.turns.some((turn) => turn.keyQuestion)).toBe(true);
    expect(elicitation.probingEsr.value).not.toBeNull();
    expect(elicitation.tkqr.denominator).toBeGreaterThan(0);
    expect(elicitation.tkqr.value).not.toBeNull();
    expect(elicitation.ire).toMatchObject({ numerator: 4, denominator: 4 });
  });

  it("sends the transcript once and classifies a whole interview in one call", async () => {
    fakeJudge();
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: seed.messages,
      docMarkdown: seed.docMarkdown,
      finalCode: seed.finalCode,
      mode: "practice",
      interviewEnd: ended,
      answers: seed.answers,
    });

    const turnCalls = postJson.mock.calls.filter(([, body]) => (body as Body).task === "turns");
    expect(turnCalls).toHaveLength(1);
    const evidence = (turnCalls[0][1] as Body).evidence;
    expect(evidence.transcript).toHaveLength(seed.messages.length);
    // Each turn carries its index and what was still hidden, not its own copy of the conversation.
    expect((evidence.turns as Record<string, unknown>[])[0]).not.toHaveProperty("conversationHistory");
    expect((evidence.turns as Record<string, unknown>[])[0]).toHaveProperty("messageIndex");
  });

  it("says the strategy labels are missing when the turns judge fails", async () => {
    fakeJudge({
      turns: () => {
        throw new Error("rate limited");
      },
    });
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: seed.messages,
      docMarkdown: seed.docMarkdown,
      finalCode: seed.finalCode,
      mode: "practice",
      interviewEnd: ended,
      answers: seed.answers,
    });

    const elicitation = result.process.elicitation!;
    expect(elicitation.labelsAvailable).toBe(false);
    expect(elicitation.labelErrors?.[0]).toContain("rate limited");
    // Coverage is code-measured, so it survives the judge failure.
    expect(elicitation.ire).toMatchObject({ numerator: 4, denominator: 4 });
    expect(elicitation.clarificationEsr.value).toBeNull();
  });

  it("marks optional rationale and ISO critique work unavailable when their judge calls fail", async () => {
    fakeJudge({
      rationale: () => { throw new Error("rationale unavailable"); },
      iso: () => { throw new Error("iso unavailable"); },
    });
    const extra: ExtraProgress[] = [];
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: seed.messages,
      docMarkdown: seed.docMarkdown,
      finalCode: seed.finalCode,
      mode: "practice",
      interviewEnd: ended,
      answers: seed.answers,
    }, { onExtraProgress: (update) => extra.push(update) });
    expect(extra.findLast((step) => step.check === "rationale")?.status).toBe("skipped");
    expect(extra.findLast((step) => step.check === "iso")?.status).toBe("skipped");
    expect(result.keep.traces.length).toBeGreaterThan(0);
  });

  it("drops fabricated quotes: the items become uncertain", async () => {
    fakeJudge({
      justify: (body) => ({
        items: (body.evidence.items as { itemId: string }[]).map((item) => ({
          itemId: item.itemId,
          verdict: "sound",
          quotes: [{ source: "doc", text: "words that are nowhere in the doc" }],
        })),
      }),
    });
    const result = await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: GOLDEN_TRANSCRIPT,
      docMarkdown: GOLDEN_DOC,
      finalCode: GOLDEN_FINAL,
      mode: "research",
      interviewEnd: ended,
      answers: [],
    });
    expect(result.justify.items.every((item) => item.verdict === "uncertain")).toBe(true);
    expect(result.verification.discardedQuotes).toBe(result.justify.items.length * 3);
  });

  it("asks the coach last, and keeps only the advice whose references are in the work", async () => {
    fakeJudge({
      suggest: () => ({
        suggestions: [
          { stage: "ask", text: "Follow a dodged answer with another question.", refs: ["cr.root-cause"] },
          { stage: "keep", text: "This names something that isn't there.", refs: ["R99"] },
        ],
      }),
    });
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: seed.messages,
      docMarkdown: seed.docMarkdown,
      finalCode: seed.finalCode,
      mode: "practice",
      interviewEnd: ended,
      answers: seed.answers,
    });
    // The coach reads the finished levels; the holistic review follows it.
    expect(tasks().slice(-2)).toEqual(["suggest", "iso"]);
    expect(result.suggestions).toEqual([{ level: "ask", text: "Follow a dodged answer with another question.", refs: ["cr.root-cause"] }]);
    expect(result.verification.discardedQuotes).toBe(1);
  });

  it("still returns the review when the coach fails", async () => {
    fakeJudge({
      suggest: () => {
        throw new Error("the coach is down");
      },
    });
    const seed = COMMUNITY_ROOM_COMPLETE_SEED;
    const result = await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: seed.messages,
      docMarkdown: seed.docMarkdown,
      finalCode: seed.finalCode,
      mode: "practice",
      interviewEnd: ended,
      answers: seed.answers,
    });
    expect(result.suggestions).toEqual([]);
    expect(result.justify.items.every((item) => item.verdict === "sound")).toBe(true);
  });

  it("asks the narrow assertion question for a borderline fact, and skips calls with nothing to judge", async () => {
    fakeJudge();
    const unprobed: ChatMessage[] = GOLDEN_TRANSCRIPT.slice(0, 7);
    const doc = "## Requirements\n- **R1** Double bookings keep happening — [Brief](#cs \"double bookings keep happening\")\n";
    const result = await runAssessment({
      caseDefinition: COMMUNITY_ROOM_CASE,
      messages: unprobed,
      docMarkdown: doc,
      finalCode: "",
      mode: "practice",
      interviewEnd: ended,
      answers: COMMUNITY_ROOM_CASE.scenarios.map((scenario) => ({
        scenarioId: scenario.id,
        pickedDecisionIds: [],
        pickedNodeIds: [],
        oneLiner: "",
        notHandled: true,
      })),
    });
    // R1 is judged; every scenario was marked not handled, so Fit needs no call.
    expect(tasks()).toEqual(["turns", "assertion", "justify", "justify", "justify", "rationale", "bano", "bano", "bano", "suggest", "iso"]);
    expect(result.ask.facts.find((fact) => fact.factId === "cr.root-cause")?.state).toBe("missed");
    expect(result.fit.scenarios.every((scenario) => scenario.verdict === "not_handled" && scenario.method === "code")).toBe(true);
  });
});
