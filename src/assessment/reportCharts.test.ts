import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "../cases/community-room/seed";
import { factFunnel, factStateCounts, sessionTimeline, tagCounts, verdictCounts } from "./reportCharts";

const review = COMMUNITY_ROOM_SEED.review;

describe("factFunnel", () => {
  it("narrows stage by stage, and counts what was lost at each one", () => {
    const stages = factFunnel(review);
    expect(stages.map((stage) => stage.key)).toEqual(["found", "requirement", "decision", "final"]);
    for (let i = 1; i < stages.length; i += 1) {
      expect(stages[i].count).toBeLessThanOrEqual(stages[i - 1].count);
      expect(stages[i].lost).toBe(stages[i - 1].count - stages[i].count);
    }
    expect(stages[0].lost).toBe(0);
  });

  it("loses nothing in the complete example", () => {
    const stages = factFunnel(COMMUNITY_ROOM_COMPLETE_SEED.review);
    expect(stages.every((stage) => stage.lost === 0)).toBe(true);
    expect(stages[3].count).toBe(stages[0].count);
  });
});

describe("factStateCounts", () => {
  it("counts every fact exactly once, in funnel order, each with a tone", () => {
    const slices = factStateCounts(review);
    expect(slices.reduce((sum, slice) => sum + slice.count, 0)).toBe(review.ask.facts.length);
    expect(slices.every((slice) => slice.count > 0 && slice.label.length > 0)).toBe(true);
    expect(slices.map((slice) => slice.key)).toContain("missed");
    // "carried through" is the best state, so it leads the bar.
    expect(slices[0].key).toBe("carried_through");
  });
});

describe("verdictCounts", () => {
  it("counts the judged items and the scenarios by verdict", () => {
    const { justify, fit } = verdictCounts(review);
    expect(justify.reduce((sum, slice) => sum + slice.count, 0)).toBe(review.justify.items.length);
    expect(fit.reduce((sum, slice) => sum + slice.count, 0)).toBe(review.fit.scenarios.length);
    expect(fit.map((slice) => slice.label)).toContain("partly handled");
  });

  it("is empty when there was nothing to judge", () => {
    expect(verdictCounts({ ...review, justify: { items: [] }, fit: { scenarios: [] } })).toEqual({ justify: [], fit: [] });
  });
});

describe("tagCounts", () => {
  it("drops the tags nobody used, and puts the biggest first", () => {
    const rows = tagCounts(COMMUNITY_ROOM_SEED.review);
    expect(rows.every((row) => row.count > 0)).toBe(true);
    expect(rows.map((row) => row.count)).toEqual([...rows.map((row) => row.count)].sort((a, b) => b - a));
    expect(rows.every((row) => !row.label.includes("_"))).toBe(true);
  });
});

describe("sessionTimeline", () => {
  it("has no marks when the transcript has no timestamps", () => {
    expect(sessionTimeline(review, [{ role: "user", content: "hello" }])).toEqual({ marks: [], durationMs: 0 });
  });

  it("places each question, fact and written item on one axis from the first message", () => {
    const start = 1_000_000;
    const messages = [
      { role: "user", content: "a", ts: start },
      { role: "client", content: "b", ts: start + 1000 },
      { role: "user", content: "c", ts: start + 120_000 },
    ];
    const result = { ...review, ask: { ...review.ask, facts: [{ ...review.ask.facts[0], messageIndex: 2 }] } };
    const timeline = sessionTimeline(result, messages, [{ at: start + 60_000, type: "editor", diff: "+- **R1** a thing\n" }]);
    expect(timeline.marks.map((mark) => [mark.kind, mark.atMs])).toEqual([
      ["question", 0],
      ["wrote", 60_000],
      ["question", 120_000],
      ["fact", 120_000],
    ]);
    expect(timeline.durationMs).toBe(120_000);
  });
});
