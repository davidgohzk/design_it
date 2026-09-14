import { describe, expect, it } from "vitest";
import { CASE_REVIEW_FACTS } from "./caseReview";
import {
  buildLogicGraph,
  connectedLogicNodeIds,
  filterLogicGraph,
  layoutLogicGraph,
  listLogicChains,
} from "./logicGraph";
import { INITIAL_AI_REVIEW_RESULT, INITIAL_REVIEW_INPUT } from "./reviewSeed";
import type { LogicGraphData, LogicGraphNode, LogicStage } from "./types";

const makeGraph = () => buildLogicGraph(
  CASE_REVIEW_FACTS,
  INITIAL_REVIEW_INPUT.messages,
  INITIAL_AI_REVIEW_RESULT,
  INITIAL_REVIEW_INPUT.reportMarkdown,
);

const allStages = new Set<LogicStage>([
  "source",
  "chat",
  "subjective",
  "objective",
  "assessment",
  "plan",
  "design",
]);

describe("logic graph construction", () => {
  it("builds the complete offline graph across all four stages", () => {
    const graph = makeGraph();
    expect(new Set(graph.nodes.map((node) => node.stage))).toEqual(allStages);
    expect(graph.links.some((link) => link.relation === "elicited_as")).toBe(true);
    expect(graph.links.some((link) => link.relation === "cited_by")).toBe(true);
    expect(graph.links.some((link) => link.relation === "appears_as")).toBe(true);
    expect(graph.links.some((link) => link.relation === "informs")).toBe(true);
    expect(graph.links.some((link) => link.relation === "develops_into")).toBe(true);
    expect(graph.links.some((link) => {
      const source = graph.nodes.find((node) => node.id === link.source);
      const target = graph.nodes.find((node) => node.id === link.target);
      return link.relation === "develops_into"
        && source?.stage === "assessment"
        && target?.stage === "plan";
    })).toBe(true);
  });

  it("keeps IDs and seeded positions stable for an identical snapshot", () => {
    const first = makeGraph().nodes.map(({ id, x, y, fx, fy }) => ({ id, x, y, fx, fy }));
    const second = makeGraph().nodes.map(({ id, x, y, fx, fy }) => ({ id, x, y, fx, fy }));
    expect(second).toEqual(first);
    expect(first.every((node) => node.y === node.fy)).toBe(true);
    expect(new Set(first.filter((node) => node.id.startsWith("source-")).map((node) => node.fx)))
      .toEqual(new Set([-540]));
    expect(new Set(first.filter((node) => node.id.startsWith("report-")).map((node) => node.fx)))
      .toEqual(new Set([-180, 0, 180, 540]));
  });

  it("includes direct brief evidence and complete source-to-logic paths", () => {
    const graph = makeGraph();
    const briefLink = graph.links.find(
      (link) => link.relation === "cited_by" && link.source.startsWith("source-brief-"),
    );
    expect(briefLink).toBeDefined();

    const chains = listLogicChains(graph);
    expect(chains.some((chain) => {
      const kinds = chain.map((id) => graph.nodes.find((node) => node.id === id)?.kind);
      return kinds[0] === "source" && kinds.includes("report") && kinds.at(-1) === "logic";
    })).toBe(true);
  });

  it("represents assumed, missed, omitted, and unreferenced gaps without placeholders", () => {
    const graph = makeGraph();
    expect(graph.links.some(
      (link) => link.relation === "appears_as" && link.health === "assumed",
    )).toBe(true);

    const missedFact = INITIAL_AI_REVIEW_RESULT.coverage.find((item) => item.status === "missed");
    const missedId = `source-fact-${missedFact?.factId}`;
    expect(graph.links.some((link) => link.source === missedId || link.target === missedId)).toBe(false);

    const omissionChat = graph.nodes.find((node) => node.id.startsWith("chat-omission-"));
    expect(omissionChat).toBeDefined();
    expect(graph.links.some((link) => link.source === omissionChat?.id)).toBe(false);

    const missingReferenceClaim = INITIAL_AI_REVIEW_RESULT.grounding.claims.find(
      (claim) => claim.issue === "missing_reference",
    );
    expect(graph.links.some(
      (link) => link.target === missingReferenceClaim?.id && link.relation === "cited_by",
    )).toBe(false);
  });
});

