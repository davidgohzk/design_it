import { useState } from "react";
import { Divider, Tab, Tabs, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { NODE_TYPE_SHAPE, diagramLegend, nodeBadges } from "../../../designDoc/legend";
import { plainNodeLabel } from "../../../designDoc/parse";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import type { Problem } from "../../../designDoc/problems";
import { SEVERITY_ICON } from "../../../designDoc/problems";
import { MermaidBlock } from "../../components/MermaidBlock";

type View = "preview" | "code" | "split";

type FinalDiagramPanelProps = {
  doc: ParsedDesignDoc;
  finalCode: string;
  /** Diagram problems only; the doc's are in the editor's Problems panel. */
  problems: Problem[];
  /** Jump to a problem's line in the doc. */
  onProblem?: (problem: Problem) => void;
  /** The diagram helper, shown on its own tab. */
  helper?: React.ReactNode;
};

/**
 * The final diagram, as in the Mermaid Live Editor: Code and Preview (or split), a legend built from
 * the node types, and the decisions that explain each box as GitHub-style label pills. The code is
 * read-only here: the doc's "## Final diagram" block is the only source.
 */
export function FinalDiagramPanel({ doc, finalCode, problems, onProblem, helper }: FinalDiagramPanelProps) {
  const [tab, setTab] = useState<"diagram" | "helper">("diagram");
  const [view, setView] = useState<View>("preview");
  const legend = diagramLegend(doc.final);
  const badges = nodeBadges(doc);
  const empty = doc.final.nodes.length === 0;

  return (
    <div className="design-wrap">
      <div className="panel-header">
        {helper ? (
          <Tabs value={tab} onChange={(_event, value: "diagram" | "helper") => setTab(value)} aria-label="Diagram panel">
            <Tab value="diagram" label="Final diagram" />
            <Tab value="helper" label="Diagram helper" />
          </Tabs>
        ) : (
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Final diagram
          </Typography>
        )}
        {tab === "diagram" && (
          <ToggleButtonGroup size="small" exclusive color="primary" value={view} onChange={(_event, value: View | null) => value && setView(value)}>
            <ToggleButton value="preview">Preview</ToggleButton>
            <ToggleButton value="code">Code</ToggleButton>
            <ToggleButton value="split">Split</ToggleButton>
          </ToggleButtonGroup>
        )}
      </div>
      <Divider />
      {tab === "helper" ? (
        helper
      ) : (
        <div className="final-pane scrollable">
          {empty ? (
            <Typography variant="body2" color="text.secondary" className="final-empty">
              No final diagram yet. Write it in the Mermaid block under “## Final diagram” in your doc, or copy one from the
              diagram helper.
            </Typography>
          ) : (
            <>
              <div className={`final-views ${view}`}>
                {view !== "code" && (
                  <div className="final-preview">
                    <MermaidBlock chart={finalCode} />
                  </div>
                )}
                {view !== "preview" && <pre className="final-code">{finalCode}</pre>}
              </div>

              <section className="diagram-legend" aria-label="Legend">
                <Typography variant="caption" className="legend-title">
                  Legend
                </Typography>
                {legend.map((entry) => (
                  <span key={entry.type} className={`legend-item legend-${entry.type}`}>
                    <span aria-hidden="true">{entry.type === "untyped" ? "?" : NODE_TYPE_SHAPE[entry.type]}</span> {entry.label} ({entry.count})
                  </span>
                ))}
              </section>

              <section className="node-badges" aria-label="Which decisions explain each box">
                {badges.map((badge) => (
                  <div key={badge.nodeId} className="node-badge-row">
                    <span className="node-badge-name">{plainNodeLabel(badge.label)}</span>
                    {badge.unexplained ? (
                      <Tooltip title="No decision's sketch has this box (C3)">
                        <span className="label-pill none">⚠ no decision</span>
                      </Tooltip>
                    ) : badge.decisionIds.length === 0 ? (
                      <span className="label-pill person">person</span>
                    ) : (
                      badge.decisionIds.map((id) => (
                        <span key={id} className="label-pill">
                          {id}
                        </span>
                      ))
                    )}
                  </div>
                ))}
              </section>
            </>
          )}

          {problems.length > 0 && (
            <ul className="diagram-problems">
              {problems.map((problem, index) => (
                <li key={`${problem.line}-${index}`}>
                  <button type="button" className={`problem-row ${problem.severity}`} onClick={() => onProblem?.(problem)}>
                    <span className="problem-icon" aria-label={problem.severity}>
                      {SEVERITY_ICON[problem.severity]}
                    </span>
                    <span className="problem-message">{problem.message}</span>
                    <span className="problem-line">Ln {problem.line}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
