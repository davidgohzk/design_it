import { useState } from "react";
import { Alert, Button, Typography } from "@mui/material";
import type { CaseDefinition } from "../../../cases";
import { askRows, fairnessBanner, levelOutcomes, levelRecap, orderedTraces, summaryLine, summaryNumbers } from "../../../assessment/reportModel";
import type { AssessmentResult, Level, SessionMode } from "../../../assessment/types";
import { LEVELS } from "../../../assessment/types";
import type { TimelineEntry } from "../../lib/types";
import type { CitationHandlers } from "../panels/citationLinks";
import { ChecksRunning } from "./ChecksRunning";
import { OverviewCharts } from "./charts/OverviewCharts";
import { LevelSection } from "./LevelSection";
import { MethodPill } from "./MethodPill";
import { emptyStateNotes } from "./reportData";
import type { ReportSnapshot } from "./reportTypes";
import { ActivityBody } from "./sections/ActivityBody";
import { AskBody } from "./sections/AskBody";
import { FitBody } from "./sections/FitBody";
import { GateBody } from "./sections/GateBody";
import { JustifyBody } from "./sections/JustifyBody";
import { KeepBody } from "./sections/KeepBody";
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

/**
 * The review, as one page: the checks at the top like a pull request, then the analytics, then the
 * five levels in order as collapsible sections, then Activity. The work being reviewed sits in the
 * pane on the left, so nothing here reprints it; an id or a message number flashes it over there.
 */
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
  // Bumped when the checks strip is clicked, so that section opens even if it had passed.
  const [opened, setOpened] = useState<{ level: Level; nonce: number } | null>(null);
  const research = mode === "research" && admin;
  const numbers = summaryNumbers(result);
  const banner = fairnessBanner(result, caseDefinition);
  const notes = emptyStateNotes(snapshot, template);
  const outcomes = levelOutcomes(result);
  const recap = levelRecap(result, snapshot.parsed);
  const rows = askRows(result, caseDefinition, mode);
  const traces = orderedTraces(result, mode);
  const suggestions = new Map(result.suggestions.map((suggestion) => [suggestion.level, suggestion]));
  const progress = Object.fromEntries(
    LEVELS.map((level) => [level, { level, status: outcomes[level] === "skipped" ? "skipped" : "done" }]),
  );

  const openLevel = (level: Level) => {
    setOpened((current) => ({ level, nonce: (current?.nonce ?? 0) + 1 }));
    requestAnimationFrame(() => document.getElementById(`level-${level}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const signal = (level: Level) => (opened?.level === level ? opened.nonce : undefined);
  const section = (level: Level, summary: string, children: React.ReactNode) => (
    <LevelSection
      level={level}
      outcome={outcomes[level]}
      summary={summary}
      recap={recap[level]}
      openSignal={signal(level)}
      suggestion={suggestions.get(level)}
    >
      {children}
    </LevelSection>
  );

  const judged = result.justify.items.filter((item) => item.verdict !== "skipped_lint");
  const handled = result.fit.scenarios.filter((scenario) => scenario.verdict === "handled").length;

  return (
    <div className="report-view">
      <header className="report-header">
        <div>
          <Typography variant="h6">Review of your design</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(result.reviewedAt).toLocaleString()} · {result.model || "code only"}
            {result.verification.discardedQuotes > 0 && ` · ${result.verification.discardedQuotes} AI claim(s) didn't verify and were dropped`}
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

      <h3 className="report-block-title">Analytics</h3>
      <OverviewCharts result={result} />

      <h3 className="report-block-title">The five checks, in order</h3>
      {section("gate", result.gate.sessionComplete ? "session complete" : "session not complete", <GateBody result={result} showDetails={research} />)}
      {section("ask", summaryLine(rows), <AskBody rows={rows} caseId={caseDefinition.id} onChat={(index) => citation.onChat(index)} />)}
      {section(
        "keep",
        `${traces.filter((trace) => trace.state === "carried_through").length} of ${traces.length} found facts carried through`,
        <KeepBody result={result} caseDefinition={caseDefinition} doc={snapshot.parsed} traces={traces} onItem={citation.onItem} />,
      )}
      {section(
        "justify",
        judged.length ? `${judged.filter((item) => item.verdict === "sound").length} of ${judged.length} steps follow` : "nothing to judge",
        <JustifyBody result={result} caseId={caseDefinition.id} doc={snapshot.parsed} mode={mode} showRuns={research} onItem={citation.onItem} />,
      )}
      {section(
        "fit",
        result.fit.scenarios.length ? `${handled} of ${result.fit.scenarios.length} scenarios handled` : "no scenarios",
        <FitBody result={result} caseDefinition={caseDefinition} mode={mode} />,
      )}

      <h3 className="report-block-title">Activity</h3>
      <ActivityBody
        result={result}
        messages={snapshot.messages}
        timeline={timeline}
        mode={mode}
        showNumbers={admin}
        timeOnTaskMs={timeOnTaskMs}
        diagramPrompts={diagramPrompts}
        onChat={(index) => citation.onChat(index)}
      />
    </div>
  );
}
