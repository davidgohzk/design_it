import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Chip,
  CssBaseline,
  Paper,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ResponseMeta } from "../lib/api";
import { warmUpBackend } from "../lib/api";
import { computeProcessMeasures } from "../../assessment/process";
import { buildSessionExport } from "../../assessment/sessionExport";
import type { SessionMode } from "../../assessment/sessionExport";
import { AssessmentReport } from "./report/AssessmentReport";
import { BriefChatPanel } from "./panels/BriefChatPanel";
import { DocEditorPanel } from "./panels/DocEditorPanel";
import type { DocEditorHandle } from "./panels/DocEditorPanel";
import { DiagramChatPanel, DiagramHistoryPanel } from "./panels/DiagramChatPanel";
import { ProcessMeasuresPanel } from "./panels/ProcessMeasuresPanel";
import { flashChatMessage, flashTextIn } from "./panels/highlight";
import { useAssessment } from "./hooks/useAssessment";
import { useCaseChat } from "./hooks/useCaseChat";
import { useDesignWorkspace } from "./hooks/useDesignWorkspace";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../../designDoc/template";
import { appTheme } from "../lib/theme";
import { useTimeline } from "../lib/timeline";
import type { ExampleKind, WorkspaceConfig } from "./config";
import { escapeMarkdownTitle } from "../lib/utils";
import "./workspace.css";

const MODES: readonly SessionMode[] = ["practice", "assessment", "research"];
const MODE_LABEL: Record<SessionMode, string> = {
  practice: "Practice",
  assessment: "Assessment",
  research: "Research",
};

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The case workspace behind /demo and /simple: brief and chat, design doc, diagram helper and review.
 * Practice mode opens prepopulated with a sample attempt: an interview, design doc and final diagram with
 * deliberate mistakes, and its review, so every level of the report has something to show. "Complete
 * example" swaps in the model answer and its passing review instead. Assessment and research modes start
 * empty. Changing mode, loading an example or starting over remounts a fresh session.
 */
export function CaseWorkspace({ config }: { config: WorkspaceConfig }) {
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode") as SessionMode | null;
  const mode: SessionMode = requestedMode && MODES.includes(requestedMode) ? requestedMode : "practice";
  const [session, setSession] = useState<{ count: number; example: ExampleKind | null }>({ count: 0, example: "sample" });
  const example = mode === "practice" ? session.example : null;
  return (
    <WorkspaceSession
      key={`${mode}-${session.count}`}
      config={config}
      mode={mode}
      example={example}
      onRestart={
        mode === "practice"
          ? (next: ExampleKind | null) => setSession((previous) => ({ count: previous.count + 1, example: next }))
          : undefined
      }
    />
  );
}

