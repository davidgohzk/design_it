import { useState } from "react";
import { Button, Divider, TextField, Typography } from "@mui/material";
import { MermaidBlock } from "../MermaidBlock";
import { parseMermaidFlowchart } from "../../designDoc/parse";
import type { FinalTurn } from "./useDesignWorkspace";

// The /simple final-diagram panel, like /demo's DesignPanel: describe the system in plain English
// and the AI turns it into Mermaid. The result is the design doc's "## Final diagram" block.

const SOURCE_LABEL: Record<FinalTurn["source"], string> = {
  ai: "AI",
  manual: "Edited in the doc",
  seed: "Prepopulated example",
};

function CodeSection({ code }: { code: string }) {
  return (
    <div className="design-section design-code">
      <div className="design-section-label">Mermaid</div>
      <pre className="design-code-body">{code || "No diagram yet."}</pre>
    </div>
  );
}

function DiagramSection({ code }: { code: string }) {
  const hasBoxes = parseMermaidFlowchart(code).nodes.length > 0;
  if (!hasBoxes) {
    return (
      <div className="design-section design-diagram design-placeholder">
        <Typography variant="caption" color="text.secondary">
          The rendered diagram appears here once a design is generated.
        </Typography>
      </div>
    );
  }
  return (
    <div className="design-section design-diagram">
      <MermaidBlock chart={code} className="mermaid-fill" />
    </div>
  );
}

export function DiagramChatPanel({
  code,
  generating = false,
  streamingCode = "",
  error,
  onGenerate,
}: {
  /** The final diagram, i.e. the design doc's last Mermaid block. */
  code: string;
  generating?: boolean;
  streamingCode?: string;
  error?: string | null;
  onGenerate: (prompt: string) => void;
}) {
  const [input, setInput] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const hasDiagram = parseMermaidFlowchart(code).nodes.length > 0;

  const submit = (prompt: string) => {
    const text = prompt.trim();
    if (!text || generating) return;
    setLastPrompt(text);
    onGenerate(text);
  };

  return (
    <div className="design-wrap">
      <div className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Final diagram
        </Typography>
      </div>
      <Divider />
      <div className="design-panel">
        <div className="design-section design-input">
          <TextField
            multiline
            minRows={3}
            maxRows={6}
            size="small"
            placeholder={
              hasDiagram
                ? "Describe a change to the final diagram..."
                : "Describe your whole system in plain English..."
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="design-input-actions">
            <Button variant="contained" size="small" onClick={() => submit(input)} disabled={generating || !input.trim()}>
              {generating ? "Generating..." : hasDiagram ? "Update Diagram" : "Generate Diagram"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Saved as the last section of your design doc.
            </Typography>
          </div>
          {error && (
            <div className="design-error">
              <Typography variant="caption" color="error">
                {error}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => submit(lastPrompt)} disabled={generating || !lastPrompt}>
                Retry
              </Button>
            </div>
          )}
        </div>
        <CodeSection code={generating ? streamingCode : code} />
        <DiagramSection code={code} />
      </div>
    </div>
  );
}

/** Admin view: step through every version of the final diagram, as /demo's admin panel does. */
export function DiagramHistoryPanel({ history, currentCode }: { history: FinalTurn[]; currentCode: string }) {
  const [step, setStep] = useState<number | null>(null);
  // Follow the latest turn until the admin steps back.
  const index = step ?? Math.max(0, history.length - 1);
  const turn = history[index];
  const code = turn?.code ?? currentCode;

  return (
    <div className="design-wrap">
      <div className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Final diagram
        </Typography>
      </div>
      <Divider />
      <div className="design-panel">
        <div className="design-section design-input">
          <div className="design-stepper">
            <Button size="small" variant="outlined" disabled={index <= 0} onClick={() => setStep(index - 1)}>
              ←
            </Button>
            <Typography variant="caption" color="text.secondary">
              {history.length ? `Turn ${index + 1} / ${history.length} · ${SOURCE_LABEL[turn.source]}` : "No turns yet"}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={index >= history.length - 1}
              onClick={() => setStep(index + 1)}
            >
              →
            </Button>
          </div>
          <div className="design-section-label">Prompt</div>
          <div className="design-prompt-readout">
            {turn?.prompt ?? (turn ? SOURCE_LABEL[turn.source] : "The engineer has not made a final diagram yet.")}
          </div>
        </div>
        <CodeSection code={code} />
        <DiagramSection code={code} />
      </div>
    </div>
  );
}
