import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResponseMeta } from "../../lib/api";
import type { CaseDefinition } from "../../../cases";
import { checkConsistency, usableSketches } from "../../../designDoc/consistency";
import { extractFinalDiagram } from "../../../designDoc/finalSection";
import { lintDesignDoc } from "../../../designDoc/lint";
import { buildProblems } from "../../../designDoc/problemList";
import { hasSketch, parseDesignDoc, parseMermaidFlowchart } from "../../../designDoc/parse";
import { useMermaidErrors } from "../../../designDoc/validate";
import type { ChatMessage } from "../../lib/types";
import type { DocWarning } from "../panels/DocEditorPanel";
import { generateDiagram } from "./diagramAI";

/** A version of the doc's final diagram. "seed" is the prepopulated example the page opened with. */
type FinalTurn = { source: "manual" | "seed"; code: string; at: number };
/**
 * One turn of the diagram helper (the right panel): a plain-English prompt and the Mermaid it produced.
 * The helper never edits the doc; the engineer copies what they want into a sketch or the final diagram.
 */
export type DiagramTurn = { prompt: string; code: string; at: number };
type AIEvent = {
  kind: "diagram";
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

/** Node ids and labels used in the sketches, sent so the diagram helper reuses them. */
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
  initialDoc,
  initialDocIsExample = false,
  initialDiagramTurns = [],
  onDocChange,
  onEvent,
}: {
  caseDefinition: CaseDefinition;
  messages: ChatMessage[];
  /** The doc, ending with its "## Final diagram" Mermaid block. */
  initialDoc: string;
  /** The page opened with the sample attempt; its final diagram is recorded as a "seed" turn. */
  initialDocIsExample?: boolean;
  /** The diagram helper's starting history (the example shows how its final diagram was made). */
  initialDiagramTurns?: DiagramTurn[];
  /** Every edit to the doc, for the timeline. */
  onDocChange?: (before: string, after: string) => void;
  /** Final-diagram edits and diagram-helper prompts, for the timeline. */
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
  const [diagramTurns, setDiagramTurns] = useState<DiagramTurn[]>(initialDiagramTurns);
  const diagramTurnsRef = useRef(diagramTurns);
  const [diagramAI, setDiagramAI] = useState<{ generating: boolean; streaming: string; error: string | null }>({
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

  /** An edit to the doc's final diagram becomes one history turn when it ends, not one per keystroke. */
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
  const lint = useMemo(() => lintDesignDoc(checked, checkedDoc), [checked, checkedDoc]);
  const consistency = useMemo(() => checkConsistency(checked), [checked]);

  const mermaidBlocks = useMemo(() => {
    const blocks: Record<string, string> = { final: checkedFinal };
    for (const decision of checked.decisions) {
      if (hasSketch(decision) && !decision.sketch?.parseError) blocks[`sketch:${decision.line}`] = decision.sketchCode!;
    }
    return blocks;
  }, [checked, checkedFinal]);
  const mermaidErrors = useMermaidErrors(mermaidBlocks);

  /** Every problem with the doc and the diagram: squiggles, the Outline and the Problems panel. */
  const problems = useMemo(
    () => buildProblems({ markdown: checkedDoc, doc: checked, lint, consistency, mermaidErrors }),
    [checked, checkedDoc, consistency, lint, mermaidErrors],
  );

  /** The preview shows each item's doc problems under it, so they sit on the item's own line. */
  const warnings = useMemo<DocWarning[]>(() => {
    const itemLines = new Map([...checked.requirements, ...checked.decisions].map((item) => [item.id, item.line]));
    return problems
      .filter((problem) => problem.source === "doc" && problem.itemId && itemLines.has(problem.itemId))
      .map((problem) => ({ line: itemLines.get(problem.itemId!)!, itemId: problem.itemId, message: problem.message }));
  }, [checked, problems]);

  const sketchIssues = useMemo(() => {
    const issues: Record<string, string[]> = {};
    const add = (id: string, message: string) => (issues[id] ??= []).push(message);
    for (const warning of lint) {
      if (warning.source === "diagram" && warning.itemId !== "final") add(warning.itemId, warning.message);
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
    for (const warning of lint) {
      if (warning.itemId === "final") messages.push(warning.message);
    }
    return messages;
  }, [checked, consistency, lint, mermaidErrors]);

  const logAI = useCallback((event: AIEvent) => setAiEvents((events) => [...events, event]), []);

  /** The diagram helper: turns a plain-English prompt into Mermaid, editing its own last diagram. */
  const askDiagramHelper = useCallback(
    async (prompt: string) => {
      const previous = diagramTurnsRef.current[diagramTurnsRef.current.length - 1];
      setDiagramAI({ generating: true, streaming: "", error: null });
      onEvent?.("Description sent", prompt);
      try {
        const { code, meta } = await generateDiagram({
          prompt,
          currentCode: previous?.code ?? null,
          context: sketchContext(parseDesignDoc(docRef.current, "", brief, []).decisions),
          onDelta: (text) => setDiagramAI((state) => ({ ...state, streaming: text })),
        });
        const turn = { prompt, code, at: Date.now() };
        diagramTurnsRef.current = [...diagramTurnsRef.current, turn];
        setDiagramTurns(diagramTurnsRef.current);
        logAI({ kind: "diagram", prompt, at: turn.at, ok: true, ...meta });
        setDiagramAI({ generating: false, streaming: "", error: null });
      } catch (error) {
        logAI({ kind: "diagram", prompt, at: Date.now(), ok: false, error: errorText(error) });
        setDiagramAI({ generating: false, streaming: "", error: errorText(error) });
      }
    },
    [brief, logAI, onEvent],
  );

  return {
    docMarkdown,
    updateDoc,
    finalCode,
    commitManualFinal,
    finalHistory,
    aiEvents,
    parsed,
    checked,
    lint,
    consistency,
    problems,
    warnings,
    sketchIssues,
    finalIssues,
    diagramTurns,
    diagramCode: diagramTurns[diagramTurns.length - 1]?.code ?? "",
    diagramAI,
    askDiagramHelper,
  };
}