describe("logic graph interaction helpers", () => {
  it("reorders adjacent layers to remove avoidable link crossings", () => {
    const node = (
      id: string,
      kind: LogicGraphNode["kind"],
      stage: LogicStage,
    ): LogicGraphNode => ({
      id,
      kind,
      stage,
      health: "grounded",
      label: id,
      text: id,
      detail: id,
      x: 0,
      y: 0,
      fx: 0,
      fy: 0,
    });
    const crossed: LogicGraphData = {
      nodes: [
        node("source-a", "source", "source"),
        node("source-b", "source", "source"),
        node("objective-a", "report", "objective"),
        node("objective-b", "report", "objective"),
      ],
      links: [
        { id: "a", source: "source-a", target: "objective-b", relation: "cited_by", health: "grounded", detail: "a" },
        { id: "b", source: "source-b", target: "objective-a", relation: "cited_by", health: "grounded", detail: "b" },
      ],
    };
    const arranged = layoutLogicGraph(crossed);
    const byId = new Map(arranged.nodes.map((item) => [item.id, item]));
    const first = arranged.links[0];
    const second = arranged.links[1];
    const sourceDelta = (byId.get(first.source)?.y ?? 0) - (byId.get(second.source)?.y ?? 0);
    const targetDelta = (byId.get(first.target)?.y ?? 0) - (byId.get(second.target)?.y ?? 0);
    expect(sourceDelta * targetDelta).toBeGreaterThanOrEqual(0);
  });

  it("routes shared connections through distinct curved lanes", () => {
    const graph = makeGraph();
    const fanOut = graph.links.find((candidate) =>
      graph.links.filter((link) => link.source === candidate.source).length > 1);
    const fanIn = graph.links.find((candidate) =>
      graph.links.filter((link) => link.target === candidate.target).length > 1);
    expect(fanOut).toBeDefined();
    expect(fanIn).toBeDefined();
    expect(new Set(
      graph.links.filter((link) => link.source === fanOut?.source).map((link) => link.curvature),
    ).size).toBeGreaterThan(1);
    expect(new Set(
      graph.links.filter((link) => link.target === fanIn?.target).map((link) => link.curvature),
    ).size).toBeGreaterThan(1);
  });

  it("filters full healthy or broken chains and preserves their context", () => {
    const graph = makeGraph();
    const grounded = filterLogicGraph(graph, allStages, "grounded");
    const gaps = filterLogicGraph(graph, allStages, "gaps");

    expect(grounded.nodes.length).toBeGreaterThan(0);
    expect(gaps.nodes.some((node) => node.health === "gap" || node.health === "assumed"))
      .toBe(true);
    expect(gaps.nodes.some((node) => node.health === "grounded")).toBe(true);
    expect(listLogicChains(grounded).every((chain) => chain.every((id) => {
      const node = grounded.nodes.find((candidate) => candidate.id === id);
      return node?.health === "grounded" || node?.health === "neutral";
    }))).toBe(true);
  });

  it("applies stage visibility and traverses both upstream and downstream", () => {
    const graph = makeGraph();
    const assessmentOnly = filterLogicGraph(graph, new Set<LogicStage>(["assessment"]), "all");
    expect(assessmentOnly.nodes.every((node) => node.stage === "assessment")).toBe(true);

    const linkedReport = graph.nodes.find(
      (node) => node.kind === "report"
        && graph.links.some((link) => link.target === node.id)
        && graph.links.some((link) => link.source === node.id),
    );
    expect(linkedReport).toBeDefined();
    const connected = connectedLogicNodeIds(graph, linkedReport?.id ?? null);
    expect(connected.has(linkedReport?.id ?? "")).toBe(true);
    expect([...connected].some((id) => graph.nodes.find((node) => node.id === id)?.kind === "source"))
      .toBe(true);
    expect([...connected].some((id) => graph.nodes.find((node) => node.id === id)?.kind === "logic"))
      .toBe(true);
  });
});
