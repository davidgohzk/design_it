import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "../cases/community-room/seed";
import { parseDesignDoc } from "../designDoc/parse";
import { FLOW_COLUMNS, flowWeb, orderFlow, rationaleGraph, traceabilityGraph } from "./flow";

const docOf = (seed: typeof COMMUNITY_ROOM_SEED) =>
  parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);

describe("the traceability web", () => {
  const seed = COMMUNITY_ROOM_COMPLETE_SEED;
  const doc = docOf(seed);
  const graph = traceabilityGraph(doc, seed.review);

  it("puts every source, requirement, decision, design and component in its column", () => {
    const columns = new Set(graph.nodes.map((node) => node.column));
    for (const column of FLOW_COLUMNS) expect(columns).toContain(column);
    // One node per requirement, decision and non-actor box, however often each is referenced.
    expect(graph.nodes.filter((node) => node.column === "requirement")).toHaveLength(doc.requirements.length);
    expect(graph.nodes.filter((node) => node.column === "decision")).toHaveLength(doc.decisions.length);
    expect(graph.nodes.filter((node) => node.column === "final")).toHaveLength(doc.final.nodes.filter((node) => !node.isActor).length);
  });

  it("colours a complete requirement as carried through, and its links with it", () => {
    expect(graph.rows.every((row) => row.status === "carried_through")).toBe(true);
    const requirement = graph.nodes.find((node) => node.column === "requirement")!;
    expect(requirement.tone).toBe("carried_through");
    expect(graph.edges.some((edge) => edge.to === requirement.key && edge.tone === "carried_through")).toBe(true);
  });

  it("joins only the links whose two ends are both in the web", () => {
    const keys = new Set(graph.nodes.map((node) => node.key));
    for (const edge of graph.edges) {
      expect(keys).toContain(edge.from);
      expect(keys).toContain(edge.to);
    }
  });

  it("says no source for a requirement that cites nothing that verifies", () => {
    const sparse = traceabilityGraph(docOf(COMMUNITY_ROOM_SEED), COMMUNITY_ROOM_SEED.review);
    expect(sparse.rows.some((row) => row.status !== "carried_through")).toBe(true);
  });
});

describe("the rationale web", () => {
  const seed = COMMUNITY_ROOM_COMPLETE_SEED;
  const doc = docOf(seed);

  it("takes each item's colour from the judge's verdict of that item", () => {
    const result = {
      ...seed.review,
      justify: {
        items: [
          { itemId: doc.requirements[0].id, kind: "requirement" as const, verdict: "weak" as const, reason: "Overstates its quote.", quotes: [], runs: [], method: "ai_verified_quote" as const },
        ],
      },
    };
    const graph = rationaleGraph(doc, result);
    expect(graph.nodes.find((node) => node.key === `req:${doc.requirements[0].id}`)?.tone).toBe("weak");
    // An item the judge said nothing about is uncertain, not invented as sound.
    expect(graph.nodes.find((node) => node.key === `req:${doc.requirements[1].id}`)?.tone).toBe("uncertain");
  });

  it("carries each link's verdict and reason, so hovering the line can show why", () => {
    const requirement = doc.requirements[0];
    const citation = requirement.citations.find((item) => item.valid)!;
    const from = citation.source === "brief" ? "brief" : `chat:${citation.messageIndex}`;
    const result = {
      ...seed.review,
      rationale: [{ id: `${from}>${requirement.id}`, from, to: requirement.id, verdict: "unsound" as const, reason: "The quote says nothing of the sort." }],
    };
    const graph = rationaleGraph(doc, result);
    const edge = graph.edges.find((item) => item.to === `req:${requirement.id}`)!;
    expect(edge.tone).toBe("unsound");
    expect(edge.reason).toBe("The quote says nothing of the sort.");
  });
});

describe("laying a web out", () => {
  const seed = COMMUNITY_ROOM_COMPLETE_SEED;
  const graph = traceabilityGraph(docOf(seed), seed.review);

  it("keeps the anchor column in its natural order and lines the rest up behind it", () => {
    const order = orderFlow(graph, FLOW_COLUMNS, "requirement");
    const natural = graph.nodes.filter((node) => node.column === "requirement").sort((a, b) => a.rank - b.rank).map((node) => node.key);
    expect(order.requirement).toEqual(natural);
    for (const column of FLOW_COLUMNS) {
      expect(order[column]).toHaveLength(graph.nodes.filter((node) => node.column === column).length);
    }
    // Sorting by another column reorders the others, not that column.
    const byDecision = orderFlow(graph, FLOW_COLUMNS, "decision");
    expect(byDecision.decision).toEqual(graph.nodes.filter((node) => node.column === "decision").sort((a, b) => a.rank - b.rank).map((node) => node.key));
  });

  it("lights up everything a node comes from and leads to", () => {
    const requirement = graph.nodes.find((node) => node.column === "requirement")!;
    const web = flowWeb(graph, requirement.key);
    expect(web).toContain(requirement.key);
    // Its sources upstream and its decisions downstream are all in the web.
    expect([...web].some((key) => key.startsWith("src:"))).toBe(true);
    expect([...web].some((key) => key.startsWith("dec:"))).toBe(true);
    // A node with no links to it is its own web.
    expect(flowWeb({ nodes: graph.nodes, edges: [] }, requirement.key)).toEqual(new Set([requirement.key]));
  });
});
