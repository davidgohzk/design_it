import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { BRIEF, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { parseDesignDoc } from "../designDoc/parse";
import { fitCodeFlags, fitEvidence, fitResults } from "./fit";
import type { ScenarioAnswer } from "./fit";

const doc = parseDesignDoc(GOLDEN_DOC, GOLDEN_FINAL, BRIEF, GOLDEN_TRANSCRIPT);
const clash = COMMUNITY_ROOM_CASE.scenarios.find((scenario) => scenario.id === "sc.clash")!;
const answer = (extra: Partial<ScenarioAnswer>): ScenarioAnswer => ({
  scenarioId: "sc.clash",
  pickedDecisionIds: ["D1", "D3"],
  pickedNodeIds: ["Calendar", "Desk"],
  oneLiner: "The calendar refuses the second booking, so the volunteer is told the slot is taken.",
  notHandled: false,
  ...extra,
});

describe("Fit: code checks on the picks", () => {
  it("accepts a valid pick", () => {
    expect(fitCodeFlags(clash, answer({}), doc)).toEqual([]);
  });

  it("flags a box that isn't in any picked decision's sketch", () => {
    expect(fitCodeFlags(clash, answer({ pickedDecisionIds: ["D1"], pickedNodeIds: ["Calendar", "SMS"] }), doc)).toEqual([
      "`SMS` isn't in the sketch of any decision picked for this scenario.",
    ]);
  });

  it("flags unknown decisions and boxes, and a missing expected box type", () => {
    expect(fitCodeFlags(clash, answer({ pickedDecisionIds: ["D9"], pickedNodeIds: ["Desk", "Printer"] }), doc)).toEqual([
      "D9 isn't a decision in the doc.",
      "`Printer` isn't a box in the diagram.",
      "`Desk` isn't in the sketch of any decision picked for this scenario.",
      "No picked box is a [datastore].",
    ]);
  });
});

describe("Fit: verdicts", () => {
  it("gives Not handled not_handled by code, with no AI call needed", () => {
    const answers = [answer({ notHandled: true, pickedDecisionIds: [], pickedNodeIds: [], oneLiner: "" })];
    expect(fitEvidence(COMMUNITY_ROOM_CASE, answers, doc)).toEqual([]);
    const [result] = fitResults({ caseDefinition: COMMUNITY_ROOM_CASE, answers, doc, docMarkdown: GOLDEN_DOC });
    expect(result).toMatchObject({ scenarioId: "sc.clash", verdict: "not_handled", method: "code", codeFlags: [] });
  });

  it("keeps the judge's verdict only with a verified quote", () => {
    const answers = [answer({})];
    const evidence = fitEvidence(COMMUNITY_ROOM_CASE, answers, doc);
    expect(evidence[0]).toMatchObject({
      scenarioId: "sc.clash",
      expectedDecisions: [expect.objectContaining({ id: "ed.conflicts" }), expect.objectContaining({ id: "ed.single-source" })],
      pickedBoxes: ["Shared booking calendar", "Desk computer"],
    });
    const judged = [
      { scenarioId: "sc.clash", verdict: "handled", reason: "D3 refuses the slot.", quotes: [{ source: "answer", text: "the calendar refuses the second booking" }] },
    ];
    const [handled] = fitResults({ caseDefinition: COMMUNITY_ROOM_CASE, answers, doc, docMarkdown: GOLDEN_DOC, judged });
    expect(handled).toMatchObject({ verdict: "handled", method: "ai_verified_quote", quotes: ["the calendar refuses the second booking"] });

    const discarded = { count: 0 };
    const fabricated = [{ scenarioId: "sc.clash", verdict: "handled", quotes: [{ source: "answer", text: "a queue guarantees order" }] }];
    const [uncertain] = fitResults({ caseDefinition: COMMUNITY_ROOM_CASE, answers, doc, docMarkdown: GOLDEN_DOC, judged: fabricated, discarded });
    expect(uncertain).toMatchObject({ verdict: "uncertain", method: "ai_judgment" });
    expect(discarded.count).toBe(1);
  });

  it("treats an unanswered scenario as not handled", () => {
    const results = fitResults({ caseDefinition: COMMUNITY_ROOM_CASE, answers: [], doc, docMarkdown: GOLDEN_DOC });
    expect(results.map((result) => [result.scenarioId, result.verdict])).toEqual([
      ["sc.clash", "not_handled"],
      ["sc.no-smartphone", "not_handled"],
      ["sc.right-size", "not_handled"],
    ]);
  });
});
