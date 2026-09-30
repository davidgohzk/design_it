import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CssBaseline, Paper, ThemeProvider, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BriefChatPanel } from "../components/simple/BriefChatPanel";
import { DocEditorPanel } from "../components/simple/DocEditorPanel";
import type { DocEditorHandle } from "../components/simple/DocEditorPanel";
import { FinalDiagramPanel } from "../components/simple/FinalDiagramPanel";
import { flashChatMessage, flashTextIn } from "../components/simple/highlight";
import { useCaseChat } from "../components/simple/useCaseChat";
import { useDesignWorkspace } from "../components/simple/useDesignWorkspace";
import { getCase } from "../cases";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../cases/community-room";
import { warmUpBackend } from "../api";
import { appTheme } from "../theme";
import { escapeMarkdownTitle } from "../utils";
import "../App.css";
import "../components/simple/simple.css";

// TODO(assessment-mode): serve facts from backend only
const CASE = getCase("community-room");
const HIGHLIGHT_MS = 2500;

export default function SimplePage() {
  const navigate = useNavigate();
  const apiKey = "";
  const { messages, isSending, send } = useCaseChat({
    caseId: CASE.id,
    openingMessage: CASE.openingMessage,
    apiKey,
  });
  const workspace = useDesignWorkspace({
    caseDefinition: CASE,
    messages,
    apiKey,
    initialDoc: EMPTY_DESIGN_DOC_TEMPLATE,
  });
  const [briefOpen, setBriefOpen] = useState(true);
  const [highlightedDecision, setHighlightedDecision] = useState<string | null>(null);
  const briefElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DocEditorHandle | null>(null);

  useEffect(() => {
    void warmUpBackend();
  }, []);

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

  const quoteIntoDoc = useCallback((text: string, index?: number) => {
    const escaped = escapeMarkdownTitle(text);
    const link =
      index === undefined
        ? `[Brief](#cs "${escaped}")`
        : `[Chat #${index}](#chat-msg-${index} "${escaped}")`;
    editorRef.current?.insertAtCaret(link);
  }, []);

  const showDecision = useCallback((decisionId: string) => {
    setHighlightedDecision(decisionId);
    editorRef.current?.showItem(decisionId);
  }, []);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <main className="app-shell">
        <header className="app-topbar">
          <button className="demo-back-btn" onClick={() => navigate("/")} aria-label="Back to home page">
            ← Back to Home
          </button>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {CASE.title}
          </Typography>
          <div className="app-topbar-actions" />
        </header>

        <section className="simple-grid">
          <Paper className="panel" elevation={0}>
            <BriefChatPanel
              briefMarkdown={CASE.briefMarkdown}
              clientName={CASE.clientName}
              messages={messages}
              isSending={isSending}
              briefOpen={briefOpen}
              onBriefOpenChange={setBriefOpen}
              briefRef={(node) => {
                briefElementRef.current = node;
              }}
              onSend={(text) => void send(text)}
              onQuote={quoteIntoDoc}
            />
          </Paper>

          <Paper className="panel" elevation={0}>
            <DocEditorPanel
              ref={editorRef}
              markdown={workspace.docMarkdown}
              parsed={workspace.parsed}
              onChange={workspace.updateDoc}
              citation={citation}
              warnings={workspace.warnings}
              sketchIssues={workspace.sketchIssues}
              sketchStatus={workspace.sketchStatus}
              onSketchWithAI={(id) => void workspace.sketchWithAI(id)}
              highlightedDecision={highlightedDecision}
            />
          </Paper>

          <Paper className="panel" elevation={0}>
            <FinalDiagramPanel
              code={workspace.finalCode}
              final={workspace.parsed.final}
              nodeDecisions={workspace.parsed.nodeDecisions}
              issues={workspace.consistency.issues}
              unjustifiedNodes={workspace.consistency.unjustifiedNodes}
              mermaidError={workspace.finalMermaidError}
              onCodeChange={workspace.setFinalCode}
              onCodeCommit={workspace.commitManualFinal}
              onBuildFromSketches={workspace.buildFromSketches}
              canBuildFromSketches={workspace.canBuildFromSketches}
              onGenerate={(prompt) => void workspace.generateFinal(prompt)}
              generating={workspace.finalAI.generating}
              streamingCode={workspace.finalAI.streaming}
              aiError={workspace.finalAI.error}
              onBadgeClick={showDecision}
            />
          </Paper>
        </section>
      </main>
    </ThemeProvider>
  );
}
