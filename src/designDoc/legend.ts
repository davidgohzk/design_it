// The diagram pane's legend and decision badges (WP13), worked out from the doc. Pure functions.
import type { NodeType } from "@/cases/types";
import type { ParsedDesignDoc, ParsedGraph } from "./parse";
import { NODE_TYPES } from "./parse";

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  person: "Person",
  system: "System",
  container: "Container (app, service)",
  datastore: "Datastore",
  external: "External system",
};

/** The shape each type is drawn with, so the legend matches what's on screen. */
export const NODE_TYPE_SHAPE: Record<NodeType, string> = {
  person: "▢",
  system: "▢",
  container: "▢",
  datastore: "⬭",
  external: "▭",
};

export type LegendEntry = { type: NodeType | "untyped"; label: string; count: number };

/** One line per node type used in the diagram, plus untyped boxes when there are any. */
export function diagramLegend(graph: ParsedGraph): LegendEntry[] {
  const counts = new Map<NodeType | "untyped", number>();
  for (const node of graph.nodes) {
    const key = node.type ?? "untyped";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries: LegendEntry[] = [];
  for (const type of NODE_TYPES) {
    const count = counts.get(type);
    if (count) entries.push({ type, label: NODE_TYPE_LABEL[type], count });
  }
  const untyped = counts.get("untyped");
  if (untyped) entries.push({ type: "untyped", label: "No type yet", count: untyped });
  return entries;
}

export type NodeBadges = {
  nodeId: string;
  label: string;
  decisionIds: string[];
  /** A box with no decision behind it (C3). People don't need one. */
  unexplained: boolean;
};

/** Which decisions explain each box in the final diagram, for the D# pills under it. */
export function nodeBadges(doc: ParsedDesignDoc): NodeBadges[] {
  return doc.final.nodes.map((node) => {
    const decisionIds = doc.nodeDecisions[node.id] ?? [];
    return { nodeId: node.id, label: node.label, decisionIds, unexplained: decisionIds.length === 0 && !node.isActor };
  });
}
