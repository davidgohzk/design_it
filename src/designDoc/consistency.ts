// Sketch ↔ final diagram consistency checks (§5.4).
// Node ids mean the same component everywhere; edges match on direction (from → to), not label.
import { edgeKey, hasSketch } from "./parse";
import type { GraphNode, ParsedDecision, ParsedDesignDoc } from "./parse";

type ConsistencyCheck = "C1" | "C2" | "C3" | "C4" | "C5";
export type ConsistencyIssue = {
  check: ConsistencyCheck;
  message: string;
  /** The decision whose sketch the issue is about (C1, C2, and C5 when a sketch is involved). */
  decisionId?: string;
  nodeId?: string;
  edge?: { from: string; to: string };
};
export type ConsistencyResult = {
  issues: ConsistencyIssue[];
  /** Decisions whose sketch fails C1 or C2 against the final diagram. */
  inconsistentDecisions: string[];
  /** Non-actor final nodes in no sketch (C3). */
  unjustifiedNodes: string[];
  /** Final edges in no sketch (C4). */
  unexplainedEdges: { from: string; to: string }[];
};

const arrow = (edge: { from: string; to: string }) => `\`${edge.from} → ${edge.to}\``;

/** Sketches that can be compared: present, non-empty and parsed without error. */
export const usableSketches = (decisions: ParsedDecision[]) =>
  decisions.filter((decision) => hasSketch(decision) && !decision.sketch?.parseError);

export function checkConsistency(doc: ParsedDesignDoc): ConsistencyResult {
  const result: ConsistencyResult = { issues: [], inconsistentDecisions: [], unjustifiedNodes: [], unexplainedEdges: [] };
  if (doc.final.parseError) return result;

  const sketches = usableSketches(doc.decisions);
  const finalNodes = new Map(doc.final.nodes.map((node) => [node.id, node]));
  const finalEdges = new Set(doc.final.edges.map(edgeKey));
  const sketchNodes = new Set<string>();
  const sketchEdges = new Set<string>();
  const inconsistent = new Set<string>();

  for (const decision of sketches) {
    const sketch = decision.sketch!;
    for (const node of sketch.nodes) {
      sketchNodes.add(node.id);
      if (!finalNodes.has(node.id)) {
        inconsistent.add(decision.id);
        result.issues.push({
          check: "C1",
          decisionId: decision.id,
          nodeId: node.id,
          message: `${decision.id}'s sketch has \`${node.id}\`, but the final diagram doesn't.`,
        });
      }
    }
    const reported = new Set<string>();
    for (const edge of sketch.edges) {
      const key = edgeKey(edge);
      sketchEdges.add(key);
      if (finalEdges.has(key) || reported.has(key)) continue;
      reported.add(key);
      inconsistent.add(decision.id);
      result.issues.push({
        check: "C2",
        decisionId: decision.id,
        edge: { from: edge.from, to: edge.to },
        message: `${decision.id}'s sketch shows ${arrow(edge)}, but the final diagram doesn't.`,
      });
    }
  }

  for (const node of doc.final.nodes) {
    if (node.isActor || sketchNodes.has(node.id)) continue;
    result.unjustifiedNodes.push(node.id);
    result.issues.push({ check: "C3", nodeId: node.id, message: `\`${node.id}\` isn't in any decision's sketch.` });
  }

  const reportedEdges = new Set<string>();
  for (const edge of doc.final.edges) {
    const key = edgeKey(edge);
    if (sketchEdges.has(key) || reportedEdges.has(key)) continue;
    reportedEdges.add(key);
    result.unexplainedEdges.push({ from: edge.from, to: edge.to });
    result.issues.push({
      check: "C4",
      edge: { from: edge.from, to: edge.to },
      message: `No decision explains ${arrow(edge)}.`,
    });
  }

  // C5: a node marked (actor) in one place must be an actor everywhere.
  const places = new Map<string, { where: string; decisionId?: string; isActor: boolean }[]>();
  const note = (node: GraphNode, where: string, decisionId?: string) => {
    const list = places.get(node.id) ?? [];
    list.push({ where, decisionId, isActor: node.isActor });
    places.set(node.id, list);
  };
  for (const decision of sketches) {
    for (const node of decision.sketch!.nodes) note(node, `${decision.id}'s sketch`, decision.id);
  }
  for (const node of doc.final.nodes) note(node, "the final diagram");
  for (const [nodeId, list] of places) {
    const actor = list.find((place) => place.isActor);
    const notActor = list.find((place) => !place.isActor);
    if (!actor || !notActor) continue;
    result.issues.push({
      check: "C5",
      nodeId,
      decisionId: actor.decisionId ?? notActor.decisionId,
      message: `\`${nodeId}\` is an actor in ${actor.where} but not in ${notActor.where}.`,
    });
  }

  result.inconsistentDecisions = sketches.map((decision) => decision.id).filter((id) => inconsistent.has(id));
  return result;
}

