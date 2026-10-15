import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, CssBaseline, Paper, ThemeProvider, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ResponseMeta } from "../lib/api";
import { warmUpBackend } from "../lib/api";
import type { ScenarioAnswer } from "../../assessment/fit";
import { computeProcessMeasures } from "../../assessment/process";
import { buildSessionExport } from "../../assessment/sessionExport";
import type { SessionMode } from "../../assessment/types";
import { ChecksRunning } from "./report/ChecksRunning";
import { ReportView } from "./report/ReportView";
import { ReviewSourcePane } from "./report/ReviewSourcePane";
import type { ReviewSourceHandle } from "./report/ReviewSourcePane";
import { BriefChatPanel } from "./panels/BriefChatPanel";
import { DocEditorPanel } from "./panels/DocEditorPanel";
import type { DocEditorHandle } from "./panels/DocEditorPanel";
import { DiagramChatPanel, DiagramHistoryPanel } from "./panels/DiagramChatPanel";
import { FinalDiagramPanel } from "./panels/FinalDiagramPanel";
import { flashChatMessage, flashTextIn } from "./panels/highlight";
import { GuidedTour } from "./shell/GuidedTour";
import { ResizablePanes } from "./shell/ResizablePanes";
import { ShortcutSheet } from "./shell/ShortcutSheet";
import { StatusBar } from "./shell/StatusBar";
import { TopBar } from "./shell/TopBar";
import { opensShortcutSheet } from "./shell/shortcuts";
import type { KeyLike } from "./shell/shortcuts";
import { WARM_UP_TOUR, tourSeen } from "./shell/tour";
import { ScenarioWalkthrough } from "./walkthrough/ScenarioWalkthrough";
import { intakeRequired } from "../../assessment/intake";
import type { Intake } from "../../assessment/intake";
import { readFeedback } from "./report/reportData";
import { IntakeForm } from "./research/IntakeForm";
import { storedIntake } from "./research/intakeStorage";
import { useAssessment } from "./hooks/useAssessment";
import { useCaseChat } from "./hooks/useCaseChat";
import { useDesignWorkspace } from "./hooks/useDesignWorkspace";
import { quickFixEdit } from "../../designDoc/quickFixes";
import { EMPTY_DESIGN_DOC_TEMPLATE, ITEM_TEMPLATE_LABELS } from "../../designDoc/template";
import type { ItemTemplate } from "../../designDoc/template";
import { CommandPalette } from "./editor/CommandPalette";
import type { PaletteCommand } from "./editor/CommandPalette";
import { ProblemsPanel } from "./editor/ProblemsPanel";
import { appThemes, preferredTheme, saveTheme } from "../lib/theme";
import type { ThemeMode } from "../lib/theme";
import { useTimeline } from "../lib/timeline";
import { SESSION_TIME_CAP_MIN } from "./config";
import type { ExampleKind, WorkspaceConfig } from "./config";
import type { InterviewEnd } from "../lib/types";
import { citationLink } from "../lib/utils";
import "./workspace.css";

