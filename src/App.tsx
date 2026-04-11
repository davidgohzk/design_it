import { useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Box,
  Button,
  Chip,
  CssBaseline,
  Divider,
  Paper,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  createTheme,
} from "@mui/material";
import { Groq } from "groq-sdk";
import ReactMarkdown from "react-markdown";
import sourceMarkdown from "./assets/test.md?raw";
import "./App.css";

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#006f9a" },
    secondary: { main: "#8f4889" },
    background: { default: "#e6eef3", paper: "#f7fbff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
});

const defaultSystemPrompt = `You are Mickey Mouse, a client who wants to build a simple link-shortening tool for your friends.

You are not a developer. You are a real customer explaining your needs to a developer who will design and build the system for you.

You convert long URLs into short, unique codes and use them to share links easily with your friends. When someone visits a short link, it should redirect to the original URL instantly. You also want to make sure no two short codes ever collide, even when many people are using the system at the same time, and you want to track how often each link is clicked.

A developer will ask you questions to clarify requirements and design the system. Your job is to respond like a real client: explain what you want in simple terms, answer questions based on your needs, and help them understand your expectations.`;

function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GROQ_API_KEY ?? "");
  const [chatInput, setChatInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello. Add your Groq API key and ask anything.",
    },
  ]);

  const [editorMarkdown, setEditorMarkdown] = useState(`## SOAP Template

### S - Subjective
- User request:
- Context and intent:
- Goals in plain language:

### O - Objective
- Known requirements:
- Constraints:
- Facts observed from source:

### A - Assessment
- Interpretation:
- Key assumptions:
- Trade-offs considered:

### P - Plan
1. Immediate next step
2. Follow-up validation
3. Optional improvements
`);
  const [editorMode, setEditorMode] = useState<"split" | "editor" | "preview">(
    "split",
  );
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLPreElement | null>(null);

  const conversation = useMemo(
    () =>
      messages
        .map((msg) => `${msg.role === "user" ? "You" : "Grok"}: ${msg.content}`)
        .join("\n\n"),
    [messages],
  );

  const renderedSourceMarkdown = useMemo(() => {
    const trimmed = sourceMarkdown.trim();
    const wrappedMarkdownFence = /^```(?:md|markdown)?\n([\s\S]*?)\n```$/i;
    const match = trimmed.match(wrappedMarkdownFence);
    const normalized = match ? match[1] : sourceMarkdown;
    return normalized
      .replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, "")
      .trim();
  }, []);

  const lineCount = useMemo(
    () => Math.max(1, editorMarkdown.split("\n").length),
    [editorMarkdown],
  );
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1).join("\n"),
    [lineCount],
  );

  const wordCount = useMemo(() => {
    const tokens = editorMarkdown.trim().split(/\s+/).filter(Boolean);
    return tokens.length;
  }, [editorMarkdown]);

  const updateCursorFromPosition = (value: string, position: number) => {
    const bounded = Math.max(0, Math.min(position, value.length));
    const head = value.slice(0, bounded);
    const line = head.split("\n").length;
    const lastBreak = head.lastIndexOf("\n");
    const column = bounded - lastBreak;
    setCursor({ line, column });
  };

  const withEditorSelection = (
    transform: (
      value: string,
      selectionStart: number,
      selectionEnd: number,
    ) => {
      nextValue: string;
      nextSelectionStart: number;
      nextSelectionEnd: number;
    },
  ) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const { selectionStart, selectionEnd, value } = editor;
    const { nextValue, nextSelectionStart, nextSelectionEnd } = transform(
      value,
      selectionStart,
      selectionEnd,
    );

    setEditorMarkdown(nextValue);

    requestAnimationFrame(() => {
      const nextEditor = editorRef.current;
      if (!nextEditor) {
        return;
      }
      nextEditor.focus();
      nextEditor.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      updateCursorFromPosition(nextValue, nextSelectionEnd);
    });
  };

  const wrapSelection = (before: string, after = before, fallback = "text") => {
    withEditorSelection((value, start, end) => {
      const selected = value.slice(start, end) || fallback;
      const nextValue =
        value.slice(0, start) + before + selected + after + value.slice(end);
      const nextSelectionStart = start + before.length;
      const nextSelectionEnd = nextSelectionStart + selected.length;
      return { nextValue, nextSelectionStart, nextSelectionEnd };
    });
  };

  const insertSnippet = (snippet: string) => {
    withEditorSelection((value, start, end) => {
      const nextValue = value.slice(0, start) + snippet + value.slice(end);
      const cursorPosition = start + snippet.length;
      return {
        nextValue,
        nextSelectionStart: cursorPosition,
        nextSelectionEnd: cursorPosition,
      };
    });
  };

  const handleEditorScroll = () => {
    const editor = editorRef.current;
    const lines = lineNumbersRef.current;
    if (editor && lines) {
      lines.scrollTop = editor.scrollTop;
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    insertSnippet("  ");
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedPrompt = chatInput.trim();
    if (!trimmedPrompt || isSending) {
      return;
    }

    if (!apiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Please provide a Groq API key first." },
      ]);
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: trimmedPrompt };
    setChatInput("");
    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", content: "" },
    ]);
    setIsSending(true);

    try {
      const groq = new Groq({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true,
      });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt.trim(),
          },
          ...messages,
          userMessage,
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 1,
        max_completion_tokens: 8000,
        top_p: 1,
        stream: true,
      });

      for await (const chunk of completion) {
        const contentPart = chunk.choices[0]?.delta?.content ?? "";
        if (!contentPart) {
          continue;
        }

        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
            next[lastIndex] = {
              ...next[lastIndex],
              content: `${next[lastIndex].content}${contentPart}`,
            };
          }
          return next;
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          next[lastIndex] = {
            role: "assistant",
            content: `Request failed: ${message}`,
          };
        }
        return next;
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <main className="app-shell">
        <section className="workspace-grid">
          <Paper className="panel" elevation={0}>
            <header className="panel-header">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Context
              </Typography>
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label="assets/test.md"
              />
            </header>
            <Divider />
            <div className="panel-body markdown-body scrollable">
              <ReactMarkdown>{renderedSourceMarkdown}</ReactMarkdown>
            </div>
          </Paper>

          <Paper className="panel" elevation={0}>
            <header className="panel-header">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Chat With Groq
              </Typography>
              <TextField
                className="api-key"
                type="password"
                size="small"
                label="Groq API key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </header>
            <Divider />
            <div className="chat-panel-main">
              <TextField
                multiline
                minRows={4}
                maxRows={10}
                label="System prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                sx={{ mb: 1.5 }}
              />
              <div className="chat-log scrollable" aria-live="polite">
                {messages.map((message, index) => (
                  <Paper
                    key={`${message.role}-${index}`}
                    className={`bubble ${message.role}`}
                    variant="outlined"
                  >
                    <Typography variant="caption" className="bubble-title">
                      {message.role === "user" ? "You" : "Grok"}
                    </Typography>
                    <ReactMarkdown>
                      {message.content || (isSending ? "..." : "")}
                    </ReactMarkdown>
                  </Paper>
                ))}
              </div>

              <form className="chat-input" onSubmit={sendMessage}>
                <TextField
                  multiline
                  minRows={3}
                  maxRows={6}
                  placeholder="Ask something..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
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
                    {conversation.length} chars
                  </Typography>
                </div>
              </form>
            </div>
          </Paper>

          <Paper className="panel" elevation={0}>
            <header className="panel-header">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Markdown Editor
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                color="primary"
                value={editorMode}
                onChange={(_event, value) => {
                  if (value) {
                    setEditorMode(value);
                  }
                }}
              >
                <ToggleButton value="editor">Editor</ToggleButton>
                <ToggleButton value="split">Split</ToggleButton>
                <ToggleButton value="preview">Preview</ToggleButton>
              </ToggleButtonGroup>
            </header>
            <Divider />

            <div className="panel-body editor-layout">
              <Box className="editor-toolbar">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet("# ")}
                >
                  H1
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet("## ")}
                >
                  H2
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => wrapSelection("**")}
                >
                  Bold
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => wrapSelection("_")}
                >
                  Italic
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => wrapSelection("`")}
                >
                  Code
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => wrapSelection("[", "](https://)", "label")}
                >
                  Link
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet("- ")}
                >
                  List
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet("> ")}
                >
                  Quote
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet("- [ ] ")}
                >
                  Task
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    insertSnippet("\n```md\nYour code here\n```\n")
                  }
                >
                  Fence
                </Button>
              </Box>

              <Box className={`editor-content mode-${editorMode}`}>
                {editorMode !== "preview" && (
                  <div className="editor-shell">
                    <pre
                      ref={lineNumbersRef}
                      className="line-numbers"
                      aria-hidden="true"
                    >
                      {lineNumbers}
                    </pre>
                    <textarea
                      ref={editorRef}
                      className="editor"
                      value={editorMarkdown}
                      onChange={(event) => {
                        setEditorMarkdown(event.target.value);
                        updateCursorFromPosition(
                          event.target.value,
                          event.target.selectionStart,
                        );
                      }}
                      onClick={(event) =>
                        updateCursorFromPosition(
                          event.currentTarget.value,
                          event.currentTarget.selectionStart,
                        )
                      }
                      onKeyUp={(event) =>
                        updateCursorFromPosition(
                          event.currentTarget.value,
                          event.currentTarget.selectionStart,
                        )
                      }
                      onKeyDown={handleEditorKeyDown}
                      onScroll={handleEditorScroll}
                      spellCheck={false}
                    />
                  </div>
                )}

                {editorMode !== "editor" && (
                  <div className="preview markdown-body scrollable">
                    <ReactMarkdown>{editorMarkdown}</ReactMarkdown>
                  </div>
                )}
              </Box>

              <div className="editor-status">
                <span>
                  Ln {cursor.line}, Col {cursor.column}
                </span>
                <span>{wordCount} words</span>
                <span>{editorMarkdown.length} chars</span>
              </div>
            </div>
          </Paper>
        </section>
      </main>
    </ThemeProvider>
  );
}

export default App;
