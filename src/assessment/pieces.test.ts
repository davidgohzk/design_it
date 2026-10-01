import { describe, expect, it } from "vitest";
import { BRIEF, FLAWED_DOC, FLAWED_FINAL, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { parseDesignDoc } from "../designDoc/parse";
import { decisionPieces, diagramPieces, requirementPieces } from "./pieces";

const parse = (doc: string, final: string) => parseDesignDoc(doc, final, BRIEF, GOLDEN_TRANSCRIPT);

describe("level 1 pieces, item by item", () => {
  it("flags nothing in the model answer", () => {
    const doc = parse(GOLDEN_DOC, GOLDEN_FINAL);
    expect(requirementPieces(doc)).toEqual({ total: 5, flagged: [], general: [] });
    expect(decisionPieces(doc, GOLDEN_DOC)).toEqual({ total: 5, flagged: [], general: [] });
    expect(diagramPieces(doc)).toEqual({ total: 6, flagged: [], general: [] });
  });

  it("flags the unexplained Queue box but not D3's missing sketch, which is a link (2C) problem", () => {
    const doc = parse(FLAWED_DOC, FLAWED_FINAL);
    expect(diagramPieces(doc).flagged).toEqual([
      { id: "final", issues: [{ message: "No decision's sketch has this box.", nodeId: "Queue" }] },
    ]);
  });

  it("flags a requirement with no reference to the chat or the brief", () => {
    const markdown = GOLDEN_DOC.replace(/(- \*\*R2\*\* [^\n]*?) — \[Chat #4\]\([^)]*\)/, "$1");
    const pieces = requirementPieces(parse(markdown, GOLDEN_FINAL));
    expect(pieces.flagged).toEqual([{ id: "R2", issues: [{ message: "R2 has no reference to the chat or the brief." }] }]);
  });

  it("flags a decision with no trade-off and no requirement", () => {
    const markdown = GOLDEN_DOC.replace(/(- \*\*D3\*\* )[^\n]*/, "$1A taken slot blocks a second booking.");
    const pieces = decisionPieces(parse(markdown, GOLDEN_FINAL), markdown);
    expect(pieces.flagged.map((item) => item.id)).toEqual(["D3"]);
    expect(pieces.flagged[0].issues.map((issue) => issue.message)).toEqual([
      'D3 has no "because".',
      "D3 doesn't say which requirement it's because of.",
      "D3 has no trade-off.",
    ]);
  });

  it("reports a missing Assumptions section, and render errors from the parser or mermaid", () => {
    const withoutAssumptions = GOLDEN_DOC.replace(/## Assumptions[\s\S]*?(?=## Decisions)/, "");
    expect(decisionPieces(parse(withoutAssumptions, GOLDEN_FINAL), withoutAssumptions).general).toEqual([
      'There is no "## Assumptions" section.',
    ]);
    expect(diagramPieces(parse(GOLDEN_DOC, "")).flagged).toEqual([
      { id: "final", issues: [{ message: "There is no final diagram yet." }] },
    ]);
    expect(diagramPieces(parse(GOLDEN_DOC, GOLDEN_FINAL), "Parse error on line 2").flagged).toEqual([
      { id: "final", issues: [{ message: "Parse error on line 2" }] },
    ]);
  });
});
