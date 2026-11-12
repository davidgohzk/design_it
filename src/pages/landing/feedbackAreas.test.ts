import { describe, expect, it } from "vitest";
import { FEEDBACK_AREAS, INITIAL_AREA, headline, type FeedbackArea } from "./feedbackAreas";
import { FACTS } from "./traceMap";

const area = <Id extends FeedbackArea["id"]>(id: Id) => FEEDBACK_AREAS.find((a) => a.id === id) as Extract<FeedbackArea, { id: Id }>;

describe("feedback areas", () => {
  it("covers the whole product in reading order, starting on traceability", () => {
    expect(FEEDBACK_AREAS.map((a) => a.id)).toEqual(["interview", "traceability", "decisions", "quality"]);
    expect(INITIAL_AREA).toBe("traceability");
  });

  it("leads each card with a number derived from its rows", () => {
    expect(FEEDBACK_AREAS.map(headline)).toEqual(["6 of 9 facts found", "1 dropped", "1 of 3 scenarios fails", "3 notes"]);
  });

  it("counts every fact the trace map follows as found in the interview, walk-ins included", () => {
    const found = new Set(area("interview").facts.filter((f) => f.found).map((f) => f.label));
    for (const fact of FACTS) expect(found).toContain(fact.label);
  });

  it("recounts when the rows change", () => {
    const decisions = area("decisions");
    const allHold = { ...decisions, scenarios: decisions.scenarios.map((s) => ({ ...s, holds: true })) };
    expect(headline(allHold)).toBe("0 of 3 scenarios fail");
  });
});
