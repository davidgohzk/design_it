import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, CircularProgress, Divider, Typography } from "@mui/material";
import type { CaseDefinition } from "../../../cases";
import type { AssessmentProgress } from "../../../assessment/run";
import type { AssessmentResult } from "../../../assessment/types";
import { flashDiagram } from "../panels/highlight";
import { buildReferences, ReferenceContext } from "../panels/references";
import { FairnessLayer } from "./FairnessLayer";
import { LinksLayer } from "./LinksLayer";
import { PiecesLayer } from "./PiecesLayer";
import { ReviewSourcePane } from "./ReviewSourcePane";
import type { ReviewSourceHandle } from "./ReviewSourcePane";
import { SoundnessLayer, WholeDesignLayer } from "./SoundnessLayer";
import { SummaryStrip } from "./SummaryStrip";
import { LayerCollapseContext } from "./reportTypes";
import type { LayerCollapse, ReportNav, ReportSnapshot } from "./reportTypes";
import "./report.css";

export type AssessmentStatus = "idle" | "loading" | "success" | "error";

/** The soundness band's containers searched for a box, final diagram first. */
const SOUNDNESS_DIAGRAMS = ["report-final", "report-sketches"];
const SOUNDNESS_LAYER = "level-3-diagrams";

/** Folded levels are remembered in this browser, so a reviewer's layout survives re-runs and reloads. */
const COLLAPSED_KEY = "design_it.review.collapsed";

function readCollapsed(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function writeCollapsed(collapsed: Set<string>) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Storage can be unavailable (private windows, blocked site data); folding still works for this view.
  }
}

/** Runs after a band has been unfolded and painted, so its contents can be found and scrolled to. */
const afterPaint = (action: () => void) => requestAnimationFrame(() => requestAnimationFrame(action));

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

/**
 * The review page: the submitted work on the left third (design doc and chat), the levels on the right.
 * References anywhere in the levels open their target on the left, except the soundness band's own
 * diagram links, which highlight the diagrams in that band.
 */
export function AssessmentReport({
  status,
  progress,
  error,
  result,
  snapshot,
  caseDefinition,
  template,
  onClose,
  onRerun,
  canRerun = true,
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
  onClose?: () => void;
  onRerun?: () => void;
  canRerun?: boolean;
  headerExtra?: ReactNode;
  /** Extra admin sections (process measures), shown under the summary. */
  children?: ReactNode;
}) {
  const sourceRef = useRef<ReviewSourceHandle | null>(null);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const setLayerOpen = useCallback((layerId: string, open: boolean) => {
    setCollapsed((previous) => {
      if (previous.has(layerId) !== open) return previous;
      const next = new Set(previous);
      if (open) next.delete(layerId);
      else next.add(layerId);
      writeCollapsed(next);
      return next;
    });
  }, []);

  const collapse = useMemo<LayerCollapse>(
    () => ({
      isOpen: (layerId) => !collapsed.has(layerId),
      toggle: (layerId) => setLayerOpen(layerId, collapsed.has(layerId)),
    }),
    [collapsed, setLayerOpen],
  );

  const nav = useMemo<ReportNav>(() => {
    const inSoundness = (action: () => void) => {
      setLayerOpen(SOUNDNESS_LAYER, true);
      afterPaint(action);
    };
    return {
      chat: (index, quote) => sourceRef.current?.showChat(index, quote),
      brief: (quote) => sourceRef.current?.showBrief(quote),
      item: (id) => sourceRef.current?.showItem(id),
      sketch: (id) => sourceRef.current?.showSketch(id),
      node: (id) => sourceRef.current?.showDiagram({ nodes: [id] }),
      edge: (from, to) => sourceRef.current?.showDiagram({ nodes: [from, to], edges: [{ from, to }] }),
      soundness: {
        // A box lights up in the band's final diagram and in every sketch that has it.
        node: (id) => inSoundness(() => flashDiagram(SOUNDNESS_DIAGRAMS, { nodes: [id] })),
        inFinal: (target) => inSoundness(() => flashDiagram([SOUNDNESS_DIAGRAMS[0]], target)),
      },
    };
  }, [setLayerOpen]);

  const references = useMemo(
    () => (snapshot ? buildReferences(snapshot.parsed, snapshot.messages) : null),
    [snapshot],
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
      <div className={snapshot ? "report-split" : "report-split is-single"}>
        {snapshot && <ReviewSourcePane ref={sourceRef} snapshot={snapshot} caseDefinition={caseDefinition} />}
        <div className="report-layers">
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
          {result && snapshot && references && status !== "loading" && (
            <ReferenceContext.Provider value={references}>
              <LayerCollapseContext.Provider value={collapse}>
                <SummaryStrip result={result} caseDefinition={caseDefinition} snapshot={snapshot} template={template} />
                {children}
                <FairnessLayer result={result} caseDefinition={caseDefinition} snapshot={snapshot} nav={nav} />
                <PiecesLayer result={result} caseDefinition={caseDefinition} snapshot={snapshot} nav={nav} />
                <LinksLayer result={result} caseDefinition={caseDefinition} snapshot={snapshot} nav={nav} />
                <SoundnessLayer result={result} caseDefinition={caseDefinition} snapshot={snapshot} nav={nav} />
                <WholeDesignLayer result={result} caseDefinition={caseDefinition} nav={nav} />
              </LayerCollapseContext.Provider>
            </ReferenceContext.Provider>
          )}
          {status !== "loading" && (!result || !snapshot) && children}
        </div>
      </div>
    </div>
  );
}
