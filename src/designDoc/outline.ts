// What the editor shows around the doc (WP5): the Outline list, the citation lens above each R#,
// definitions for hover and Go to Definition, and the `#` reference completions. Pure functions only.
import type { ParsedDesignDoc } from "./parse";
import type { Problem, ProblemSeverity } from "./problems";

export type ItemKind = "requirement" | "assumption" | "decision";

export type OutlineItem = {
  id: string;
  kind: ItemKind;
  line: number;
  title: string;
  /** The worst problem on this item, if any. */
  worst: ProblemSeverity | null;
  problemCount: number;
};

export type ItemDefinition = { id: string; kind: ItemKind; line: number; text: string; quotes: string[] };

/** Citations as their label, emphasis removed: "Bookings rise — Chat #4". */
export const readableText = (markdown: string) =>
  markdown
    .replace(/\[([^\]]+)\]\((?:[^()"]|"(?:[^"\\]|\\.)*")*\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();

const shorten = (text: string, max = 70) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function items(parsed: ParsedDesignDoc) {
  return [
    ...parsed.requirements.map((item) => ({ id: item.id, kind: "requirement" as const, line: item.line, text: item.text })),
    ...parsed.assumptions.map((item) => ({ id: item.id, kind: "assumption" as const, line: item.line, text: item.text })),
    ...parsed.decisions.map((item) => ({ id: item.id, kind: "decision" as const, line: item.line, text: item.title })),
  ].sort((a, b) => a.line - b.line);
}

/** The Outline side list: every R#, A# and D# in doc order, with its worst problem. */
export function docOutline(parsed: ParsedDesignDoc, problems: Problem[] = []): OutlineItem[] {
  const rank: Record<ProblemSeverity, number> = { error: 0, warning: 1, info: 2 };
  return items(parsed).map((item) => {
    const own = problems.filter((problem) => problem.itemId === item.id);
    const worst = own.reduce<ProblemSeverity | null>(
      (best, problem) => (best === null || rank[problem.severity] < rank[best] ? problem.severity : best),
      null,
    );
    return {
      id: item.id,
      kind: item.kind,
      line: item.line,
      title: shorten(readableText(item.text.replace(/\s+—\s+\[(?:Brief|Chat)[^\n]*$/, ""))) || "(empty)",
      worst,
      problemCount: own.length,
    };
  });
}

/** For hover and Go to Definition: each item's line, its text, and the quotes it cites. */
export function itemDefinitions(parsed: ParsedDesignDoc): Map<string, ItemDefinition> {
  const quotes = new Map(parsed.requirements.map((item) => [item.id, item.citations.map((citation) => citation.excerpt)]));
  const definitions = new Map<string, ItemDefinition>();
  for (const item of items(parsed)) {
    if (definitions.has(item.id)) continue;
    definitions.set(item.id, {
      id: item.id,
      kind: item.kind,
      line: item.line,
      text: readableText(item.text),
      quotes: quotes.get(item.id) ?? [],
    });
  }
  return definitions;
}

/**
 * The lens line shown above each R#: where it was cited from, and (practice mode only, because scored
 * modes must not show Keep results live) which decisions use it.
 */
export function citationLenses(parsed: ParsedDesignDoc, { showUsedBy }: { showUsedBy: boolean }): Map<number, string> {
  const lenses = new Map<number, string>();
  for (const requirement of parsed.requirements) {
    const sources = [...new Set(requirement.citations.filter((c) => c.valid).map((c) => c.label))];
    const broken = requirement.citations.some((citation) => !citation.valid);
    const parts = [
      sources.length ? `cited from ${sources.join(", ")}` : requirement.citations.length ? "" : "no citation",
      broken ? "a quote isn't found" : "",
    ];
    if (showUsedBy) {
      const users = parsed.decisions.filter((decision) => decision.because.includes(requirement.id)).map((d) => d.id);
      parts.push(users.length ? `used by ${[...new Set(users)].join(", ")}` : "not used by a decision yet");
    }
    lenses.set(requirement.line, parts.filter(Boolean).join(" · "));
  }
  return lenses;
}

export type ReferenceCompletion = { id: string; label: string; insert: string; detail: string };

/** What `#` offers: every R#, A# and D#, inserting a link like [R3](#R3). */
export function referenceCompletions(parsed: ParsedDesignDoc): ReferenceCompletion[] {
  return [...itemDefinitions(parsed).values()].map((item) => ({
    id: item.id,
    label: item.id,
    insert: `[${item.id}](#${item.id})`,
    detail: shorten(item.text, 60),
  }));
}

/** The R#, A# or D# id at a character offset in a line, e.g. for Ctrl/Cmd + click. */
export function itemIdAt(lineText: string, offset: number): string | null {
  for (const match of lineText.matchAll(/\b([RAD]\d+)\b/g)) {
    const start = match.index ?? 0;
    if (offset >= start && offset <= start + match[0].length) return match[1];
  }
  return null;
}
