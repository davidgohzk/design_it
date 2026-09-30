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
        { kind: "diagram", ok: true },
        { kind: "diagram", ok: false },
      ],
      diagramTurns: [],
      finalHistory: [],
      finalCode: "",
      result,
    });
    expect(measures).toEqual({
      questions: 5,
      timeToFirstSurfacedFactMs: 40_000, // message 4
      timeOnTaskMs: 600_000,
      diagramPrompts: 2,
      aiCreatedNodeShare: null,
    });
  });

  it("credits a final box to the helper only when the helper drew it before the doc had it", () => {
    const measures = computeProcessMeasures({
      startedAt: 0,
      endedAt: 1,
      messages: [],
      messageTimes: [],
      aiEvents: [],
      diagramTurns: [
        { code: 'flowchart LR\n  Desk["Desk"] --> Calendar[("Calendar")]', at: 1 },
        // Drawn by the helper after the doc already had SMS: still the engineer's.
        { code: 'flowchart LR\n  SMS["SMS"]', at: 3 },
      ],
      finalHistory: [
        { source: "manual", code: 'flowchart LR\n  SMS["SMS"]', at: 2 },
        { source: "manual", code: GOLDEN_FINAL, at: 4 },
      ],
      finalCode: GOLDEN_FINAL,
      result: null,
    });
    // Desk and Calendar came from the helper; SMS, Resident and Staff from the doc.
    expect(measures.aiCreatedNodeShare).toBeCloseTo(2 / 5);
    expect(measures.timeToFirstSurfacedFactMs).toBeNull();
  });
});
