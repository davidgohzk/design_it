import { describe, expect, it } from "vitest";
import {
  BRIEF,
  FINAL_STAFF_NOT_ACTOR,
  FINAL_WITHOUT_SMS,
  FLAWED_DOC,
  FLAWED_FINAL,
  GOLDEN_DOC,
  GOLDEN_FINAL,
  GOLDEN_TRANSCRIPT,
} from "../cases/community-room.fixtures";
import { checkConsistency } from "./consistency";
import { lintDesignDoc } from "./lint";
import { parseDesignDoc } from "./parse";

const parse = (doc: string, final: string) => parseDesignDoc(doc, final, BRIEF, GOLDEN_TRANSCRIPT);

describe("lintDesignDoc", () => {
  it("finds no format problems in the golden doc", () => {
    expect(lintDesignDoc(parse(GOLDEN_DOC, GOLDEN_FINAL))).toEqual([]);
  });

  it("flags the flawed doc (§9 test 4)", () => {
    const messages = lintDesignDoc(parse(FLAWED_DOC, FLAWED_FINAL)).map((warning) => warning.message);
    expect(messages).toEqual([
      "D1 refers to R4, which doesn't exist.",
      "D2 refers to R4, which doesn't exist.",
      "D3 has no sketch.",
    ]);
  });

  it("uses the spec's messages for every rule", () => {
    const doc = [
      "## Requirements",
      "- **R1** No citation here",
      '- **R2** Changed quote [Chat #4](#chat-msg-4 "about 300 bookings a week")',
      "",
      "## Decisions",
      "- **D2** Something — because [R9](#R9). Trade-off: none.",
      "  ```mermaid",
      "  flowchart LR",
      "    A -->",
      "  ```",
      "- **D2** A duplicate with no reference",
      "- **D4** Another — because it seemed right",
    ].join("\n");
    const messages = lintDesignDoc(parse(doc, "")).map((warning) => warning.message);
    expect(messages).toEqual([
      "R1 has no citation.",
      "R2's quote isn't in the chat anymore.",
      "D2 refers to R9, which doesn't exist.",
      "D2's sketch: Line 2: a connection needs a box at both ends.",
      "Two items are called D2.",
      "D2 doesn't say which requirement it's because of.",
      "D2 has no trade-off.",
      "D2 has no sketch.",
      "D4 doesn't say which requirement it's because of.",
      "D4 has no trade-off.",
      "D4 has no sketch.",
    ]);
  });
});

describe("checkConsistency", () => {
  it("passes C1–C5 for the golden doc and final diagram", () => {
    expect(checkConsistency(parse(GOLDEN_DOC, GOLDEN_FINAL)).issues).toEqual([]);
  });

  it("reports a missing box and its connections when SMS is removed (§9 test 5)", () => {
    const result = checkConsistency(parse(GOLDEN_DOC, FINAL_WITHOUT_SMS));
    expect(result.issues.map((issue) => [issue.check, issue.message])).toEqual([
      ["C1", "D4's sketch has `SMS`, but the final diagram doesn't."],
      ["C2", "D4's sketch shows `Calendar → SMS`, but the final diagram doesn't."],
      ["C2", "D4's sketch shows `SMS → Resident`, but the final diagram doesn't."],
    ]);
    expect(result.inconsistentDecisions).toEqual(["D4"]);
  });

  it("reports an actor mismatch when Staff loses (actor) in the final diagram (§9 test 5)", () => {
    const result = checkConsistency(parse(GOLDEN_DOC, FINAL_STAFF_NOT_ACTOR));
    expect(result.issues.map((issue) => [issue.check, issue.message])).toEqual([
      ["C5", "`Staff` is an actor in D2's sketch but not in the final diagram."],
    ]);
  });

  it("reports unexplained boxes and connections in the flawed fixture (§9 test 4)", () => {
    const result = checkConsistency(parse(FLAWED_DOC, FLAWED_FINAL));
    expect(result.unjustifiedNodes).toEqual(["Queue"]);
    expect(result.unexplainedEdges).toEqual([
      { from: "Calendar", to: "Desk" },
      { from: "Desk", to: "Queue" },
    ]);
    expect(result.issues.map((issue) => issue.message)).toEqual([
      "`Queue` isn't in any decision's sketch.",
      "No decision explains `Calendar → Desk`.",
      "No decision explains `Desk → Queue`.",
    ]);
  });

  it("skips the checks while the final diagram doesn't parse", () => {
    expect(checkConsistency(parse(GOLDEN_DOC, "flowchart LR\n  A -->")).issues).toEqual([]);
  });
});

