import { describe, expect, it } from "vitest";
import { BRIEF, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { extractFinalDiagram, finalDiagramLine, setFinalDiagram } from "./finalSection";
import { parseDesignDoc } from "./parse";

describe("final diagram section", () => {
  it("appends a final diagram section when the doc has none, and reads it back", () => {
    const doc = setFinalDiagram(GOLDEN_DOC, GOLDEN_FINAL);
    expect(doc.startsWith(GOLDEN_DOC.trimEnd())).toBe(true);
    expect(doc).toContain("\n\n## Final diagram\n```mermaid\nflowchart LR\n");
    expect(extractFinalDiagram(doc)).toBe(GOLDEN_FINAL);
    expect(doc.split("\n")[finalDiagramLine(doc)! - 1]).toBe("```mermaid");
  });

  it("replaces the block in place and leaves the rest of the doc alone", () => {
    const doc = setFinalDiagram(GOLDEN_DOC, GOLDEN_FINAL);
    const next = setFinalDiagram(doc, 'flowchart LR\n  Calendar[("Calendar")]');
    expect(extractFinalDiagram(next)).toBe('flowchart LR\n  Calendar[("Calendar")]');
    expect(next.slice(0, next.indexOf("## Final diagram"))).toBe(doc.slice(0, doc.indexOf("## Final diagram")));
  });

  it("adds a block under an existing heading", () => {
    const next = setFinalDiagram("## Decisions\n\n## Final diagram\n", "flowchart LR\n  A");
    expect(next).toBe("## Decisions\n\n## Final diagram\n```mermaid\nflowchart LR\n  A\n```\n");
  });

  it("is empty when there is no block", () => {
    expect(extractFinalDiagram(GOLDEN_DOC)).toBe("");
    expect(extractFinalDiagram("## Final diagram\nNot drawn yet.")).toBe("");
  });

  it("is not mistaken for a decision's sketch", () => {
    const doc = setFinalDiagram(GOLDEN_DOC, 'flowchart LR\n  Queue["Queue"]');
    const parsed = parseDesignDoc(doc, extractFinalDiagram(doc), BRIEF, GOLDEN_TRANSCRIPT);
    expect(parsed.decisions.map((decision) => decision.sketchCode)).toEqual(
      parseDesignDoc(GOLDEN_DOC, "", BRIEF, GOLDEN_TRANSCRIPT).decisions.map((decision) => decision.sketchCode),
    );
    expect(parsed.final.nodes.map((node) => node.id)).toEqual(["Queue"]);
  });
});
