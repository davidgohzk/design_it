import { useMemo } from "react";
import { FLOW_COLUMNS, flowGraph } from "../../../assessment/flow";
import type { FlowColumn, FlowEdge, FlowStatus } from "../../../assessment/flow";
import type { AssessmentLinks } from "../../../assessment/types";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import { FlowWeb } from "./FlowWeb";
import { FLOW_LABELS } from "./reportData";
import type { ReportNav } from "./reportTypes";

/** One colour per end state: every link a requirement made is drawn in the colour of where it ended up. */
const STATUS_COLORS: Record<FlowStatus, string> = {
  carried_through: "#16a34a",
  not_drawn: "#f59e0b",
  no_decision: "#f97316",
  no_source: "#ef4444",
};
const EDGE_COLORS: Record<FlowEdge["tone"], string> = { ...STATUS_COLORS, drawn: "#16a34a" };
const LEGEND_ORDER: readonly FlowStatus[] = ["carried_through", "not_drawn", "no_decision", "no_source"];

const COLUMN_LABELS: Record<FlowColumn, string> = {
  source: "Source",
  requirement: "Requirement",
  decision: "Decision",
  design: "Design",
  final: "Components",
};
const COLUMNS = FLOW_COLUMNS.map((id) => ({ id, label: COLUMN_LABELS[id] }));

/**
 * Level 1's flow of references: every source, requirement, decision, design (each decision's sketch)
 * and component once, joined by the references between them, each requirement coloured by where its
 * chain of references stops.
 */
export function RequirementFlow({
  parsed,
  links,
  nav,
}: {
  parsed: ParsedDesignDoc;
  links: AssessmentLinks;
  nav: ReportNav;
}) {
  const graph = useMemo(() => flowGraph(parsed, links), [parsed, links]);
  if (graph.rows.length === 0) return <div className="report-note">No requirements yet.</div>;
  const counts = new Map<FlowStatus, number>();
  for (const row of graph.rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);

  return (
    <FlowWeb
      graph={graph}
      columns={COLUMNS}
      defaultAnchor="requirement"
      nav={nav}
      fill={(node) => (node.column === "requirement" ? STATUS_COLORS[node.tone as FlowStatus] : undefined)}
      edgeColor={(edge) => EDGE_COLORS[edge.tone as FlowEdge["tone"]]}
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
