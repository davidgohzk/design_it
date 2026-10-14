import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED } from "../cases/community-room.seed";
import { GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import type { ChatMessage } from "../shared/lib/types";
import { runAssessment } from "./run";
import type { LevelProgress } from "./run";

const postJson = vi.hoisted(() => vi.fn());
vi.mock("../shared/lib/api", () => ({ postJson }));

type Body = { task: string; evidence: Record<string, unknown> };

/** A fake judge: every justify item is sound with a quote from its own text; every scenario handled. */
function fakeJudge(overrides: Partial<Record<string, (body: Body) => unknown>> = {}) {
  postJson.mockImplementation(async (_path: string, body: Body) => {
    const custom = overrides[body.task];
    if (custom) return { content: JSON.stringify(custom(body)), model: "judge-model" };
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
    expect(tasks()).toEqual(["match", "justify", "justify", "justify", "fit"]);
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
    const justifyBody = postJson.mock.calls[1][1] as Body;
    expect(justifyBody.evidence.rubricAnchors).toEqual(COMMUNITY_ROOM_CASE.rubricAnchors);
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
    expect(tasks()).toEqual(["assertion", "justify", "justify", "justify"]);
    expect(result.ask.facts.find((fact) => fact.factId === "cr.root-cause")?.state).toBe("missed");
    expect(result.fit.scenarios.every((scenario) => scenario.verdict === "not_handled" && scenario.method === "code")).toBe(true);
  });
});
