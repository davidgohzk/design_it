import { useCallback, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import type { CaseDefinition } from "../../../cases";
import type { ScenarioAnswer } from "../../../assessment/fit";
import { runAssessment } from "../../../assessment/run";
import type { LevelProgress } from "../../../assessment/run";
import type { AssessmentResult, Level, SessionMode } from "../../../assessment/types";
import { parseDesignDoc } from "../../../designDoc/parse";
import type { ChatMessage, InterviewEnd } from "../../lib/types";
import type { AssessmentStatus, ReportSnapshot } from "../report/reportTypes";

const fingerprint = (value: unknown) => {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

export type WorkSnapshot = { messages: ChatMessage[]; docMarkdown: string; finalCode: string; answers: ScenarioAnswer[] };
type AssessmentSeed = WorkSnapshot & { review: AssessmentResult };

/** The parts of the work a review depends on (message times and guard logs don't change it). */
const snapshotKey = (caseDefinition: CaseDefinition, { messages, docMarkdown, finalCode, answers }: WorkSnapshot) =>
  fingerprint({ caseId: caseDefinition.id, messages: messages.map(({ role, content }) => ({ role, content })), docMarkdown, finalCode, answers });

/**
 * Runs the review on a snapshot of the work; an unchanged snapshot reuses the last result. With a seed,
 * reviewing the untouched prepopulated work (and its walkthrough answers) shows the seeded review
 * without an AI call.
 */
export function useAssessment({ caseDefinition, mode, seed }: { caseDefinition: CaseDefinition; mode: SessionMode; seed?: AssessmentSeed }) {
  const [status, setStatus] = useState<AssessmentStatus>("idle");
  const [progress, setProgress] = useState<Partial<Record<Level, LevelProgress>>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const [seedEntry] = useState(() => (seed ? { key: snapshotKey(caseDefinition, seed), result: { ...seed.review, mode } } : null));
  const lastRef = useRef<{ key: string; result: AssessmentResult } | null>(seedEntry);
  const requestRef = useRef(0);

  const run = useCallback(
    async (work: WorkSnapshot, interviewEnd: InterviewEnd | null, { force = false }: { force?: boolean } = {}) => {
      const next: ReportSnapshot = {
        messages: work.messages,
        docMarkdown: work.docMarkdown,
        finalCode: work.finalCode,
        parsed: parseDesignDoc(work.docMarkdown, work.finalCode, caseDefinition.briefMarkdown, work.messages),
      };
      const key = snapshotKey(caseDefinition, work);
      setError(null);
      if (!force && lastRef.current?.key === key) {
        setSnapshot(next);
        setResult(lastRef.current.result);
        setProgress({});
        setStatus("success");
        return lastRef.current.result;
      }
      const requestId = ++requestRef.current;
      setStatus("loading");
      setProgress({});
      try {
        const assessed = await runAssessment(
          { caseDefinition, mode, interviewEnd, ...work },
          { onProgress: (update) => requestRef.current === requestId && setProgress((previous) => ({ ...previous, [update.level]: update })) },
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
    [caseDefinition, mode],
  );

  return { status, progress, error, result, snapshot, history, run };
}
