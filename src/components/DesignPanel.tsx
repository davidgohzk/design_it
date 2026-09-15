import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, Divider, TextField, Typography } from "@mui/material";
import { MermaidBlock } from "./MermaidBlock";
import { streamText } from "../api";
import { INITIAL_DESIGN_TURNS } from "../content";
import mermaid from "../mermaid";
import type { DesignTurn } from "../types";

type DesignFailure = { prompt: string; code: string; error: string };
type DesignStatus = "idle" | "generating" | "error";

type DesignState = {
  turns: DesignTurn[];
  status: DesignStatus;
  streamingCode: string;
  failure: DesignFailure | null;
  currentCode: string;
  generate: (prompt: string, apiKey: string) => Promise<void>;
  retry: (apiKey: string) => Promise<void>;
};

const DesignStateCtx = createContext<DesignState | null>(null);

const stripFences = (text: string) =>
  text
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

export function DesignStateProvider({
  children,
  onLog,
}: {
  children: ReactNode;
  onLog?: (summary: string, detail: string) => void;
}) {
  const [turns, setTurns] = useState<DesignTurn[]>(INITIAL_DESIGN_TURNS);
  const [status, setStatus] = useState<DesignStatus>("idle");
  const [streamingCode, setStreamingCode] = useState("");
  const [failure, setFailure] = useState<DesignFailure | null>(null);

  const currentCode = turns.length > 0 ? turns[turns.length - 1].code : "";

  const runGeneration = useCallback(
    async (prompt: string, apiKey: string, priorAttempt: DesignFailure | null) => {
      setStatus("generating");
      setStreamingCode("");

      try {
        let raw = "";
        await streamText(
          "/api/diagram",
          {
            prompt,
            currentCode: currentCode || null,
            priorAttempt: priorAttempt ? { code: priorAttempt.code, error: priorAttempt.error } : null,
          },
          {
            apiKey,
            onDelta: (part) => {
              raw += part;
              setStreamingCode(raw);
            },
          },
        );

        const code = stripFences(raw);
        try {
          await mermaid.parse(code);
        } catch (parseErr) {
          const message = parseErr instanceof Error ? parseErr.message : "Diagram failed to parse.";
          setFailure({ prompt, code, error: message });
          setStatus("error");
          return;
        }

        setTurns((prev) => [...prev, { prompt, code }]);
        setFailure(null);
        setStatus("idle");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setFailure({ prompt, code: "", error: `Request failed: ${message}` });
        setStatus("error");
      } finally {
        setStreamingCode("");
      }
    },
    [currentCode],
  );

  const generate = useCallback(
    (prompt: string, apiKey: string) => {
      onLog?.("Diagram update", prompt);
      return runGeneration(prompt, apiKey, null);
    },
    [onLog, runGeneration],
  );

  const retry = useCallback(
    (apiKey: string) => {
      if (!failure) return Promise.resolve();
      onLog?.("Retry after parse error", failure.error);
      return runGeneration(failure.prompt, apiKey, failure.code ? failure : null);
    },
    [failure, onLog, runGeneration],
  );

  const value = useMemo(
    () => ({ turns, status, streamingCode, failure, currentCode, generate, retry }),
    [currentCode, failure, generate, retry, status, streamingCode, turns],
  );

  return <DesignStateCtx.Provider value={value}>{children}</DesignStateCtx.Provider>;
}

function DiagramSection({ code }: { code: string }) {
  if (!code) {
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

function CodeSection({ code, label }: { code: string; label: string }) {
  return (
    <div className="design-section design-code">
      <div className="design-section-label">{label}</div>
      <pre className="design-code-body">{code || "No diagram yet."}</pre>
    </div>
  );
}

function ClientPanel({ apiKey }: { apiKey: string }) {
  const { status, streamingCode, failure, currentCode, generate, retry } = useContext(DesignStateCtx)!;
  const [input, setInput] = useState(
    INITIAL_DESIGN_TURNS.length > 0 ? INITIAL_DESIGN_TURNS[INITIAL_DESIGN_TURNS.length - 1].prompt : "",
  );
  const isGenerating = status === "generating";

  const submit = () => {
    const prompt = input.trim();
    if (!prompt || isGenerating) return;
    void generate(prompt, apiKey);
  };

  const displayedCode = isGenerating ? streamingCode : failure?.code || currentCode;

  return (
    <div className="design-panel">
      <div className="design-section design-input">
        <TextField
          multiline
          minRows={3}
          maxRows={6}
          size="small"
          placeholder={
            currentCode
              ? "Describe a change to the current design..."
              : "Describe your system design in plain English..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="design-input-actions">
          <Button
            variant="contained"
            size="small"
            onClick={submit}
            disabled={isGenerating || !input.trim()}
          >
            {isGenerating ? "Generating..." : currentCode ? "Update Diagram" : "Generate Diagram"}
          </Button>
        </div>
        {failure && (
          <div className="design-error">
            <Typography variant="caption" color="error">
              {failure.error}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => void retry(apiKey)} disabled={isGenerating}>
              Retry
            </Button>
          </div>
        )}
      </div>
      <CodeSection code={displayedCode} label="Mermaid" />
      <DiagramSection code={currentCode} />
    </div>
  );
}

function AdminPanel() {
  const { turns } = useContext(DesignStateCtx)!;
  const [stepIndex, setStepIndex] = useState(0);

  const index = Math.min(stepIndex, Math.max(0, turns.length - 1));
  const turn = turns[index];

  return (
    <div className="design-panel">
      <div className="design-section design-input">
        <div className="design-stepper">
          <Button
            size="small"
            variant="outlined"
            disabled={index <= 0}
            onClick={() => setStepIndex(index - 1)}
          >
            ←
          </Button>
          <Typography variant="caption" color="text.secondary">
            {turns.length > 0 ? `Turn ${index + 1} / ${turns.length}` : "No turns yet"}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={index >= turns.length - 1}
            onClick={() => setStepIndex(index + 1)}
          >
            →
          </Button>
        </div>
        <div className="design-section-label">Prompt</div>
        <div className="design-prompt-readout">
          {turn ? turn.prompt : "The client has not submitted a design description yet."}
        </div>
      </div>
      <CodeSection code={turn?.code ?? ""} label="Mermaid" />
      <DiagramSection code={turn?.code ?? ""} />
    </div>
  );
}

export function DesignPanel({ apiKey = "", readOnly = false }: { apiKey?: string; readOnly?: boolean }) {
  return (
    <div className="design-wrap">
      <div className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          System Design
        </Typography>
      </div>
      <Divider />
      {readOnly ? <AdminPanel /> : <ClientPanel apiKey={apiKey} />}
    </div>
  );
}
