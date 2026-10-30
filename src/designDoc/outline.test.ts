import { describe, expect, it } from "vitest";
import { BRIEF, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room/fixtures";
import { extractReviewReferences } from "../shared/lib/evidence";
import { citationLink } from "../shared/lib/utils";
import { citationLenses, docOutline, itemDefinitions, itemIdAt, referenceCompletions } from "./outline";
import { parseDesignDoc } from "./parse";
import { itemSnippet, nextItemNumbers } from "./template";

const golden = () => parseDesignDoc(GOLDEN_DOC, GOLDEN_FINAL, BRIEF, GOLDEN_TRANSCRIPT);

describe("click-to-cite", () => {
  it("inserts a citation that always verifies, for any selection of a client message or the brief", () => {
    const selections: [string, number | undefined][] = [
      ["We get about 30 bookings a week", 4],
      // Quotes, curly apostrophes and line breaks in a selection still verify.
      ["some of them don't have smartphones,\nso they call or just walk in", 6],
      ['Whoever answers writes it on a sticky note because the book isn\'t always in front of them', 8],
      ["double bookings keep happening", undefined],
      ["Interview Mei to find out what's really going on", undefined],
    ];
    for (const [text, index] of selections) {
      const [reference] = extractReviewReferences(citationLink(text, index), BRIEF, GOLDEN_TRANSCRIPT);
      expect(reference.valid, `${text} (${index})`).toBe(true);
    }
    expect(citationLink('She said "hi"', 2)).toBe('[Chat #2](#chat-msg-2 "She said \\"hi\\"")');
  });
});

describe("citation lens", () => {
  it("says where each requirement was cited from", () => {
    const lenses = citationLenses(golden(), { showUsedBy: false });
    expect([...lenses.values()]).toEqual(["cited from Brief", "cited from Chat #4", "cited from Chat #6", "cited from Chat #8", "cited from Chat #10"]);
  });

  it("shows which decisions use a requirement only when asked (practice mode)", () => {
    const practice = citationLenses(golden(), { showUsedBy: true });
    expect(practice.get(golden().requirements[0].line)).toBe("cited from Brief · used by D1, D3");
    expect(practice.get(golden().requirements[4].line)).toBe("cited from Chat #10 · used by D2");
    // Assessment and research modes pass showUsedBy: false, so no lens says "used by".
    const scored = citationLenses(golden(), { showUsedBy: false });
    expect([...scored.values()].some((text) => text.includes("used by"))).toBe(false);
  });

  it("flags a requirement with no citation or a broken one", () => {
    const doc = parseDesignDoc('## Requirements\n- **R1** Nothing cited\n- **R2** Wrong — [Chat #4](#chat-msg-4 "not said")\n', "", BRIEF, GOLDEN_TRANSCRIPT);
    expect([...citationLenses(doc, { showUsedBy: false }).values()]).toEqual(["no citation", "a quote isn't found"]);
  });
});

describe("outline, definitions and # completion", () => {
  it("lists every item in doc order with its worst problem", () => {
    const outline = docOutline(golden(), [
      { severity: "warning", line: 1, message: "", source: "doc", itemId: "D3", rule: "x" },
      { severity: "error", line: 1, message: "", source: "doc", itemId: "D3", rule: "y" },
    ]);
    expect(outline.map((item) => item.id)).toEqual(["R1", "R2", "R3", "R4", "R5", "D1", "D2", "D3", "D4", "D5"]);
    expect(outline.find((item) => item.id === "D3")).toMatchObject({ worst: "error", problemCount: 2 });
    expect(outline.find((item) => item.id === "R2")).toMatchObject({ worst: null, title: "Three rooms, about 30 bookings a week" });
    // Long titles are cut at 70 characters.
    expect(outline.find((item) => item.id === "D1")?.title).toBe("One shared online calendar is the only record; the book and sticky no…");
  });

  it("gives hover text and quotes for Go to Definition", () => {
    const definitions = itemDefinitions(golden());
    expect(definitions.get("R3")).toMatchObject({
      kind: "requirement",
      quotes: ["some of them don't have smartphones, so they call or just walk in"],
    });
    expect(definitions.get("D2")?.text).toBe("Staff enter phone and walk-in bookings directly while the booker is still there");
  });

  it("offers every R#, A# and D# after #, inserting a link", () => {
    const completions = referenceCompletions(golden());
    expect(completions.map((item) => item.label)).toEqual(["R1", "R2", "R3", "R4", "R5", "D1", "D2", "D3", "D4", "D5"]);
    expect(completions[2].insert).toBe("[R3](#R3)");
  });

  it("finds the item id under the cursor for Ctrl/Cmd + click", () => {
    expect(itemIdAt("  - Because: [R1](#R1), [R4](#R4)", 15)).toBe("R1");
    expect(itemIdAt("  - Because: [R1](#R1), [R4](#R4)", 26)).toBe("R4");
    expect(itemIdAt("Trade-off: depends on R1", 23)).toBe("R1");
    expect(itemIdAt("no ids here", 3)).toBeNull();
  });
});

describe("templates", () => {
  it("numbers a new item after the doc's last one", () => {
    expect(nextItemNumbers(GOLDEN_DOC)).toEqual({ R: 6, A: 1, D: 6 });
    expect(itemSnippet("decision", GOLDEN_DOC).split("\n")[0]).toBe("- **D6** ${1:what you chose}");
    expect(itemSnippet("requirement", GOLDEN_DOC)).toContain("- **R6** ");
  });

  it("gives a decision every labelled field and a sketch, as tab stops", () => {
    const snippet = itemSnippet("decision", "");
    for (const field of ["Because:", "Instead of:", "Trade-off:", "Quality:", "```mermaid", "flowchart TD"]) {
      expect(snippet).toContain(field);
    }
    expect(snippet.match(/\$\{\d+:/g)).toHaveLength(6);
  });
});
