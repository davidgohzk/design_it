import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, CssBaseline, Paper, ThemeProvider, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ResponseMeta } from "@/lib/api";
import { warmUpBackend } from "@/lib/api";
import { normalizeScenarioAnswers } from "@/review/levels/fit";
import type { ScenarioAnswer } from "@/review/levels/fit";
import { computeProcessMeasures } from "@/review/levels/process";
import { buildSessionExport } from "@/review/session/sessionExport";
import type { SessionMode } from "@/review/types";
import { SummaryProgress } from "@/workspace/report/SummaryProgress";
import { ReportView } from "@/workspace/report/ReportView";
import { ReviewSourcePane } from "@/workspace/report/ReviewSourcePane";
import type { ReviewSourceHandle } from "@/workspace/report/ReviewSourcePane";
import { BriefChatPanel } from "@/workspace/panels/BriefChatPanel";
import { DocEditorPanel } from "@/workspace/panels/DocEditorPanel";
import type { DocEditorHandle } from "@/workspace/panels/DocEditorPanel";
import { ScenarioPanel } from "@/workspace/panels/ScenarioPanel";
import { flashChatMessage, flashTextIn } from "@/workspace/panels/highlight";
import { GuidedTour } from "@/workspace/shell/GuidedTour";
import { ResizablePanes } from "@/workspace/shell/ResizablePanes";
import { ShortcutSheet } from "@/workspace/shell/ShortcutSheet";
import { StatusBar } from "@/workspace/shell/StatusBar";
import { TopBar } from "@/workspace/shell/TopBar";
import { WARM_UP_TOUR, tourSeen } from "@/workspace/shell/tour";
import { intakeRequired } from "@/review/session/intake";
import type { Intake } from "@/review/session/intake";
import { readFeedback } from "@/workspace/report/reportData";
import { IntakeForm } from "@/workspace/research/IntakeForm";
import { storedIntake } from "@/workspace/research/intakeStorage";
import { useAssessment } from "@/workspace/hooks/useAssessment";
import { useCaseChat } from "@/workspace/hooks/useCaseChat";
import { useDesignWorkspace } from "@/workspace/hooks/useDesignWorkspace";
import { quickFixEdit } from "@/designDoc/quickFixes";
import { EMPTY_DESIGN_DOC_TEMPLATE, ITEM_TEMPLATE_LABELS } from "@/designDoc/template";
import type { ItemTemplate } from "@/designDoc/template";
import { CommandPalette } from "@/workspace/editor/CommandPalette";
import type { PaletteCommand } from "@/workspace/editor/CommandPalette";
import { ProblemsPanel } from "@/workspace/editor/ProblemsPanel";
import { appThemes, preferredTheme, saveTheme } from "@/ui/theme";
import type { ThemeMode } from "@/ui/theme";
import { useTimeline } from "./hooks/useTimeline";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useSessionClock } from "./hooks/useSessionClock";
import type { ExampleKind, WorkspaceConfig } from "./config";
import type { InterviewEnd } from "@/lib/types";
import { citationLink } from "@/lib/utils";
import "./workspace.css";

