// Live format checks for the design doc and its diagrams (WP6). These check the format, not the
// skill: dropped facts and unused requirements are review results and appear only after Submit.
import { finalDiagramLines } from "./finalSection";
import { QUALITIES, hasSketch } from "./parse";
import type { GraphEdge, GraphNode, ParsedDesignDoc } from "./parse";
import { diagramLineOf } from "./problemList";
import type { ProblemSeverity, QuickFix } from "./problems";

export type LintRule =
  | "no-citation"
  | "citation-unverified"
  | "duplicate-id"
  | "no-requirement"
  | "no-trade-off"
  | "missing-ref"
  | "no-sketch"
  | "sketch-parse"
  | "no-alternative"
  | "bad-quality"
  | "unlabelled-arrow"
  | "untyped-node"
  | "many-sources"
  | "inline-format";

export type LintWarning = {
  line: number;
  itemId: string;
  rule: LintRule;
  message: string;
  severity: ProblemSeverity;
  source: "doc" | "diagram";
  nodeId?: string;
  fix?: QuickFix;
};

const SEVERITY: Record<LintRule, ProblemSeverity> = {
  "duplicate-id": "error",
  "missing-ref": "error",
  "sketch-parse": "error",
  "no-citation": "warning",
  "citation-unverified": "warning",
  "no-requirement": "warning",
  "no-trade-off": "warning",
  "no-sketch": "warning",
  "no-alternative": "warning",
  "bad-quality": "warning",
  "unlabelled-arrow": "warning",
  "untyped-node": "warning",
  "many-sources": "info",
  "inline-format": "info",
};

/** The line a node is drawn with a label on (where a [type] tag goes), else its first mention. */
function nodeLine(lines: string[], start: number, end: number, node: GraphNode) {
  const escaped = node.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelled = new RegExp(`(^|[^\\w])${escaped}\\s*[[({>]`);
  for (let line = start; line <= Math.min(end, lines.length); line += 1) {
    if (labelled.test(lines[line - 1] ?? "")) return line;
  }
  return diagramLineOf(lines, start, end, node.id) ?? start;
}

type Diagram = { itemId: string; nodes: GraphNode[]; edges: GraphEdge[]; start: number; end: number };

