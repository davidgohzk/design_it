import { useState } from "react";
import { Alert, Button, Tab, Tabs, Typography } from "@mui/material";
import type { CaseDefinition } from "../../../cases";
import { fairnessBanner, levelOutcomes, summaryNumbers } from "../../../assessment/reportModel";
import type { AssessmentResult, Level, SessionMode } from "../../../assessment/types";
import type { TimelineEntry } from "../../lib/types";
import type { CitationHandlers } from "../panels/citationLinks";
import { ActivityTab } from "./ActivityTab";
import { ChecksRunning } from "./ChecksRunning";
import { ChecksTab } from "./ChecksTab";
import { MethodPill } from "./MethodPill";
import { emptyStateNotes } from "./reportData";
import type { ReportSnapshot } from "./reportTypes";
import { ReviewTab } from "./ReviewTab";
import "./report.css";

type ReportViewProps = {
  result: AssessmentResult;
  snapshot: ReportSnapshot;
  caseDefinition: CaseDefinition;
  mode: SessionMode;
  /** The admin view; in research mode it also shows gate details and raw judge runs. */
  admin: boolean;
  timeline: TimelineEntry[];
  citation: CitationHandlers;
  template: string;
  timeOnTaskMs?: number;
  diagramPrompts?: number;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
};

type TabId = "checks" | "review" | "activity";

/** The review, shown like a pull request: checks at the top, then Checks, Review and Activity tabs. */
export function ReportView({
  result,
  snapshot,
  caseDefinition,
  mode,
  admin,
  timeline,
  citation,
  template,
  timeOnTaskMs,
  diagramPrompts,
  headerExtra,
  onClose,
}: ReportViewProps) {
  const [tab, setTab] = useState<TabId>("checks");
  const research = mode === "research" && admin;
  const numbers = summaryNumbers(result);
  const banner = fairnessBanner(result, caseDefinition);
  const notes = emptyStateNotes(snapshot, template);
  const outcomes = levelOutcomes(result);
  const progress = Object.fromEntries(
    (Object.keys(outcomes) as Level[]).map((level) => [level, { level, status: outcomes[level] === "skipped" ? "skipped" : "done" }]),
  );

  const openLevel = (level: Level) => {
    setTab(level === "justify" || level === "fit" ? "review" : "checks");
    requestAnimationFrame(() => document.getElementById(`check-${level}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="report-view">
      <header className="report-header">
        <div>
          <Typography variant="h6">Review of your design</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(result.reviewedAt).toLocaleString()} · {result.model || "code only"}
            {result.verification.discardedQuotes > 0 && ` · ${result.verification.discardedQuotes} AI quote(s) didn't verify and were dropped`}
          </Typography>
        </div>
        <div className="report-header-actions">
          {headerExtra}
          {onClose && (
            <Button variant="outlined" size="small" onClick={onClose}>
              Back to my work
            </Button>
          )}
        </div>
      </header>

      <ChecksRunning progress={progress} outcomes={outcomes} onSelect={openLevel} />

      {banner ? (
        <Alert severity="warning" className="fair-banner">
          {banner}
        </Alert>
      ) : (
        <Alert severity="success" className="fair-banner" icon={<span aria-hidden="true">✓</span>}>
          Fair session: the client answered what you asked, and the interview ended properly.
        </Alert>
      )}
      {notes.map((note) => (
        <Alert key={note} severity="info" className="fair-banner">
          {note}
        </Alert>
      ))}

      <div className="summary-strip" aria-label="Summary">
        <div className="summary-cell">
          <span className="summary-value">{numbers.onProbe ? `${numbers.onProbe.found}/${numbers.onProbe.eligible}` : "n/a"}</span>
          <span className="summary-label">
            follow-up facts found <MethodPill method="code" />
          </span>
        </div>
        <div className="summary-cell">
          <span className="summary-value">
            {numbers.carriedThrough.carried}/{numbers.carriedThrough.found}
          </span>
          <span className="summary-label">found facts carried through</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value">{numbers.unjustifiedBoxes}</span>
          <span className="summary-label">boxes no decision explains</span>
        </div>
        <div className="summary-cell">
          <span className="summary-value">{numbers.assumedSilently}</span>
          <span className="summary-label">facts assumed silently</span>
        </div>
      </div>

      <Tabs value={tab} onChange={(_event, value: TabId) => setTab(value)} aria-label="Review sections">
        <Tab value="checks" label="Checks" />
        <Tab value="review" label="Review" />
        <Tab value="activity" label="Activity" />
      </Tabs>
      <div className="report-tab-body">
        {tab === "checks" && (
          <ChecksTab
            result={result}
            caseDefinition={caseDefinition}
            doc={snapshot.parsed}
            mode={mode}
            showGateDetails={research}
            onChat={(index) => citation.onChat(index)}
          />
        )}
        {tab === "review" && (
          <ReviewTab result={result} caseDefinition={caseDefinition} doc={snapshot.parsed} mode={mode} showRuns={research} citation={citation} />
        )}
        {tab === "activity" && (
          <ActivityTab
            result={result}
            messages={snapshot.messages}
            timeline={timeline}
            mode={mode}
            showNumbers={admin}
            timeOnTaskMs={timeOnTaskMs}
            diagramPrompts={diagramPrompts}
          />
        )}
      </div>
    </div>
  );
}
