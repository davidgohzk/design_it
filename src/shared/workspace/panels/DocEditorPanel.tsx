import { useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { Button, Divider, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { citationLenses, docOutline, itemDefinitions, referenceCompletions } from "../../../designDoc/outline";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import type { Problem, QuickFix } from "../../../designDoc/problems";
import { SEVERITY_ICON } from "../../../designDoc/problems";
import type { ItemTemplate } from "../../../designDoc/template";
import { DocCodeEditor } from "../editor/DocCodeEditor";
import type { DocCodeEditorHandle, QuickFixEdit } from "../editor/DocCodeEditor";
import type { CitationHandlers } from "./citationLinks";
import { DocPreview } from "./DocPreview";
import type { DocWarning } from "./DocPreview";

export type { DocWarning } from "./DocPreview";
export type DocEditorHandle = {
  insertAtCaret: (text: string) => void;
  goToLine: (line: number) => void;
  insertTemplate: (kind: ItemTemplate) => void;
};

type ViewMode = "write" | "preview" | "split";

type DocEditorPanelProps = {
  markdown: string;
  parsed: ParsedDesignDoc;
  onChange: (next: string) => void;
  citation: CitationHandlers;
  readOnly?: boolean;
  title?: string;
  /** Every problem with the doc and the diagram, for squiggles and the Outline (WP6). */
  problems?: Problem[];
  /** Live format checks, shown inline in the preview. */
  warnings?: DocWarning[];
  /** Per-decision messages about its sketch: Mermaid errors and consistency checks. */
  sketchIssues?: Record<string, string[]>;
  /** The final diagram (the doc's last Mermaid block), drawn at the end of the preview. */
  finalCode?: string;
  /** Messages about the final diagram: Mermaid errors and unexplained boxes or connections. */
  finalIssues?: string[];
  /** Practice mode shows "used by D1, D2" in the citation lens; scored modes must not. */
  showUsedBy?: boolean;
  quickFixEdit?: (doc: string, fix: QuickFix) => QuickFixEdit | null;
  onCommandPalette?: () => void;
  onToggleProblems?: () => void;
  /** Shown under the editor, e.g. the Problems panel. */
  footer?: React.ReactNode;
  ref?: Ref<DocEditorHandle>;
};

export function DocEditorPanel({
  markdown,
  parsed,
  onChange,
  citation,
  readOnly = false,
  title = "Design doc",
  problems = [],
  warnings = [],
  sketchIssues = {},
  finalCode = "",
  finalIssues = [],
  showUsedBy = false,
  quickFixEdit,
  onCommandPalette,
  onToggleProblems,
  footer,
  ref,
}: DocEditorPanelProps) {
  const [view, setView] = useState<ViewMode>(readOnly ? "preview" : "write");
  const [outlineOpen, setOutlineOpen] = useState(false);
  const editorRef = useRef<DocCodeEditorHandle | null>(null);
  const pending = useRef<((editor: DocCodeEditorHandle) => void) | null>(null);

  const definitions = useMemo(() => itemDefinitions(parsed), [parsed]);
  const completions = useMemo(() => referenceCompletions(parsed), [parsed]);
  const lenses = useMemo(() => citationLenses(parsed, { showUsedBy }), [parsed, showUsedBy]);
  const outline = useMemo(() => docOutline(parsed, problems), [parsed, problems]);

  /** Runs an editor action, switching to the editor first if only the preview is showing. */
  const withEditor = (action: (editor: DocCodeEditorHandle) => void) => {
    if (view === "preview" && !readOnly) {
      pending.current = action;
      setView("write");
      requestAnimationFrame(() => {
        if (editorRef.current && pending.current) pending.current(editorRef.current);
        pending.current = null;
      });
      return;
    }
    if (editorRef.current) action(editorRef.current);
  };

  useImperativeHandle(ref, () => ({
    insertAtCaret: (text: string) => withEditor((editor) => editor.insertAtCaret(text)),
    goToLine: (line: number) => withEditor((editor) => editor.goToLine(line)),
    insertTemplate: (kind: ItemTemplate) => withEditor((editor) => editor.insertTemplate(kind)),
  }));

  const showEditor = view !== "preview";
  const showPreview = view !== "write";

  return (
    <div className="simple-doc">
      <header className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <div className="doc-header-actions">
          <Button size="small" onClick={() => setOutlineOpen((open) => !open)} aria-pressed={outlineOpen}>
            {outlineOpen ? "Hide outline" : "Outline"}
          </Button>
          {!readOnly && (
            <ToggleButtonGroup
              size="small"
              exclusive
              color="primary"
              value={view}
              onChange={(_event, value: ViewMode | null) => {
                if (value) setView(value);
              }}
              aria-label="Write or preview"
            >
              <ToggleButton value="write">Write</ToggleButton>
              <ToggleButton value="preview">Preview</ToggleButton>
              <ToggleButton value="split">Split</ToggleButton>
            </ToggleButtonGroup>
          )}
        </div>
      </header>
      <Divider />
      <div className="panel-body simple-doc-body doc-layout">
        {outlineOpen && (
          <nav className="doc-outline scrollable" aria-label="Outline">
            {outline.length === 0 && <span className="doc-outline-empty">No items yet</span>}
            {outline.map((item) => (
              <button
                key={`${item.id}-${item.line}`}
                type="button"
                className={`doc-outline-item doc-outline-${item.kind}`}
                onClick={() => withEditor((editor) => editor.goToLine(item.line))}
                title={item.problemCount ? `${item.problemCount} problem(s)` : "No problems"}
              >
                <span className="simple-id-chip">{item.id}</span>
                <span className="doc-outline-title">{item.title}</span>
                <span className={`doc-outline-status ${item.worst ?? "ok"}`} aria-label={item.worst ?? "no problems"}>
                  {item.worst ? SEVERITY_ICON[item.worst] : "✓"}
                </span>
              </button>
            ))}
          </nav>
        )}
        <div className={`doc-panes ${view}`}>
          {showEditor && (
            <div className="doc-editor-pane">
              <DocCodeEditor
                ref={editorRef}
                value={markdown}
                onChange={onChange}
                readOnly={readOnly}
                problems={problems}
                lenses={lenses}
                definitions={definitions}
                completions={completions}
                quickFixEdit={quickFixEdit}
                onCommandPalette={onCommandPalette}
                onToggleProblems={onToggleProblems}
              />
            </div>
          )}
          {showPreview && (
            <div className="doc-preview-pane scrollable">
              <DocPreview
                parsed={parsed}
                finalCode={finalCode}
                citation={citation}
                warnings={warnings}
                sketchIssues={sketchIssues}
                finalIssues={finalIssues}
                emptyFinalHint="No final diagram yet. Add boxes to the Mermaid block under “## Final diagram”, or copy a diagram from the diagram helper."
              />
            </div>
          )}
        </div>
      </div>
      {footer}
    </div>
  );
}
