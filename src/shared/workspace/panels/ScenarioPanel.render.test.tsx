import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../../../cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "../../../cases/community-room/seed";
import { parseDesignDoc } from "../../../designDoc/parse";
import { ScenarioPanel } from "./ScenarioPanel";
import { scenarioDiagramCode } from "./scenarioDiagram";

const seed = COMMUNITY_ROOM_COMPLETE_SEED;
const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);
const render = (answers = seed.answers) => renderToStaticMarkup(
  <ScenarioPanel caseDefinition={COMMUNITY_ROOM_CASE} doc={doc} finalCode={seed.finalCode} answers={answers} onChange={() => {}} />,
);

describe("scenario work panel", () => {
  it("shows seeded Given/When/Then answers, a diagram and selectable labels without the helper", () => {
    const html = render();
    expect(html).toContain("Given");
    expect(html).toContain(COMMUNITY_ROOM_CASE.scenarios[0].given);
    expect(html).toContain(COMMUNITY_ROOM_CASE.scenarios[0].when);
    expect(html).toContain(COMMUNITY_ROOM_CASE.scenarios[0].then);
    expect(html).toContain("Decisions that handle it");
    expect(html).toContain("Final-diagram components involved");
    expect(html).toContain("aria-pressed=\"true\"");
    expect(html).toContain("mermaid-wrap");
    expect(html).toContain("laid out left to right");
    expect(html).not.toContain("Diagram helper");
    expect(html).not.toContain("A good answer:");
  });

  it("shows unanswered status before review and handles cases with no scenarios", () => {
    expect(render([])).toContain("0/3 answered");
    const empty = renderToStaticMarkup(<ScenarioPanel caseDefinition={{ ...COMMUNITY_ROOM_CASE, scenarios: [] }} doc={doc} finalCode={seed.finalCode} answers={[]} onChange={() => {}} />);
    expect(empty).toContain("0/0 answered");
    expect(empty).toContain("This case has no scenarios");
  });

  it("keeps the flawed example's explicit Not handled answer", () => {
    const flawedDoc = parseDesignDoc(COMMUNITY_ROOM_SEED.docMarkdown, COMMUNITY_ROOM_SEED.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, COMMUNITY_ROOM_SEED.messages);
    const html = renderToStaticMarkup(<ScenarioPanel caseDefinition={COMMUNITY_ROOM_CASE} doc={flawedDoc} finalCode={COMMUNITY_ROOM_SEED.finalCode} answers={COMMUNITY_ROOM_SEED.answers} onChange={() => {}} />);
    expect(html).toContain("Scenario 3<span>Not handled</span>");
  });

  it("uses left-to-right layout only for the scenario view", () => {
    expect(scenarioDiagramCode(seed.finalCode)).toMatch(/^flowchart LR/);
    expect(seed.finalCode).toMatch(/^flowchart TD/);
    expect(scenarioDiagramCode("graph RL;\n  A --> B")).toBe("graph LR;\n  A --> B");
    expect(scenarioDiagramCode("flowchart\n  A --> B")).toBe("flowchart LR\n  A --> B");
  });
});
