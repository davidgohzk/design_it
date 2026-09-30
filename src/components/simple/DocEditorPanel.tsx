import { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, Ref } from "react";
import { Divider, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { MermaidBlock } from "../MermaidBlock";
import { BadgedDiagram } from "./BadgedDiagram";
import { hasSketch } from "../../designDoc/parse";
import type { ParsedDecision, ParsedDesignDoc } from "../../designDoc/parse";
import { citationComponents } from "./citationLinks";
import type { CitationHandlers } from "./citationLinks";

export type DocWarning = { line: number; itemId?: string; message: string };
export type DocEditorHandle = {
  insertAtCaret: (text: string) => void;
  goToLine: (line: number) => void;
  /** Switches to the preview and scrolls to an item (R1, D2...) or a decision's sketch. */
  showItem: (id: string, target?: "item" | "sketch") => void;
};

type DocEditorPanelProps = {
  markdown: string;
  parsed: ParsedDesignDoc;
  onChange: (next: string) => void;
  citation: CitationHandlers;
  readOnly?: boolean;
  title?: string;
  /** Live format checks, shown inline (§5.3). */
  warnings?: DocWarning[];
  /** Per-decision messages about its sketch: Mermaid errors and consistency checks (§5.4). */
  sketchIssues?: Record<string, string[]>;
  highlightedDecision?: string | null;
  /** The final diagram (the doc's last Mermaid block), drawn at the end of the preview. */
  finalCode?: string;
  /** Messages about the final diagram: Mermaid errors and unexplained boxes or connections. */
  finalIssues?: string[];
  unjustifiedNodes?: string[];
  onDecisionBadge?: (decisionId: string) => void;
  ref?: Ref<DocEditorHandle>;
};

/** Selects a whole line in the textarea and scrolls it into view. */
function selectLine(el: HTMLTextAreaElement, markdown: string, line: number) {
  const lines = markdown.split("\n");
  const offset = lines.slice(0, line - 1).reduce((sum, text) => sum + text.length + 1, 0);
  el.focus();
  el.setSelectionRange(offset, offset + (lines[line - 1]?.length ?? 0));
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
  el.scrollTop = Math.max(0, (line - 4) * lineHeight);
}

function ItemWarnings({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <ul className="simple-inline-warnings">
      {messages.map((message, index) => (
        <li key={index}>⚠ {message}</li>
      ))}
    </ul>
  );
}

export function DocEditorPanel({
  markdown,
  parsed,
  onChange,
  citation,
  readOnly = false,
  title = "Design doc",
  warnings = [],
  sketchIssues = {},
  highlightedDecision,
  finalCode = "",
  finalIssues = [],
  unjustifiedNodes = [],
  onDecisionBadge,
  ref,
}: DocEditorPanelProps) {
  const [mode, setMode] = useState<"editor" | "preview">(readOnly ? "preview" : "editor");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLPreElement | null>(null);
  const caretRef = useRef(0);

  const withEditor = useCallback((action: (editor: HTMLTextAreaElement) => void) => {
    setMode("editor");
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (editor) action(editor);
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      insertAtCaret: (text: string) => {
        const editor = editorRef.current;
        const start = Math.min(editor ? editor.selectionStart : caretRef.current, markdown.length);
        const end = Math.min(editor ? editor.selectionEnd : start, markdown.length);
        const caret = start + text.length;
        onChange(markdown.slice(0, start) + text + markdown.slice(end));
        caretRef.current = caret;
        withEditor((el) => {
          el.focus();
          el.setSelectionRange(caret, caret);
        });
      },
      goToLine: (line: number) => withEditor((el) => selectLine(el, markdown, line)),
      showItem: (id: string, target: "item" | "sketch" = "item") => {
        setMode("preview");
        requestAnimationFrame(() =>
          document
            .getElementById(target === "sketch" ? `sketch-${id}` : `doc-${id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        );
      },
    }),
    [markdown, onChange, withEditor],
  );

  const components = useMemo(
    () =>
      citationComponents({
        ...citation,
        onItem: (id) => {
          citation.onItem?.(id);
          document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
      }),
    [citation],
  );

  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(1, markdown.split("\n").length) }, (_, i) => i + 1).join("\n"),
    [markdown],
  );

  const warningsFor = (id: string, line: number) =>
    warnings.filter((warning) => warning.itemId === id && warning.line === line).map((warning) => warning.message);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart, selectionEnd } = el;
    onChange(markdown.slice(0, selectionStart) + "  " + markdown.slice(selectionEnd));
    requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
  };

  const renderSketch = (decision: ParsedDecision) => {
    const issues = sketchIssues[decision.id] ?? [];
    const drawable = hasSketch(decision) && !decision.sketch?.parseError;
    return (
      <div className="simple-sketch" id={`sketch-${decision.id}`}>
        {drawable ? (
          <MermaidBlock chart={decision.sketchCode ?? ""} />
        ) : (
          <div className="simple-sketch-empty">
            {decision.sketch?.parseError ?? "No sketch yet."}
          </div>
        )}
        <ItemWarnings messages={issues} />
      </div>
    );
  };

  const isEmpty =
    parsed.requirements.length + parsed.assumptions.length + parsed.decisions.length === 0;

  return (
    <div className="simple-doc">
      <header className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {!readOnly && (
          <ToggleButtonGroup
            size="small"
            exclusive
            color="primary"
            value={mode}
            onChange={(_event, value) => {
              if (value) setMode(value);
            }}
          >
            <ToggleButton value="editor">Editor</ToggleButton>
            <ToggleButton value="preview">Preview</ToggleButton>
          </ToggleButtonGroup>
        )}
      </header>
      <Divider />
      <div className="panel-body simple-doc-body">
        {mode === "editor" ? (
          <>
            <div className="editor-shell simple-editor-shell">
              <pre ref={lineNumbersRef} className="line-numbers" aria-hidden="true">
                {lineNumbers}
              </pre>
              <textarea
                ref={editorRef}
                className="editor"
                value={markdown}
                onChange={(event) => {
                  caretRef.current = event.target.selectionStart;
                  onChange(event.target.value);
                }}
                onSelect={(event) => {
                  caretRef.current = event.currentTarget.selectionStart;
                }}
                onKeyDown={handleKeyDown}
                onScroll={(event) => {
                  if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                }}
                spellCheck={false}
              />
            </div>
            <div className="simple-warning-strip" aria-live="polite">
              {warnings.length === 0 ? (
                <span className="simple-warning-ok">✓ No format problems</span>
              ) : (
                warnings.map((warning, index) => (
                  <button
                    key={`${warning.line}-${index}`}
                    type="button"
                    className="simple-warning"
                    onClick={() => {
                      if (editorRef.current) selectLine(editorRef.current, markdown, warning.line);
                    }}
                  >
                    <span className="simple-warning-line">Ln {warning.line}</span> {warning.message}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="preview markdown-body scrollable simple-preview">
            {isEmpty && (
              <Typography variant="body2" color="text.secondary">
                Nothing to preview yet. Add items like <code>- **R1** …</code> under the three headings.
              </Typography>
            )}
            {parsed.requirements.length > 0 && <h3>Requirements</h3>}
            <ul className="simple-doc-list">
              {parsed.requirements.map((item) => (
                <li key={`${item.id}-${item.line}`} id={`doc-${item.id}`}>
                  <span className="simple-id-chip">{item.id}</span>{" "}
                  <ReactMarkdown components={components}>{item.text || "*(empty)*"}</ReactMarkdown>
                  <ItemWarnings messages={warningsFor(item.id, item.line)} />
                </li>
              ))}
            </ul>
            {parsed.assumptions.length > 0 && <h3>Assumptions</h3>}
            <ul className="simple-doc-list">
              {parsed.assumptions.map((item) => (
                <li key={`${item.id}-${item.line}`} id={`doc-${item.id}`}>
                  <span className="simple-id-chip simple-id-chip-assumption">{item.id}</span>{" "}
                  <ReactMarkdown components={components}>{item.text || "*(empty)*"}</ReactMarkdown>
                  <ItemWarnings messages={warningsFor(item.id, item.line)} />
                </li>
              ))}
            </ul>
            {parsed.decisions.length > 0 && <h3>Decisions</h3>}
            <ul className="simple-doc-list">
              {parsed.decisions.map((item) => (
                <li
                  key={`${item.id}-${item.line}`}
                  id={`doc-${item.id}`}
                  className={highlightedDecision === item.id ? "simple-decision-highlight" : undefined}
                >
                  <span className="simple-id-chip simple-id-chip-decision">{item.id}</span>{" "}
                  <ReactMarkdown components={components}>{item.text || "*(empty)*"}</ReactMarkdown>
                  <ItemWarnings messages={warningsFor(item.id, item.line)} />
                  {renderSketch(item)}
                </li>
              ))}
            </ul>
            <h3>Final diagram</h3>
            <div className="simple-sketch simple-doc-final" id="doc-final">
              {parsed.final.parseError ? (
                <code className="simple-mermaid-error">{parsed.final.parseError}</code>
              ) : parsed.final.nodes.length === 0 ? (
                <div className="simple-sketch-empty">
                  No final diagram yet. Add boxes to the Mermaid block under “## Final diagram”, or use the final
                  diagram panel.
                </div>
              ) : (
                <BadgedDiagram
                  code={finalCode}
                  nodeDecisions={parsed.nodeDecisions}
                  unjustifiedNodes={unjustifiedNodes}
                  onBadgeClick={onDecisionBadge}
                />
              )}
              <ItemWarnings messages={finalIssues} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
