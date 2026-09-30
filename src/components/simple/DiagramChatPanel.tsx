import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Divider, TextField, Typography } from "@mui/material";
import { MermaidBlock } from "../MermaidBlock";
import { parseMermaidFlowchart } from "../../designDoc/parse";
import type { DiagramTurn } from "./useDesignWorkspace";

// The /simple diagram helper, like /demo's DesignPanel: describe a system in plain English and the AI
// turns it into Mermaid. It only creates diagrams; it never changes the design doc. The engineer copies
// what they want into a decision's sketch or the doc's "## Final diagram" block.

function CodeSection({ code, action }: { code: string; action?: ReactNode }) {
  return (
    <div className="design-section design-code">
      <div className="design-section-label simple-code-label">
        <span>Mermaid</span>
        {action}
      </div>
      <pre className="design-code-body">{code || "No diagram yet."}</pre>
    </div>
  );
}

function DiagramSection({ code }: { code: string }) {
  if (parseMermaidFlowchart(code).nodes.length === 0) {
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

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="small"
      disabled={!code}
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : "Copy Mermaid"}
    </Button>
  );
}

export function DiagramChatPanel({
  code,
  generating = false,
  streamingCode = "",
  error,
  onGenerate,
}: {
  /** The helper's latest diagram. */
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
          Diagram helper
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
              hasDiagram ? "Describe a change to this diagram..." : "Describe your system design in plain English..."
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="design-input-actions">
            <Button variant="contained" size="small" onClick={() => submit(input)} disabled={generating || !input.trim()}>
              {generating ? "Generating..." : hasDiagram ? "Update Diagram" : "Generate Diagram"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Copy what you need into a sketch or your final diagram.
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
        <CodeSection code={generating ? streamingCode : code} action={<CopyButton code={generating ? "" : code} />} />
        <DiagramSection code={code} />
      </div>
    </div>
  );
}

/** Admin view: step through every diagram-helper prompt and its result, as /demo's admin panel does. */
export function DiagramHistoryPanel({ turns }: { turns: DiagramTurn[] }) {
  const [step, setStep] = useState<number | null>(null);
  // Follow the latest turn until the admin steps back.
  const index = step ?? Math.max(0, turns.length - 1);
  const turn = turns[index];

  return (
    <div className="design-wrap">
      <div className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Diagram helper
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
              {turns.length ? `Turn ${index + 1} / ${turns.length}` : "No turns yet"}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={index >= turns.length - 1}
              onClick={() => setStep(index + 1)}
            >
              →
            </Button>
          </div>
          <div className="design-section-label">Prompt</div>
          <div className="design-prompt-readout">
            {turn ? turn.prompt : "The engineer has not used the diagram helper yet."}
          </div>
        </div>
        <CodeSection code={turn?.code ?? ""} />
        <DiagramSection code={turn?.code ?? ""} />
      </div>
    </div>
  );
}