const MODES: readonly SessionMode[] = ["practice", "assessment", "research"];

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The case workspace behind /demo: brief and chat, design doc, scenarios and review.
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
  /** Review locks the work and opens the summary directly. */
  const [stage, setStage] = useState<"work" | "report">("work");
  const [answers, setAnswers] = useState<ScenarioAnswer[]>(() => seed?.answers ?? []);
  const showReport = stage === "report";
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

  useGlobalShortcuts({
    onCommandPalette: useCallback(() => setPaletteOpen(true), []),
    onToggleProblems: useCallback(() => setProblemsOpen((open) => !open), []),
    onShortcutSheet: useCallback(() => setShortcutsOpen(true), []),
  });

  const msLeft = useSessionClock({
    mode,
    stage,
    interviewEnd,
    awaitingIntake: intakeRequired(mode) && !intake,
    workStartedAt,
  });

  // The unscored warm-up offers its tour once, on an empty doc. Never in a scored session: it would
  // eat into the time cap.
  useEffect(() => {
    if (mode !== "practice" || caseDefinition.scored || tourSeen() || seed) return;
    const timer = setTimeout(() => setTourOpen(true), 600);
    return () => clearTimeout(timer);
  }, [caseDefinition.scored, mode, seed]);

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
      onSketch: (id: string) => sourceRef.current?.showSketch(id),
      onNode: (id: string) => sourceRef.current?.showDiagram({ nodes: [id] }),
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

  /** Review the current work and scenario answers without an intermediate walkthrough. */
  const runChecks = useCallback(
    (draft: ScenarioAnswer[], force = false) => {
      const finished = normalizeScenarioAnswers(caseDefinition.scenarios, draft);
      workspace.commitManualFinal();
      flushEditor();
      if (mode !== "practice" && !interviewEnd) endInterview("button", "");
      setAnswers(finished);
      setStage("report");
      logEvent("design", "Review requested", `${finished.length} scenarios · mode: ${mode}`);
      // Practice mode uses the review action as the interview end for this snapshot.
      const end = interviewEnd ?? { at: Date.now(), how: "button" as const, reason: "" };
      void assessment.run({ messages, docMarkdown: workspace.docMarkdown, finalCode: workspace.finalCode, answers: finished }, end, { force });
    },
    [assessment, caseDefinition.scenarios, endInterview, flushEditor, interviewEnd, logEvent, messages, mode, workspace],
  );

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
        result: assessment.result,
      }),
    [assessment.result, lastActivityAt, messageTimes, messages, startedAt],
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
      timeline,
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
      />
    </Paper>
  );

  /** While the review runs, show progress in the same five sections as the summary. */
  const checking = (
    <div className="submitted-view summary-loading">
      <Typography variant="h6">Preparing your summary</Typography>
      <Typography color="text.secondary">Reviewing your interview, design document and scenario answers.</Typography>
      <SummaryProgress progress={assessment.progress} extraProgress={assessment.extraProgress} />
    </div>
  );

  const report = () => {
    if (assessment.status === "loading") return checking;
    if (assessment.status === "error") {
      return (
        <div className="submitted-view">
          <Typography color="error">The checks failed: {assessment.error}</Typography>
          <Button variant="contained" onClick={() => runChecks(answers, true)}>
            Try again
          </Button>
          {mode === "practice" && <Button onClick={() => setStage("work")}>Back to my work</Button>}
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
        admin={false}
        timeline={timeline}
        citation={reportCitation}
        template={EMPTY_DESIGN_DOC_TEMPLATE}
        timeOnTaskMs={processMeasures.timeOnTaskMs}
        onClose={mode === "practice" ? () => setStage("work") : undefined}
        headerExtra={<Button size="small" variant="outlined" onClick={exportSession}>Export session</Button>}
      />
    );
  };

  const fullPane = (key: string, body: React.ReactNode) => (
    <Paper key={key} className="panel report-panel-full" elevation={0}>
      {body}
    </Paper>
  );

  /** The review stage: the submitted work on the left, the review on the right. */
  const reviewLayout = () => {
    const body = report();
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

  const needsIntake = intakeRequired(mode) && !intake;

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

  const scenarioPanel = (
    <Paper key="scenarios" className="panel" elevation={0}>
      <ScenarioPanel caseDefinition={caseDefinition} doc={workspace.parsed} finalCode={workspace.finalCode} answers={answers} onChange={setAnswers} />
    </Paper>
  );

  const workspaceSizes = { sizes: [1, 1.15, 1], storageKey: "workspace" };
  const clientPanes = !showReport
    ? { ...workspaceSizes, panes: [briefChat(false), docPanel, scenarioPanel] }
    : reviewLayout();



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
          onHome={() => void navigate("/")}
          onShortcuts={() => setShortcutsOpen(true)}
          submit={
            stage === "work" && !needsIntake
              ? { label: "Review", disabled: isSending || assessment.status === "loading", onClick: () => runChecks(answers) }
              : undefined
          }
        >
          {onRestart &&
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
        ) : (
          <ResizablePanes key={clientPanes.storageKey} defaultSizes={clientPanes.sizes} storageKey={clientPanes.storageKey}>
            {clientPanes.panes}
          </ResizablePanes>
        )}

        {!needsIntake && (
          <StatusBar problems={workspace.problems} msLeft={msLeft} saved={!isSending} onProblems={() => setProblemsOpen((open) => !open)} />
        )}
      </main>
    </ThemeProvider>
  );
}
