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
import type { ResponseMeta } from "../api";
import { warmUpBackend } from "../api";
import { computeProcessMeasures } from "../assessment/process";
import { buildSessionExport } from "../assessment/sessionExport";
import type { SessionMode } from "../assessment/sessionExport";
import { AssessmentReport } from "../components/assessment/AssessmentReport";
import { AdminWorkPanel } from "../components/simple/AdminWorkPanel";
import { BriefChatPanel } from "../components/simple/BriefChatPanel";
import { DocEditorPanel } from "../components/simple/DocEditorPanel";
import type { DocEditorHandle } from "../components/simple/DocEditorPanel";
import { DiagramChatPanel } from "../components/simple/DiagramChatPanel";
import { ProcessMeasuresPanel } from "../components/simple/ProcessMeasuresPanel";
import { flashChatMessage, flashTextIn } from "../components/simple/highlight";
import { useAssessment } from "../components/simple/useAssessment";
import { useCaseChat } from "../components/simple/useCaseChat";
import { useDesignWorkspace } from "../components/simple/useDesignWorkspace";
import { getCase } from "../cases";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../cases/community-room";
import { COMMUNITY_ROOM_SEED } from "../cases/community-room.seed";
import { appTheme } from "../theme";
import { useTimeline } from "../timeline";
import { escapeMarkdownTitle } from "../utils";
import "../App.css";
import "../components/simple/simple.css";

// TODO(assessment-mode): serve facts from backend only
const CASE = getCase("community-room");
const HIGHLIGHT_MS = 2500;
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
 * Practice mode opens prepopulated with the worked example (like /demo): Mei's interview, the model
 * design doc and final diagram, and its review. Assessment and research modes start empty, since the
 * example is the model answer. Changing mode or starting over remounts a fresh session.
 */
export default function SimplePage() {
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode") as SessionMode | null;
  const mode: SessionMode = requestedMode && MODES.includes(requestedMode) ? requestedMode : "practice";
  const [session, setSession] = useState({ count: 0, prepopulated: true });
  const prepopulated = mode === "practice" && session.prepopulated;
  return (
    <SimpleSession
      key={`${mode}-${session.count}`}
      mode={mode}
      prepopulated={prepopulated}
      onRestart={
        mode === "practice"
          ? (withExample: boolean) => setSession((previous) => ({ count: previous.count + 1, prepopulated: withExample }))
          : undefined
      }
    />
  );
}

