// The labelling sheet for validating the interview-mistake check (§9): one row per item per session,
// for two people to label independently, plus the agreement numbers that come back from their sheets.
//
// Tab-separated, not comma-separated: the mistake wordings and the notes contain commas.
//
// Pure functions only, so the tests cover them; scripts/bano-labelling-sheet.ts does the file I/O.
import { BANO_CHECKLIST } from "./checklist";
import type { BanoReport } from "./types";

export type SheetSession = { sessionId: string; caseId: string; mode: string; report: BanoReport };

export const SHEET_COLUMNS = [
  "sessionId",
  "caseId",
  "mode",
  "itemId",
  "theme",
  "mistake",
  "autoStatus",
  "method",
  "messageIndexes",
  "quote",
  "humanStatus",
  "humanNote",
  "configHash",
  "promptVersion",
] as const;

const cell = (value: string | undefined) => (value ?? "").replace(/[\t\r\n]+/g, " ").trim();

/**
 * Every item of every session, including the ones that weren't observed: a sheet that only listed
 * findings could never show a mistake the check missed.
 */
export function labellingSheet(sessions: readonly SheetSession[]): string {
  const rows = [SHEET_COLUMNS.join("\t")];
  for (const session of sessions) {
    for (const item of session.report.items) {
      const spec = BANO_CHECKLIST.find((candidate) => candidate.id === item.id);
      rows.push(
        [
          session.sessionId,
          session.caseId,
          session.mode,
          item.id,
          item.theme,
          cell(spec?.mistake),
          item.status,
          item.method,
          item.evidence.map((entry) => `#${entry.messageIndex}`).join(" "),
          cell(item.evidence.find((entry) => entry.quote)?.quote),
          "",
          "",
          session.report.configHash,
          session.report.promptVersion ?? "",
        ]
          .map(cell)
          .join("\t"),
      );
    }
  }
  return `${rows.join("\n")}\n`;
}

export type SheetRow = Record<(typeof SHEET_COLUMNS)[number], string>;

/** Reads a sheet back, however the labeller's spreadsheet reordered or renamed nothing. */
export function readSheet(tsv: string): SheetRow[] {
  const [header, ...lines] = tsv.trim().split(/\r?\n/);
  const columns = header.split("\t");
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split("\t");
      return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""])) as SheetRow;
    });
}

/** How one item did against the humans: the four counts, then precision and recall. */
export type ItemAgreement = {
  itemId: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  /** Null when the check never said "observed", so precision is undefined rather than 0. */
  precision: number | null;
  /** Null when the humans never said "observed". */
  recall: number | null;
  /** Cohen's kappa between the two labellers; null when they labelled nothing in common. */
  kappa: number | null;
  /** Rows where the two labellers disagreed; an item they can't agree on is dropped, not reported. */
  humanDisagreements: number;
};

const observedIn = (status: string) => status === "observed";

/**
 * Cohen's kappa for two labellers over the same items, on the one distinction that matters here:
 * did this mistake happen or not.
 */
export function cohensKappa(a: readonly boolean[], b: readonly boolean[]): number | null {
  if (a.length === 0 || a.length !== b.length) return null;
  const agree = a.filter((value, index) => value === b[index]).length / a.length;
  const share = (values: readonly boolean[]) => values.filter(Boolean).length / values.length;
  const [pa, pb] = [share(a), share(b)];
  const chance = pa * pb + (1 - pa) * (1 - pb);
  // Both labellers used one label for everything: there is no agreement beyond chance to measure.
  if (chance === 1) return null;
  return (agree - chance) / (1 - chance);
}

/**
 * Compares the check against two labellers' sheets, per item. `humanStatus` is read as observed or
 * not; a row either labeller left blank is left out of that item's numbers.
 */
export function agreement(first: readonly SheetRow[], second: readonly SheetRow[]): ItemAgreement[] {
  const key = (row: SheetRow) => `${row.sessionId}\u0000${row.itemId}`;
  const byKey = new Map(second.map((row) => [key(row), row]));
  const itemIds = [...new Set(first.map((row) => row.itemId))];

  return itemIds.map((itemId) => {
    const pairs = first
      .filter((row) => row.itemId === itemId)
      .map((row) => ({ row, other: byKey.get(key(row)) }))
      .filter((pair) => pair.other && pair.row.humanStatus.trim() && pair.other.humanStatus.trim());

    const labelsA = pairs.map((pair) => observedIn(pair.row.humanStatus.trim()));
    const labelsB = pairs.map((pair) => observedIn(pair.other!.humanStatus.trim()));
    // Only the rows the two labellers agreed on are used as the truth to score the check against.
    const settled = pairs.filter((_pair, index) => labelsA[index] === labelsB[index]);

    const counts = { truePositives: 0, falsePositives: 0, falseNegatives: 0, trueNegatives: 0 };
    for (const pair of settled) {
      const human = observedIn(pair.row.humanStatus.trim());
      const auto = observedIn(pair.row.autoStatus);
      if (auto && human) counts.truePositives += 1;
      else if (auto && !human) counts.falsePositives += 1;
      else if (!auto && human) counts.falseNegatives += 1;
      else counts.trueNegatives += 1;
    }
    const predicted = counts.truePositives + counts.falsePositives;
    const actual = counts.truePositives + counts.falseNegatives;

    return {
      itemId,
      ...counts,
      precision: predicted === 0 ? null : counts.truePositives / predicted,
      recall: actual === 0 ? null : counts.truePositives / actual,
      kappa: cohensKappa(labelsA, labelsB),
      humanDisagreements: pairs.length - settled.length,
    };
  });
}

const show = (value: number | null) => (value === null ? "—" : value.toFixed(2));

/** The agreement numbers as a table, with the §9 thresholds applied. */
export function agreementReport(rows: readonly ItemAgreement[]): string {
  const lines = ["itemId\tn\tprecision\trecall\tkappa\thumanDisagreements\tshowToEngineers"];
  for (const row of rows) {
    const n = row.truePositives + row.falsePositives + row.falseNegatives + row.trueNegatives;
    // §9: precision 0.80 for a code rule, kappa 0.60 for a judged one; an item the humans can't
    // agree on is dropped rather than shown to anyone.
    const show_to =
      row.humanDisagreements > 0 && row.kappa !== null && row.kappa < 0.6
        ? "drop: the labellers disagree"
        : (row.precision ?? 0) >= 0.8 && (row.kappa === null || row.kappa >= 0.6)
          ? "yes"
          : "admin only";
    lines.push([row.itemId, n, show(row.precision), show(row.recall), show(row.kappa), row.humanDisagreements, show_to].join("\t"));
  }
  return `${lines.join("\n")}\n`;
}
