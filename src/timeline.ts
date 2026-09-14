import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialTimeline } from "./content";
import type { TimelineEntry, TimelineEntryType } from "./types";
import { makePatch, patchStats } from "./utils";

const IDLE_FLUSH_MS = 3000;

type EditorSession = { before: string; after: string };

export function useTimeline() {
  const [entries, setEntries] = useState<TimelineEntry[]>(createInitialTimeline);
  const sessionRef = useRef<EditorSession | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);

  const push = useCallback(
    (
      type: TimelineEntryType,
      summary: string,
      detail: string,
      extra?: { target?: string; diff?: string },
    ) => {
      nextIdRef.current += 1;
      setEntries((prev) => [
        ...prev,
        { id: `entry-${nextIdRef.current}`, at: Date.now(), type, summary, detail, ...extra },
      ]);
    },
    [],
  );

  const flushEditor = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session || session.before === session.after) return;

    const diff = makePatch(session.before, session.after);
    push("editor", patchStats(diff), "", { diff });
  }, [push]);

  // Anything that is not typing ends the current editing session first, so the
  // editor entry lands before the action that interrupted it.
  const logEvent = useCallback(
    (type: TimelineEntryType, summary: string, detail: string, target?: string) => {
      flushEditor();
      push(type, summary, detail, target ? { target } : undefined);
    },
    [flushEditor, push],
  );

  const noteEditorChange = useCallback(
    (before: string, after: string) => {
      if (sessionRef.current) sessionRef.current.after = after;
      else sessionRef.current = { before, after };

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(flushEditor, IDLE_FLUSH_MS);
    },
    [flushEditor],
  );

  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  return { entries, logEvent, noteEditorChange, flushEditor };
}
