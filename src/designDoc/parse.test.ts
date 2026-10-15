import { describe, expect, it } from "vitest";
import {
  BRIEF,
  GOLDEN_DOC,
  GOLDEN_FINAL,
  GOLDEN_TRANSCRIPT,
  LEGACY_INLINE_DOC,
  LEGACY_INLINE_FINAL,
} from "../cases/community-room.fixtures";
import { edgeKey, parseDesignDoc, parseMermaidFlowchart, plainNodeLabel, qualityOf } from "./parse";

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

  it("reads assumptions and how each would be confirmed", () => {
    expect(golden().assumptions.map((item) => [item.id, item.confirmBy])).toEqual([
      ["A1", "Can your regulars get text messages?"],
      ["A2", "Does the desk ever lose internet?"],
    ]);
    expect(golden().assumptions[0].text).toContain("Bookers can receive an SMS on a basic phone");
  });

  it("reads decisions with their labelled fields and sketches (handover §7)", () => {
    const doc = golden();
    expect(doc.decisions.map((item) => [item.id, item.because])).toEqual([
      ["D1", ["R1", "R4"]],
      ["D2", ["R3", "R4", "R5"]],
      ["D3", ["R1"]],
      ["D4", ["R3"]],
      ["D5", ["R2"]],
    ]);
    expect(doc.decisions.every((item) => item.format === "labelled" && item.hasBecause && item.hasTradeOff)).toBe(true);
    expect(doc.decisions[0]).toMatchObject({
      title: "One shared online calendar is the only record; the book and sticky notes are retired",
      insteadOf: "keep the paper book and add a phone log",
      tradeOff: "staff need to be online to book (A2)",
      quality: "reliability",
      qualityText: "reliability",
    });
    expect(doc.decisions.map((item) => item.quality)).toEqual([
      "reliability",
      "interaction-capability",
      "reliability",
      "interaction-capability",
      "maintainability",
    ]);
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
        '  Desk["Desk computer [system]"] -->|"request slot"| Calendar[("Shared booking calendar [datastore]")]',
        '  Calendar -->|"slot taken: refuse"| Desk',
      ].join("\n"),
    );
  });

  it("reads node types from [type] tags, (actor) and the [( )] shape", () => {
    const graph = parseMermaidFlowchart(
      [
        "flowchart LR",
        '  A["Resident [person]"] --> B["Front desk (actor)"]',
        '  B --> C[("Bookings")]',
        '  C --> D[("Archive [external]")]',
        '  D --> E["Desk computer [System]"]',
        '  E --> F["Plain box"]',
      ].join("\n"),
    );
    expect(graph.nodes.map((node) => [node.id, node.type, node.isActor])).toEqual([
      ["A", "person", true],
      ["B", "person", true],
      ["C", "datastore", false],
      ["D", "external", false],
      ["E", "system", false],
      ["F", null, false],
    ]);
    expect(plainNodeLabel("Shared booking calendar [datastore]")).toBe("Shared booking calendar");
    expect(plainNodeLabel("Front desk (actor)")).toBe("Front desk");
  });

  it("still reads the older one-line decisions", () => {
    const doc = parseDesignDoc(LEGACY_INLINE_DOC, LEGACY_INLINE_FINAL, BRIEF, GOLDEN_TRANSCRIPT);
    expect(doc.decisions.map((item) => [item.id, item.format, item.because])).toEqual([
      ["D1", "inline", ["R1", "R4"]],
      ["D2", "inline", ["R3", "R4", "R5"]],
      ["D3", "inline", ["R1"]],
      ["D4", "inline", ["R3"]],
      ["D5", "inline", ["R2"]],
    ]);
    expect(doc.decisions.every((item) => item.hasBecause && item.hasTradeOff && !item.sketch?.parseError)).toBe(true);
    expect(doc.decisions[4]).toMatchObject({
      title: "Use a hosted calendar with a conflict check; no custom server",
      insteadOf: "a booking app with its own database",
      tradeOff: "fewer custom features",
      quality: null,
    });
    expect(doc.assumptions[0]).toEqual({ id: "A1", text: "Bookers can receive an SMS on a basic phone (not asked)", line: 9 });
    expect(doc.final.nodes.find((node) => node.id === "Staff")).toMatchObject({ type: "person", isActor: true });
    expect(doc.final.nodes.find((node) => node.id === "Calendar")?.type).toBe("datastore");
  });

  it("keeps a sub-bullet that isn't a field as part of the item's text", () => {
    const doc = parseDesignDoc(
      "## Decisions\n- **D1** Use one calendar\n  - Because: [R1](#R1)\n  - Also: works offline\n",
      "",
      BRIEF,
      GOLDEN_TRANSCRIPT,
    );
    expect(doc.decisions[0]).toMatchObject({ title: "Use one calendar", because: ["R1"], format: "labelled" });
    expect(doc.decisions[0].text).toContain("Also: works offline");
    expect(doc.decisions[0].fieldLines).toEqual({ because: 3 });
  });

  it("reads an ISO 25010 quality however it is written, and keeps an invalid one as text", () => {
    expect(qualityOf("Interaction capability")).toBe("interaction-capability");
    expect(qualityOf("Performance_efficiency.")).toBe("performance-efficiency");
    expect(qualityOf("speed")).toBeNull();
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
