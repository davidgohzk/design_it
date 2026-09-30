import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResponseMeta } from "../../api";
import type { CaseDefinition } from "../../cases";
import { buildFinalFromSketches, checkConsistency, usableSketches } from "../../designDoc/consistency";
import { extractFinalDiagram, finalDiagramLine, setFinalDiagram } from "../../designDoc/finalSection";
import { lintDesignDoc } from "../../designDoc/lint";
import { hasSketch, parseDesignDoc, parseMermaidFlowchart } from "../../designDoc/parse";
import { useMermaidErrors } from "../../designDoc/validate";
import type { ChatMessage } from "../../types";
import type { DocWarning } from "./DocEditorPanel";
import { generateDiagram } from "./diagramAI";

/** "seed" is the prepopulated example the page opened with. */
export type FinalTurn = { source: "ai" | "merge" | "manual" | "seed"; prompt?: string; code: string; at: number };
export type AIEvent = {
  kind: "sketch" | "final";
  /** The decision id, for sketches. */
  target?: string;
  prompt: string;
  at: number;
  ok: boolean;
  error?: string;
} & ResponseMeta;

const CHECK_DELAY_MS = 300;
/** A pause this long after editing the final diagram records the edit as one history turn. */
const FINAL_COMMIT_DELAY_MS = 1500;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

/** Node ids and labels used in the sketches, sent so the AI reuses them in the final diagram. */
function sketchContext(decisions: ReturnType<typeof parseDesignDoc>["decisions"]) {
  const seen = new Map<string, string>();
  for (const decision of usableSketches(decisions)) {
    for (const node of decision.sketch!.nodes) if (!seen.has(node.id)) seen.set(node.id, node.label);
  }
  return [...seen].map(([id, label]) => `${id}: "${label}"`).join("\n");
}

