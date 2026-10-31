import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ParsedDesignDoc } from "@/designDoc/parse";
import type { ChatMessage } from "@/lib/types";

/** The work as it was when it was submitted; the report never reads the live doc. */
export type ReportSnapshot = {
  messages: ChatMessage[];
  docMarkdown: string;
  finalCode: string;
  parsed: ParsedDesignDoc;
};

export type AssessmentStatus = "idle" | "loading" | "success" | "error";

/** Which sections of the review are folded. Kept outside the sections so a fold survives a re-render. */
export type LayerCollapse = {
  isOpen: (layerId: string) => boolean;
  toggle: (layerId: string) => void;
};

const ALWAYS_OPEN: LayerCollapse = { isOpen: () => true, toggle: () => {} };

export const LayerCollapseContext = createContext<LayerCollapse>(ALWAYS_OPEN);

export const useLayerCollapse = () => useContext(LayerCollapseContext);

/** Folded sections are remembered in this browser, so a reader's layout survives re-runs and reloads. */
const COLLAPSED_KEY = "design_it.review.collapsed";

/** The sections that start folded the first time someone opens a review. */
export const DEFAULT_COLLAPSED = [
  "design-doc",
  "design-traceability-links",
  "design-traceability-facts",
  "rationale-requirements",
  "rationale-decisions",
  "scenarios",
  "overall",
  "elicitation-metrics",
  "elicitation-bano",
];

function readCollapsed(): Set<string> {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === null) return new Set(DEFAULT_COLLAPSED);
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set(DEFAULT_COLLAPSED);
  }
}

function writeCollapsed(collapsed: Set<string>) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Storage can be unavailable (private windows, blocked site data); folding still works for this view.
  }
}

/** The fold state for one review page, remembered in this browser. */
export function useReportCollapse(): LayerCollapse {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const setOpen = useCallback((layerId: string, open: boolean) => {
    setCollapsed((previous) => {
      if (previous.has(layerId) !== open) return previous;
      const next = new Set(previous);
      if (open) next.delete(layerId);
      else next.add(layerId);
      writeCollapsed(next);
      return next;
    });
  }, []);
  return useMemo(
    () => ({
      isOpen: (layerId) => !collapsed.has(layerId),
      toggle: (layerId) => setOpen(layerId, collapsed.has(layerId)),
    }),
    [collapsed, setOpen],
  );
}
