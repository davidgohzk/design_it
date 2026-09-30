import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, CircularProgress, Divider, Tab, Tabs, Typography } from "@mui/material";
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
  /** Extra admin sections (process measures), shown under the tabs. */
  children?: ReactNode;
}) {
  const [tab, setTab] = useState(0);

  const nav = useMemo<ReportNav>(() => {
    const reveal = (elementId: string) => {
      setTab(2);
      requestAnimationFrame(() => requestAnimationFrame(() => flashElementById(elementId)));
    };
    return {
      chat: onChat,
      brief: onBrief,
      item: (id) => reveal(`report-item-${id}`),
      sketch: (id) => reveal(`report-sketch-${id}`),
      node: (id) => reveal(`report-node-${id}`),
    };
  }, [onBrief, onChat]);

  return (
    <div className="simple-final">
      <header className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Review
          {result && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {new Date(result.reviewedAt).toLocaleTimeString()} · case v{result.caseVersion}
            </Typography>
          )}
        </Typography>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {headerExtra}
          {onRerun && (
            <Button size="small" variant="outlined" onClick={onRerun} disabled={!canRerun || status === "loading"}>
              Run again
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
      <div className="report-body">
        {status === "loading" && (
          <div className="report-loading" aria-live="polite">
            <CircularProgress size={28} />
            <span>{progressText(progress)}</span>
          </div>
        )}
        {status === "error" && (
          <div className="report-note report-note-warn">
            The review failed: {error ?? "unknown error"}. Your work is unchanged; run it again when ready.
          </div>
        )}
        {status === "idle" && !result && (
          <div className="report-note">No review yet.</div>
        )}
        {result && snapshot && status !== "loading" && (
          <>
            <SummaryStrip result={result} caseDefinition={caseDefinition} snapshot={snapshot} template={template} />
            <Tabs value={tab} onChange={(_event, value) => setTab(value as number)}>
              <Tab label="Found" />
              <Tab label="Traced" />
              <Tab label="Reasoning" />
            </Tabs>
            {tab === 0 && (
              <FoundSection
                result={result}
                caseDefinition={caseDefinition}
                nav={nav}
                showFairnessDetails={showFairnessDetails}
              />
            )}
            {tab === 1 && <TracedSection result={result} caseDefinition={caseDefinition} nav={nav} />}
            {tab === 2 && (
              <ReasoningSection result={result} caseDefinition={caseDefinition} snapshot={snapshot} nav={nav} />
            )}
            {children}
          </>
        )}
      </div>
    </div>
  );
}