export function lintDesignDoc(doc: ParsedDesignDoc, markdown = ""): LintWarning[] {
  const warnings: LintWarning[] = [];
  const add = (warning: Omit<LintWarning, "severity" | "source"> & { source?: "doc" | "diagram" }) =>
    warnings.push({ source: "doc", ...warning, severity: SEVERITY[warning.rule] });
  const items = [...doc.requirements, ...doc.decisions];

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) add({ line: item.line, itemId: item.id, rule: "duplicate-id", message: `Two items are called ${item.id}.` });
    seen.add(item.id);
  }

  for (const requirement of doc.requirements) {
    const { id, line, citations } = requirement;
    if (citations.length === 0) {
      add({ line, itemId: id, rule: "no-citation", message: `${id} has no citation.` });
      continue;
    }
    for (const citation of citations) {
      if (citation.valid) continue;
      const place = citation.source === "brief" ? "the brief" : "the chat";
      const message =
        citation.source === "chat" && citation.invalidReason?.includes("not a client response")
          ? `${id} cites your own message; cite what the client said.`
          : `${id}'s quote isn't in ${place} anymore.`;
      add({ line, itemId: id, rule: "citation-unverified", message });
    }
    const sources = new Set(citations.map((citation) => citation.label));
    if (sources.size >= 3) add({ line, itemId: id, rule: "many-sources", message: `${id} may hold more than one idea.` });
  }

  const requirementIds = new Set(doc.requirements.map((requirement) => requirement.id));
  for (const decision of doc.decisions) {
    const { id, line, fieldLines } = decision;
    if (decision.because.length === 0) {
      add({ line: fieldLines.because ?? line, itemId: id, rule: "no-requirement", message: `${id} doesn't say which requirement it's because of.` });
    }
    for (const ref of decision.because) {
      if (!requirementIds.has(ref)) {
        add({ line: fieldLines.because ?? line, itemId: id, rule: "missing-ref", message: `${id} refers to ${ref}, which doesn't exist.` });
      }
    }
    if (!decision.insteadOf) {
      add({
        line,
        itemId: id,
        rule: "no-alternative",
        message: `${id} doesn't name an alternative (Instead of:).`,
        fix: { kind: "add-instead-of", decisionId: id, line },
      });
    }
    if (!decision.hasTradeOff) add({ line, itemId: id, rule: "no-trade-off", message: `${id} has no trade-off.` });
    if (decision.qualityText && !decision.quality) {
      const qualityLine = fieldLines.quality ?? line;
      add({
        line: qualityLine,
        itemId: id,
        rule: "bad-quality",
        message: `${id}'s quality '${decision.qualityText}' isn't on the list. Pick one of: ${QUALITIES.join(", ")}.`,
        fix: { kind: "pick-quality", decisionId: id, line: qualityLine },
      });
    }
    if (decision.sketch?.parseError) {
      add({
        line: decision.sketchLines?.start ?? line,
        itemId: id,
        rule: "sketch-parse",
        source: "diagram",
        message: `${id}'s sketch: ${decision.sketch.parseError}`,
      });
    } else if (!hasSketch(decision)) {
      add({ line, itemId: id, rule: "no-sketch", message: `${id} has no sketch.` });
    }
    if (decision.format === "inline" && decision.title) {
      add({ line, itemId: id, rule: "inline-format", message: `Try the labelled fields for ${id}.` });
    }
  }

  // Diagram rules: every arrow labelled, every box typed (C4), in each sketch and the final diagram.
  const lines = markdown.split("\n");
  const diagrams: Diagram[] = doc.decisions
    .filter((decision) => hasSketch(decision) && !decision.sketch?.parseError && decision.sketchLines)
    .map((decision) => ({
      itemId: decision.id,
      nodes: decision.sketch!.nodes,
      edges: decision.sketch!.edges,
      start: decision.sketchLines!.start + 1,
      end: decision.sketchLines!.end - 1,
    }));
  // Without the markdown (the final diagram given on its own), its problems point at line 1.
  const finalRange = finalDiagramLines(markdown) ?? { start: 1, end: 0 };
  if (!doc.final.parseError) {
    diagrams.push({ itemId: "final", nodes: doc.final.nodes, edges: doc.final.edges, ...finalRange });
  }
  for (const diagram of diagrams) {
    const where = diagram.itemId === "final" ? "the final diagram" : `${diagram.itemId}'s sketch`;
    const reported = new Set<string>();
    for (const edge of diagram.edges) {
      const key = `${edge.from}->${edge.to}`;
      if (edge.label || reported.has(key)) continue;
      reported.add(key);
      const line = diagramLineOf(lines, diagram.start, diagram.end, edge.from, edge.to) ?? diagram.start;
      add({
        line,
        itemId: diagram.itemId,
        rule: "unlabelled-arrow",
        source: "diagram",
        nodeId: edge.from,
        message: `The arrow ${edge.from} → ${edge.to} has no label (${where}).`,
        fix: { kind: "label-arrow", from: edge.from, to: edge.to, line },
      });
    }
    for (const node of diagram.nodes) {
      if (node.type) continue;
      const line = nodeLine(lines, diagram.start, diagram.end, node);
      add({
        line,
        itemId: diagram.itemId,
        rule: "untyped-node",
        source: "diagram",
        nodeId: node.id,
        message: `\`${node.id}\` has no type (${where}). Add [container], [datastore], [system] or [external].`,
        fix: { kind: "add-node-type", nodeId: node.id, line },
      });
    }
  }

  return warnings.sort((a, b) => a.line - b.line);
}
