import { describe, expect, it } from "vitest";
import { decisionPieces, diagramPieces, requirementPieces } from "../assessment/pieces";
import { sessionCompletion } from "../assessment/session";
import { summarize } from "../assessment/summary";
import { checkConsistency } from "../designDoc/consistency";
import { lintDesignDoc } from "../designDoc/lint";
import { extractFinalDiagram } from "../designDoc/finalSection";
import { parseDesignDoc } from "../designDoc/parse";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../designDoc/template";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "./community-room.seed";

const flaggedIds = (list: { flagged: { id: string }[] }) => list.flagged.map((item) => item.id);

describe("community-room seed (the flawed sample attempt, loaded by the Flawed example button)", () => {
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

  it("level 1: template problems item by item, next to clean items", () => {
    // R4's citation doesn't verify, but it has one: that is a level 2 link problem, not a template one.
    expect(requirementPieces(doc)).toEqual({
      total: 5,
      flagged: [{ id: "R3", issues: [{ message: "R3 has no reference to the chat or the brief." }] }],
      general: [],
    });
    const decisions = decisionPieces(doc, COMMUNITY_ROOM_SEED.docMarkdown);
    expect(flaggedIds(decisions)).toEqual(["D4", "D5"]);
    expect(decisions.flagged[0].issues).toHaveLength(2);
    expect(decisions.general).toEqual([]);
    expect(diagramPieces(doc)).toEqual({
      total: 5,
      flagged: [{ id: "final", issues: [{ message: "No decision's sketch has this box.", nodeId: "Printer" }] }],
      general: [],
    });
  });

  it("level 2A: a missed on-probe fact", () => {
    expect(review.found.facts.map((fact) => fact.state)).toEqual([
      "given",
      "client_failed",
      "surfaced",
      "missed",
      "surfaced",
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
      unused: ["R3", "R5"],
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

  it("levels 2 and 3: an item too alike at each stage, and every rating on each scale", () => {
    const perItem = [
      ...review.soundness.requirementItems,
      ...review.soundness.decisionItems,
      ...review.soundness.sketchItems,
    ];
    expect(new Set(perItem.map((item) => item.rating))).toEqual(new Set(["sound", "weak", "unsound"]));
    // D4's queue is wedged into the final diagram as an extra hop.
    expect(review.soundness.sketchIntegration.filter((item) => item.rating !== "sound").map((item) => item.id)).toEqual(["D4"]);
    expect(review.soundness.similar.map(({ kind, ids }) => ({ kind, ids }))).toEqual([
      { kind: "requirements", ids: ["R1", "R5"] },
      { kind: "decisions", ids: ["D3", "D6"] },
      { kind: "sketches", ids: ["D1", "D6"] },
    ]);
    const ratings = [...review.soundness.requirements, ...review.soundness.decisions, ...review.soundness.sketches];
    expect(new Set(ratings.map((rating) => rating.rating))).toEqual(new Set(["sound", "weak", "unsound"]));
    expect(new Set(review.soundness.expectedDecisions.map((item) => item.rating))).toEqual(
      new Set(["well", "weakly", "not_addressed"]),
    );
    expect(new Set(review.soundness.requirementsMet.map((item) => item.rating))).toEqual(new Set(["met", "partly", "not_met"]));
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

describe("community-room complete example (the model answer /simple opens with in practice mode)", () => {
  const seed = COMMUNITY_ROOM_COMPLETE_SEED;
  const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);

  it("ends the design doc with the model answer's final diagram", () => {
    expect(seed.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(seed.docMarkdown)).toBe(COMMUNITY_ROOM_CASE.modelAnswerFinalDiagram);
  });

  it("has no format or consistency problems", () => {
    expect(lintDesignDoc(doc)).toEqual([]);
    expect(checkConsistency(doc).issues).toEqual([]);
    expect(flaggedIds(requirementPieces(doc))).toEqual([]);
    expect(decisionPieces(doc, seed.docMarkdown)).toMatchObject({ flagged: [], general: [] });
    expect(flaggedIds(diagramPieces(doc))).toEqual([]);
    expect(sessionCompletion(seed.messages).completed).toBe(true);
  });

  it("comes with a verified review that carries every fact through and finds a few small things", () => {
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
    expect(review.soundness.requirementsMet.filter((item) => item.rating !== "met").map((item) => item.id)).toEqual(["R7"]);
    expect(review.soundness.requirements.filter((item) => item.rating !== "sound").map((item) => item.id)).toEqual(["R2"]);
    // On its own, R7's "simple" can't be checked, and D3's "none significant" hides a cost.
    expect(review.soundness.requirementItems.filter((item) => item.rating !== "sound").map((item) => item.id)).toEqual(["R7"]);
    expect(review.soundness.decisionItems.filter((item) => item.rating !== "sound").map((item) => item.id)).toEqual(["D3"]);
    expect(review.soundness.sketchItems.every((item) => item.rating === "sound")).toBe(true);
    // D1 and D5 both sketch only the calendar, which the AI flags as too alike.
    expect(review.soundness.similar).toEqual([
      expect.objectContaining({ kind: "sketches", ids: ["D1", "D5"] }),
    ]);
  });
});
