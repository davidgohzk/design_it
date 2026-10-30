import { useMemo } from "react";
import { FLOW_COLUMNS, rationaleGraph, traceabilityGraph } from "../../../assessment/flow";
import type { FlowColumn, FlowStatus, WebEdge, WebNode } from "../../../assessment/flow";
import type { AssessmentResult } from "../../../assessment/types";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import type { CitationHandlers } from "../panels/citationLinks";
import { FlowWeb } from "./FlowWeb";

const COLUMN_LABELS: Record<FlowColumn, string> = {
  source: "Source",
  requirement: "Requirement",
  decision: "Decision",
  design: "Design",
  final: "Components",
};
const COLUMNS = FLOW_COLUMNS.map((id) => ({ id, label: COLUMN_LABELS[id] }));

/** One colour per end state: every link a requirement made is drawn in the colour of where it ended up. */
const STATUS_COLORS: Record<FlowStatus, string> = {
  carried_through: "#16a34a",
  not_drawn: "#f59e0b",
  no_decision: "#f97316",
  no_source: "#ef4444",
};
const FLOW_LABELS: Record<FlowStatus, string> = {
  carried_through: "Carried through",
  not_drawn: "Not drawn",
  no_decision: "No decision",
  no_source: "No source",
};
const LEGEND_ORDER: readonly FlowStatus[] = ["carried_through", "not_drawn", "no_decision", "no_source"];

/**
 * The design doc's flow of references: every source, requirement, decision, design (each decision's
 * sketch) and component once, joined by the references between them, each requirement coloured by
 * where its chain of references stops.
 */
export function TraceabilityWeb({
  doc,
  result,
  citation,
}: {
  doc: ParsedDesignDoc;
  result: AssessmentResult;
  citation: CitationHandlers;
}) {
  const graph = useMemo(() => traceabilityGraph(doc, result), [doc, result]);
  if (graph.rows.length === 0) return <div className="report-note">No requirements yet.</div>;
  const counts = new Map<FlowStatus, number>();
  for (const row of graph.rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);

  return (
    <FlowWeb
      graph={graph}
      columns={COLUMNS}
      defaultAnchor="requirement"
      citation={citation}
      fill={(node) => (node.column === "requirement" ? STATUS_COLORS[node.tone as FlowStatus] : undefined)}
      edgeColor={(edge) => STATUS_COLORS[edge.tone as FlowStatus] ?? "#94a3b8"}
      hint="Click a node to light up everything it comes from and leads to. Click a heading to sort by it."
      legend={
        <>
          {LEGEND_ORDER.filter((status) => counts.has(status)).map((status) => (
            <span key={status} className="flow-graph-legend-item">
              <span className="flow-graph-swatch" style={{ background: STATUS_COLORS[status] }} />
              {FLOW_LABELS[status]} ({counts.get(status)})
            </span>
          ))}
          <span className="flow-graph-legend-item">
            <span className="flow-graph-swatch is-outline" style={{ borderColor: "#f59e0b" }} />
            Decision not drawn
          </span>
          <span className="flow-graph-legend-item">
            <span className="flow-graph-swatch is-outline is-dashed" style={{ borderColor: "#ef4444" }} />
            Component no decision explains
          </span>
        </>
      }
    />
  );
}

/** Colours for the judge's verdicts, in the rationale web. */
const VERDICT_COLORS: Record<string, string | undefined> = {
  sound: "#16a34a",
  weak: "#f59e0b",
  unsound: "#ef4444",
  uncertain: "#94a3b8",
  skipped_lint: "#94a3b8",
  neutral: undefined,
};
const VERDICT_LABELS: Record<string, string> = {
  sound: "sound",
  weak: "weak",
  unsound: "unsound",
  uncertain: "could not be verified",
};

/** The judge's verdict of one item or link, as a web tooltip reads it. */
const Critique = ({ label, verdict, reason }: { label: string; verdict?: string; reason?: string }) => (
  <div className="flow-tip-critique">
    <span className="flow-tip-label">{label}</span>{" "}
    {verdict ? (
      <>
        <span className={`report-rating report-rating-${verdict}`}>{VERDICT_LABELS[verdict] ?? verdict}</span>
        {reason}
      </>
    ) : (
      "not judged"
    )}
  </div>
);

/**
 * The same web, judged: each item coloured by the verdict of the item itself and each link by the
 * verdict of that link, so hovering either shows the judge's reason for it.
 */
export function RationaleWeb({
  doc,
  result,
  citation,
}: {
  doc: ParsedDesignDoc;
  result: AssessmentResult;
  citation: CitationHandlers;
}) {
  const graph = useMemo(() => rationaleGraph(doc, result), [doc, result]);
  const reasons = useMemo(
    () => new Map(result.justify.items.map((item) => [item.itemId, item.reason])),
    [result.justify.items],
  );
  if (graph.nodes.length === 0) return <div className="report-note">Nothing in your doc had the parts needed to judge it.</div>;

  const nodeTip = (node: WebNode) =>
    node.column === "source" ? null : (
      <Critique label="On its own" verdict={node.tone} reason={reasons.get(node.target.kind === "sketch" ? `${node.target.id}-sketch` : node.label)} />
    );
  const edgeTip = (edge: WebEdge) => <Critique label="This link" verdict={edge.tone} reason={edge.reason} />;

  return (
    <FlowWeb
      graph={graph}
      columns={COLUMNS}
      defaultAnchor="requirement"
      citation={citation}
      fill={(node) => (node.column === "source" ? undefined : VERDICT_COLORS[node.tone])}
      edgeColor={(edge) => VERDICT_COLORS[edge.tone] ?? "#94a3b8"}
      nodeTip={nodeTip}
      edgeTip={edgeTip}
      hint="Hover an item or a link to see the judge's reason. Click a node to light up its web; click a heading to sort by it."
      legend={
        <>
          {(["sound", "weak", "unsound", "uncertain"] as const).map((verdict) => (
            <span key={verdict} className="flow-graph-legend-item">
              <span className="flow-graph-swatch" style={{ background: VERDICT_COLORS[verdict] }} />
              {VERDICT_LABELS[verdict]}
            </span>
          ))}
        </>
      }
    />
  );
}
