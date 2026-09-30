import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Divider, TextField, Typography } from "@mui/material";
import { BadgedDiagram } from "./BadgedDiagram";
import type { ConsistencyIssue } from "../../designDoc/consistency";
import type { ParsedGraph } from "../../designDoc/parse";

type FinalDiagramPanelProps = {
  code: string;
  final: ParsedGraph;
  nodeDecisions: Record<string, string[]>;
  issues: ConsistencyIssue[];
  unjustifiedNodes: string[];
  /** Mermaid's own parse error for the final diagram, if any. */
  mermaidError?: string;
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
  /** Called when a manual edit ends (blur), so it is recorded as one history turn. */
  onCodeCommit?: () => void;
  onBuildFromSketches?: () => void;
  canBuildFromSketches?: boolean;
  onGenerate?: (prompt: string) => void;
  generating?: boolean;
  streamingCode?: string;
  aiError?: string | null;
  onBadgeClick?: (decisionId: string) => void;
  /** Admin view: stepper over the final diagram's history. */
  historyControls?: ReactNode;
};

export function FinalDiagramPanel({
  code,
  final,
  nodeDecisions,
  issues,
  unjustifiedNodes,
  mermaidError,
  readOnly = false,
  onCodeChange,
  onCodeCommit,
  onBuildFromSketches,
  canBuildFromSketches = false,
  onGenerate,
  generating = false,
  streamingCode = "",
  aiError,
  onBadgeClick,
  historyControls,
}: FinalDiagramPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [expanded, setExpanded] = useState(false);
  const parseError = final.parseError ?? mermaidError;
  const legend = final.nodes.filter((node) => !node.isActor);

  const submit = () => {
    const text = prompt.trim();
    if (!text || generating || !onGenerate) return;
    onGenerate(text);
  };

  return (
    <div className="simple-final">
      <header className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Final diagram
        </Typography>
        {!readOnly && onBuildFromSketches && (
          <Button
            size="small"
            variant="outlined"
            disabled={!canBuildFromSketches || generating}
            onClick={onBuildFromSketches}
            title="Merge every decision's sketch into the final diagram"
          >
            Build final from sketches
          </Button>
        )}
      </header>
      <Divider />
      <div className="panel-body simple-final-body scrollable">
        {historyControls}
        <div className="simple-final-diagram">
          {!code.trim() ? (
            <Typography variant="caption" color="text.secondary">
              No final diagram yet. Build it from your sketches, describe it to the AI, or write Mermaid below.
            </Typography>
          ) : parseError ? (
            <code className="simple-mermaid-error">{parseError}</code>
          ) : (
            <>
              <BadgedDiagram
                code={code}
                nodeDecisions={nodeDecisions}
                unjustifiedNodes={unjustifiedNodes}
                onBadgeClick={onBadgeClick}
                className="mermaid-fill"
              />
              <Button size="small" className="simple-expand" onClick={() => setExpanded(true)}>
                Expand
              </Button>
            </>
          )}
        </div>
        <Dialog open={expanded} onClose={() => setExpanded(false)} maxWidth="xl" fullWidth>
          <DialogTitle>Final diagram</DialogTitle>
          <DialogContent className="simple-final-expanded">
            {expanded && !parseError && code.trim() && (
              <BadgedDiagram
                code={code}
                nodeDecisions={nodeDecisions}
                unjustifiedNodes={unjustifiedNodes}
                onBadgeClick={(decisionId) => {
                  setExpanded(false);
                  onBadgeClick?.(decisionId);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {legend.length > 0 && !parseError && (
          <div className="simple-legend">
            <div className="design-section-label">Boxes and the decisions that explain them</div>
            {legend.map((node) => (
              <div key={node.id} className="simple-legend-row">
                <code>{node.id}</code>
                <span className="simple-legend-label">{node.label}</span>
                {(nodeDecisions[node.id] ?? []).length === 0 ? (
                  <span className="simple-legend-none">no decision</span>
                ) : (
                  nodeDecisions[node.id].map((decisionId) => (
                    <button
                      key={decisionId}
                      type="button"
                      className="simple-legend-badge"
                      onClick={() => onBadgeClick?.(decisionId)}
                    >
                      {decisionId}
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        )}

        <div className="simple-checks" aria-live="polite">
          <div className="design-section-label">Consistency with your sketches</div>
          {parseError ? (
            <span className="simple-legend-none">Checks resume once the diagram parses.</span>
          ) : issues.length === 0 ? (
            <span className="simple-warning-ok">
              {code.trim() ? "✓ Matches every sketch, and every box is explained" : "Nothing to check yet."}
            </span>
          ) : (
            <ul className="simple-inline-warnings">
              {issues.map((issue, index) => (
                <li key={index}>
                  <span className="simple-check-tag">{issue.check}</span> {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="design-section">
          <div className="design-section-label">Mermaid</div>
          <textarea
            className="simple-final-code"
            value={generating ? streamingCode : code}
            readOnly={readOnly || generating}
            onChange={(event) => onCodeChange?.(event.target.value)}
            onBlur={() => onCodeCommit?.()}
            spellCheck={false}
            placeholder={'flowchart LR\n  Resident["Resident (actor)"] --> Desk["Desk computer"]'}
          />
        </div>

        {!readOnly && onGenerate && (
          <div className="design-section design-input">
            <TextField
              multiline
              minRows={2}
              maxRows={5}
              size="small"
              placeholder={code.trim() ? "Describe a change to the final diagram..." : "Describe the whole system..."}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="design-input-actions">
              <Button variant="contained" size="small" onClick={submit} disabled={generating || !prompt.trim()}>
                {generating ? "Generating..." : code.trim() ? "Update with AI" : "Generate with AI"}
              </Button>
              {aiError && (
                <Typography variant="caption" color="error">
                  {aiError}
                </Typography>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
