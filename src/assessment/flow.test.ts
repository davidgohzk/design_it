import { describe, expect, it } from "vitest";
import { BRIGHTPATH_CASE } from "../cases/brightpath";
import { BRIGHTPATH_COMPLETE_SEED, BRIGHTPATH_SEED } from "../cases/brightpath.seed";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { COMMUNITY_ROOM_SEED } from "../cases/community-room.seed";
import type { CaseSeed } from "../cases/seed";
import { parseDesignDoc } from "../designDoc/parse";
import { FLOW_COLUMNS, flowGraph, flowWeb, orderFlow, requirementFlow, SOUNDNESS_COLUMNS, soundnessGraph } from "./flow";

const flowOf = (seed: CaseSeed, brief: string) =>
  requirementFlow(parseDesignDoc(seed.docMarkdown, seed.finalCode, brief, seed.messages), seed.review.links);

const label = (source: { kind: string; messageIndex?: number; valid: boolean }) =>
  `${source.kind === "brief" ? "Brief" : `Chat #${source.messageIndex}`}${source.valid ? "" : " (unverified)"}`;

describe("requirement flow (level 2)", () => {
  it("stops each requirement at its first missing reference", () => {
    const rows = flowOf(BRIGHTPATH_SEED, BRIGHTPATH_CASE.briefMarkdown);
    expect(
      rows.map(({ id, sources, decisions, drawn, status }) => ({ id, sources: sources.map(label), decisions, drawn, status })),
    ).toEqual([
      { id: "R1", sources: ["Chat #2"], decisions: ["D1", "D5"], drawn: ["D1"], status: "carried_through" },
      { id: "R2", sources: ["Chat #4"], decisions: ["D2", "D6", "D7"], drawn: ["D2", "D7"], status: "carried_through" },
      { id: "R3", sources: ["Chat #4"], decisions: ["D3"], drawn: [], status: "not_drawn" },
      { id: "R4", sources: ["Chat #4"], decisions: [], drawn: [], status: "no_decision" },
      { id: "R5", sources: [], decisions: [], drawn: [], status: "no_source" },
      // A quote that isn't in the chat is no reference, even though the rest of the chain exists.
      { id: "R6", sources: ["Chat #8 (unverified)"], decisions: ["D1"], drawn: ["D1"], status: "no_source" },
    ]);
  });

  it("lists the brief before the chats", () => {
    const rows = flowOf(COMMUNITY_ROOM_SEED, COMMUNITY_ROOM_CASE.briefMarkdown);
    expect(rows.map((row) => row.sources.map(label))).toEqual([
      ["Brief"],
      ["Chat #8"],
      [],
      ["Chat #4 (unverified)"],
      ["Chat #2"],
    ]);
  });

  it("carries every requirement of the complete example through, each source listed", () => {
    const rows = flowOf(BRIGHTPATH_COMPLETE_SEED, BRIGHTPATH_CASE.briefMarkdown);
    expect(rows.every((row) => row.status === "carried_through")).toBe(true);
    expect(rows.find((row) => row.id === "R2")?.sources.map(label)).toEqual(["Chat #4", "Chat #4"]);
  });
});

