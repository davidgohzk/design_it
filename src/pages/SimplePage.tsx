import { useCallback, useMemo, useRef, useState } from "react";
import { CssBaseline, Divider, Paper, ThemeProvider, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BriefChatPanel } from "../components/simple/BriefChatPanel";
import { DocEditorPanel } from "../components/simple/DocEditorPanel";
import type { DocEditorHandle } from "../components/simple/DocEditorPanel";
import { flashChatMessage, flashTextIn } from "../components/simple/highlight";
import { useCaseChat } from "../components/simple/useCaseChat";
import { getCase } from "../cases";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../cases/community-room";
import { parseDesignDoc } from "../designDoc/parse";
import { appTheme } from "../theme";
import { escapeMarkdownTitle } from "../utils";
import "../App.css";
import "../components/simple/simple.css";

// TODO(assessment-mode): serve facts from backend only
const CASE = getCase("community-room");

export default function SimplePage() {
  const navigate = useNavigate();
  const { messages, isSending, send } = useCaseChat({
    caseId: CASE.id,
    openingMessage: CASE.openingMessage,
    apiKey: "",
  });
  const [docMarkdown, setDocMarkdown] = useState(EMPTY_DESIGN_DOC_TEMPLATE);
  const [finalCode] = useState("");
  const [briefOpen, setBriefOpen] = useState(true);
  const briefElementRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DocEditorHandle | null>(null);

  const parsed = useMemo(
    () => parseDesignDoc(docMarkdown, finalCode, CASE.briefMarkdown, messages),
    [docMarkdown, finalCode, messages],
  );

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
              markdown={docMarkdown}
              parsed={parsed}
              onChange={setDocMarkdown}
              citation={citation}
            />
          </Paper>

          <Paper className="panel" elevation={0}>
            <header className="panel-header">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Final diagram
              </Typography>
            </header>
            <Divider />
            <div className="panel-body">
              <Typography variant="caption" color="text.secondary">
                The final diagram appears here.
              </Typography>
            </div>
          </Paper>
        </section>
      </main>
    </ThemeProvider>
  );
}
