import { useCallback, useState } from "react";
import { CssBaseline, Divider, Paper, ThemeProvider, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BriefChatPanel } from "../components/simple/BriefChatPanel";
import { getCase } from "../cases";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../cases/community-room";
import { appTheme } from "../theme";
import type { ChatMessage } from "../types";
import "../App.css";
import "../components/simple/simple.css";

// TODO(assessment-mode): serve facts from backend only
const CASE = getCase("community-room");

export default function SimplePage() {
  const navigate = useNavigate();
  const [messages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: CASE.openingMessage },
  ]);
  const [docMarkdown, setDocMarkdown] = useState(EMPTY_DESIGN_DOC_TEMPLATE);
  const briefRef = useCallback(() => {}, []);

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
              isSending={false}
              briefRef={briefRef}
            />
          </Paper>

          <Paper className="panel" elevation={0}>
            <header className="panel-header">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Design doc
              </Typography>
            </header>
            <Divider />
            <div className="panel-body editor-layout">
              <div className="editor-shell simple-editor-shell">
                <textarea
                  className="editor"
                  value={docMarkdown}
                  onChange={(event) => setDocMarkdown(event.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
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
