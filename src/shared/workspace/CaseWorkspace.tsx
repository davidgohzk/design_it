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
import type { ScenarioAnswer } from "../../assessment/fit";
import { computeProcessMeasures } from "../../assessment/process";
import { buildSessionExport } from "../../assessment/sessionExport";
import type { SessionMode } from "../../assessment/types";
import { ChecksRunning } from "./report/ChecksRunning";
import { ReportView } from "./report/ReportView";
import { BriefChatPanel } from "./panels/BriefChatPanel";
import { DocEditorPanel } from "./panels/DocEditorPanel";
import type { DocEditorHandle } from "./panels/DocEditorPanel";
import { DiagramChatPanel, DiagramHistoryPanel } from "./panels/DiagramChatPanel";
import { flashChatMessage, flashTextIn } from "./panels/highlight";
import { ScenarioWalkthrough } from "./walkthrough/ScenarioWalkthrough";
import { useAssessment } from "./hooks/useAssessment";
import { useCaseChat } from "./hooks/useCaseChat";
import { useDesignWorkspace } from "./hooks/useDesignWorkspace";
import { quickFixEdit } from "../../designDoc/quickFixes";
import { EMPTY_DESIGN_DOC_TEMPLATE, ITEM_TEMPLATE_LABELS } from "../../designDoc/template";
import type { ItemTemplate } from "../../designDoc/template";
import { CommandPalette } from "./editor/CommandPalette";
import type { PaletteCommand } from "./editor/CommandPalette";
import { ProblemsPanel } from "./editor/ProblemsPanel";
import { appTheme } from "../lib/theme";
import { useTimeline } from "../lib/timeline";
import { SESSION_TIME_CAP_MIN } from "./config";
import type { ExampleKind, WorkspaceConfig } from "./config";
import type { InterviewEnd } from "../lib/types";
import { citationLink } from "../lib/utils";
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
 * Practice mode opens prepopulated with the complete example: a full interview, a strong design doc and
 * final diagram, and its review, which still finds a few small things. "Flawed example" swaps in a sample
 * attempt with deliberate mistakes, so every check in the report has something to show. Assessment and
 * research modes start empty. Changing mode, loading an example or starting over remounts a fresh session.
 */
