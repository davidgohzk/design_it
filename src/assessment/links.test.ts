import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import {
  BRIEF,
  FINAL_WITHOUT_SMS,
  FLAWED_DOC,
  FLAWED_FINAL,
  GOLDEN_DOC,
  GOLDEN_FINAL,
  GOLDEN_FOUND,
  GOLDEN_TRANSCRIPT,
} from "../cases/community-room.fixtures";
import { checkConsistency } from "../designDoc/consistency";
import { parseDesignDoc } from "../designDoc/parse";
import { computeLinks, matchFactsToRequirements, matchKey, quotesOverlap } from "./links";
import type { FoundFact } from "./types";

const FACTS = COMMUNITY_ROOM_CASE.facts;

const links = (doc: string, final: string, found: FoundFact[] = GOLDEN_FOUND, factMatches = {}) => {
  const parsed = parseDesignDoc(doc, final, BRIEF, GOLDEN_TRANSCRIPT);
  return computeLinks({ doc: parsed, consistency: checkConsistency(parsed), facts: FACTS, found, factMatches });
};

const withState = (factId: string, fact: Partial<FoundFact>) =>
  GOLDEN_FOUND.map((item) => (item.factId === factId ? { factId, ...fact } as FoundFact : item));

describe("computeLinks", () => {
  it("golden run: every list is empty and every fact is carried through (§9 test 3)", () => {
    expect(links(GOLDEN_DOC, GOLDEN_FINAL)).toEqual({
      funnel: {
        "cr.current": "given",
        "cr.scale": "carried_through",
        "cr.bookers": "carried_through",
        "cr.root-cause": "carried_through",
        "cr.staff": "carried_through",
      },
      dropped: [],
      uncited: [],
      hiddenAssumptions: [],
      unused: [],
      unsupported: [],
      notDrawn: [],
      unjustified: [],
      unexplainedEdges: [],
    });
  });

  it("flawed fixture: dropped fact, undrawn decision, unexplained box and connections (§9 test 4)", () => {
    const result = links(FLAWED_DOC, FLAWED_FINAL);
    expect(result.funnel["cr.root-cause"]).toBe("dropped");
    expect(result.dropped).toEqual(["cr.root-cause"]);
    expect(result.notDrawn).toEqual(["D3"]);
    expect(result.unjustified).toEqual(["Queue"]);
    expect(result.unexplainedEdges).toEqual(
      expect.arrayContaining([
        { from: "Calendar", to: "Desk" },
        { from: "Desk", to: "Queue" },
      ]),
    );
    expect(result.unused).toEqual([]);
    expect(result.unsupported).toEqual([]);
  });

  it("scores a never-surfaced fact once, as missed (§9 test 7)", () => {
    const docWithoutR4 = GOLDEN_DOC.split("\n")
      .filter((line) => !line.startsWith("- **R4**"))
      .join("\n")
      .replace(", [R4](#R4)", "")
      .replace("[R3](#R3), [R4](#R4)", "[R3](#R3)");
    const result = links(docWithoutR4, GOLDEN_FINAL, withState("cr.root-cause", { state: "missed" }));
    expect(result.funnel["cr.root-cause"]).toBe("missed");
    expect(result.dropped).toEqual([]);
    expect(result.unused).toEqual([]);
    expect(result.notDrawn).toEqual([]);
  });

  it("marks the decision not drawn when the final diagram loses a sketch's box (§9 test 5)", () => {
    const result = links(GOLDEN_DOC, FINAL_WITHOUT_SMS);
    expect(result.notDrawn).toEqual(["D4"]);
    // R3 also reaches D2, which is still drawn.
    expect(result.funnel["cr.bookers"]).toBe("carried_through");
  });

  it("finds unused requirements, unsupported decisions, uncited requirements and hidden assumptions", () => {
    const doc = [
      "## Requirements",
      '- **R1** Thirty a week [Chat #4](#chat-msg-4 "We get about 30 bookings a week")',
      '- **R2** A misquote [Chat #4](#chat-msg-4 "We get about 300 bookings a week")',
      "- **R3** The centre is open every day",
      "- **R4** ",
      "## Decisions",
      "- **D1** A calendar — because [R9](#R9). Trade-off: none.",
      "  ```mermaid",
      "  flowchart LR",
      '    Calendar[("Calendar")]',
      "  ```",
    ].join("\n");
    const result = links(doc, 'flowchart LR\n  Calendar[("Calendar")]');
    expect(result.unused).toEqual(["R1", "R2", "R3"]);
    expect(result.unsupported).toEqual(["D1"]);
    expect(result.uncited).toEqual(["R2"]);
    expect(result.hiddenAssumptions).toEqual(["R3"]);
    expect(result.funnel["cr.scale"]).toBe("unused");
  });

  it("marks every decision not drawn while the final diagram is empty", () => {
    const result = links(GOLDEN_DOC, "");
    expect(result.notDrawn).toEqual(["D1", "D2", "D3", "D4", "D5"]);
    expect(result.funnel["cr.scale"]).toBe("not_drawn");
  });
});

describe("matchFactsToRequirements", () => {
  it("treats a same-message citation with a different quote as ambiguous until the AI decides", () => {
    const found = withState("cr.staff", {
      state: "surfaced",
      messageIndex: 10,
      quote: "Just me and one other staff member, on alternating shifts",
    });
    const doc = parseDesignDoc(GOLDEN_DOC, GOLDEN_FINAL, BRIEF, GOLDEN_TRANSCRIPT);
    const { matched, ambiguous } = matchFactsToRequirements(doc, found);
    expect(matched["cr.staff"]).toEqual([]);
    expect(ambiguous).toEqual([
      {
        factId: "cr.staff",
        requirementId: "R5",
        factQuote: "Just me and one other staff member, on alternating shifts",
        citationQuote: "We share the one computer at the desk.",
        requirementText: expect.stringContaining("Two staff on shifts"),
      },
    ]);
    expect(links(GOLDEN_DOC, GOLDEN_FINAL, found).funnel["cr.staff"]).toBe("dropped");
    expect(links(GOLDEN_DOC, GOLDEN_FINAL, found, { [matchKey("cr.staff", "R5")]: true }).funnel["cr.staff"]).toBe(
      "carried_through",
    );
  });

  it("compares quotes by containment or shared words", () => {
    expect(quotesOverlap("We get about 30 bookings a week", "about 30 bookings")).toBe(true);
    expect(quotesOverlap("the note never makes it into the book", "note never reaches the book")).toBe(true);
    expect(quotesOverlap("Three rooms", "We get about 30 bookings a week")).toBe(false);
  });
});