describe("requirement web (level 2)", () => {
  const sampleGraph = () => {
    const seed = COMMUNITY_ROOM_SEED;
    const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);
    return flowGraph(doc, seed.review.links);
  };

  it("draws every source, requirement, decision and box once, joined only by references", () => {
    const graph = sampleGraph();
    const keys = (column: string) => graph.nodes.filter((node) => node.column === column).map((node) => node.label);
    // Chat #4's quote doesn't verify, so it is no node; R3 has no citation at all.
    expect(keys("source")).toEqual(["Brief", "Chat #8", "Chat #2"]);
    expect(keys("requirement")).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    expect(keys("decision")).toEqual(["D1", "D2", "D3", "D4", "D5", "D6"]);
    // A design for each decision with a sketch that parses; D3 and D5 have none.
    expect(keys("design")).toEqual(["D1", "D2", "D4", "D6"]);
    expect(keys("final")).toEqual(["Desk", "Queue", "Calendar", "SMS", "Printer"]);
    const edges = graph.edges.map((edge) => `${edge.from}>${edge.to}`);
    expect(edges).toEqual(
      expect.arrayContaining([
        "src:brief>req:R1",
        "req:R1>dec:D3",
        "dec:D1>sketch:D1",
        "sketch:D1>box:Calendar",
        "sketch:D4>box:Queue",
      ]),
    );
    // Not drawn: D3 and D5 reach no design or box. Unexplained: nothing reaches Printer.
    expect(edges.some((edge) => edge.startsWith("dec:D3>") || edge.startsWith("dec:D5>"))).toBe(false);
    expect(edges.some((edge) => edge.endsWith(">box:Printer"))).toBe(false);
    expect(graph.nodes.find((node) => node.key === "box:Printer")?.tone).toBe("unexplained");
    expect(graph.nodes.find((node) => node.key === "dec:D3")?.tone).toBe("undrawn");
  });

  it("sorts the chosen column and lines the others up behind it", () => {
    const graph = sampleGraph();
    expect(orderFlow(graph, FLOW_COLUMNS, "requirement").requirement).toEqual(["req:R1", "req:R2", "req:R3", "req:R4", "req:R5"]);
    const bySource = orderFlow(graph, FLOW_COLUMNS, "source");
    expect(bySource.source).toEqual(["src:brief", "src:chat:2", "src:chat:8"]);
    // R5 (Chat #2) now sits above R2 (Chat #8); R3 and R4, with no source, go last.
    expect(bySource.requirement).toEqual(["req:R1", "req:R5", "req:R2", "req:R3", "req:R4"]);
  });

  it("lights up a node's web: what it comes from and what it leads to", () => {
    const graph = sampleGraph();
    expect([...flowWeb(graph, "req:R2")].sort()).toEqual(
      ["box:Calendar", "box:SMS", "dec:D2", "req:R2", "sketch:D2", "src:chat:8"].sort(),
    );
    // From a box, back through every design that draws it to its decision, requirements and sources.
    expect(flowWeb(graph, "box:SMS")).toEqual(new Set(["box:SMS", "sketch:D2", "dec:D2", "req:R2", "src:chat:8"]));
  });

  it("shows a design that is only partly in the final diagram as not drawn", () => {
    const seed = BRIGHTPATH_SEED;
    const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, BRIGHTPATH_CASE.briefMarkdown, seed.messages);
    const graph = flowGraph(doc, seed.review.links);
    // D5's sketch draws donor reports, which the final diagram leaves out; only its database is there.
    expect(graph.nodes.find((node) => node.key === "sketch:D5")?.tone).toBe("undrawn");
    expect(graph.edges.filter((edge) => edge.from === "sketch:D5")).toEqual([
      { from: "sketch:D5", to: "box:DB", tone: "not_drawn" },
    ]);
  });
});

describe("soundness web (level 2)", () => {
  const graphOf = (seed: CaseSeed, brief: string) =>
    soundnessGraph(parseDesignDoc(seed.docMarkdown, seed.finalCode, brief, seed.messages), seed.review.soundness);

  it("adds each decision's design between it and the components, coloured by the AI's judgments", () => {
    const graph = graphOf(COMMUNITY_ROOM_SEED, COMMUNITY_ROOM_CASE.briefMarkdown);
    const labels = (column: string) => graph.nodes.filter((node) => node.column === column).map((node) => node.label);
    expect(labels("design")).toEqual(["D1", "D2", "D4", "D6"]);
    expect(labels("components")).toEqual(["Desk", "Queue", "Calendar", "SMS", "Printer"]);
    const tone = (key: string) => graph.nodes.find((node) => node.key === key)?.tone;
    // Each item by the AI's judgment of it on its own.
    expect([tone("req:R3"), tone("dec:D5"), tone("sketch:D4"), tone("box:Queue")]).toEqual([
      "unsound",
      "unsound",
      "weak",
      "neutral",
    ]);
    // Each link by the AI's judgment of that link, and which judgment it is.
    const edge = (from: string, to: string) => graph.edges.find((item) => item.from === from && item.to === to);
    expect(edge("src:brief", "req:R1")).toMatchObject({ tone: "sound", judges: "quote" });
    expect(edge("req:R4", "dec:D5")).toMatchObject({ tone: "unsound", judges: "requirements" });
    expect(edge("dec:D4", "sketch:D4")).toMatchObject({ tone: "weak", judges: "decision" });
    expect(edge("sketch:D4", "box:Queue")).toMatchObject({ tone: "weak", judges: "diagram" });
    expect(orderFlow(graph, SOUNDNESS_COLUMNS, "decision").decision).toEqual([
      "dec:D1",
      "dec:D2",
      "dec:D3",
      "dec:D4",
      "dec:D5",
      "dec:D6",
    ]);
  });

  it("joins a design only to the components the final diagram has", () => {
    const graph = graphOf(BRIGHTPATH_SEED, BRIGHTPATH_CASE.briefMarkdown);
    // D5 sketches donor reports, which the final diagram leaves out.
    expect(graph.edges.filter((edge) => edge.from === "sketch:D5").map((edge) => edge.to)).toEqual(["box:DB"]);
    expect(graph.nodes.some((node) => node.key === "box:Reports")).toBe(false);
    expect(graph.edges.find((edge) => edge.from === "sketch:D5")?.tone).toBe("unsound");
  });
});
