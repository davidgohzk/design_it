import { describe, expect, it } from "vitest";
import { BRIEF, FLAWED_DOC, FLAWED_FINAL, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { parseDesignDoc } from "../designDoc/parse";
import { designDocChecks, diagramChecks } from "./pieces";

const parse = (doc: string, final: string) => parseDesignDoc(doc, final, BRIEF, GOLDEN_TRANSCRIPT);

describe("level 1B / 1C checks", () => {
  it("passes the model answer", () => {
    const doc = parse(GOLDEN_DOC, GOLDEN_FINAL);
    expect(designDocChecks(doc, GOLDEN_DOC).every((check) => check.passed)).toBe(true);
    expect(diagramChecks(doc).every((check) => check.passed)).toBe(true);
  });

  it("flags the unexplained Queue box but not D3's missing sketch, which is a link (2.3) problem", () => {
    const doc = parse(FLAWED_DOC, FLAWED_FINAL);
    expect(diagramChecks(doc)[1]).toMatchObject({ passed: false, failing: ["Queue"] });
  });

  it("reports a missing Assumptions section, and render errors from the parser or mermaid", () => {
    const withoutAssumptions = GOLDEN_DOC.replace(/## Assumptions[\s\S]*?(?=## Decisions)/, "");
    expect(designDocChecks(parse(withoutAssumptions, GOLDEN_FINAL), withoutAssumptions)[1]).toMatchObject({ passed: false });
    expect(diagramChecks(parse(GOLDEN_DOC, ""))[0]).toMatchObject({ passed: false, detail: expect.any(String) });
    expect(diagramChecks(parse(GOLDEN_DOC, GOLDEN_FINAL), "Parse error on line 2")[0]).toMatchObject({
      passed: false,
      detail: "Parse error on line 2",
    });
  });
});
