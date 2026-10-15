import { describe, expect, it } from "vitest";
import { levelOutcomes, summaryNumbers } from "../assessment/reportModel";
import { checkConsistency } from "../designDoc/consistency";
import { extractFinalDiagram } from "../designDoc/finalSection";
import { lintDesignDoc } from "../designDoc/lint";
import { parseDesignDoc } from "../designDoc/parse";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../designDoc/template";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "./community-room.seed";

const states = (review: typeof COMMUNITY_ROOM_SEED.review) => Object.fromEntries(review.ask.facts.map((fact) => [fact.factId, fact.state]));
const verdicts = (review: typeof COMMUNITY_ROOM_SEED.review) => Object.fromEntries(review.justify.items.map((item) => [item.itemId, item.verdict]));

describe("community-room seed (the flawed sample attempt, loaded by the Flawed example button)", () => {
  const { review } = COMMUNITY_ROOM_SEED;

  it("ends the design doc with the final diagram as a Mermaid block", () => {
    expect(COMMUNITY_ROOM_SEED.docMarkdown.trimEnd().endsWith("```")).toBe(true);
    expect(COMMUNITY_ROOM_SEED.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(COMMUNITY_ROOM_SEED.docMarkdown)).toBe(COMMUNITY_ROOM_SEED.finalCode);
    expect(extractFinalDiagram(EMPTY_DESIGN_DOC_TEMPLATE)).toBe("flowchart TD");
  });

  it("verifies every quote in its review", () => {
    expect(review.verification).toEqual({ discardedQuotes: 0 });
  });

  it("Gate: a client failure, an invented price and a failed reply", () => {
    expect(review.gate.clientFailed).toEqual([
      { factId: "cr.scale", messageIndex: 3, quote: "How many bookings do you get in a typical week?" },
    ]);
    expect(review.gate.inventedSpecifics).toEqual([{ messageIndex: 8, text: "$20" }]);
    expect(review.gate.failedReplies).toEqual([6]);
    expect(review.gate.sessionComplete).toBe(false);
  });

  it("Ask and Keep: a fact at every stop of the funnel", () => {
    expect(states(review)).toEqual({
      "cr.current": "given",
      "cr.scale": "client_failed",
      "cr.bookers": "carried_through",
      "cr.root-cause": "missed",
      "cr.staff": "dropped",
    });
    expect(review.ask.onProbe).toEqual({ found: 0, eligible: 1 });
    expect(review.keep).toMatchObject({
      givenCarried: { carried: 1, total: 1 },
      uncitedRequirements: ["R3", "R4"],
      unsupportedDecisions: ["D4"],
      unjustifiedNodes: ["Printer"],
      unexplainedEdges: [
        { from: "Resident", to: "Staff" },
        { from: "Staff", to: "Desk" },
        { from: "Calendar", to: "Printer" },
      ],
    });
    expect(checkConsistency(parseDesignDoc(COMMUNITY_ROOM_SEED.docMarkdown, COMMUNITY_ROOM_SEED.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, COMMUNITY_ROOM_SEED.messages)).inconsistentDecisions).toEqual([]);
  });

  it("Justify: skipped items, a split vote, and every verdict", () => {
    const items = verdicts(review);
    for (const id of ["R3", "R4", "D1", "D4", "D5", "D3-sketch", "D5-sketch"]) expect(items[id]).toBe("skipped_lint");
    expect(items.D2).toBe("uncertain");
    expect(review.justify.items.find((item) => item.itemId === "D2")?.runs).toEqual(["sound", "sound", "weak"]);
    expect(new Set(Object.values(items))).toEqual(new Set(["sound", "weak", "unsound", "uncertain", "skipped_lint"]));
  });

  it("Fit: partly handled scenarios with a code flag, and one marked not handled", () => {
    expect(review.fit.scenarios.map((scenario) => [scenario.scenarioId, scenario.verdict, scenario.method])).toEqual([
      ["sc.clash", "partly", "ai_verified_quote"],
      ["sc.no-smartphone", "partly", "ai_verified_quote"],
      ["sc.right-size", "not_handled", "code"],
    ]);
    expect(review.fit.scenarios[1].codeFlags).toEqual(["No picked box is a [datastore]."]);
  });

  it("gives the report real numbers and a failing check at each level", () => {
    expect(summaryNumbers(review)).toEqual({
      onProbe: { found: 0, eligible: 1 },
      carriedThrough: { carried: 1, found: 2 },
      unjustifiedBoxes: 1,
      assumedSilently: 0,
    });
    expect(levelOutcomes(review)).toEqual({ gate: "fail", ask: "fail", keep: "fail", justify: "fail", fit: "fail" });
    expect(review.process.stopBucket).toBe("covered");
  });
});

describe("community-room complete example (the model answer /simple opens with in practice mode)", () => {
  const seed = COMMUNITY_ROOM_COMPLETE_SEED;
  const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);

  it("ends the design doc with the model answer's final diagram", () => {
    expect(seed.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(seed.docMarkdown)).toBe(COMMUNITY_ROOM_CASE.modelAnswerFinalDiagram);
  });

  it("has no format or consistency problems", () => {
    expect(lintDesignDoc(doc, seed.docMarkdown)).toEqual([]);
    expect(checkConsistency(doc).issues).toEqual([]);
  });

  it("comes with a verified review that carries every fact through and finds a few small things", () => {
    const { review } = seed;
    expect(review.verification).toEqual({ discardedQuotes: 0 });
    expect(review.gate).toMatchObject({ clientFailed: [], inventedSpecifics: [], leaks: [], phantoms: [], sessionComplete: true });
    expect(Object.values(states(review))).toEqual(["given", "carried_through", "carried_through", "carried_through", "carried_through"]);
    expect(review.ask.onProbe).toEqual({ found: 1, eligible: 1 });
    expect(review.keep).toMatchObject({ givenCarried: { carried: 1, total: 1 }, uncitedRequirements: [], unsupportedDecisions: [], unjustifiedNodes: [], unexplainedEdges: [] });
    const items = verdicts(review);
    expect(Object.entries(items).filter(([, verdict]) => verdict !== "sound").map(([id]) => id)).toEqual(["R2", "D3", "D5-sketch"]);
    expect(review.fit.scenarios.every((scenario) => scenario.verdict === "handled" && scenario.codeFlags.length === 0)).toBe(true);
    expect(levelOutcomes(review)).toEqual({ gate: "pass", ask: "pass", keep: "pass", justify: "pass", fit: "pass" });
    expect(review.process.stopBucket).toBe("enough_to_start");
  });
});
