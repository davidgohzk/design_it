import { useCallback, useRef, useState } from "react";
import type { CaseDefinition } from "../../cases";
import { runAssessment } from "../../assessment/run";
import type { AssessmentProgress } from "../../assessment/run";
import type { AssessmentResult } from "../../assessment/types";
import { parseDesignDoc } from "../../designDoc/parse";
import type { ChatMessage } from "../../types";
import type { AssessmentStatus } from "../assessment/AssessmentReport";
import type { ReportSnapshot } from "../assessment/reportTypes";

const fingerprint = (value: unknown) => {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

/** Runs the review on a snapshot of the work; an unchanged snapshot reuses the last result. */
export function useAssessment({ caseDefinition, apiKey }: { caseDefinition: CaseDefinition; apiKey: string }) {
  const [status, setStatus] = useState<AssessmentStatus>("idle");
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const lastRef = useRef<{ key: string; result: AssessmentResult } | null>(null);
  const requestRef = useRef(0);

  const run = useCallback(
    async (
      { messages, docMarkdown, finalCode }: { messages: ChatMessage[]; docMarkdown: string; finalCode: string },
      { force = false }: { force?: boolean } = {},
    ) => {
      const next: ReportSnapshot = {
        messages,
        docMarkdown,
        finalCode,
        parsed: parseDesignDoc(docMarkdown, finalCode, caseDefinition.briefMarkdown, messages),
      };
      const key = fingerprint({ caseVersion: caseDefinition.version, messages, docMarkdown, finalCode });
      setSnapshot(next);
      setError(null);
      if (!force && lastRef.current?.key === key) {
        setResult(lastRef.current.result);
        setStatus("success");
        return lastRef.current.result;
      }
      const requestId = ++requestRef.current;
      setStatus("loading");
      setProgress(null);
      try {
        const assessed = await runAssessment(
          { caseDefinition, messages, docMarkdown, finalCode },
          { apiKey, onProgress: (update) => requestRef.current === requestId && setProgress(update) },
        );
        if (requestRef.current !== requestId) return null;
        lastRef.current = { key, result: assessed };
        setResult(assessed);
        setHistory((previous) => [...previous, assessed]);
        setStatus("success");
        return assessed;
      } catch (err) {
        if (requestRef.current !== requestId) return null;
        setError(err instanceof Error ? err.message : "The review failed.");
        setStatus("error");
        return null;
      }
    },
    [apiKey, caseDefinition],
  );

  return { status, progress, error, result, snapshot, history, run };
}
