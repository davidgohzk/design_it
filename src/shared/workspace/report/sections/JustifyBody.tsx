import { useState } from "react";
import { Button, Typography } from "@mui/material";
import type { JustifyItem } from "../../../../assessment/justify";
import type { AssessmentResult, SessionMode } from "../../../../assessment/types";
import type { ParsedDesignDoc } from "../../../../designDoc/parse";
import { FeedbackButtons } from "../FeedbackButtons";
import { MethodPill } from "../MethodPill";

type JustifyBodyProps = {
  result: AssessmentResult;
  caseId: string;
  doc: ParsedDesignDoc;
  mode: SessionMode;
  /** Research admin: show each judge run's verdict. */
  showRuns: boolean;
  /** Flashes the item in the doc on the left. */
  onItem?: (id: string) => void;
};

/** How each verdict reads, like a GitHub review: no comment, Comment, Request changes, Uncertain. */
const COMMENT: Record<JustifyItem["verdict"], { icon: string; title: string } | null> = {
  sound: null,
  weak: { icon: "💬", title: "Comment" },
  unsound: { icon: "✗", title: "Request changes" },
  uncertain: { icon: "?", title: "Uncertain" },
  skipped_lint: { icon: "⊘", title: "Not judged" },
};

function Comment({ item, caseId, mode, showRuns }: { item: JustifyItem; caseId: string; mode: SessionMode; showRuns: boolean }) {
  const [resolved, setResolved] = useState(false);
  const comment = COMMENT[item.verdict];
  if (!comment) {
    return (
      <span className="review-sound" aria-label="sound">
        ✓ Follows
      </span>
    );
  }
  if (resolved) {
    return (
      <button type="button" className="link-button" onClick={() => setResolved(false)}>
        Resolved: show comment
      </button>
    );
  }
  return (
    <div className={`review-comment ${item.verdict}`}>
      <div className="review-comment-head">
        <span aria-hidden="true">{comment.icon}</span> <strong>{comment.title}</strong> <MethodPill method={item.method} />
        <FeedbackButtons caseId={caseId} item={`justify:${item.itemId}`} />
      </div>
      {item.reason && <p>{item.reason}</p>}
      {item.quotes.map((quote) => (
        <blockquote key={quote}>“{quote}”</blockquote>
      ))}
      {showRuns && item.runs.length > 0 && <div className="review-runs">Runs: {item.runs.join(", ")}</div>}
      {mode === "practice" && (
        <Button size="small" onClick={() => setResolved(true)}>
          Resolve conversation
        </Button>
      )}
    </div>
  );
}

/**
 * Justify: one row per judged item, like the comments on a pull request. The item itself is not
 * reprinted — it is in the doc on the left, and the id chip flashes it there.
 */
export function JustifyBody({ result, caseId, doc, mode, showRuns, onItem }: JustifyBodyProps) {
  if (result.justify.items.length === 0) {
    return <Typography variant="body2">There was nothing in your doc with the parts needed to judge a step.</Typography>;
  }
  // The item's own words, so a row reads on its own without reprinting the doc.
  const titles = new Map<string, string>();
  for (const item of doc.requirements) titles.set(item.id, item.text);
  for (const item of doc.assumptions) titles.set(item.id, item.text);
  for (const decision of doc.decisions) titles.set(decision.id, decision.title);

  return (
    <ul className="justify-rows">
      {result.justify.items.map((item) => {
        const base = item.itemId.replace(/-sketch$/, "");
        return (
          <li key={item.itemId} className={`justify-row ${item.verdict}`}>
            <div className="justify-row-head">
              <button type="button" className="simple-id-chip" onClick={() => onItem?.(base)} disabled={!onItem} title="Show it in your doc">
                {item.itemId}
              </button>
              <span className="justify-row-title">{titles.get(base) ?? ""}</span>
            </div>
            <Comment item={item} caseId={caseId} mode={mode} showRuns={showRuns} />
          </li>
        );
      })}
    </ul>
  );
}