function WorkspaceSession({
  config,
  mode,
  example,
  onRestart,
}: {
  config: WorkspaceConfig;
  mode: SessionMode;
  example: ExampleKind | null;
  onRestart?: (next: ExampleKind | null) => void;
}) {
  const navigate = useNavigate();
  const { caseDefinition, examples } = config;
  const seed = example ? examples[example].seed : undefined;
  const apiKey = "";
  const [startedAt] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<"client" | "admin">("client");
  const [adminView, setAdminView] = useState<"review" | "work">("review");
  const [showReport, setShowReport] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);
  const [chatMeta, setChatMeta] = useState<ResponseMeta[]>([]);
  const briefElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DocEditorHandle | null>(null);
  const { entries: timeline, logEvent, noteEditorChange, flushEditor } = useTimeline(() => []);

  const recordChatMeta = useCallback((meta: ResponseMeta) => setChatMeta((previous) => [...previous, meta]), []);
  const logQuestion = useCallback((text: string) => logEvent("chat", `Message to ${caseDefinition.clientName}`, text), [caseDefinition.clientName, logEvent]);
  const logDesignEvent = useCallback((summary: string, detail: string) => logEvent("design", summary, detail), [logEvent]);

  const { messages, messageTimes, isSending, send } = useCaseChat({
    caseId: caseDefinition.id,
    openingMessage: caseDefinition.openingMessage,
    initialMessages: seed?.messages,
    apiKey,
    onMeta: recordChatMeta,
    onUserMessage: logQuestion,
  });
  const workspace = useDesignWorkspace({
    caseDefinition,
    messages,
    apiKey,
    initialDoc: seed?.docMarkdown ?? EMPTY_DESIGN_DOC_TEMPLATE,
    initialDocIsExample: Boolean(seed),
    initialDiagramTurns: seed?.diagramTurns,
    onDocChange: noteEditorChange,
    onEvent: logDesignEvent,
  });
  const assessment = useAssessment({ caseDefinition, apiKey, seed });

  useEffect(() => {
    void warmUpBackend();
  }, []);

  useEffect(() => {
    flushEditor();
  }, [viewMode, flushEditor]);

  const citation = useMemo(
    () => ({
      onBrief: (quote: string) => {
        setBriefOpen(true);
        requestAnimationFrame(() => flashTextIn(briefElementRef.current, quote));
      },
      onChat: (index: number, quote?: string) => flashChatMessage(index, quote),
    }),
    [],
  );

  const quoteIntoDoc = useCallback(
    (text: string, index?: number) => {
      const escaped = escapeMarkdownTitle(text);
      const source = index === undefined ? "Brief" : `Chat #${index}`;
      const link = index === undefined ? `[Brief](#cs "${escaped}")` : `[Chat #${index}](#chat-msg-${index} "${escaped}")`;
      editorRef.current?.insertAtCaret(link);
      logEvent("quote", source, text, "Design doc");
    },
    [logEvent],
  );

  const review = useCallback(
    (force = false) => {
      workspace.commitManualFinal();
      if (viewMode === "client") setShowReport(true);
      logEvent("design", mode === "assessment" ? "Submitted for review" : "Review requested", `mode: ${mode}`);
      void assessment.run({ messages, docMarkdown: workspace.docMarkdown, finalCode: workspace.finalCode }, { force });
    },
    [assessment, logEvent, messages, mode, viewMode, workspace],
  );

  // Time on task runs to the last recorded activity, so the number doesn't depend on when it is viewed.
  const lastActivityAt = Math.max(
    startedAt,
    ...messageTimes,
    ...timeline.map((entry) => entry.at),
    ...workspace.finalHistory.map((turn) => turn.at),
    ...workspace.diagramTurns.map((turn) => turn.at),
    assessment.result?.reviewedAt ?? 0,
  );
  const processMeasures = useMemo(
    () =>
      computeProcessMeasures({
        startedAt,
        endedAt: lastActivityAt,
        messages,
        messageTimes,
        aiEvents: workspace.aiEvents,
        diagramTurns: workspace.diagramTurns,
        finalHistory: workspace.finalHistory,
        finalCode: workspace.finalCode,
        result: assessment.result,
      }),
    [assessment.result, lastActivityAt, messageTimes, messages, startedAt, workspace.aiEvents, workspace.diagramTurns, workspace.finalCode, workspace.finalHistory],
  );

  const exportSession = () => {
    flushEditor();
    const data = buildSessionExport({
      caseDefinition,
      mode,
      startedAt,
      messages,
      messageTimes,
      docMarkdown: workspace.docMarkdown,
      parsed: workspace.parsed,
      finalCode: workspace.finalCode,
      finalHistory: workspace.finalHistory,
      diagramTurns: workspace.diagramTurns,
      timeline,
      aiEvents: workspace.aiEvents,
      chatMeta,
      assessment: assessment.result,
      assessmentHistory: assessment.history,
      processMeasures,
    });
    downloadJson(`design_it-${caseDefinition.id}-${mode}-${new Date(startedAt).toISOString().replace(/[:.]/g, "-")}.json`, data);
  };

  const briefChat = (readOnly: boolean, hidden = false) => (
    <Paper className="panel" elevation={0} hidden={hidden}>
      <BriefChatPanel
        briefMarkdown={caseDefinition.briefMarkdown}
        clientName={caseDefinition.clientName}
        messages={messages}
        isSending={isSending}
        readOnly={readOnly}
        briefOpen={briefOpen}
        onBriefOpenChange={setBriefOpen}
        briefRef={(node) => {
          briefElementRef.current = node;
        }}
        onSend={readOnly ? undefined : (text) => void send(text)}
        onQuote={readOnly ? undefined : quoteIntoDoc}
      />
    </Paper>
  );

  const report = (admin: boolean) => (
    <AssessmentReport
      status={assessment.status}
      progress={assessment.progress}
      error={assessment.error}
      result={assessment.result}
      snapshot={assessment.snapshot}
      caseDefinition={caseDefinition}
      template={EMPTY_DESIGN_DOC_TEMPLATE}
      onClose={admin ? undefined : () => setShowReport(false)}
      onRerun={() => review(admin ? false : true)}
      canRerun={!isSending}
      headerExtra={
        admin && (
          <Button size="small" variant="outlined" onClick={exportSession}>
            Export session
          </Button>
        )
      }
    >
      {admin && mode === "research" && (
        <ProcessMeasuresPanel measures={processMeasures} discardedQuotes={assessment.result?.verification?.discardedQuotes} />
      )}
    </AssessmentReport>
  );

  const submitted = (
    <div className="simple-final">
      <div className="report-body report-loading">
        {assessment.status === "loading" ? (
          <Typography>Submitting your work...</Typography>
        ) : assessment.status === "error" ? (
          <Typography color="error">Submitting failed: {assessment.error}. Please try again.</Typography>
        ) : (
          <>
            <Typography variant="h6">Submitted</Typography>
            <Typography color="text.secondary">
              Your chat, design doc and final diagram were submitted. You can keep working and submit again.
            </Typography>
          </>
        )}
        <Button variant="contained" onClick={() => setShowReport(false)}>
          Back to my work
        </Button>
      </div>
    </div>
  );

  const reviewLabel = mode === "assessment" ? "Submit" : "Review";

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <main className="app-shell">
        <header className="app-topbar">
          <button className="demo-back-btn" onClick={() => navigate("/")} aria-label="Back to home page">
            ← Back to Home
          </button>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {caseDefinition.title}{" "}
            <Chip size="small" label={MODE_LABEL[mode]} sx={{ ml: 1, verticalAlign: "middle" }} />
          </Typography>
          <div className="app-topbar-actions">
            {viewMode === "admin" && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={adminView}
                onChange={(_event, value) => {
                  if (value) setAdminView(value);
                }}
              >
                <ToggleButton value="review">Review</ToggleButton>
                <ToggleButton value="work">Work</ToggleButton>
              </ToggleButtonGroup>
            )}
            {viewMode === "client" &&
              onRestart &&
              // Offer each example that isn't loaded, and "Start fresh" whenever one is.
              (["sample", "complete", "fresh"] as const)
                .filter((next) => next !== example && (next !== "fresh" || example))
                .map((next) => {
                  const target = next === "fresh" ? null : next;
                  return (
                    <Button
                      key={next}
                      size="small"
                      variant="outlined"
                      disabled={isSending || assessment.status === "loading"}
                      onClick={() => {
                        const leaving = example ? examples[example].name : "your work";
                        if (window.confirm(`Replace ${leaving}? This can't be undone.`)) onRestart(target);
                      }}
                      title={target ? examples[target].title : "Clear the example and start from the empty template"}
                    >
                      {target ? examples[target].label : "Start fresh"}
                    </Button>
                  );
                })}
            {viewMode === "client" && (
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => review()}
                disabled={isSending || assessment.status === "loading"}
              >
                {assessment.status === "loading" ? (mode === "assessment" ? "Submitting..." : "Reviewing...") : reviewLabel}
              </Button>
            )}
            <ToggleButtonGroup
              size="small"
              exclusive
              color="primary"
              value={viewMode}
              onChange={(_event, value) => {
                if (value) setViewMode(value);
              }}
            >
              <ToggleButton value="client">User View</ToggleButton>
              <ToggleButton value="admin">Admin View</ToggleButton>
            </ToggleButtonGroup>
          </div>
        </header>

        {viewMode === "client" ? (
          <section className="simple-grid">
            {/* The review takes the whole width; "Submitted" (assessment mode) leaves the chat visible. */}
            {briefChat(false, showReport && mode !== "assessment")}

            {showReport && (
              <Paper
                className={mode === "assessment" ? "panel report-panel" : "panel report-panel-full"}
                elevation={0}
              >
                {mode === "assessment" ? submitted : report(false)}
              </Paper>
            )}

            <Paper className="panel" elevation={0} hidden={showReport}>
              <DocEditorPanel
                ref={editorRef}
                markdown={workspace.docMarkdown}
                parsed={workspace.parsed}
                onChange={workspace.updateDoc}
                citation={citation}
                warnings={workspace.warnings}
                sketchIssues={workspace.sketchIssues}
                finalCode={workspace.finalCode}
                finalIssues={workspace.finalIssues}
              />
            </Paper>

            <Paper className="panel" elevation={0} hidden={showReport}>
              <DiagramChatPanel
                code={workspace.diagramCode}
                onGenerate={(prompt) => void workspace.askDiagramHelper(prompt)}
                generating={workspace.diagramAI.generating}
                streamingCode={workspace.diagramAI.streaming}
                error={workspace.diagramAI.error}
              />
            </Paper>
          </section>
        ) : (
          <section className="simple-grid">
            {adminView === "review" ? (
              <Paper className="panel report-panel-full" elevation={0}>
                {report(true)}
              </Paper>
            ) : (
              <>
                {briefChat(true)}
                <Paper className="panel" elevation={0}>
                  <DocEditorPanel
                    markdown={workspace.docMarkdown}
                    parsed={workspace.parsed}
                    onChange={() => {}}
                    citation={citation}
                    readOnly
                    title="Design doc (read-only)"
                    finalCode={workspace.finalCode}
                    finalIssues={workspace.finalIssues}
                  />
                </Paper>
                <Paper className="panel" elevation={0}>
                  <DiagramHistoryPanel turns={workspace.diagramTurns} />
                </Paper>
              </>
            )}
          </section>
        )}
      </main>
    </ThemeProvider>
  );
}
