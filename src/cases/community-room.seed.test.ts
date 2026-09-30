import { describe, expect, it } from "vitest";
import { summarize } from "../assessment/summary";
import { checkConsistency } from "../designDoc/consistency";
import { lintDesignDoc } from "../designDoc/lint";
import { parseDesignDoc } from "../designDoc/parse";
import { extractFinalDiagram } from "../designDoc/finalSection";
import { COMMUNITY_ROOM_CASE, EMPTY_DESIGN_DOC_TEMPLATE } from "./community-room";
import { COMMUNITY_ROOM_SEED } from "./community-room.seed";

describe("community-room seed (what /simple opens with in practice mode)", () => {
  const doc = parseDesignDoc(
    COMMUNITY_ROOM_SEED.docMarkdown,
    COMMUNITY_ROOM_SEED.finalCode,
    COMMUNITY_ROOM_CASE.briefMarkdown,
    COMMUNITY_ROOM_SEED.messages,
  );

  it("ends the design doc with the final diagram as a Mermaid block", () => {
    expect(COMMUNITY_ROOM_SEED.docMarkdown.trimEnd().endsWith("```")).toBe(true);
    expect(COMMUNITY_ROOM_SEED.docMarkdown).toContain("## Final diagram\n```mermaid\n");
    expect(extractFinalDiagram(COMMUNITY_ROOM_SEED.docMarkdown)).toBe(COMMUNITY_ROOM_CASE.modelAnswerFinalDiagram);
    expect(extractFinalDiagram(EMPTY_DESIGN_DOC_TEMPLATE)).toBe("flowchart LR");
  });

  it("opens with no format or consistency problems", () => {
    expect(lintDesignDoc(doc)).toEqual([]);
    expect(checkConsistency(doc).issues).toEqual([]);
  });

  it("comes with a verified review that carries every fact through", () => {
    const { review } = COMMUNITY_ROOM_SEED;
    expect(review.verification).toEqual({ discardedQuotes: 0 });
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
