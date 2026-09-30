import { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, Ref } from "react";
import { Divider, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import type { CitationHandlers } from "./citationLinks";
import { DocPreview } from "./DocPreview";
import type { DocWarning } from "./DocPreview";

export type { DocWarning } from "./DocPreview";
export type DocEditorHandle = {
  insertAtCaret: (text: string) => void;
  goToLine: (line: number) => void;
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
  /** The final diagram (the doc's last Mermaid block), drawn at the end of the preview. */
  finalCode?: string;
  /** Messages about the final diagram: Mermaid errors and unexplained boxes or connections. */
  finalIssues?: string[];
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

export function DocEditorPanel({
  markdown,
  parsed,
  onChange,
  citation,
  readOnly = false,
  title = "Design doc",
  warnings = [],
  sketchIssues = {},
  finalCode = "",
  finalIssues = [],
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
    }),
    [markdown, onChange, withEditor],
  );

  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(1, markdown.split("\n").length) }, (_, i) => i + 1).join("\n"),
    [markdown],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart, selectionEnd } = el;
    onChange(markdown.slice(0, selectionStart) + "  " + markdown.slice(selectionEnd));
    requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
  };

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
          <DocPreview
            parsed={parsed}
            finalCode={finalCode}
            citation={citation}
            warnings={warnings}
            sketchIssues={sketchIssues}
            finalIssues={finalIssues}
            emptyFinalHint="No final diagram yet. Add boxes to the Mermaid block under “## Final diagram”, or copy a diagram from the Description panel."
          />
        )}
      </div>
    </div>
  );
}
