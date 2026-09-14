import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
} from "@mui/material";
import { DiffBlock } from "./DiffBlock";
import { LogicGraphSection } from "./LogicGraphSection";
import { CASE_REVIEW_FACTS } from "../caseReview";
import { coverageScore, groundingScore } from "../review";
import type {
  AIReviewResult,
  AIReviewStatus,
  CoverageStatus,
  GroundingIssue,
  LogicGraphData,
  TimelineEntry,
} from "../types";
import { formatClockTime, formatElapsed } from "../utils";

type AIReviewDialogProps = {
  open: boolean;
  viewMode: "client" | "admin";
  status: AIReviewStatus;
  result: AIReviewResult | null;
  error: string | null;
  timelineEntries: TimelineEntry[];
  logicGraph: LogicGraphData;
  canReview: boolean;
  onRefresh: () => void;
  onClose: () => void;
};

const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  elicited: "Elicited",
  assumed: "Assumed",
  missed: "Missed",
};

const ISSUE_LABELS: Record<GroundingIssue, string> = {
  missing_reference: "Missing reference",
  invalid_reference: "Invalid reference",
  unsupported_reference: "Reference does not support claim",
};

const scorePercent = (found: number, total: number) =>
  total === 0 ? null : Math.round((found / total) * 100);

function EvidenceExcerpt({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="review-evidence">
      <span>{label}</span>
      <q>{text}</q>
    </div>
  );
}

