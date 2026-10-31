// The interview-mistake check: which of the known novice interviewing mistakes this session shows.
// Based on the reviewer checklist of Bano et al. (2019); see checklist.ts for the citation.
//
// Teaching feedback and an exploratory research measure. There is no total here and there never will
// be: the theme counts are for display, and nothing in this report feeds a level or a score.
import { combineBanoRuns, readBanoRun } from "./ai";
import { BANO_CHECKLIST, BANO_CHECKLIST_VERSION, BANO_THEMES } from "./checklist";
import { configHash } from "./config";
import { buildBanoContext, runBanoRules } from "./rules";
import type { BanoInput, BanoItemResult, BanoReport, BanoThemeCount } from "./types";

export type { BanoInput, BanoItemResult, BanoReport, BanoStatus, BanoThemeCount } from "./types";
export { BANO_CHECKLIST, BANO_THEME_LABEL, BANO_THEMES } from "./checklist";
export type { BanoTheme } from "./checklist";
export { BANO_RUNS, banoEvidence } from "./ai";

/** The statuses that don't count towards a theme's "checked" total. */
const NOT_COUNTED = new Set(["see_ask", "not_applicable", "info"]);

function themeCounts(items: readonly BanoItemResult[]): BanoThemeCount[] {
  return BANO_THEMES.map((theme) => {
    const counted = items.filter((item) => item.theme === theme && !NOT_COUNTED.has(item.status));
    return { theme, observed: counted.filter((item) => item.status === "observed").length, checked: counted.length };
  });
}

/**
 * Builds the report: the code rules from the transcript, the AI items from the judge's runs (absent
 * runs leave them `uncertain`), and the pointer and not-applicable items straight from the checklist.
 */
export function runBanoCheck(
  input: BanoInput,
  ai?: { replies?: readonly unknown[]; promptVersion?: string; discarded?: { count: number } },
): BanoReport {
  const context = buildBanoContext(input);
  const outcomes = runBanoRules(context);
  const discarded = ai?.discarded ?? { count: 0 };
  const before = discarded.count;

  const runs = (ai?.replies ?? []).map((reply) => {
    try {
      return readBanoRun(reply, input.messages, discarded);
    } catch {
      return new Map();
    }
  });
  const judged = combineBanoRuns(runs);

  const items: BanoItemResult[] = BANO_CHECKLIST.map((spec) => {
    const base = { id: spec.id, theme: spec.theme, ...(spec.weak ? { weak: true } : {}) };

    if (spec.source === "see_ask") {
      return { ...base, status: "see_ask", method: "code", evidence: [], ...(spec.seeAsk ? { note: spec.seeAsk.why } : {}) };
    }
    if (spec.source === "not_applicable") {
      return {
        ...base,
        status: "not_applicable",
        method: "code",
        evidence: [],
        note: `Not checked in a text chat: ${spec.notApplicable}.`,
      };
    }
    if (spec.source === "ai") {
      const entry = judged.get(spec.id);
      if (!entry) {
        return { ...base, status: "uncertain", method: "ai_judgment", evidence: [], note: "This item wasn't judged." };
      }
      return {
        ...base,
        status: entry.status,
        method: entry.status === "observed" ? "ai_verified_quote" : "ai_judgment",
        evidence: entry.evidence,
        ...(entry.note ? { note: entry.note } : {}),
        ...(entry.evidence.length ? { count: entry.evidence.length } : {}),
        runs: entry.runs,
      };
    }

    // A code rule. `null` means it looked and found nothing; TP5 is only ever information.
    const outcome = outcomes.get(spec.id) ?? null;
    if (outcome === null) {
      return { ...base, status: spec.infoOnly ? "info" : "not_observed", method: "code", evidence: [] };
    }
    return {
      ...base,
      status: outcome.status,
      method: "code",
      evidence: "evidence" in outcome ? (outcome.evidence ?? []) : [],
      note: outcome.note,
      ...("count" in outcome && outcome.count !== undefined ? { count: outcome.count } : {}),
    };
  });

  return {
    checklistVersion: BANO_CHECKLIST_VERSION,
    configHash: configHash(context.config),
    ...(ai?.promptVersion ? { promptVersion: ai.promptVersion } : {}),
    items,
    themes: themeCounts(items),
    discardedAiItems: discarded.count - before,
  };
}
