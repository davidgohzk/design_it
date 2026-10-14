// The design doc editor: CodeMirror 6 with Markdown highlighting, `#` reference completion, `/`
// templates, hover and Go to Definition on R# / A# / D#, the citation lens, and squiggles with quick
// fixes for the problems the workspace computes (WP5, WP6).
import { useEffect, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import { autocompletion, completionKeymap, snippet, snippetCompletion } from "@codemirror/autocomplete";
import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { setDiagnostics } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  hoverTooltip,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { itemIdAt } from "../../../designDoc/outline";
import type { ItemDefinition, ReferenceCompletion } from "../../../designDoc/outline";
import type { Problem, QuickFix } from "../../../designDoc/problems";
import { ITEM_TEMPLATE_LABELS, itemSnippet } from "../../../designDoc/template";
import type { ItemTemplate } from "../../../designDoc/template";

export type DocCodeEditorHandle = {
  insertAtCaret: (text: string) => void;
  goToLine: (line: number) => void;
  insertTemplate: (kind: ItemTemplate) => void;
  focus: () => void;
};

/** One edit a quick fix makes: replace [from, to) of the doc with `insert`, then put the cursor at `cursor`. */
export type QuickFixEdit = { from: number; to: number; insert: string; cursor: number; label: string };

type DocCodeEditorProps = {
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  problems?: Problem[];
  /** Lens text shown above lines (1-based line → text), e.g. "cited from Chat #4". */
  lenses?: Map<number, string>;
  definitions?: Map<string, ItemDefinition>;
  completions?: ReferenceCompletion[];
  /** The edit a problem's quick fix makes on the current doc. */
  quickFixEdit?: (doc: string, fix: QuickFix) => QuickFixEdit | null;
  onCommandPalette?: () => void;
  onToggleProblems?: () => void;
  ref?: Ref<DocCodeEditorHandle>;
};

// ---------------------------------------------------------------------------------------------
// Citation lens: a small line of text above each R#, like VS Code's CodeLens.

class LensWidget extends WidgetType {
  readonly text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }
  eq(other: LensWidget) {
    return other.text === this.text;
  }
  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-lens";
    element.textContent = this.text;
    element.setAttribute("aria-hidden", "true");
    return element;
  }
}

const setLenses = StateEffect.define<Map<number, string>>();

const lensField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setLenses)) continue;
      const ranges = [...effect.value]
        .filter(([line, text]) => text && line >= 1 && line <= transaction.state.doc.lines)
        .sort(([a], [b]) => a - b)
        .map(([line, text]) =>
          Decoration.widget({ widget: new LensWidget(text), side: -1, block: true }).range(transaction.state.doc.line(line).from),
        );
      next = Decoration.set(ranges);
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

// ---------------------------------------------------------------------------------------------

const highlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "700", color: "var(--cm-heading, #1d4ed8)" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.link, color: "var(--cm-link, #0f766e)" },
  { tag: tags.url, color: "var(--cm-muted, #64748b)" },
  { tag: tags.monospace, color: "var(--cm-code, #9333ea)" },
  { tag: tags.list, color: "var(--cm-muted, #64748b)" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "0.86rem", backgroundColor: "var(--editor-bg, transparent)", color: "inherit" },
  ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: "1.55" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--cm-muted, #94a3b8)" },
  ".cm-activeLine": { backgroundColor: "var(--cm-active-line, rgba(37, 99, 235, 0.06))" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "inherit" },
  ".cm-lens": { fontSize: "0.72rem", color: "var(--cm-muted, #64748b)", padding: "2px 0 0 2px", fontFamily: "system-ui, sans-serif" },
  ".cm-tooltip.cm-ref-tooltip": { padding: "6px 9px", maxWidth: "420px", fontFamily: "system-ui, sans-serif", fontSize: "0.8rem" },
  ".cm-ref-tooltip .cm-ref-quote": { color: "var(--cm-muted, #64748b)", fontStyle: "italic", marginTop: "4px" },
});

const lineRange = (state: EditorState, line: number) => {
  const target = state.doc.line(Math.min(Math.max(1, line), state.doc.lines));
  return { from: target.from, to: target.to };
};

