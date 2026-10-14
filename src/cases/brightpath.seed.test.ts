import { describe, expect, it } from "vitest";
import { levelOutcomes } from "../assessment/reportModel";
import { checkConsistency } from "../designDoc/consistency";
import { extractFinalDiagram } from "../designDoc/finalSection";
import { lintDesignDoc } from "../designDoc/lint";
import { parseDesignDoc } from "../designDoc/parse";
import { BRIGHTPATH_CASE } from "./brightpath";
import { BRIGHTPATH_COMPLETE_SEED, BRIGHTPATH_SEED } from "./brightpath.seed";

const states = (review: typeof BRIGHTPATH_SEED.review) => Object.fromEntries(review.ask.facts.map((fact) => [fact.factId, fact.state]));
const verdicts = (review: typeof BRIGHTPATH_SEED.review) => Object.fromEntries(review.justify.items.map((item) => [item.itemId, item.verdict]));

describe("brightpath seed (the flawed sample attempt, loaded by the Flawed example button)", () => {
  const { review } = BRIGHTPATH_SEED;

  it("ends the design doc with the final diagram as a Mermaid block", () => {
    expect(BRIGHTPATH_SEED.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(BRIGHTPATH_SEED.docMarkdown)).toBe(BRIGHTPATH_SEED.finalCode);
  });

  it("verifies every quote in its review", () => {
    expect(review.verification).toEqual({ discardedQuotes: 0 });
  });

  it("Gate: a client failure, an invented specific, a failed reply, and an interview stopped by the time cap", () => {
    expect(review.gate.clientFailed).toEqual([
      { factId: "brightpath.5", messageIndex: 7, quote: "Sorry - what phones do your field workers use?" },
    ]);
    expect(review.gate.inventedSpecifics).toEqual([{ messageIndex: 8, text: "fourth" }]);
    expect(review.gate.failedReplies).toEqual([6]);
    expect(review.gate.sessionComplete).toBe(false);
  });

  it("Ask and Keep: a fact at every link of the chain", () => {
    expect(states(review)).toEqual({
      "brightpath.0": "given",
      "brightpath.1": "dropped",
      "brightpath.2": "carried_through",
      "brightpath.3": "not_drawn",
      "brightpath.4": "unused",
      "brightpath.5": "client_failed",
      "brightpath.6": "assumed_openly",
      "brightpath.7": "given",
      "brightpath.8": "given",
      "brightpath.9": "given",
    });
    expect(review.keep).toMatchObject({
      givenCarried: { carried: 1, total: 4 },
      uncitedRequirements: ["R5", "R6"],
      unsupportedDecisions: ["D4"],
      unjustifiedNodes: ["Dashboard"],
    });
    expect(review.keep.unexplainedEdges.length).toBeGreaterThan(0);
  });

  it("Justify: skipped items, a split vote, and weak and unsound verdicts", () => {
    const items = verdicts(review);
    for (const id of ["R5", "R6", "D4", "D6", "D3-sketch", "D6-sketch"]) expect(items[id]).toBe("skipped_lint");
    expect(items.D7).toBe("uncertain");
    expect(items["D4-sketch"]).toBe("unsound");
    expect(items.D1).toBe("weak");
  });

  it("Fit: not handled and partly handled scenarios, with code flags", () => {
    expect(review.fit.scenarios.map((scenario) => [scenario.scenarioId, scenario.verdict])).toEqual([
      ["sc.no-signal", "not_handled"],
      ["sc.unacknowledged", "partly"],
      ["sc.right-size", "not_handled"],
    ]);
    expect(review.fit.scenarios[1].codeFlags).toEqual([
      "`Supervisor` isn't in the sketch of any decision picked for this scenario.",
      "No picked box is a [container].",
      "No picked box is a [datastore].",
    ]);
    expect(review.fit.scenarios[2].codeFlags).toEqual(["No picked box is a [datastore]."]);
    expect(levelOutcomes(review)).toEqual({ gate: "fail", ask: "pass", keep: "fail", justify: "fail", fit: "fail" });
  });
});

describe("brightpath complete example (the strong doc /demo opens with in practice mode)", () => {
  const seed = BRIGHTPATH_COMPLETE_SEED;
  const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, BRIGHTPATH_CASE.briefMarkdown, seed.messages);

  it("ends the design doc with the model answer's final diagram", () => {
    expect(extractFinalDiagram(seed.docMarkdown)).toBe(BRIGHTPATH_CASE.modelAnswerFinalDiagram);
  });

  it("has no format or consistency problems", () => {
    expect(lintDesignDoc(doc, seed.docMarkdown)).toEqual([]);
    expect(checkConsistency(doc).issues).toEqual([]);
  });

  it("comes with a verified review that carries every fact through and finds one small thing", () => {
    const { review } = seed;
    expect(review.verification).toEqual({ discardedQuotes: 0 });
    expect(review.gate).toMatchObject({ clientFailed: [], inventedSpecifics: [], sessionComplete: true });
    expect(Object.values(states(review)).filter((state) => state !== "given").every((state) => state === "carried_through")).toBe(true);
    expect(review.keep.givenCarried).toEqual({ carried: 4, total: 4 });
    // No on-probe facts in this case: the primary measure is n/a.
    expect(review.ask.onProbe).toEqual({ found: 0, eligible: 0 });
    expect(Object.entries(verdicts(review)).filter(([, verdict]) => verdict !== "sound").map(([id]) => id)).toEqual(["D4"]);
    expect(review.fit.scenarios.every((scenario) => scenario.verdict === "handled" && scenario.codeFlags.length === 0)).toBe(true);
    expect(levelOutcomes(review)).toEqual({ gate: "pass", ask: "pass", keep: "pass", justify: "pass", fit: "pass" });
  });
});
