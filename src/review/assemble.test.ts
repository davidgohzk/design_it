import { describe, expect, it } from "vitest";
import { readAssertions, readMatches, readSuggestions } from "./assemble";

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

describe("checking the coaching advice", () => {
  const sources = {
    known: new Set(["cr.staff", "R1", "D2"]),
    labels: new Map([["cr.staff", "Who runs the front desk"]]),
    text: "Volunteers take turns at the front desk every afternoon.",
  };
  const run = (value: unknown) => {
    const discarded = { count: 0 };
    return { kept: readSuggestions(value, sources, discarded), discarded: discarded.count };
  };

  it("keeps advice whose references are all in the work", () => {
    expect(run([{ stage: "ask", text: "Follow up when a reply dodges you.", refs: ["cr.staff"] }])).toEqual({
      kept: [{ level: "ask", text: "Follow up when a reply dodges you.", refs: ["cr.staff"] }],
      discarded: 0,
    });
  });

  it("drops advice that names something that isn't there, and counts it", () => {
    expect(run([{ stage: "keep", text: "Cite R99 from the chat.", refs: ["R1", "R99"] }])).toEqual({ kept: [], discarded: 1 });
  });

  it("swaps a fact id left in the prose for the topic in plain words", () => {
    const { kept } = run([{ stage: "ask", text: "You missed 'cr.staff'. Ask who covers the desk.", refs: ["cr.staff"] }]);
    expect(kept[0].text).toBe("You missed who runs the front desk. Ask who covers the desk.");
  });

  it("drops advice that quotes words nobody wrote, and keeps one that quotes the work", () => {
    expect(run([{ stage: "ask", text: "You heard 'the desk is staffed by robots' and left it out.", refs: [] }])).toEqual({ kept: [], discarded: 1 });
    const { kept } = run([{ stage: "ask", text: "She said 'take turns at the front desk', so write it down.", refs: [] }]);
    expect(kept).toHaveLength(1);
  });

  it("cuts a long one to 40 words", () => {
    const { kept } = run([{ stage: "fit", text: Array.from({ length: 60 }, (_, i) => `w${i}`).join(" "), refs: [] }]);
    expect(kept[0].text.split(" ")).toHaveLength(40);
  });

  it("takes one per stage, in level order, and ignores anything malformed", () => {
    const { kept } = run([
      { stage: "fit", text: "Second by level, first here.", refs: [] },
      { stage: "gate", text: "First by level.", refs: [] },
      { stage: "gate", text: "A second for the same stage.", refs: [] },
      { stage: "nonsense", text: "Not a level.", refs: [] },
      { stage: "ask" },
      "not an object",
    ]);
    expect(kept.map((suggestion) => [suggestion.level, suggestion.text])).toEqual([
      ["gate", "First by level."],
      ["fit", "Second by level, first here."],
    ]);
  });

  it("gives nothing when the coach was never asked", () => {
    expect(run(undefined)).toEqual({ kept: [], discarded: 0 });
  });
});
