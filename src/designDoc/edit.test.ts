import { describe, expect, it } from "vitest";
import { BRIEF, FLAWED_DOC, GOLDEN_DOC, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { setDecisionSketch } from "./edit";
import { parseDesignDoc } from "./parse";

const decision = (doc: string, id: string) =>
  parseDesignDoc(doc, "", BRIEF, GOLDEN_TRANSCRIPT).decisions.find((item) => item.id === id)!;

const D3_SKETCH = [
  "flowchart LR",
  '  Desk["Desk computer"] -->|"request slot"| Calendar[("Shared booking calendar")]',
  '  Calendar -->|"slot taken: refuse"| Desk',
].join("\n");

describe("setDecisionSketch", () => {
  it("inserts a missing sketch directly under its decision", () => {
    expect(setDecisionSketch(FLAWED_DOC, decision(FLAWED_DOC, "D3"), D3_SKETCH)).toBe(
      FLAWED_DOC.replace(
        "Trade-off: none significant.\n",
        "Trade-off: none significant.\n  ```mermaid\n" +
          D3_SKETCH.split("\n").map((line) => `  ${line}`).join("\n") +
          "\n  ```\n",
      ),
    );
    expect(decision(setDecisionSketch(FLAWED_DOC, decision(FLAWED_DOC, "D3"), D3_SKETCH), "D3").sketchCode).toBe(
      D3_SKETCH,
    );
  });

  it("replaces an existing sketch in place", () => {
    const next = setDecisionSketch(GOLDEN_DOC, decision(GOLDEN_DOC, "D1"), 'flowchart LR\n  Calendar[("Calendar")]');
    expect(decision(next, "D1").sketchCode).toBe('flowchart LR\n  Calendar[("Calendar")]');
    expect(decision(next, "D2").sketchCode).toBe(decision(GOLDEN_DOC, "D2").sketchCode);
  });
});