export function DocCodeEditor({
  value,
  onChange,
  readOnly = false,
  problems = [],
  lenses = new Map(),
  definitions = new Map(),
  completions = [],
  quickFixEdit,
  onCommandPalette,
  onToggleProblems,
  ref,
}: DocCodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // The view is built once; these refs give its extensions the latest props.
  const latest = useRef({ onChange, definitions, completions, quickFixEdit, onCommandPalette, onToggleProblems });
  latest.current = { onChange, definitions, completions, quickFixEdit, onCommandPalette, onToggleProblems };

  useEffect(() => {
    if (!hostRef.current) return;

    const goToLine = (view: EditorView, line: number) => {
      const { from, to } = lineRange(view.state, line);
      view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
      view.focus();
    };

    const referenceSource = (context: CompletionContext): CompletionResult | null => {
      const word = context.matchBefore(/#[A-Za-z]?\d*/);
      if (!word || (word.from === word.to && !context.explicit)) return null;
      return {
        from: word.from,
        options: latest.current.completions.map(
          (item): Completion => ({ label: `#${item.label}`, detail: item.detail, apply: item.insert, type: "variable" }),
        ),
        validFor: /^#[A-Za-z]?\d*$/,
      };
    };

    const templateSource = (context: CompletionContext): CompletionResult | null => {
      const line = context.state.doc.lineAt(context.pos);
      const before = line.text.slice(0, context.pos - line.from);
      if (!/^\s*\/\w*$/.test(before)) return null;
      const slash = line.from + before.indexOf("/");
      const doc = context.state.doc.toString();
      return {
        from: slash,
        options: (Object.keys(ITEM_TEMPLATE_LABELS) as ItemTemplate[]).map((kind) =>
          snippetCompletion(itemSnippet(kind, doc), { label: `/${kind}`, detail: ITEM_TEMPLATE_LABELS[kind], type: "keyword" }),
        ),
        validFor: /^\/\w*$/,
      };
    };

    const refTooltip = hoverTooltip((view, pos) => {
      const line = view.state.doc.lineAt(pos);
      const id = itemIdAt(line.text, pos - line.from);
      const definition = id ? latest.current.definitions.get(id) : undefined;
      if (!definition) return null;
      return {
        pos,
        above: true,
        create: () => {
          const dom = document.createElement("div");
          dom.className = "cm-ref-tooltip";
          const text = document.createElement("div");
          text.textContent = `${definition.id}: ${definition.text}`;
          dom.append(text);
          for (const quote of definition.quotes) {
            const quoteLine = document.createElement("div");
            quoteLine.className = "cm-ref-quote";
            quoteLine.textContent = `“${quote}”`;
            dom.append(quoteLine);
          }
          const hint = document.createElement("div");
          hint.className = "cm-ref-quote";
          hint.textContent = "Ctrl/Cmd + click to go to it";
          dom.append(hint);
          return { dom };
        },
      };
    });

    /** Ctrl/Cmd + . : apply the quick fix of the first fixable problem on the cursor's line. */
    const quickFix = (view: EditorView) => {
      const line = view.state.doc.lineAt(view.state.selection.main.head).number;
      const fixable = problemsRef.current.find((problem) => problem.fix && problem.fix.line === line)
        ?? problemsRef.current.find((problem) => problem.fix && problem.line === line);
      const edit = fixable?.fix && latest.current.quickFixEdit?.(view.state.doc.toString(), fixable.fix);
      if (!edit) return false;
      view.dispatch({ changes: { from: edit.from, to: edit.to, insert: edit.insert }, selection: { anchor: edit.cursor } });
      return true;
    };

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      markdown(),
      syntaxHighlighting(highlight),
      EditorView.lineWrapping,
      theme,
      lensField,
      refTooltip,
      autocompletion({ override: [referenceSource, templateSource], activateOnTyping: true }),
      keymap.of([
        { key: "Mod-Shift-p", run: () => (latest.current.onCommandPalette?.(), true), preventDefault: true },
        { key: "Mod-Shift-m", run: () => (latest.current.onToggleProblems?.(), true), preventDefault: true },
        { key: "Mod-.", run: quickFix, preventDefault: true },
        ...completionKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      EditorView.domEventHandlers({
        mousedown(event, view) {
          if (!(event.ctrlKey || event.metaKey)) return false;
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos === null) return false;
          const line = view.state.doc.lineAt(pos);
          const id = itemIdAt(line.text, pos - line.from);
          const definition = id ? latest.current.definitions.get(id) : undefined;
          if (!definition) return false;
          event.preventDefault();
          goToLine(view, definition.line);
          return true;
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) latest.current.onChange(update.state.doc.toString());
      }),
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      EditorView.contentAttributes.of({ "aria-label": "Design doc editor", spellcheck: "false" }),
    ];

    const view = new EditorView({ state: EditorState.create({ doc: value, extensions }), parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The view is created once per mount; `value` changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // Keep the editor in step when the doc changes from outside (Cite, examples, start over).
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  // Squiggles: one diagnostic per problem, on its line.
  const problemsRef = useRef(problems);
  problemsRef.current = problems;
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const diagnostics: Diagnostic[] = problems
      .filter((problem) => problem.line >= 1 && problem.line <= view.state.doc.lines)
      .map((problem) => {
        const { from, to } = lineRange(view.state, problem.line);
        const fix = problem.fix;
        return {
          from,
          to: Math.max(to, from),
          severity: problem.severity,
          message: problem.message,
          source: problem.source === "doc" ? "Doc" : "Diagram",
          actions: fix
            ? [
                {
                  name: "Quick fix",
                  apply: (target: EditorView) => {
                    const edit = latest.current.quickFixEdit?.(target.state.doc.toString(), fix);
                    if (edit) {
                      target.dispatch({ changes: { from: edit.from, to: edit.to, insert: edit.insert }, selection: { anchor: edit.cursor } });
                    }
                  },
                },
              ]
            : undefined,
        };
      });
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [problems, value]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setLenses.of(lenses) });
  }, [lenses, value]);

  useImperativeHandle(
    ref,
    () => ({
      insertAtCaret: (text: string) => {
        const view = viewRef.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, scrollIntoView: true });
        view.focus();
      },
      goToLine: (line: number) => {
        const view = viewRef.current;
        if (!view) return;
        const { from, to } = lineRange(view.state, line);
        view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
        view.focus();
      },
      insertTemplate: (kind: ItemTemplate) => {
        const view = viewRef.current;
        if (!view) return;
        const line = view.state.doc.lineAt(view.state.selection.main.head);
        // On an empty line, insert there; otherwise on a new line after the current one.
        const at = line.text.trim() ? line.to : line.from;
        const prefix = line.text.trim() ? "\n" : "";
        if (prefix) view.dispatch({ changes: { from: at, insert: prefix } });
        const start = at + prefix.length;
        snippet(itemSnippet(kind, view.state.doc.toString()))(view, null, start, line.text.trim() ? start : line.to);
        view.focus();
      },
      focus: () => viewRef.current?.focus(),
    }),
    [],
  );

  return <div ref={hostRef} className="doc-code-editor" />;
}
