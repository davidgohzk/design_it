import { describe, expect, it } from "vitest";
import { readAssertions, readMatches } from "./assemble";

describe("checking the borderline Ask answers (rule 2)", () => {
  it("keeps a match only with a quote from the requirement's own words", () => {
    const questions = [
      { factId: "cr.staff", requirementId: "R5", factQuote: "", citationQuote: "", requirementText: "People take turns at the front desk" },
      { factId: "cr.scale", requirementId: "R6", factQuote: "", citationQuote: "", requirementText: "Bookings rise during the school holidays" },
    ];
    const discarded = { count: 0 };
    const verdicts = readMatches(
      [
        { pairId: "p1", statesFact: true, quote: "take turns at the front desk" },
        { pairId: "p2", statesFact: true, quote: "about 30 bookings a week" },
      ],
      questions,
      discarded,
    );
    expect(verdicts).toEqual({ "cr.staff|R5": true, "cr.scale|R6": false });
    expect(discarded.count).toBe(1);
  });

  it("keeps an assertion only with a quote from the doc item itself", () => {
    const questions = [{ factId: "cr.root-cause", itemId: "R1", itemText: "Double bookings keep happening", keyword: "double booking" }];
    const discarded = { count: 0 };
    expect(readAssertions([{ factId: "cr.root-cause", docAssertion: { quote: "notes go missing" } }], questions, discarded)).toEqual({
      "cr.root-cause": null,
    });
    expect(discarded.count).toBe(1);
    expect(readAssertions([{ factId: "cr.root-cause", docAssertion: { quote: "Double bookings keep happening" } }], questions, discarded)).toEqual({
      "cr.root-cause": "Double bookings keep happening",
    });
    expect(readAssertions(undefined, questions, discarded)).toEqual({ "cr.root-cause": null });
  });
});
