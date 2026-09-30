import { describe, expect, it } from "vitest";
import { designDocChecks, diagramChecks } from "../assessment/pieces";
import { sessionCompletion } from "../assessment/session";
import { summarize } from "../assessment/summary";
import { checkConsistency } from "../designDoc/consistency";
import { lintDesignDoc } from "../designDoc/lint";
import { extractFinalDiagram } from "../designDoc/finalSection";
import { parseDesignDoc } from "../designDoc/parse";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../designDoc/template";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "./community-room.seed";

describe("community-room seed (the flawed sample attempt /simple opens with in practice mode)", () => {
  const doc = parseDesignDoc(
    COMMUNITY_ROOM_SEED.docMarkdown,
    COMMUNITY_ROOM_SEED.finalCode,
    COMMUNITY_ROOM_CASE.briefMarkdown,
    COMMUNITY_ROOM_SEED.messages,
  );
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

  it("level 0: a client failure, an invented fact and a failed reply", () => {
    expect(review.fairness.clientFailed).toEqual(["cr.scale"]);
    expect(review.fairness.inventedStatements).toEqual([
      { messageIndex: 8, quote: "we're hoping to start charging a small fee for the hall next year" },
    ]);
    expect(sessionCompletion(COMMUNITY_ROOM_SEED.messages)).toEqual({ completed: false, failedReplies: [6] });
  });

  it("level 1: a missed on-probe fact, and failing 1B / 1C checks next to passing ones", () => {
    expect(review.found.facts.map((fact) => fact.state)).toEqual([
      "given",
      "client_failed",
      "surfaced",
      "missed",
      "surfaced",
    ]);
    expect(designDocChecks(doc, COMMUNITY_ROOM_SEED.docMarkdown).map(({ passed, failing }) => ({ passed, failing }))).toEqual([
      { passed: false, failing: ["R3", "R4"] },
      { passed: true, failing: [] },
      { passed: false, failing: ["D5"] },
      { passed: false, failing: ["D4"] },
      { passed: false, failing: ["D4"] },
    ]);
    expect(diagramChecks(doc).map(({ passed, failing }) => ({ passed, failing }))).toEqual([
      { passed: true, failing: [] },
      { passed: false, failing: ["Printer"] },
    ]);
  });

  it("level 2: something lost or unexplained at every link", () => {
    expect(review.links).toEqual({
      funnel: {
        "cr.current": "given",
        "cr.scale": "client_failed",
        "cr.bookers": "carried_through",
        "cr.root-cause": "missed",
        "cr.staff": "dropped",
      },
      paths: {
        "cr.bookers": { requirements: ["R2"], decisions: ["D2"], drawn: ["D2"] },
        "cr.staff": { requirements: [], decisions: [], drawn: [] },
      },
      dropped: ["cr.staff"],
      uncited: ["R4"],
      hiddenAssumptions: ["R3"],
      unused: ["R3"],
      unsupported: ["D4"],
      notDrawn: ["D3", "D5"],
      unjustified: ["Printer"],
      unexplainedEdges: [
        { from: "Resident", to: "Staff" },
        { from: "Staff", to: "Desk" },
        { from: "Calendar", to: "Printer" },
      ],
    });
    expect(checkConsistency(doc).inconsistentDecisions).toEqual([]);
  });

  it("level 3: every rating on the scale appears", () => {
    const ratings = [...review.soundness.requirements, ...review.soundness.decisions, ...review.soundness.sketches];
    expect(new Set(ratings.map((rating) => rating.rating))).toEqual(new Set(["sound", "weak", "unsound"]));
    expect(new Set(review.soundness.expectedDecisions.map((item) => item.rating))).toEqual(
      new Set(["well", "weakly", "not_addressed"]),
    );
  });

  it("gives the summary strip real numbers", () => {
    expect(summarize(review, COMMUNITY_ROOM_CASE.facts)).toMatchObject({
      factsFound: { found: 2, total: 3 },
      onProbeFound: { found: 0, total: 1 },
      carriedThrough: { found: 1, total: 3 },
      unexplainedBoxes: 1,
      expectedAddressed: { found: 4, total: 5 },
      excludedFacts: ["cr.scale"],
    });
  });
});

describe("community-room complete example (the model answer, loaded by the Complete example button)", () => {
  const seed = COMMUNITY_ROOM_COMPLETE_SEED;
  const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);

  it("ends the design doc with the model answer's final diagram", () => {
    expect(seed.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(seed.docMarkdown)).toBe(COMMUNITY_ROOM_CASE.modelAnswerFinalDiagram);
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
    expect(Object.values(review.links.funnel)).toEqual([
      "given",
      "carried_through",
      "carried_through",
      "carried_through",
      "carried_through",
    ]);
    expect(summarize(review, COMMUNITY_ROOM_CASE.facts)).toMatchObject({
      factsFound: { found: 4, total: 4 },
      onProbeFound: { found: 1, total: 1 },
      carriedThrough: { found: 4, total: 4 },
      unexplainedBoxes: 0,
      expectedAddressed: { found: 5, total: 5 },
    });
  });
});
