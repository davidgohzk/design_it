import { useState } from "react";
import { readFeedback, saveFeedback } from "./reportData";
import type { FeedbackEntry } from "./reportData";

/** 👍 / 👎 "this is wrong" on one report row, stored locally as { caseId, item, verdict, timestamp }. */
export function FeedbackButtons({ caseId, item }: { caseId: string; item: string }) {
  const [verdict, setVerdict] = useState<FeedbackEntry["verdict"] | null>(() => {
    const entries = readFeedback().filter((entry) => entry.caseId === caseId && entry.item === item);
    return entries.length ? entries[entries.length - 1].verdict : null;
  });
  const choose = (next: FeedbackEntry["verdict"]) => {
    setVerdict(next);
    saveFeedback({ caseId, item, verdict: next, timestamp: Date.now() });
  };
  return (
    <span className="report-feedback">
      <button
        type="button"
        aria-pressed={verdict === "right"}
        className={verdict === "right" ? "is-chosen" : undefined}
        title="This looks right"
        onClick={() => choose("right")}
      >
        👍
      </button>
      <button
        type="button"
        aria-pressed={verdict === "wrong"}
        className={verdict === "wrong" ? "is-chosen" : undefined}
        title="This is wrong"
        onClick={() => choose("wrong")}
      >
        👎
      </button>
    </span>
  );
}
