import { useMemo } from "react";
import type { ReactNode } from "react";
import { Button, CircularProgress, Divider, Typography } from "@mui/material";
import type { CaseDefinition } from "../../cases";
import type { AssessmentProgress } from "../../assessment/run";
import type { AssessmentResult } from "../../assessment/types";
import { flashElementById } from "../simple/highlight";
import { FoundSection } from "./FoundSection";
import { ReasoningSection } from "./ReasoningSection";
import { SummaryStrip } from "./SummaryStrip";
import { TracedSection } from "./TracedSection";
import type { ReportNav, ReportSnapshot } from "./reportTypes";
import "./report.css";

export type AssessmentStatus = "idle" | "loading" | "success" | "error";

const STAGE_LABELS: Record<AssessmentProgress["stage"], string> = {
  evidence: "Checking which facts came up in the chat and your doc",
  match: "Matching facts to your requirements",
  soundness: "Rating the reasoning in your doc",
};

function progressText(progress: AssessmentProgress | null) {
  if (!progress) return "Starting the review...";
  const base = STAGE_LABELS[progress.stage];
  if (progress.attempt === 1) return `${base}...`;
  const redo = progress.retrySections ? `: redoing ${progress.retrySections.join(", ")}` : "";
  return `${base} (attempt ${progress.attempt} of 3${redo})...`;
}

export function AssessmentReport({
  status,
  progress,
  error,
  result,
  snapshot,
  caseDefinition,
  template,
  onChat,
  onBrief,
  onClose,
  onRerun,
  canRerun = true,
  showFairnessDetails = false,
  headerExtra,
  children,
}: {
  status: AssessmentStatus;
  progress: AssessmentProgress | null;
  error: string | null;
  result: AssessmentResult | null;
  snapshot: ReportSnapshot | null;
  caseDefinition: CaseDefinition;
  /** The empty doc template, to tell an untouched doc apart. */
  template: string;
  onChat: (index: number, quote?: string) => void;
  onBrief: (quote: string) => void;
  onClose?: () => void;
  onRerun?: () => void;
  canRerun?: boolean;
  showFairnessDetails?: boolean;
  headerExtra?: ReactNode;
  /** Extra admin sections (process measures), shown under the summary. */
  children?: ReactNode;
}) {
  const nav = useMemo<ReportNav>(
    () => ({
      chat: onChat,
      brief: onBrief,
      // Items, sketches and boxes are all in the Reasoning column, which scrolls on its own.
      item: (id) => flashElementById(`report-item-${id}`),
      sketch: (id) => flashElementById(`report-sketch-${id}`),
      node: (id) => flashElementById(`report-node-${id}`),
    }),
    [onBrief, onChat],
  );

  const reviewTime = result ? new Date(result.reviewedAt).toLocaleTimeString() : "";

  return (
    <div className="report-shell">
      <header className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Review
          {result && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {reviewTime} · case v{result.caseVersion}
            </Typography>
          )}
        </Typography>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {headerExtra}
          {onRerun && (
            <Button size="small" variant="outlined" onClick={onRerun} disabled={!canRerun || status === "loading"}>
              {result ? "Run again" : "Run review"}
            </Button>
          )}
          {onClose && (
            <Button size="small" variant="contained" onClick={onClose}>
              Back to my work
            </Button>
          )}
        </div>
      </header>
      <Divider />
      <div className="report-top">
        {status === "loading" && (
          <div className="report-loading" aria-live="polite">
            <CircularProgress size={28} />
            <span>{progressText(progress)}</span>
          </div>
        )}
        {status === "error" && (
          <div className="report-note report-note-warn">
            The review failed: {error ?? "unknown error"}
            {result ? ` Below is your previous review, from ${reviewTime}.` : " Your work is unchanged; run it again when ready."}
          </div>
        )}
        {status === "idle" && !result && <div className="report-note">No review yet.</div>}
        {result && snapshot && status !== "loading" && (
          <SummaryStrip result={result} caseDefinition={caseDefinition} snapshot={snapshot} template={template} />
        )}
        {status !== "loading" && children}
      </div>
      {result && snapshot && status !== "loading" && (
        <div className="report-columns">
          <section className="report-column">
            <h3 className="report-column-title">Found</h3>
            <FoundSection
              result={result}
              caseDefinition={caseDefinition}
              nav={nav}
              showFairnessDetails={showFairnessDetails}
            />
          </section>
          <section className="report-column">
            <h3 className="report-column-title">Traced</h3>
            <TracedSection result={result} caseDefinition={caseDefinition} nav={nav} />
          </section>
          <section className="report-column">
            <h3 className="report-column-title">Reasoning</h3>
            <ReasoningSection result={result} caseDefinition={caseDefinition} snapshot={snapshot} nav={nav} />
          </section>
        </div>
      )}
    </div>
  );
}
