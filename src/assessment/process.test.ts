import { describe, expect, it } from "vitest";
import { GOLDEN_FINAL, GOLDEN_FOUND, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { computeProcessMeasures } from "./process";
import type { AssessmentResult } from "./types";

const result = { found: { facts: GOLDEN_FOUND } } as AssessmentResult;
const times = GOLDEN_TRANSCRIPT.map((_, index) => 1_000 + index * 10_000);

describe("computeProcessMeasures", () => {
  it("counts questions, prompts and time, and finds the first surfaced fact", () => {
    const measures = computeProcessMeasures({
      startedAt: 1_000,
      endedAt: 601_000,
      messages: GOLDEN_TRANSCRIPT,
      messageTimes: times,
      aiEvents: [
        { kind: "sketch", ok: true },
        { kind: "sketch", ok: false },
        { kind: "final", ok: true },
      ],
      finalHistory: [],
      finalCode: "",
      result,
    });
    expect(measures).toEqual({
      questions: 5,
      timeToFirstSurfacedFactMs: 40_000, // message 4
      timeOnTaskMs: 600_000,
      sketchPrompts: 2,
      finalPrompts: 1,
      aiCreatedNodeShare: null,
    });
  });

  it("credits each final box to the turn that first drew it", () => {
    const measures = computeProcessMeasures({
      startedAt: 0,
      endedAt: 1,
      messages: [],
      messageTimes: [],
      aiEvents: [],
      finalHistory: [
        { source: "ai", code: 'flowchart LR\n  Desk["Desk"] --> Calendar[("Calendar")]', at: 1 },
        { source: "manual", code: GOLDEN_FINAL, at: 2 },
      ],
      finalCode: GOLDEN_FINAL,
      result: null,
    });
    // Desk and Calendar came from the AI; Resident, Staff and SMS were added by hand.
    expect(measures.aiCreatedNodeShare).toBeCloseTo(2 / 5);
    expect(measures.timeToFirstSurfacedFactMs).toBeNull();
  });
});