function SimpleSession({
  mode,
  prepopulated,
  onRestart,
}: {
  mode: SessionMode;
  prepopulated: boolean;
  onRestart?: (withExample: boolean) => void;
}) {
  const navigate = useNavigate();
  const seed = prepopulated ? COMMUNITY_ROOM_SEED : undefined;
  const apiKey = "";
  const [startedAt] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<"client" | "admin">("client");
  const [showReport, setShowReport] = useState(false);
  const [briefOpen, setBriefOpen] = useState(true);
  const [highlightedDecision, setHighlightedDecision] = useState<string | null>(null);
  const [chatMeta, setChatMeta] = useState<ResponseMeta[]>([]);
  const briefElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DocEditorHandle | null>(null);
  const { entries: timeline, logEvent, noteEditorChange, flushEditor } = useTimeline(() => []);

  const recordChatMeta = useCallback((meta: ResponseMeta) => setChatMeta((previous) => [...previous, meta]), []);
  const logQuestion = useCallback((text: string) => logEvent("chat", `Message to ${CASE.clientName}`, text), [logEvent]);
  const logDesignEvent = useCallback((summary: string, detail: string) => logEvent("design", summary, detail), [logEvent]);

  const { messages, messageTimes, isSending, send } = useCaseChat({
    caseId: CASE.id,
    openingMessage: CASE.openingMessage,
    initialMessages: seed?.messages,
    apiKey,
    onMeta: recordChatMeta,
    onUserMessage: logQuestion,
  });
  const workspace = useDesignWorkspace({
    caseDefinition: CASE,
    messages,
    apiKey,
    initialDoc: seed?.docMarkdown ?? EMPTY_DESIGN_DOC_TEMPLATE,
    initialDocIsExample: Boolean(seed),
    onDocChange: noteEditorChange,
    onEvent: logDesignEvent,
  });
  const assessment = useAssessment({ caseDefinition: CASE, apiKey, seed });

  useEffect(() => {
    void warmUpBackend();
  }, []);

  useEffect(() => {
    flushEditor();
  }, [viewMode, flushEditor]);

  useEffect(() => {
    if (!highlightedDecision) return;
    const timer = setTimeout(() => setHighlightedDecision(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightedDecision]);

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

  const showDecision = useCallback((decisionId: string) => {
    setHighlightedDecision(decisionId);
    editorRef.current?.showItem(decisionId);
  }, []);

  // Time on task runs to the last recorded activity, so the number doesn't depend on when it is viewed.
  const lastActivityAt = Math.max(
    startedAt,
    ...messageTimes,
    ...timeline.map((entry) => entry.at),
    ...workspace.finalHistory.map((turn) => turn.at),
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
        finalHistory: workspace.finalHistory,
        finalCode: workspace.finalCode,
        result: assessment.result,
      }),
    [assessment.result, lastActivityAt, messageTimes, messages, startedAt, workspace.aiEvents, workspace.finalCode, workspace.finalHistory],
  );

  const exportSession = () => {
    flushEditor();
    const data = buildSessionExport({
      caseDefinition: CASE,
      mode,
      startedAt,
      messages,
      messageTimes,
      docMarkdown: workspace.docMarkdown,
      parsed: workspace.parsed,
      finalCode: workspace.finalCode,
      finalHistory: workspace.finalHistory,
      timeline,
      aiEvents: workspace.aiEvents,
      chatMeta,
      assessment: assessment.result,
      assessmentHistory: assessment.history,
      processMeasures,
    });
    downloadJson(`design_it-${CASE.id}-${mode}-${new Date(startedAt).toISOString().replace(/[:.]/g, "-")}.json`, data);
  };

  const briefChat = (readOnly: boolean) => (
    <Paper className="panel" elevation={0}>
      <BriefChatPanel
        briefMarkdown={CASE.briefMarkdown}
        clientName={CASE.clientName}
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
      caseDefinition={CASE}
      template={EMPTY_DESIGN_DOC_TEMPLATE}
      onChat={citation.onChat}
      onBrief={citation.onBrief}
      onClose={admin ? undefined : () => setShowReport(false)}
      onRerun={() => review(admin ? false : true)}
      canRerun={!isSending}
      showFairnessDetails={admin && mode === "research"}
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
            {CASE.title}{" "}
            <Chip size="small" label={MODE_LABEL[mode]} sx={{ ml: 1, verticalAlign: "middle" }} />
          </Typography>
          <div className="app-topbar-actions">
            {viewMode === "client" && onRestart && (
              <Button
                size="small"
                variant="outlined"
                disabled={isSending || assessment.status === "loading"}
                onClick={() => {
                  const leaving = prepopulated ? "the example" : "your work";
                  if (window.confirm(`Replace ${leaving}? This can't be undone.`)) onRestart(!prepopulated);
                }}
                title={prepopulated ? "Clear the example and start from the empty template" : "Load the worked example"}
              >
                {prepopulated ? "Start fresh" : "Load the example"}
              </Button>
            )}
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
            {briefChat(false)}

            {showReport && (
              <Paper className="panel report-panel" elevation={0}>
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
                highlightedDecision={highlightedDecision}
                finalCode={workspace.finalCode}
                finalIssues={workspace.finalIssues}
                unjustifiedNodes={workspace.consistency.unjustifiedNodes}
                onDecisionBadge={showDecision}
              />
            </Paper>

            <Paper className="panel" elevation={0} hidden={showReport}>
              <DiagramChatPanel
                code={workspace.finalCode}
                onGenerate={(prompt) => void workspace.generateFinal(prompt)}
                generating={workspace.finalAI.generating}
                streamingCode={workspace.finalAI.streaming}
                error={workspace.finalAI.error}
              />
            </Paper>
          </section>
        ) : (
          <section className="simple-grid">
            {briefChat(true)}
            <Paper className="panel" elevation={0}>
              {report(true)}
            </Paper>
            <Paper className="panel" elevation={0}>
              <AdminWorkPanel
                docMarkdown={workspace.docMarkdown}
                parsed={workspace.parsed}
                finalCode={workspace.finalCode}
                finalHistory={workspace.finalHistory}
                finalIssues={workspace.finalIssues}
                unjustifiedNodes={workspace.consistency.unjustifiedNodes}
                citation={citation}
              />
            </Paper>
          </section>
        )}
      </main>
    </ThemeProvider>
  );
}