export function CaseWorkspace({ config }: { config: WorkspaceConfig }) {
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode") as SessionMode | null;
  const mode: SessionMode = requestedMode && MODES.includes(requestedMode) ? requestedMode : "practice";
  const [session, setSession] = useState<{ count: number; example: ExampleKind | null }>({ count: 0, example: "complete" });
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
  const [startedAt] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<"client" | "admin">("client");
  const [adminView, setAdminView] = useState<"review" | "work">("review");
  /** work → (Submit) walkthrough → (Finish) report; the doc and diagram are locked after "work". */
  const [stage, setStage] = useState<"work" | "walkthrough" | "report">("work");
  const [answers, setAnswers] = useState<ScenarioAnswer[]>(() => seed?.answers ?? []);
  const showReport = stage !== "work";
  const [briefOpen, setBriefOpen] = useState(true);
  const [chatMeta, setChatMeta] = useState<ResponseMeta[]>([]);
  const [interviewEnd, setInterviewEnd] = useState<InterviewEnd | null>(null);
  const [problemsOpen, setProblemsOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const briefElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DocEditorHandle | null>(null);
  const { entries: timeline, logEvent, noteEditorChange, flushEditor } = useTimeline();

  const recordChatMeta = useCallback((meta: ResponseMeta) => setChatMeta((previous) => [...previous, meta]), []);
  const logQuestion = useCallback((text: string) => logEvent("chat", `Message to ${caseDefinition.clientName}`, text), [caseDefinition.clientName, logEvent]);
  const logDesignEvent = useCallback((summary: string, detail: string) => logEvent("design", summary, detail), [logEvent]);

  const { messages, messageTimes, isSending, send } = useCaseChat({
    caseId: caseDefinition.id,
    openingMessage: caseDefinition.openingMessage,
    initialMessages: seed?.messages,
    onMeta: recordChatMeta,
    onUserMessage: logQuestion,
  });
  const workspace = useDesignWorkspace({
    caseDefinition,
    messages,
    initialDoc: seed?.docMarkdown ?? EMPTY_DESIGN_DOC_TEMPLATE,
    initialDocIsExample: Boolean(seed),
    initialDiagramTurns: seed?.diagramTurns,
    onDocChange: noteEditorChange,
    onEvent: logDesignEvent,
  });
  const assessment = useAssessment({ caseDefinition, mode, seed });

  useEffect(() => {
    void warmUpBackend();
  }, []);

  const endInterview = useCallback(
    (how: InterviewEnd["how"], reason: string) => {
      setInterviewEnd((previous) => previous ?? { at: Date.now(), how, reason });
      logEvent("chat", how === "time_cap" ? "Interview ended: time is up" : "Interview ended", reason);
    },
    [logEvent],
  );

  // Ctrl/Cmd + Shift + P and Ctrl/Cmd + Shift + M work anywhere on the page. Inside the editor,
  // CodeMirror handles them first and marks the event as handled.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || !event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (key === "m") {
        event.preventDefault();
        setProblemsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Scored modes stop the interview at the time cap.
  useEffect(() => {
    if (mode === "practice" || interviewEnd) return;
    const capAt = startedAt + SESSION_TIME_CAP_MIN * 60_000;
    const timer = setTimeout(() => endInterview("time_cap", ""), Math.max(0, capAt - Date.now()));
    return () => clearTimeout(timer);
  }, [endInterview, interviewEnd, mode, startedAt]);

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
      const source = index === undefined ? "Brief" : `Chat #${index}`;
      editorRef.current?.insertAtCaret(citationLink(text, index));
      logEvent("quote", source, text, "Design doc");
    },
    [logEvent],
  );

  /** Submit: lock the work and start the scenario walkthrough. Scored modes end the interview here. */
  const submit = useCallback(() => {
    workspace.commitManualFinal();
    if (mode !== "practice" && !interviewEnd) endInterview("button", "");
    logEvent("design", mode === "practice" ? "Review requested" : "Submitted", `mode: ${mode}`);
    setStage("walkthrough");
  }, [endInterview, interviewEnd, logEvent, mode, workspace]);

  /** The walkthrough is done: run the checks on the locked work. */
  const runChecks = useCallback(
    (finished: ScenarioAnswer[], force = false) => {
      setAnswers(finished);
      setStage("report");
      logEvent("design", "Walkthrough finished", `${finished.length} scenarios`);
      // In practice mode the interview stays open, so the review treats Submit as its end.
      const end = interviewEnd ?? { at: Date.now(), how: "button" as const, reason: "" };
      void assessment.run({ messages, docMarkdown: workspace.docMarkdown, finalCode: workspace.finalCode, answers: finished }, end, { force });
    },
    [assessment, interviewEnd, logEvent, messages, workspace.docMarkdown, workspace.finalCode],
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
      interviewEnd,
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
        onSend={readOnly || interviewEnd ? undefined : (text) => void send(text)}
        onQuote={readOnly ? undefined : quoteIntoDoc}
        interviewEnd={interviewEnd}
        onEndInterview={readOnly ? undefined : (reason) => endInterview("button", reason)}
      />
    </Paper>
  );

  /** While the checks run: the GitHub Actions-style list, without results in scored modes. */
  const checking = (
    <div className="submitted-view">
      <Typography variant="h6">{mode === "practice" ? "Checks running" : "Submitting your work…"}</Typography>
      <ChecksRunning progress={assessment.progress} />
    </div>
  );

  const report = (admin: boolean) => {
    if (assessment.status === "loading") return checking;
    if (assessment.status === "error") {
      return (
        <div className="submitted-view">
          <Typography color="error">The checks failed: {assessment.error}</Typography>
          <Button variant="contained" onClick={() => runChecks(answers, true)}>
            Try again
          </Button>
          {!admin && <Button onClick={() => setStage("work")}>Back to my work</Button>}
        </div>
      );
    }
    if (!assessment.result || !assessment.snapshot) {
      return (
        <div className="submitted-view">
          <Typography>Nothing has been submitted yet.</Typography>
        </div>
      );
    }
    return (
      <ReportView
        result={assessment.result}
        snapshot={assessment.snapshot}
        caseDefinition={caseDefinition}
        mode={mode}
        admin={admin}
        timeline={timeline}
        citation={citation}
        template={EMPTY_DESIGN_DOC_TEMPLATE}
        timeOnTaskMs={processMeasures.timeOnTaskMs}
        diagramPrompts={processMeasures.diagramPrompts}
        onClose={admin ? undefined : () => setStage("work")}
        headerExtra={
          admin && (
            <Button size="small" variant="outlined" onClick={exportSession}>
              Export session
            </Button>
          )
        }
      />
    );
  };

  /** Assessment and research modes: the engineer sees only that the work was submitted. */
  const submitted =
    assessment.status === "loading" ? (
      checking
    ) : (
      <div className="submitted-view">
        {assessment.status === "error" ? (
          <>
            <Typography color="error">Submitting failed: {assessment.error}</Typography>
            <Button variant="contained" onClick={() => runChecks(answers, true)}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h6">✓ Submitted</Typography>
            <Typography color="text.secondary">Your chat, design doc, final diagram and walkthrough were submitted.</Typography>
          </>
        )}
      </div>
    );

  const walkthrough = (
    <ScenarioWalkthrough
      caseDefinition={caseDefinition}
      doc={workspace.parsed}
      finalCode={workspace.finalCode}
      mode={mode}
      initialAnswers={answers}
      onFinish={(finished) => runChecks(finished)}
      onCancel={mode === "practice" ? () => setStage("work") : undefined}
    />
  );

  const reviewLabel = mode === "practice" ? "Review" : "Submit";

  const paletteCommands: PaletteCommand[] = [
    ...(Object.keys(ITEM_TEMPLATE_LABELS) as ItemTemplate[]).map((kind) => ({
      id: `template-${kind}`,
      label: ITEM_TEMPLATE_LABELS[kind],
      shortcut: "/ on an empty line",
      run: () => editorRef.current?.insertTemplate(kind),
    })),
    {
      id: "toggle-problems",
      label: problemsOpen ? "Hide Problems panel" : "Show Problems panel",
      shortcut: "Ctrl/Cmd + Shift + M",
      run: () => setProblemsOpen((open) => !open),
    },
  ];

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} />
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
            {viewMode === "client" && stage === "work" && (
              <Button size="small" variant="contained" color="success" onClick={submit} disabled={isSending || assessment.status === "loading"}>
                {reviewLabel}
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
            {/* The walkthrough and the review take the whole width. */}
            {briefChat(false, showReport)}

            {showReport && (
              <Paper className="panel report-panel-full" elevation={0}>
                {stage === "walkthrough" ? walkthrough : mode === "practice" ? report(false) : submitted}
              </Paper>
            )}

            <Paper className="panel" elevation={0} hidden={showReport}>
              <DocEditorPanel
                ref={editorRef}
                markdown={workspace.docMarkdown}
                parsed={workspace.parsed}
                onChange={workspace.updateDoc}
                citation={citation}
                problems={workspace.problems}
                warnings={workspace.warnings}
                sketchIssues={workspace.sketchIssues}
                finalCode={workspace.finalCode}
                finalIssues={workspace.finalIssues}
                showUsedBy={mode === "practice"}
                quickFixEdit={quickFixEdit}
                onCommandPalette={() => setPaletteOpen(true)}
                onToggleProblems={() => setProblemsOpen((open) => !open)}
                footer={
                  <ProblemsPanel
                    problems={workspace.problems}
                    open={problemsOpen}
                    onToggle={() => setProblemsOpen((open) => !open)}
                    onSelect={(problem) => editorRef.current?.goToLine(problem.line)}
                  />
                }
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
