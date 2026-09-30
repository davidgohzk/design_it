import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResponseMeta } from "../../api";
import type { CaseDefinition } from "../../cases";
import { buildFinalFromSketches, checkConsistency, usableSketches } from "../../designDoc/consistency";
import { setDecisionSketch } from "../../designDoc/edit";
import { lintDesignDoc } from "../../designDoc/lint";
import { hasSketch, parseDesignDoc } from "../../designDoc/parse";
import { useMermaidErrors } from "../../designDoc/validate";
import type { ChatMessage } from "../../types";
import type { DocWarning, SketchStatus } from "./DocEditorPanel";
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

/** Node ids and labels already used in other sketches, sent as context for a new sketch. */
function sketchContext(decisions: ReturnType<typeof parseDesignDoc>["decisions"], exceptId: string) {
  const seen = new Map<string, string>();
  for (const decision of usableSketches(decisions)) {
    if (decision.id === exceptId) continue;
    for (const node of decision.sketch!.nodes) if (!seen.has(node.id)) seen.set(node.id, node.label);
  }
  return [...seen].map(([id, label]) => `${id}: "${label}"`).join("\n");
}

export function useDesignWorkspace({
  caseDefinition,
  messages,
  apiKey,
  initialDoc,
  initialFinal = "",
  onDocChange,
  onEvent,
}: {
  caseDefinition: CaseDefinition;
  messages: ChatMessage[];
  apiKey: string;
  initialDoc: string;
  /** A prepopulated final diagram, recorded as the first history turn. */
  initialFinal?: string;
  /** Every edit to the doc, for the timeline. */
  onDocChange?: (before: string, after: string) => void;
  /** Sketch / final-diagram actions, for the timeline. */
  onEvent?: (summary: string, detail: string) => void;
}) {
  const brief = caseDefinition.briefMarkdown;
  const [docMarkdown, setDocMarkdown] = useState(initialDoc);
  const [finalCode, setFinalCode] = useState(initialFinal);
  const [finalHistory, setFinalHistory] = useState<FinalTurn[]>(() =>
    initialFinal ? [{ source: "seed", code: initialFinal, at: Date.now() }] : [],
  );
  const [aiEvents, setAiEvents] = useState<AIEvent[]>([]);
  const [sketchStatus, setSketchStatus] = useState<Record<string, SketchStatus>>({});
  const [finalAI, setFinalAI] = useState<{ generating: boolean; streaming: string; error: string | null }>({
    generating: false,
    streaming: "",
    error: null,
  });
  const docRef = useRef(docMarkdown);
  const finalRef = useRef(finalCode);
  useEffect(() => {
    docRef.current = docMarkdown;
    finalRef.current = finalCode;
  }, [docMarkdown, finalCode]);

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

  const commitFinal = useCallback((code: string, source: FinalTurn["source"], prompt?: string) => {
    finalRef.current = code;
    committedFinalRef.current = code;
    setFinalCode(code);
    setFinalHistory((history) => [...history, { source, prompt, code, at: Date.now() }]);
  }, []);

  /** A manual edit becomes one history turn when it ends, not one per keystroke. */
  const commitManualFinal = useCallback(() => {
    const code = finalRef.current;
    if (code === committedFinalRef.current) return;
    committedFinalRef.current = code;
    setFinalHistory((history) => [...history, { source: "manual", code, at: Date.now() }]);
    onEvent?.("Final diagram edited by hand", code);
  }, [onEvent]);

  // Parsed on every keystroke for the preview; the checks run on a debounced copy.
  const parsed = useMemo(
    () => parseDesignDoc(docMarkdown, finalCode, brief, messages),
    [brief, docMarkdown, finalCode, messages],
  );
  const checkedDoc = useDebouncedValue(docMarkdown, CHECK_DELAY_MS);
  const checkedFinal = useDebouncedValue(finalCode, CHECK_DELAY_MS);
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
    return list.sort((a, b) => a.line - b.line);
  }, [checked, lint, mermaidErrors]);

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

  const logAI = useCallback((event: AIEvent) => setAiEvents((events) => [...events, event]), []);

  const sketchWithAI = useCallback(
    async (decisionId: string) => {
      const current = parseDesignDoc(docRef.current, "", brief, []);
      const decision = current.decisions.find((item) => item.id === decisionId);
      if (!decision) return;
      const prompt = `${decision.id}: ${decision.text}`;
      setSketchStatus((status) => ({ ...status, [decisionId]: { generating: true } }));
      onEvent?.(`Sketch ${decisionId} with AI`, prompt);
      try {
        const { code, meta } = await generateDiagram({
          caseId: caseDefinition.id,
          mode: "sketch",
          prompt,
          currentCode: hasSketch(decision) ? decision.sketchCode : null,
          context: sketchContext(current.decisions, decisionId),
          apiKey,
        });
        // The doc may have changed while the AI was drawing, so find the decision again.
        const latest = parseDesignDoc(docRef.current, "", brief, []).decisions.find((item) => item.id === decisionId);
        if (latest) updateDoc(setDecisionSketch(docRef.current, latest, code));
        logAI({ kind: "sketch", target: decisionId, prompt, at: Date.now(), ok: true, ...meta });
        setSketchStatus((status) => ({ ...status, [decisionId]: { generating: false } }));
      } catch (error) {
        logAI({ kind: "sketch", target: decisionId, prompt, at: Date.now(), ok: false, error: errorText(error) });
        setSketchStatus((status) => ({ ...status, [decisionId]: { generating: false, error: errorText(error) } }));
      }
    },
    [apiKey, brief, caseDefinition.id, logAI, onEvent, updateDoc],
  );

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
          currentCode: finalRef.current || null,
          context: sketchContext(parseDesignDoc(docRef.current, "", brief, []).decisions, ""),
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
    [apiKey, brief, caseDefinition.id, commitFinal, commitManualFinal, logAI, onEvent],
  );

  const buildFromSketches = useCallback(() => {
    const merged = buildFinalFromSketches(parseDesignDoc(docRef.current, "", brief, []).decisions);
    if (finalRef.current.trim() && finalRef.current !== merged) {
      if (!window.confirm("Replace the final diagram with the merge of all your sketches?")) return;
    }
    commitManualFinal();
    commitFinal(merged, "merge");
    onEvent?.("Final diagram built from sketches", merged);
  }, [brief, commitFinal, commitManualFinal, onEvent]);

  return {
    docMarkdown,
    updateDoc,
    finalCode,
    setFinalCode: (code: string) => {
      finalRef.current = code;
      setFinalCode(code);
    },
    commitManualFinal,
    finalHistory,
    aiEvents,
    parsed,
    checked,
    lint,
    consistency,
    warnings,
    sketchIssues,
    finalMermaidError: mermaidErrors.final,
    sketchStatus,
    sketchWithAI,
    finalAI,
    generateFinal,
    buildFromSketches,
    canBuildFromSketches: usableSketches(parsed.decisions).length > 0,
  };
}