export function AIReviewDialog({
  open,
  viewMode,
  status,
  result,
  error,
  timelineEntries,
  logicGraph,
  canReview,
  onRefresh,
  onClose,
}: AIReviewDialogProps) {
  const coverage = result ? coverageScore(result.coverage) : null;
  const grounding = result ? groundingScore(result.grounding.claims) : null;
  const unsupportedClaims = result?.grounding.claims.filter((claim) => !claim.grounded) ?? [];
  const coverageCounts = result
    ? {
        elicited: result.coverage.filter((item) => item.status === "elicited").length,
        assumed: result.coverage.filter((item) => item.status === "assumed").length,
        missed: result.coverage.filter((item) => item.status === "missed").length,
      }
    : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle className="review-dialog-title">
        <span>AI Review</span>
        <span className="review-view-label">
          {viewMode === "client" ? "User View" : "Admin View"}
        </span>
      </DialogTitle>
      <DialogContent dividers className="review-dialog-content">
        {status === "loading" && (
          <div className="review-status" aria-live="polite">
            <LinearProgress />
            <span>{result ? "Refreshing review…" : "Reviewing the interview and SOAP report…"}</span>
          </div>
        )}
        {status === "error" && error && (
          <Alert
            severity="error"
            action={
              canReview ? (
                <Button color="inherit" size="small" onClick={onRefresh}>
                  Retry
                </Button>
              ) : undefined
            }
          >
            {error}
          </Alert>
        )}

        <section className="review-section" aria-labelledby="coverage-heading">
          <div className="review-section-heading">
            <div>
              <span className="review-section-kicker">Interview quality</span>
              <h2 id="coverage-heading">Coverage</h2>
              <p>Did you find out what there was to find out?</p>
            </div>
            <div className="review-score" aria-label="Coverage score">
              <strong>
                {coverage ? `${coverage.elicited}/${coverage.total}` : "—"}
              </strong>
              <span>
                {coverage
                  ? `${scorePercent(coverage.elicited, coverage.total)}% elicited`
                  : "Awaiting review"}
              </span>
            </div>
          </div>

          {coverageCounts && (
            <div className="review-counts" aria-label="Coverage status totals">
              <span className="review-count review-count-elicited">
                {coverageCounts.elicited} elicited
              </span>
              <span className="review-count review-count-assumed">
                {coverageCounts.assumed} assumed
              </span>
              <span className="review-count review-count-missed">
                {coverageCounts.missed} missed
              </span>
            </div>
          )}

          {result ? (
            <div className="review-findings">
              {result.coverage.map((finding) => {
                const fact = CASE_REVIEW_FACTS.find((item) => item.id === finding.factId);
                return (
                  <article className="review-finding" key={finding.factId}>
                    <div className="review-finding-heading">
                      <h3>{fact?.label ?? finding.factId}</h3>
                      <Chip
                        className={`review-chip review-chip-${finding.status}`}
                        size="small"
                        label={COVERAGE_LABELS[finding.status]}
                      />
                    </div>
                    <p>{finding.rationale}</p>
                    <EvidenceExcerpt
                      label={finding.status === "elicited" ? "Client" : "Report"}
                      text={finding.transcriptExcerpt ?? finding.reportExcerpt}
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="review-empty">Coverage findings will appear after the review runs.</p>
          )}
        </section>

        <section className="review-section" aria-labelledby="grounding-heading">
          <div className="review-section-heading">
            <div>
              <span className="review-section-kicker">Write-up quality</span>
              <h2 id="grounding-heading">Grounding</h2>
              <p>Does the report rest on explicit evidence?</p>
            </div>
            <div className="review-score" aria-label="Grounding score">
              <strong>
                {grounding
                  ? grounding.total === 0
                    ? "N/A"
                    : `${grounding.grounded}/${grounding.total}`
                  : "—"}
              </strong>
              <span>
                {grounding
                  ? grounding.total === 0
                    ? "No factual claims"
                    : `${scorePercent(grounding.grounded, grounding.total)}% grounded`
                  : "Awaiting review"}
              </span>
            </div>
          </div>

          {result ? (
            <div className="grounding-audit">
              <div className="grounding-group">
                <div className="grounding-group-heading">
                  <h3>Unsupported claims</h3>
                  <span>{unsupportedClaims.length}</span>
                </div>
                {unsupportedClaims.length === 0 ? (
                  <p className="review-success">Every factual claim has a supporting reference.</p>
                ) : (
                  <div className="review-findings">
                    {unsupportedClaims.map((claim, index) => (
                      <article className="review-finding" key={`${claim.reportExcerpt}-${index}`}>
                        <div className="review-finding-heading">
                          <h3>{claim.claim}</h3>
                          {claim.issue && (
                            <Chip
                              className="review-chip review-chip-unsupported"
                              size="small"
                              label={ISSUE_LABELS[claim.issue]}
                            />
                          )}
                        </div>
                        <p>{claim.rationale}</p>
                        <EvidenceExcerpt label="Report" text={claim.reportExcerpt} />
                        <EvidenceExcerpt
                          label={claim.reference?.source === "chat" ? "Client" : "Brief"}
                          text={claim.reference?.excerpt}
                        />
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="grounding-group">
                <div className="grounding-group-heading">
                  <h3>Client facts missing from the report</h3>
                  <span>{result.grounding.omissions.length}</span>
                </div>
                {result.grounding.omissions.length === 0 ? (
                  <p className="review-success">The report includes every material fact the client shared.</p>
                ) : (
                  <div className="review-findings">
                    {result.grounding.omissions.map((omission, index) => (
                      <article className="review-finding" key={`${omission.fact}-${index}`}>
                        <h3>{omission.fact}</h3>
                        <p>{omission.rationale}</p>
                        <EvidenceExcerpt label="Client" text={omission.clientExcerpt} />
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="review-empty">Grounding findings will appear after the review runs.</p>
          )}
        </section>

        <LogicGraphSection graph={logicGraph} />

        <section className="review-section review-activity" aria-labelledby="activity-heading">
          <div className="review-section-heading">
            <div>
              <span className="review-section-kicker">Session record</span>
              <h2 id="activity-heading">Activity timeline</h2>
            </div>
          </div>
          {timelineEntries.length === 0 ? (
            <p className="review-empty">No activity recorded yet.</p>
          ) : (
            <div className="timeline">
              {timelineEntries.map((entry, index) => (
                <div className="timeline-row" key={entry.id}>
                  <div className="timeline-when">
                    <span className="timeline-time">{formatClockTime(entry.at)}</span>
                    {index > 0 && (
                      <span className="timeline-elapsed">
                        {formatElapsed(entry.at - timelineEntries[index - 1].at)}
                      </span>
                    )}
                  </div>
                  <div className="timeline-rail">
                    <span className="timeline-dot" />
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-heading">
                      <span className={`timeline-type timeline-type-${entry.type}`}>
                        {entry.type}
                      </span>
                      <span className="timeline-summary">
                        {entry.type === "quote" ? `from ${entry.summary}` : entry.summary}
                      </span>
                      {entry.target && (
                        <span className="timeline-target">into “{entry.target}”</span>
                      )}
                    </div>
                    {entry.diff ? (
                      <DiffBlock patch={entry.diff} />
                    ) : (
                      <div className="timeline-detail">{entry.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </DialogContent>
      <DialogActions>
        <Button onClick={onRefresh} disabled={!canReview || status === "loading"}>
          Refresh review
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
