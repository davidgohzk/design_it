import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_COMPLETE_SEED } from "@/examples/community-room/seed";
import { GOLDEN_TRANSCRIPT } from "@/examples/community-room/fixtures";
import { computeProcessMeasures } from "./process";

const result = COMMUNITY_ROOM_COMPLETE_SEED.review;
const times = GOLDEN_TRANSCRIPT.map((_, index) => 1_000 + index * 10_000);

describe("computeProcessMeasures", () => {
  it("counts questions and time, and finds the first surfaced fact", () => {
    const measures = computeProcessMeasures({
      startedAt: 1_000,
      endedAt: 601_000,
      messages: GOLDEN_TRANSCRIPT,
      messageTimes: times,
      result,
    });
    expect(measures).toEqual({
      questions: 5,
      timeToFirstSurfacedFactMs: 40_000, // message 4
      timeOnTaskMs: 600_000,
    });
  });

  it("reports no first surfaced fact when there is no review", () => {
    const measures = computeProcessMeasures({
      startedAt: 0,
      endedAt: 1,
      messages: [],
      messageTimes: [],
      result: null,
    });
    expect(measures.timeToFirstSurfacedFactMs).toBeNull();
  });
});
