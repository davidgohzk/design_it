import { describe, expect, it } from "vitest";
import { BRIEF, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { edgeKey, parseDesignDoc, parseMermaidFlowchart } from "./parse";

const golden = () => parseDesignDoc(GOLDEN_DOC, GOLDEN_FINAL, BRIEF, GOLDEN_TRANSCRIPT);

describe("parseMermaidFlowchart", () => {
  it("reads node shapes, actors and the database shape", () => {
    const graph = parseMermaidFlowchart(
      [
        "flowchart LR",
        '  Resident["Resident (actor)"]',
        "  Plain[Plain label]",
        "  Round(Rounded)",
        '  Calendar[("Shared booking calendar")]',
        "  Check{Slot free?}",
        "  Bare",
      ].join("\n"),
    );
    expect(graph.parseError).toBeUndefined();
    expect(graph.nodes.map(({ id, label, isActor }) => ({ id, label, isActor }))).toEqual([
      { id: "Resident", label: "Resident (actor)", isActor: true },
      { id: "Plain", label: "Plain label", isActor: false },
      { id: "Round", label: "Rounded", isActor: false },
      { id: "Calendar", label: "Shared booking calendar", isActor: false },
      { id: "Check", label: "Slot free?", isActor: false },
      { id: "Bare", label: "Bare", isActor: false },
    ]);
    expect(graph.edges).toEqual([]);
  });

  it("reads inline nodes, edge labels in both syntaxes, chained edges and comments", () => {
    const graph = parseMermaidFlowchart(
      [
        "flowchart LR",
        "  %% a whole-line comment",
        '  A["Alpha"] -->|"calls"| B["Beta"] %% trailing comment',
        "  B -- writes to --> C[(Store)]",
        "  C --> D --> E",
        "  E --- A",
      ].join("\n"),
    );
    expect(graph.parseError).toBeUndefined();
    expect(graph.nodes.map((node) => [node.id, node.label])).toEqual([
      ["A", "Alpha"],
      ["B", "Beta"],
      ["C", "Store"],
      ["D", "D"],
      ["E", "E"],
    ]);
    expect(graph.edges).toEqual([
      { from: "A", to: "B", label: "calls" },
      { from: "B", to: "C", label: "writes to" },
      { from: "C", to: "D" },
      { from: "D", to: "E" },
      { from: "E", to: "A" },
    ]);
  });

  it("accepts a single-node sketch", () => {
    const graph = parseMermaidFlowchart('flowchart LR\n  Calendar[("Shared booking calendar")]');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
    expect(graph.parseError).toBeUndefined();
  });

  it("reports text it cannot read", () => {
    expect(parseMermaidFlowchart("sequenceDiagram\n  A->>B: hi").parseError).toMatch(/flowchart/);
    expect(parseMermaidFlowchart("flowchart LR\n  A --> ").parseError).toMatch(/line 2/i);
    expect(parseMermaidFlowchart('flowchart LR\n  A["unclosed').parseError).toMatch(/line 2/i);
  });

  it("keeps the golden final diagram's six edges", () => {
    const graph = parseMermaidFlowchart(GOLDEN_FINAL);
    expect(graph.edges.map(edgeKey)).toEqual([
      "Resident->Staff",
      "Staff->Desk",
      "Desk->Calendar",
      "Calendar->Desk",
      "Calendar->SMS",
      "SMS->Resident",
    ]);
    expect(graph.nodes.filter((node) => node.isActor).map((node) => node.id)).toEqual([
      "Resident",
      "Staff",
    ]);
  });
});

describe("parseDesignDoc", () => {
  it("reads requirements with verified citations (§3.8)", () => {
    const doc = golden();
    expect(doc.requirements.map((item) => item.id)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    for (const requirement of doc.requirements) {
      expect(requirement.citations).toHaveLength(1);
      expect(requirement.citations[0].valid).toBe(true);
    }
    expect(doc.requirements[0].citations[0].source).toBe("brief");
    expect(doc.requirements[1].citations[0].messageIndex).toBe(4);
    expect(doc.requirements[3].text).toContain("sticky notes");
  });

  it("reads assumptions", () => {
    expect(golden().assumptions.map((item) => [item.id, item.text])).toEqual([
      ["A1", "Bookers can receive an SMS on a basic phone (not asked)"],
      ["A2", "The desk computer has reliable internet (not asked)"],
    ]);
  });

  it("reads decisions with their requirement refs, conventions and sketches", () => {
    const doc = golden();
    expect(doc.decisions.map((item) => [item.id, item.requirementIds])).toEqual([
      ["D1", ["R1", "R4"]],
      ["D2", ["R3", "R4", "R5"]],
      ["D3", ["R1"]],
      ["D4", ["R3"]],
      ["D5", ["R2"]],
    ]);
    expect(doc.decisions.every((item) => item.hasBecause && item.hasTradeOff)).toBe(true);
    expect(doc.decisions.every((item) => item.sketch && !item.sketch.parseError)).toBe(true);
    expect(doc.decisions[0].sketch?.nodes.map((node) => node.id)).toEqual(["Calendar"]);
    expect(doc.decisions[1].sketch?.edges.map(edgeKey)).toEqual([
      "Resident->Staff",
      "Staff->Desk",
      "Desk->Calendar",
    ]);
    expect(doc.decisions[2].sketchCode).toBe(
      [
        "flowchart TD",
        '  Desk["Desk computer"] -->|"request slot"| Calendar[("Shared booking calendar")]',
        '  Calendar -->|"slot taken: refuse"| Desk',
      ].join("\n"),
    );
  });

  it("records source lines for items and sketch blocks", () => {
    const doc = golden();
    const lines = GOLDEN_DOC.split("\n");
    for (const item of [...doc.requirements, ...doc.assumptions, ...doc.decisions]) {
      expect(lines[item.line - 1]).toContain(`**${item.id}**`);
    }
    const d3 = doc.decisions[2];
    expect(lines[d3.sketchLines!.start - 1].trim()).toBe("```mermaid");
    expect(lines[d3.sketchLines!.end - 1].trim()).toBe("```");
  });

  it("computes each node's decisions from the sketches, without actors (§9 test 2)", () => {
    expect(golden().nodeDecisions).toEqual({
      Calendar: ["D1", "D2", "D3", "D4", "D5"],
      Desk: ["D2", "D3"],
      SMS: ["D4"],
    });
  });

  it("parses the empty template without crashing", () => {
    const doc = parseDesignDoc(
      "## Requirements\n- **R1** \n\n## Assumptions\n- **A1** \n\n## Decisions\n- **D1**  — because [R1](#R1). Trade-off: \n  ```mermaid\n  flowchart LR\n  ```\n",
      "",
      BRIEF,
      GOLDEN_TRANSCRIPT,
    );
    expect(doc.requirements[0]).toMatchObject({ id: "R1", text: "", citations: [] });
    expect(doc.decisions[0].sketch?.nodes).toEqual([]);
    expect(doc.final.nodes).toEqual([]);
  });
});