export function useDesignWorkspace({
  caseDefinition,
  messages,
  apiKey,
  initialDoc,
  initialDocIsExample = false,
  onDocChange,
  onEvent,
}: {
  caseDefinition: CaseDefinition;
  messages: ChatMessage[];
  apiKey: string;
  /** The doc, ending with its "## Final diagram" Mermaid block. */
  initialDoc: string;
  /** The page opened with the worked example; its final diagram is recorded as a "seed" turn. */
  initialDocIsExample?: boolean;
  /** Every edit to the doc, for the timeline. */
  onDocChange?: (before: string, after: string) => void;
  /** Sketch / final-diagram actions, for the timeline. */
  onEvent?: (summary: string, detail: string) => void;
}) {
  const brief = caseDefinition.briefMarkdown;
  const [docMarkdown, setDocMarkdown] = useState(initialDoc);
  // The final diagram is the Mermaid block at the end of the doc; the doc is the only source of truth.
  const finalCode = useMemo(() => extractFinalDiagram(docMarkdown), [docMarkdown]);
  const [initialFinal] = useState(() => extractFinalDiagram(initialDoc));
  const [finalHistory, setFinalHistory] = useState<FinalTurn[]>(() =>
    initialDocIsExample && parseMermaidFlowchart(initialFinal).nodes.length > 0
      ? [{ source: "seed", code: initialFinal, at: Date.now() }]
      : [],
  );
  const [aiEvents, setAiEvents] = useState<AIEvent[]>([]);
  const [finalAI, setFinalAI] = useState<{ generating: boolean; streaming: string; error: string | null }>({
    generating: false,
    streaming: "",
    error: null,
  });
  const docRef = useRef(docMarkdown);
  useEffect(() => {
    docRef.current = docMarkdown;
  }, [docMarkdown]);
  const currentFinal = useCallback(() => extractFinalDiagram(docRef.current), []);

  const updateDoc = useCallback(
    (next: string) => {
      onDocChange?.(docRef.current, next);
      docRef.current = next;
      setDocMarkdown(next);
    },
    [onDocChange],
  );

  // The last committed final diagram, read synchronously so a commit never runs twice.
  const committedFinalRef = useRef(initialFinal);

  /** Writes the final diagram into the doc's final block. */
  const setFinalCode = useCallback(
    (code: string) => updateDoc(setFinalDiagram(docRef.current, code)),
    [updateDoc],
  );

  const commitFinal = useCallback(
    (code: string, source: FinalTurn["source"], prompt?: string) => {
      setFinalCode(code);
      committedFinalRef.current = extractFinalDiagram(docRef.current);
      setFinalHistory((history) => [...history, { source, prompt, code, at: Date.now() }]);
    },
    [setFinalCode],
  );

  /** A manual edit (in the panel or the doc) becomes one history turn when it ends, not one per keystroke. */
  const commitManualFinal = useCallback(() => {
    const code = currentFinal();
    if (code === committedFinalRef.current) return;
    committedFinalRef.current = code;
    setFinalHistory((history) => [...history, { source: "manual", code, at: Date.now() }]);
    onEvent?.("Final diagram edited by hand", code);
  }, [currentFinal, onEvent]);

  useEffect(() => {
    if (finalCode === committedFinalRef.current) return;
    const timer = setTimeout(commitManualFinal, FINAL_COMMIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [commitManualFinal, finalCode]);

  // Parsed on every keystroke for the preview; the checks run on a debounced copy.
  const parsed = useMemo(
    () => parseDesignDoc(docMarkdown, finalCode, brief, messages),
    [brief, docMarkdown, finalCode, messages],
  );
  const checkedDoc = useDebouncedValue(docMarkdown, CHECK_DELAY_MS);
  const checkedFinal = useMemo(() => extractFinalDiagram(checkedDoc), [checkedDoc]);
  const checked = useMemo(
    () => parseDesignDoc(checkedDoc, checkedFinal, brief, messages),
    [brief, checkedDoc, checkedFinal, messages],
  );
  const lint = useMemo(() => lintDesignDoc(checked), [checked]);
  const consistency = useMemo(() => checkConsistency(checked), [checked]);

  const mermaidBlocks = useMemo(() => {
    const blocks: Record<string, string> = { final: checkedFinal };
    for (const decision of checked.decisions) {
      if (hasSketch(decision) && !decision.sketch?.parseError) blocks[`sketch:${decision.line}`] = decision.sketchCode!;
    }
    return blocks;
  }, [checked, checkedFinal]);
  const mermaidErrors = useMermaidErrors(mermaidBlocks);

  const warnings = useMemo<DocWarning[]>(() => {
    const list: DocWarning[] = lint.map(({ line, itemId, message }) => ({ line, itemId, message }));
    for (const decision of checked.decisions) {
      const error = mermaidErrors[`sketch:${decision.line}`];
      if (error) {
        list.push({ line: decision.sketchLines?.start ?? decision.line, itemId: decision.id, message: `${decision.id}'s sketch: ${error}` });
      }
    }
    const finalError = checked.final.parseError ?? mermaidErrors.final;
    const finalLine = finalDiagramLine(checkedDoc);
    if (finalError && finalLine) list.push({ line: finalLine, itemId: "final", message: `Final diagram: ${finalError}` });
    return list.sort((a, b) => a.line - b.line);
  }, [checked, checkedDoc, lint, mermaidErrors]);

  const sketchIssues = useMemo(() => {
    const issues: Record<string, string[]> = {};
    const add = (id: string, message: string) => (issues[id] ??= []).push(message);
    for (const warning of lint) {
      if (warning.rule === "sketch-parse") add(warning.itemId, warning.message);
    }
    for (const decision of checked.decisions) {
      const error = mermaidErrors[`sketch:${decision.line}`];
      if (error) add(decision.id, `Mermaid: ${error}`);
    }
    for (const issue of consistency.issues) {
      if (issue.decisionId && issue.check !== "C3" && issue.check !== "C4") add(issue.decisionId, issue.message);
    }
    return issues;
  }, [checked, consistency, lint, mermaidErrors]);

  /** Messages about the final diagram itself, shown under it at the end of the doc. */
  const finalIssues = useMemo(() => {
    const messages: string[] = [];
    const error = checked.final.parseError ? null : mermaidErrors.final;
    if (error) messages.push(`Mermaid: ${error}`);
    for (const issue of consistency.issues) {
      if (issue.check === "C3" || issue.check === "C4") messages.push(issue.message);
    }
    return messages;
  }, [checked, consistency, mermaidErrors]);

  const logAI = useCallback((event: AIEvent) => setAiEvents((events) => [...events, event]), []);

  const generateFinal = useCallback(
    async (prompt: string) => {
      commitManualFinal();
      setFinalAI({ generating: true, streaming: "", error: null });
      onEvent?.("Final diagram with AI", prompt);
      try {
        const { code, meta } = await generateDiagram({
          caseId: caseDefinition.id,
          mode: "final",
          prompt,
          currentCode: parseMermaidFlowchart(currentFinal()).nodes.length ? currentFinal() : null,
          context: sketchContext(parseDesignDoc(docRef.current, "", brief, []).decisions),
          apiKey,
          onDelta: (text) => setFinalAI((state) => ({ ...state, streaming: text })),
        });
        commitFinal(code, "ai", prompt);
        logAI({ kind: "final", prompt, at: Date.now(), ok: true, ...meta });
        setFinalAI({ generating: false, streaming: "", error: null });
      } catch (error) {
        logAI({ kind: "final", prompt, at: Date.now(), ok: false, error: errorText(error) });
        setFinalAI({ generating: false, streaming: "", error: errorText(error) });
      }
    },
    [apiKey, brief, caseDefinition.id, commitFinal, commitManualFinal, currentFinal, logAI, onEvent],
  );

  const buildFromSketches = useCallback(() => {
    const merged = buildFinalFromSketches(parseDesignDoc(docRef.current, "", brief, []).decisions);
    const current = currentFinal();
    if (parseMermaidFlowchart(current).nodes.length > 0 && current !== merged) {
      if (!window.confirm("Replace the final diagram with the merge of all your sketches?")) return;
    }
    commitManualFinal();
    commitFinal(merged, "merge");
    onEvent?.("Final diagram built from sketches", merged);
  }, [brief, commitFinal, commitManualFinal, currentFinal, onEvent]);

  return {
    docMarkdown,
    updateDoc,
    finalCode,
    setFinalCode,
    commitManualFinal,
    finalHistory,
    aiEvents,
    parsed,
    checked,
    lint,
    consistency,
    warnings,
    sketchIssues,
    finalIssues,
    finalMermaidError: mermaidErrors.final,
    finalAI,
    generateFinal,
    buildFromSketches,
    canBuildFromSketches: usableSketches(parsed.decisions).length > 0,
  };
}
