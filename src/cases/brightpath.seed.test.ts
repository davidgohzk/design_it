import { describe, expect, it } from "vitest";
import { designDocChecks, diagramChecks } from "../assessment/pieces";
import { sessionCompletion } from "../assessment/session";
import { summarize } from "../assessment/summary";
import { checkConsistency } from "../designDoc/consistency";
import { extractFinalDiagram } from "../designDoc/finalSection";
import { lintDesignDoc } from "../designDoc/lint";
import { parseDesignDoc } from "../designDoc/parse";
import { BRIGHTPATH_CASE } from "./brightpath";
import { BRIGHTPATH_COMPLETE_SEED, BRIGHTPATH_SEED } from "./brightpath.seed";

describe("brightpath case", () => {
  it("uses the backend persona's fact ids, in order", () => {
    // PERSONAS["brightpath"]["facts"] in design_it_backend/app/prompts.py.
    expect(BRIGHTPATH_CASE.facts.map((fact) => fact.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `brightpath.${index}`),
    );
  });
});

describe("brightpath seed (the flawed sample attempt /demo opens with in practice mode)", () => {
  const doc = parseDesignDoc(
    BRIGHTPATH_SEED.docMarkdown,
    BRIGHTPATH_SEED.finalCode,
    BRIGHTPATH_CASE.briefMarkdown,
    BRIGHTPATH_SEED.messages,
  );
  const { review } = BRIGHTPATH_SEED;

  it("ends the design doc with the final diagram as a Mermaid block", () => {
    expect(BRIGHTPATH_SEED.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(BRIGHTPATH_SEED.docMarkdown)).toBe(BRIGHTPATH_SEED.finalCode);
  });

  it("verifies every quote in its review", () => {
    expect(review.verification).toEqual({ discardedQuotes: 0 });
  });

  it("level 0: a client failure, an invented fact and a failed reply", () => {
    expect(review.fairness.clientFailed).toEqual(["brightpath.5"]);
    expect(review.fairness.inventedStatements).toEqual([
      { messageIndex: 8, quote: "We're also hoping to open an office in a fourth district next year." },
    ]);
    expect(sessionCompletion(BRIGHTPATH_SEED.messages)).toEqual({ completed: false, failedReplies: [6] });
  });

  it("level 1: an assumed fact, and failing 1B / 1C checks next to passing ones", () => {
    expect(review.found.facts.map((fact) => fact.state)).toEqual([
      "given",
      "surfaced",
      "surfaced",
      "surfaced",
      "surfaced",
      "client_failed",
      "assumed",
      "given",
      "given",
      "given",
    ]);
    expect(designDocChecks(doc, BRIGHTPATH_SEED.docMarkdown).map(({ passed, failing }) => ({ passed, failing }))).toEqual([
      { passed: false, failing: ["R5", "R6"] },
      { passed: true, failing: [] },
      { passed: false, failing: ["D6"] },
      { passed: false, failing: ["D4"] },
      { passed: false, failing: ["D4"] },
    ]);
    expect(diagramChecks(doc).map(({ passed, failing }) => ({ passed, failing }))).toEqual([
      { passed: true, failing: [] },
      { passed: false, failing: ["Dashboard"] },
    ]);
  });

  it("level 2: facts end at every link of the chain, and something is lost or unexplained at each", () => {
    expect(review.links).toEqual({
      funnel: {
        "brightpath.0": "given",
        "brightpath.1": "dropped",
        "brightpath.2": "carried_through",
        "brightpath.3": "not_drawn",
        "brightpath.4": "unused",
        "brightpath.5": "client_failed",
        "brightpath.6": "assumed",
        "brightpath.7": "given",
        "brightpath.8": "given",
        "brightpath.9": "given",
      },
      paths: {
        "brightpath.1": { requirements: [], decisions: [], drawn: [] },
        // D6 cites R2 but has no sketch, so only D2 reaches the final diagram.
        "brightpath.2": { requirements: ["R2"], decisions: ["D2", "D6"], drawn: ["D2"] },
        "brightpath.3": { requirements: ["R3"], decisions: ["D3"], drawn: [] },
        "brightpath.4": { requirements: ["R4"], decisions: [], drawn: [] },
      },
      dropped: ["brightpath.1"],
      uncited: ["R6"],
      hiddenAssumptions: ["R5"],
      unused: ["R4", "R5"],
      unsupported: ["D4"],
      // D3 and D6 have no sketch; D5's sketch has a box the final diagram leaves out.
      notDrawn: ["D3", "D5", "D6"],
      unjustified: ["Dashboard"],
      unexplainedEdges: [
        { from: "Server", to: "DB" },
        { from: "Notify", to: "Supervisor" },
        { from: "DB", to: "Dashboard" },
      ],
    });
    expect(checkConsistency(doc).inconsistentDecisions).toEqual(["D5"]);
  });

  it("level 3: every rating on the scale appears", () => {
    const ratings = [...review.soundness.requirements, ...review.soundness.decisions, ...review.soundness.sketches];
    expect(new Set(ratings.map((rating) => rating.rating))).toEqual(new Set(["sound", "weak", "unsound"]));
    expect(new Set(review.soundness.expectedDecisions.map((item) => item.rating))).toEqual(
      new Set(["well", "weakly", "not_addressed"]),
    );
  });

  it("gives the summary strip real numbers", () => {
    expect(summarize(review, BRIGHTPATH_CASE.facts)).toMatchObject({
      factsFound: { found: 4, total: 5 },
      onProbeFound: { found: 0, total: 0 },
      carriedThrough: { found: 1, total: 5 },
      unexplainedBoxes: 1,
      expectedAddressed: { found: 4, total: 5 },
      excludedFacts: ["brightpath.5"],
    });
  });
});

describe("brightpath complete example (the model answer, loaded by the Complete example button)", () => {
  const seed = BRIGHTPATH_COMPLETE_SEED;
  const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, BRIGHTPATH_CASE.briefMarkdown, seed.messages);

  it("ends the design doc with the model answer's final diagram", () => {
    expect(seed.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(seed.docMarkdown)).toBe(BRIGHTPATH_CASE.modelAnswerFinalDiagram);
  });

  it("has no format or consistency problems", () => {
    expect(lintDesignDoc(doc)).toEqual([]);
    expect(checkConsistency(doc).issues).toEqual([]);
    expect(designDocChecks(doc, seed.docMarkdown).every((check) => check.passed)).toBe(true);
    expect(diagramChecks(doc).every((check) => check.passed)).toBe(true);
    expect(sessionCompletion(seed.messages).completed).toBe(true);
  });

  it("comes with a verified review that carries every fact through", () => {
    const { review } = seed;
    expect(review.verification).toEqual({ discardedQuotes: 0 });
    expect(review.fairness).toEqual({ clientFailed: [], inventedStatements: [] });
    expect(review.links.funnel).toEqual({
      "brightpath.0": "given",
      "brightpath.1": "carried_through",
      "brightpath.2": "carried_through",
      "brightpath.3": "carried_through",
      "brightpath.4": "carried_through",
      "brightpath.5": "carried_through",
      "brightpath.6": "carried_through",
      "brightpath.7": "given",
      "brightpath.8": "given",
      "brightpath.9": "given",
    });
    expect(summarize(review, BRIGHTPATH_CASE.facts)).toMatchObject({
      factsFound: { found: 6, total: 6 },
      carriedThrough: { found: 6, total: 6 },
      unexplainedBoxes: 0,
      expectedAddressed: { found: 5, total: 5 },
    });
  });
});