const MODES: readonly SessionMode[] = ["practice", "assessment", "research"];
/** How often the countdown redraws. */
const TICK_MS = 1000;

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
  const [intake, setIntake] = useState<Intake | null>(() => (intakeRequired(mode) ? storedIntake() : null));
  /** When the work started: after the intake in research mode, so the intake doesn't use up the time cap. */
  const [workStartedAt, setWorkStartedAt] = useState(startedAt);
  const [theme, setTheme] = useState<ThemeMode>(preferredTheme);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
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

  // Ctrl/Cmd + Shift + P, Ctrl/Cmd + Shift + M and "?" work anywhere on the page. Inside the editor,
  // CodeMirror handles the first two and marks the event as handled.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (opensShortcutSheet({ ...event, key: event.key, target: event.target as KeyLike["target"] })) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
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

  // The countdown ticks only while there is a cap and work to do.
  const capped = mode !== "practice" && stage === "work" && !interviewEnd && !(intakeRequired(mode) && !intake);
  useEffect(() => {
    if (!capped) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [capped]);
  const msLeft = capped ? Math.max(0, workStartedAt + SESSION_TIME_CAP_MIN * 60_000 - now) : null;

  // The unscored warm-up offers its tour once, on an empty doc. Never in a scored session: it would
  // eat into the time cap.
  useEffect(() => {
    if (mode !== "practice" || caseDefinition.scored || tourSeen() || seed) return;
    const timer = setTimeout(() => setTourOpen(true), 600);
    return () => clearTimeout(timer);
  }, [caseDefinition.scored, mode, seed]);

  // Scored modes stop the interview at the time cap.
  useEffect(() => {
    if (mode === "practice" || interviewEnd || (intakeRequired(mode) && !intake)) return;
    const capAt = workStartedAt + SESSION_TIME_CAP_MIN * 60_000;
    const timer = setTimeout(() => endInterview("time_cap", ""), Math.max(0, capAt - Date.now()));
    return () => clearTimeout(timer);
  }, [endInterview, intake, interviewEnd, mode, workStartedAt]);

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

  // The report's own references: they land in the submitted work beside it, which is the only copy
  // of the chat and the doc mounted while the review shows.
  const sourceRef = useRef<ReviewSourceHandle | null>(null);
  const reportCitation = useMemo(
    () => ({
      onBrief: (quote: string) => sourceRef.current?.showBrief(quote),
      onChat: (index: number, quote?: string) => sourceRef.current?.showChat(index, quote),
      onItem: (id: string) => sourceRef.current?.showItem(id),
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
      answers,
      intake,
      feedback: readFeedback().filter((entry) => entry.caseId === caseDefinition.id),
      assessment: assessment.result,
      assessmentHistory: assessment.history,
      processMeasures,
    });
    downloadJson(`design_it-${caseDefinition.id}-${mode}-${new Date(startedAt).toISOString().replace(/[:.]/g, "-")}.json`, data);
  };

  const briefChat = (readOnly: boolean) => (
    <Paper key="chat" className="panel" elevation={0}>
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
        citation={reportCitation}
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

  const fullPane = (key: string, body: React.ReactNode) => (
    <Paper key={key} className="panel report-panel-full" elevation={0}>
      {body}
    </Paper>
  );

  /** The review stage: the submitted work on the left, the review on the right. */
  const reviewLayout = (admin: boolean) => {
    const body = report(admin);
    if (assessment.status !== "success" || !assessment.snapshot) {
      return { sizes: [1], storageKey: "report", panes: [fullPane("report", body)] };
    }
    return {
      sizes: [1, 1.25],
      storageKey: "review",
      panes: [
        <Paper key="review-source" className="panel" elevation={0}>
          <ReviewSourcePane ref={sourceRef} snapshot={assessment.snapshot} caseDefinition={caseDefinition} />
        </Paper>,
        <Paper key="report" className="panel" elevation={0}>
          {body}
        </Paper>,
      ],
    };
  };

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

  const diagramProblems = workspace.problems.filter((problem) => problem.source === "diagram");
  const needsIntake = intakeRequired(mode) && !intake && viewMode === "client";

  const docPanel = (
    <Paper key="doc" className="panel" elevation={0}>
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
  );

  const diagramPanel = (
    <Paper key="diagram" className="panel" elevation={0}>
      <FinalDiagramPanel
        doc={workspace.parsed}
        finalCode={workspace.finalCode}
        problems={diagramProblems}
        onProblem={(problem) => editorRef.current?.goToLine(problem.line)}
        helper={
          <DiagramChatPanel
            code={workspace.diagramCode}
            onGenerate={(prompt) => void workspace.askDiagramHelper(prompt)}
            generating={workspace.diagramAI.generating}
            streamingCode={workspace.diagramAI.streaming}
            error={workspace.diagramAI.error}
          />
        }
      />
    </Paper>
  );

  const workspaceSizes = { sizes: [1, 1.15, 1], storageKey: "workspace" };
  const fullWidth = (key: string, body: React.ReactNode) => ({ sizes: [1], storageKey: "report", panes: [fullPane(key, body)] });

  const clientPanes = !showReport
    ? { ...workspaceSizes, panes: [briefChat(false), docPanel, diagramPanel] }
    : stage === "walkthrough"
      ? fullWidth("walkthrough", walkthrough)
      : mode === "practice"
        ? reviewLayout(false)
        : fullWidth("submitted", submitted);

  const adminPanes =
    adminView === "review"
      ? reviewLayout(true)
      : {
          ...workspaceSizes,
          panes: [
            briefChat(true),
            <Paper key="admin-doc" className="panel" elevation={0}>
              <DocEditorPanel
                markdown={workspace.docMarkdown}
                parsed={workspace.parsed}
                onChange={() => {}}
                citation={citation}
                readOnly
                title="Design doc (read-only)"
                problems={workspace.problems}
                finalCode={workspace.finalCode}
                finalIssues={workspace.finalIssues}
              />
            </Paper>,
            <Paper key="admin-diagram" className="panel" elevation={0}>
              <DiagramHistoryPanel turns={workspace.diagramTurns} />
            </Paper>,
          ],
        };


  return (
    <ThemeProvider theme={appThemes[theme]}>
      <CssBaseline />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} />
      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {tourOpen && <GuidedTour stops={WARM_UP_TOUR} onClose={() => setTourOpen(false)} />}
      <main className={`app-shell theme-${theme}`} data-theme={theme}>
        <TopBar
          title={caseDefinition.title}
          mode={mode}
          msLeft={msLeft}
          theme={theme}
          onThemeChange={(next) => {
            setTheme(next);
            saveTheme(next);
          }}
          onHome={() => navigate("/")}
          onShortcuts={() => setShortcutsOpen(true)}
          submit={
            viewMode === "client" && stage === "work" && !needsIntake
              ? { label: reviewLabel, disabled: isSending || assessment.status === "loading", onClick: submit }
              : undefined
          }
        >
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
        </TopBar>

        {needsIntake ? (
          <Paper className="panel intake-panel" elevation={0}>
            <IntakeForm
              onDone={(answers) => {
                setIntake(answers);
                setWorkStartedAt(Date.now());
              }}
            />
          </Paper>
        ) : viewMode === "client" ? (
          <ResizablePanes defaultSizes={clientPanes.sizes} storageKey={clientPanes.storageKey}>
            {clientPanes.panes}
          </ResizablePanes>
        ) : (
          <ResizablePanes defaultSizes={adminPanes.sizes} storageKey={adminPanes.storageKey}>
            {adminPanes.panes}
          </ResizablePanes>
        )}

        {!needsIntake && (
          <StatusBar problems={workspace.problems} msLeft={msLeft} saved={!isSending} onProblems={() => setProblemsOpen((open) => !open)} />
        )}
      </main>
    </ThemeProvider>
  );
}
