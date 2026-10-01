import { useCallback, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import type { CaseDefinition } from "../../../cases";
import { runAssessment } from "../../../assessment/run";
import type { AssessmentProgress } from "../../../assessment/run";
import type { AssessmentResult } from "../../../assessment/types";
import { parseDesignDoc } from "../../../designDoc/parse";
import type { ChatMessage } from "../../lib/types";
import type { AssessmentStatus } from "../report/AssessmentReport";
import type { ReportSnapshot } from "../report/reportTypes";

const fingerprint = (value: unknown) => {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

type AssessmentSeed = { messages: ChatMessage[]; docMarkdown: string; finalCode: string; review: AssessmentResult };

const snapshotKey = (
  caseDefinition: CaseDefinition,
  { messages, docMarkdown, finalCode }: { messages: ChatMessage[]; docMarkdown: string; finalCode: string },
) => fingerprint({ caseId: caseDefinition.id, messages, docMarkdown, finalCode });

/**
 * Runs the review on a snapshot of the work; an unchanged snapshot reuses the last result.
 * With a seed, reviewing the untouched prepopulated work shows the seeded review without an AI call.
 */
export function useAssessment({
  caseDefinition,
  seed,
}: {
  caseDefinition: CaseDefinition;
  seed?: AssessmentSeed;
}) {
  const [status, setStatus] = useState<AssessmentStatus>("idle");
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const [seedEntry] = useState(() => (seed ? { key: snapshotKey(caseDefinition, seed), result: seed.review } : null));
  const lastRef = useRef<{ key: string; result: AssessmentResult } | null>(seedEntry);
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
      const key = snapshotKey(caseDefinition, { messages, docMarkdown, finalCode });
      setError(null);
      // The snapshot only changes together with its result, so a failed re-run never pairs
      // the new doc with the old review.
      if (!force && lastRef.current?.key === key) {
        setSnapshot(next);
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
          { onProgress: (update) => requestRef.current === requestId && setProgress(update) },
        );
        if (requestRef.current !== requestId) return null;
        lastRef.current = { key, result: assessed };
        setSnapshot(next);
        setResult(assessed);
        setHistory((previous) => [...previous, assessed]);
        setStatus("success");
        return assessed;
      } catch (err) {
        if (requestRef.current !== requestId) return null;
        setError(
          err instanceof ApiError && err.status === 404
            ? "The server doesn't have the review endpoint (/api/assess). Deploy the updated backend, or point VITE_API_BASE_URL at one that has it."
            : err instanceof Error
              ? err.message
              : "The review failed.",
        );
        setStatus("error");
        return null;
      }
    },
    [caseDefinition],
  );

  return { status, progress, error, result, snapshot, history, run };
}
