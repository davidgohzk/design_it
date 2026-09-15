import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FormEvent, KeyboardEvent, MouseEvent } from "react";
import {
  Box,
  Button,
  CssBaseline,
  Divider,
  Paper,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { ChatBubble } from "../components/ChatBubble";
import { AIReviewDialog } from "../components/AIReviewDialog";
import { DesignPanel, DesignStateProvider } from "../components/DesignPanel";
import { streamText, warmUpBackend } from "../api";
import { CASE_REVIEW_FACTS } from "../caseReview";
import { MermaidBlock } from "../components/MermaidBlock";
import { DEFAULT_PANEL_WIDTHS, MIN_PANEL_WIDTH, PANEL_HANDLE_WIDTH } from "../constants";
import { EDITOR_INITIAL, INITIAL_MESSAGES, renderedSourceMarkdown } from "../content";
import { appTheme } from "../theme";
import { useTimeline } from "../timeline";
import { createReviewFingerprint, requestAIReview } from "../review";
import { INITIAL_AI_REVIEW_RESULT } from "../reviewSeed";
import { buildLogicGraph } from "../logicGraph";
import type { AIReviewResult, AIReviewStatus, ChatFloatingQuote, ChatMessage, FloatingQuote, PanelWidths, ResizeState } from "../types";
import { clamp, escapeMarkdownTitle, flashElementClass, flashTextMatch, getQuotePosition, normalizeQuoteText, panelGridTemplate, sectionAt } from "../utils";
import "../App.css";

export default function DemoPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"client" | "admin">("client");
  const [apiKey, setApiKey] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  const [editorMarkdown, setEditorMarkdown] = useState(EDITOR_INITIAL);
  const [previewMarkdown, setPreviewMarkdown] = useState(EDITOR_INITIAL);

  const [leftTab, setLeftTab] = useState(0);
  const [editorMode, setEditorMode] = useState<"split" | "editor" | "preview">("split");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [clientPanelWidths, setClientPanelWidths] = useState<PanelWidths>(DEFAULT_PANEL_WIDTHS);
  const [adminPanelWidths, setAdminPanelWidths] = useState<PanelWidths>(DEFAULT_PANEL_WIDTHS);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<AIReviewStatus>("success");
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(INITIAL_AI_REVIEW_RESULT);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { entries: timelineEntries, logEvent, noteEditorChange, flushEditor } = useTimeline();
  const reviewInput = useMemo(
    () => ({
      facts: CASE_REVIEW_FACTS,
      messages,
      briefMarkdown: renderedSourceMarkdown,
      reportMarkdown: editorMarkdown,
    }),
    [editorMarkdown, messages],
  );
  const reviewFingerprint = useMemo(
    () => createReviewFingerprint(reviewInput),
    [reviewInput],
  );
  const logicGraph = useMemo(
    () =>
      reviewResult
        ? buildLogicGraph(CASE_REVIEW_FACTS, messages, reviewResult, editorMarkdown)
        : { nodes: [], links: [] },
    [editorMarkdown, messages, reviewResult],
  );
  const reviewCacheRef = useRef<{
    fingerprint: string;
    result: AIReviewResult;
  } | null>({
    fingerprint: INITIAL_AI_REVIEW_RESULT.fingerprint,
    result: INITIAL_AI_REVIEW_RESULT,
  });
  const reviewRequestIdRef = useRef(0);
  const latestReviewFingerprintRef = useRef(reviewFingerprint);
  latestReviewFingerprintRef.current = reviewFingerprint;

  const logDesignEvent = useCallback(
    (summary: string, detail: string) => logEvent("design", summary, detail),
    [logEvent],
  );

  const runReview = useCallback(
    async (force: boolean) => {
      const requestId = reviewRequestIdRef.current + 1;
      reviewRequestIdRef.current = requestId;

      const cached = reviewCacheRef.current;
      // The server key always works, so only an explicit refresh spends tokens on an unchanged review.
      if (!force && cached?.fingerprint === reviewFingerprint) {
        setReviewResult(cached.result);
        setReviewError(null);
        setReviewStatus("success");
        return;
      }

      if (isSending) {
        setReviewResult(cached?.result ?? null);
        setReviewStatus("error");
        setReviewError("Showing the last available review. Wait for the client response to finish before refreshing it.");
        return;
      }
      setReviewError(null);
      setReviewStatus("loading");

      try {
        const result = await requestAIReview(reviewInput, { apiKey });
        if (
          reviewRequestIdRef.current !== requestId ||
          latestReviewFingerprintRef.current !== reviewFingerprint
        ) {
          return;
        }
        reviewCacheRef.current = { fingerprint: reviewFingerprint, result };
        setReviewResult(result);
        setReviewStatus("success");
      } catch (error) {
        if (
          reviewRequestIdRef.current !== requestId ||
          latestReviewFingerprintRef.current !== reviewFingerprint
        ) {
          return;
        }
        const message = error instanceof Error ? error.message : "The review failed. Please retry.";
        setReviewError(message);
        setReviewStatus("error");
      }
    },
    [apiKey, isSending, reviewFingerprint, reviewInput],
  );

  const openReview = useCallback(() => {
    flushEditor();
    setIsReviewOpen(true);
    void runReview(false);
  }, [flushEditor, runReview]);

  useEffect(() => {
    flushEditor();
  }, [viewMode, leftTab, flushEditor]);

  useEffect(() => {
    void warmUpBackend();
  }, []);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorOffsetRef = useRef(0);
  const lineNumbersRef = useRef<HTMLPreElement | null>(null);
  const caseStudyRef = useRef<HTMLDivElement | null>(null);
  const clientGridRef = useRef<HTMLElement | null>(null);
  const adminGridRef = useRef<HTMLElement | null>(null);
  const [caseStudyQuote, setCaseStudyQuote] = useState<FloatingQuote | null>(null);
  const [chatQuote, setChatQuote] = useState<ChatFloatingQuote | null>(null);
  const [csHighlightText, setCsHighlightText] = useState<string | null>(null);
  const [chatHighlight, setChatHighlight] = useState<{ index: number; text?: string } | null>(null);

  const conversationLength = useMemo(
    () => messages.reduce((sum, m) => sum + m.content.length, 0),
    [messages],
  );

  const lineCount = useMemo(
    () => Math.max(1, editorMarkdown.split("\n").length),
    [editorMarkdown],
  );
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );
  const wordCount = useMemo(
    () => editorMarkdown.trim().split(/\s+/).filter(Boolean).length,
    [editorMarkdown],
  );

  useEffect(() => {
    if (leftTab !== 0 || !csHighlightText) return;

    let cleanup: null | (() => void) = null;
    let timer: null | ReturnType<typeof setTimeout> = null;
    let frame = 0;

    const runHighlight = (attemptsLeft: number) => {
      const container = caseStudyRef.current;
      if (!container) {
        if (attemptsLeft > 0) {
          frame = requestAnimationFrame(() => runHighlight(attemptsLeft - 1));
        }
        return;
      }

      cleanup =
        flashTextMatch(container, csHighlightText, "cs-text-highlight")
        ?? flashElementClass(container, "context-panel-highlight");

      timer = setTimeout(() => {
        cleanup?.();
        setCsHighlightText(null);
      }, 2500);
    };

    frame = requestAnimationFrame(() => runHighlight(8));

    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      cleanup?.();
    };
  }, [csHighlightText, leftTab]);

  useEffect(() => {
    if (leftTab !== 1 || !chatHighlight) return;

    const bubble = document.getElementById(`chat-msg-${chatHighlight.index}`) as HTMLElement | null;
    if (!bubble) return;

    bubble.scrollIntoView({ behavior: "smooth", block: "center" });
    const cleanup =
      chatHighlight.text
        ? flashTextMatch(bubble, chatHighlight.text, "chat-text-highlight")
        : null;

    if (!cleanup) bubble.classList.add("quote-highlight");

    const timer = setTimeout(() => {
      cleanup?.();
      bubble.classList.remove("quote-highlight");
      setChatHighlight(null);
    }, 2500);

    return () => {
      clearTimeout(timer);
      cleanup?.();
      bubble.classList.remove("quote-highlight");
    };
  }, [chatHighlight, leftTab]);

  useEffect(() => {
    if (!resizeState) return;

    const applyResize = (event: globalThis.MouseEvent) => {
      const delta = event.clientX - resizeState.startX;
      const totalFlexibleWidth = Math.max(1, resizeState.containerWidth - PANEL_HANDLE_WIDTH * 2);
      const startTotal = resizeState.startWidths[0] + resizeState.startWidths[1] + resizeState.startWidths[2];
      const startPixels = resizeState.startWidths.map(
        (width) => (width / startTotal) * totalFlexibleWidth,
      ) as PanelWidths;

      const nextPixels = [...startPixels] as PanelWidths;

      if (resizeState.handleIndex === 0) {
        const combined = startPixels[0] + startPixels[1];
        if (combined <= MIN_PANEL_WIDTH * 2) return;
        nextPixels[0] = clamp(startPixels[0] + delta, MIN_PANEL_WIDTH, combined - MIN_PANEL_WIDTH);
        nextPixels[1] = combined - nextPixels[0];
      } else {
        const combined = startPixels[1] + startPixels[2];
        if (combined <= MIN_PANEL_WIDTH * 2) return;
        nextPixels[1] = clamp(startPixels[1] + delta, MIN_PANEL_WIDTH, combined - MIN_PANEL_WIDTH);
        nextPixels[2] = combined - nextPixels[1];
      }

      if (resizeState.view === "client") setClientPanelWidths(nextPixels);
      else setAdminPanelWidths(nextPixels);
    };

    const stopResize = () => setResizeState(null);

    document.body.classList.add("is-resizing-panels");
    window.addEventListener("mousemove", applyResize);
    window.addEventListener("mouseup", stopResize);

    return () => {
      document.body.classList.remove("is-resizing-panels");
      window.removeEventListener("mousemove", applyResize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [resizeState]);

  const handleResizeStart = useCallback(
    (view: "client" | "admin", handleIndex: 0 | 1) =>
      (event: MouseEvent<HTMLDivElement>) => {
        if (window.innerWidth <= 1024) return;

        const container =
          view === "client" ? clientGridRef.current : adminGridRef.current;
        const widths = view === "client" ? clientPanelWidths : adminPanelWidths;
        if (!container) return;

        setResizeState({
          view,
          handleIndex,
          startX: event.clientX,
          startWidths: widths,
          containerWidth: container.getBoundingClientRect().width,
        });
        event.preventDefault();
      },
    [adminPanelWidths, clientPanelWidths],
  );

  const markdownComponents = useMemo(
    () => ({
      code: ({
        inline,
        className,
        children,
        ...props
      }: {
        inline?: boolean;
        className?: string;
        children?: ReactNode;
      }) => {
        const language = className?.replace("language-", "") ?? "";
        const codeText = String(children ?? "").replace(/\n$/, "");
        if (!inline && language === "mermaid") return <MermaidBlock chart={codeText} />;
        return <code className={className} {...props}>{children}</code>;
      },
      a: ({
        href,
        title,
        children,
      }: {
        href?: string;
        title?: string;
        children?: ReactNode;
      }) => {
        if (href === "#cs") {
          return (
            <Tooltip title={title ? `"${title}"` : ""} arrow placement="top">
              <span
                className="inline-ref inline-ref-cs"
                role="link"
                tabIndex={0}
                onClick={() => {
                  setLeftTab(0);
                  setCsHighlightText(title ?? null);
                }}
              >
                {children}
              </span>
            </Tooltip>
          );
        }
        if (href?.startsWith("#chat-msg-")) {
          const msgIdx = parseInt(href.replace("#chat-msg-", ""));
          return (
            <Tooltip title={title ? `"${title}"` : ""} arrow placement="top">
              <span
                className="inline-ref inline-ref-chat"
                role="link"
                tabIndex={0}
                onClick={() => {
                  setLeftTab(1);
                  setChatHighlight({
                    index: msgIdx,
                    text: title ? normalizeQuoteText(title) : undefined,
                  });
                }}
              >
                {children}
              </span>
            </Tooltip>
          );
        }
        return <a href={href}>{children}</a>;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const caseStudyComponents = useMemo(
    () => ({
      ...markdownComponents,
      h2: ({ children }: { children?: ReactNode }) => {
        const id = "cs-" + String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <h2 id={id}>{children}</h2>;
      },
      h3: ({ children }: { children?: ReactNode }) => {
        const id = "cs-" + String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <h3 id={id}>{children}</h3>;
      },
    }),
    [markdownComponents],
  );

  const updateCursorFromPosition = useCallback((value: string, position: number) => {
    const bounded = Math.max(0, Math.min(position, value.length));
    // Remembered so quoting still lands at the caret while the editor is
    // unmounted in preview mode.
    cursorOffsetRef.current = bounded;
    const head = value.slice(0, bounded);
    const line = head.split("\n").length;
    const lastBreak = head.lastIndexOf("\n");
    setCursor({ line, column: bounded - lastBreak });
  }, []);

  const withEditorSelection = useCallback(
    (
      transform: (
        value: string,
        selectionStart: number,
        selectionEnd: number,
      ) => { nextValue: string; nextSelectionStart: number; nextSelectionEnd: number },
    ) => {
      const editor = editorRef.current;
      if (!editor) return;
      const { selectionStart, selectionEnd, value } = editor;
      const { nextValue, nextSelectionStart, nextSelectionEnd } = transform(
        value, selectionStart, selectionEnd,
      );
      setEditorMarkdown(nextValue);
      requestAnimationFrame(() => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextSelectionStart, nextSelectionEnd);
        updateCursorFromPosition(nextValue, nextSelectionEnd);
      });
    },
    [updateCursorFromPosition],
  );

  const insertSnippet = useCallback(
    (snippet: string) => {
      withEditorSelection((value, start, end) => {
        const nextValue = value.slice(0, start) + snippet + value.slice(end);
        const pos = start + snippet.length;
        noteEditorChange(value, nextValue);
        return { nextValue, nextSelectionStart: pos, nextSelectionEnd: pos };
      });
    },
    [noteEditorChange, withEditorSelection],
  );

  const handleEditorScroll = useCallback(() => {
    const editor = editorRef.current;
    const lines = lineNumbersRef.current;
    if (editor && lines) lines.scrollTop = editor.scrollTop;
  }, []);

  const handleCompile = useCallback(() => {
    setPreviewMarkdown(editorMarkdown);
  }, [editorMarkdown]);

  const insertQuote = useCallback(
    (markdown: string, source: string, quotedText: string) => {
      // A quote is an inline citation link, so it goes in at the caret,
      // replacing whatever is selected — not appended to the end of the report.
      const editor = editorRef.current;
      const start = clamp(
        editor ? editor.selectionStart : cursorOffsetRef.current,
        0,
        editorMarkdown.length,
      );
      const end = clamp(editor ? editor.selectionEnd : start, start, editorMarkdown.length);
      const caret = start + markdown.length;

      setEditorMarkdown((prev) => prev.slice(0, start) + markdown + prev.slice(end));
      cursorOffsetRef.current = caret;
      if (editorMode === "preview") setEditorMode("split");

      requestAnimationFrame(() => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caret, caret);
      });

      logEvent("quote", source, quotedText, sectionAt(editorMarkdown, start));
    },
    [editorMarkdown, editorMode, logEvent],
  );

  const handleCaseStudyMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setCaseStudyQuote(null); return; }
    const text = sel.toString().trim();
    if (!text) { setCaseStudyQuote(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setChatQuote(null);
    setCaseStudyQuote({ text, ...getQuotePosition(rect) });
  }, []);

  const handleChatQuote = useCallback(
    (text: string, index: number) => {
      const escaped = escapeMarkdownTitle(text);
      const md = `[Chat #${index + 1}](#chat-msg-${index} "${escaped}")`;
      insertQuote(md, `Chat #${index + 1}`, text);
    },
    [insertQuote],
  );

  const handleChatMouseSelection = useCallback((text: string, index: number, rect: DOMRect) => {
    setCaseStudyQuote(null);
    setChatQuote({ text, index, ...getQuotePosition(rect) });
  }, []);

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      insertSnippet("  ");
    },
    [insertSnippet],
  );

  const sendMessage = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const trimmedPrompt = chatInput.trim();
      if (!trimmedPrompt || isSending) return;

      logEvent("chat", "Message to Sarah", trimmedPrompt);

      const userMessage: ChatMessage = { role: "user", content: trimmedPrompt };
      setChatInput("");
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
      setIsSending(true);

      try {
        await streamText("/api/chat", { messages: [...messages, userMessage] }, {
          apiKey,
          onDelta: (part) =>
            setMessages((prev) => {
              const next = [...prev];
              const last = next.length - 1;
              if (last >= 0 && next[last].role === "assistant")
                next[last] = { ...next[last], content: next[last].content + part };
              return next;
            }),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => {
          const next = [...prev];
          const last = next.length - 1;
          if (last >= 0 && next[last].role === "assistant")
            next[last] = { role: "assistant", content: `Request failed: ${msg}` };
          return next;
        });
      } finally {
        setIsSending(false);
      }
    },
    [chatInput, isSending, apiKey, messages, logEvent],
  );

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <DesignStateProvider onLog={logDesignEvent}>
        <main className="app-shell">
          <AIReviewDialog
            open={isReviewOpen}
            viewMode={viewMode}
            status={reviewStatus}
            result={reviewResult}
            error={reviewError}
            timelineEntries={timelineEntries}
            logicGraph={logicGraph}
            canReview={!isSending}
            onRefresh={() => void runReview(true)}
            onClose={() => setIsReviewOpen(false)}
          />
          {caseStudyQuote && (
            <Box
              sx={{
                position: "fixed",
                top: caseStudyQuote.top,
                left: caseStudyQuote.left,
                transform: "translateX(-50%)",
                zIndex: 9999,
              }}
            >
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  const { text } = caseStudyQuote;
                  const escaped = escapeMarkdownTitle(text);
                  const md = `[Context](#cs "${escaped}")`;
                  insertQuote(md, "Context panel", text);
                  setCaseStudyQuote(null);
                  window.getSelection()?.removeAllRanges();
                }}
              >
                ❝ Quote
              </Button>
            </Box>
          )}
          {chatQuote && (
            <Box
              sx={{
                position: "fixed",
                top: chatQuote.top,
                left: chatQuote.left,
                transform: "translateX(-50%)",
                zIndex: 9999,
              }}
            >
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  const escaped = escapeMarkdownTitle(chatQuote.text);
                  const md = `[Chat #${chatQuote.index + 1}](#chat-msg-${chatQuote.index} "${escaped}")`;
                  insertQuote(md, `Chat #${chatQuote.index + 1}`, chatQuote.text);
                  setChatQuote(null);
                  window.getSelection()?.removeAllRanges();
                }}
              >
                Quote
              </Button>
            </Box>
          )}
          <header className="app-topbar">
            <button
              className="demo-back-btn"
              onClick={() => navigate("/")}
              aria-label="Back to home page"
            >
              ← Back to Home
            </button>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Design_IT</Typography>
            <div className="app-topbar-actions">
              <TextField
                className="api-key topbar-api-key"
                type="password"
                size="small"
                label="SoCLaaS API key (optional)"
                placeholder="Uses server key if blank"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button size="small" variant="outlined" onClick={openReview}>
                AI Review
              </Button>
              <ToggleButtonGroup
                size="small"
                exclusive
                color="primary"
                value={viewMode}
                onChange={(_e, v) => { if (v) setViewMode(v); }}
              >
                <ToggleButton value="client">User View</ToggleButton>
                <ToggleButton value="admin">Admin View</ToggleButton>
              </ToggleButtonGroup>
            </div>
          </header>

          {viewMode === "client" ? (
            <section
              ref={clientGridRef}
              className="workspace-grid"
              style={{ ["--panel-columns" as string]: panelGridTemplate(clientPanelWidths) }}
            >
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Tabs
                    value={leftTab}
                    onChange={(_e, v) => setLeftTab(v as number)}
                    textColor="primary"
                    indicatorColor="primary"
                  >
                    <Tab label="Context" />
                    <Tab label="Chat" />
                  </Tabs>
                </header>
                <Divider />
                {leftTab === 0 && (
                  <div
                    ref={caseStudyRef}
                    className="panel-body markdown-body scrollable"
                    onMouseUp={handleCaseStudyMouseUp}
                  >
                    <ReactMarkdown components={caseStudyComponents}>
                      {renderedSourceMarkdown}
                    </ReactMarkdown>
                  </div>
                )}
                {leftTab === 1 && (
                  <div className="chat-panel-main">
                    <div className="chat-log scrollable" aria-live="polite">
                      {messages.map((message, index) => (
                        <ChatBubble
                          key={`${message.role}-${index}`}
                          role={message.role}
                          content={message.content}
                          showLoading={isSending && index === messages.length - 1}
                          index={index}
                          onQuote={handleChatQuote}
                          onSelectionQuote={handleChatMouseSelection}
                          onDismissSelectionQuote={() => setChatQuote(null)}
                        />
                      ))}
                    </div>
                    <form className="chat-input" onSubmit={sendMessage}>
                      <TextField
                        multiline
                        minRows={3}
                        maxRows={6}
                        placeholder="Ask something..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <div className="chat-actions">
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={isSending || !chatInput.trim()}
                        >
                          {isSending ? "Streaming..." : "Send"}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          {conversationLength} chars
                        </Typography>
                      </div>
                    </form>
                  </div>
                )}
              </Paper>

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize left and middle panels"
                onMouseDown={handleResizeStart("client", 0)}
              />

              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Markdown Editor
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button size="small" variant="contained" color="primary" onClick={handleCompile}>
                      Compile
                    </Button>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      color="primary"
                      value={editorMode}
                      onChange={(_e, v) => { if (v) setEditorMode(v); }}
                    >
                      <ToggleButton value="editor">Editor</ToggleButton>
                      <ToggleButton value="split">Split</ToggleButton>
                      <ToggleButton value="preview">Preview</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </header>
                <Divider />
                <div className="panel-body editor-layout">
                  <Box className={`editor-content mode-${editorMode}`}>
                    {editorMode !== "preview" && (
                      <div className="editor-shell">
                        <pre ref={lineNumbersRef} className="line-numbers" aria-hidden="true">
                          {lineNumbers}
                        </pre>
                        <textarea
                          ref={editorRef}
                          className="editor"
                          value={editorMarkdown}
                          onChange={(e) => {
                            noteEditorChange(editorMarkdown, e.target.value);
                            setEditorMarkdown(e.target.value);
                            updateCursorFromPosition(e.target.value, e.target.selectionStart);
                          }}
                          onClick={(e) => updateCursorFromPosition(e.currentTarget.value, e.currentTarget.selectionStart)}
                          onKeyUp={(e) => updateCursorFromPosition(e.currentTarget.value, e.currentTarget.selectionStart)}
                          onKeyDown={handleEditorKeyDown}
                          onScroll={handleEditorScroll}
                          spellCheck={false}
                        />
                      </div>
                    )}
                    {editorMode !== "editor" && (
                      <div className="preview markdown-body scrollable">
                        <ReactMarkdown components={markdownComponents}>
                          {previewMarkdown}
                        </ReactMarkdown>
                      </div>
                    )}
                  </Box>

                  <div className="editor-status">
                    <span>Ln {cursor.line}, Col {cursor.column}</span>
                    <span>{wordCount} words</span>
                    <span>{editorMarkdown.length} chars</span>
                  </div>
                </div>
              </Paper>

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize middle and right panels"
                onMouseDown={handleResizeStart("client", 1)}
              />

              <Paper className="panel" elevation={0}>
                <DesignPanel apiKey={apiKey} />
              </Paper>
            </section>
          ) : (
            <section
              ref={adminGridRef}
              className="admin-grid"
              style={{ ["--panel-columns" as string]: panelGridTemplate(adminPanelWidths) }}
            >
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Tabs
                    value={leftTab}
                    onChange={(_e, v) => setLeftTab(v as number)}
                    textColor="primary"
                    indicatorColor="primary"
                  >
                    <Tab label="Context" />
                    <Tab label="Chat" />
                  </Tabs>
                </header>
                <Divider />
                {leftTab === 0 && (
                  <div
                    ref={caseStudyRef}
                    className="panel-body markdown-body scrollable"
                  >
                    <ReactMarkdown components={caseStudyComponents}>
                      {renderedSourceMarkdown}
                    </ReactMarkdown>
                  </div>
                )}
                {leftTab === 1 && (
                  <div className="panel-body admin-panel-body">
                    <div className="chat-log scrollable admin-chat-log" aria-live="polite">
                      {messages.map((message, index) => (
                        <ChatBubble
                          key={`${message.role}-${index}`}
                          role={message.role}
                          content={message.content}
                          showLoading={false}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Paper>

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize left and middle panels"
                onMouseDown={handleResizeStart("admin", 0)}
              />

              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Rendered Markdown</Typography>
                </header>
                <Divider />
                <div className="panel-body admin-panel-body">
                  <div className="preview markdown-body scrollable admin-preview">
                    <ReactMarkdown components={markdownComponents}>
                      {previewMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              </Paper>

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize middle and right panels"
                onMouseDown={handleResizeStart("admin", 1)}
              />

              <Paper className="panel" elevation={0}>
                <DesignPanel readOnly />
              </Paper>
            </section>
          )}
        </main>
      </DesignStateProvider>
    </ThemeProvider>
  );
}
