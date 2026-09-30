import { describe, expect, it } from "vitest";
import { summarize } from "../assessment/summary";
import { checkConsistency } from "../designDoc/consistency";
import { lintDesignDoc } from "../designDoc/lint";
import { parseDesignDoc } from "../designDoc/parse";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import { COMMUNITY_ROOM_SEED } from "./community-room.seed";

describe("community-room seed (what /simple opens with in practice mode)", () => {
  const doc = parseDesignDoc(
    COMMUNITY_ROOM_SEED.docMarkdown,
    COMMUNITY_ROOM_SEED.finalCode,
    COMMUNITY_ROOM_CASE.briefMarkdown,
    COMMUNITY_ROOM_SEED.messages,
  );

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
