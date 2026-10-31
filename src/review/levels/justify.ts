// Justify (WP9): does each step follow from the last? The only level judged by AI, so:
// - an item that fails lint is not sent (skipped_lint, no AI call);
// - every quote is checked against its source, and an item with no verified quote is uncertain;
// - each item is judged several times; anything short of a unanimous verdict is uncertain (rule 6).
import type { CaseDefinition } from "@/cases";
import { usableSketches } from "@/designDoc/consistency";
import type { ParsedDesignDoc } from "@/designDoc/parse";
import type { ChatMessage } from "@/lib/types";
import { isRecord } from "@/lib/evidence";
import type { Method } from "./funnel";
import { ownWords } from "./funnel";
import { quoteFound } from "@/review/judge/quotes";
import { unanimous } from "@/review/judge/vote";

export type JustifyKind = "requirement" | "decision" | "sketch";
export type JustifyVerdict = "sound" | "weak" | "unsound" | "uncertain" | "skipped_lint";

export type JustifyItem = {
  itemId: string;
  kind: JustifyKind;
  verdict: JustifyVerdict;
  reason?: string;
  quotes: string[];
  /** Each run's verdict, in order (uncertain where its quotes didn't verify). */
  runs: string[];
  method: Method;
};

/** How many times each item is judged. */
export const JUSTIFY_RUNS = 3;

/** One item as the judge sees it. Sketch items use the id "<D#>-sketch". */
export type JudgeInput = { itemId: string; kind: JustifyKind; text: string; [key: string]: unknown };

export const sketchItemId = (decisionId: string) => `${decisionId}-sketch`;

/**
 * Splits the doc into items for the judge, and items that fail lint (skipped, never sent):
 * a requirement with no verified citation, a decision with no Because: or no Instead of:, a decision
 * with no usable sketch.
 */
export function justifyInputs(doc: ParsedDesignDoc) {
  const send: JudgeInput[] = [];
  const skipped: JustifyItem[] = [];
  const skip = (itemId: string, kind: JustifyKind, reason: string) =>
    skipped.push({ itemId, kind, verdict: "skipped_lint", reason, quotes: [], runs: [], method: "code" });
  const requirementText = new Map(doc.requirements.map((item) => [item.id, ownWords(item.text).trim()]));
  const sketched = new Set(usableSketches(doc.decisions).map((decision) => decision.id));

  for (const requirement of doc.requirements) {
    if (!requirement.text.trim()) continue;
    const quotes = requirement.citations.filter((citation) => citation.valid).map((citation) => ({ source: citation.source, quote: citation.excerpt }));
    if (quotes.length === 0) {
      skip(requirement.id, "requirement", "Not judged: it has no citation that verifies.");
      continue;
    }
    send.push({ itemId: requirement.id, kind: "requirement", text: ownWords(requirement.text).trim(), cites: quotes });
  }
  for (const decision of doc.decisions) {
    if (decision.because.length === 0 || !decision.insteadOf) {
      skip(decision.id, "decision", `Not judged: it has no ${decision.because.length === 0 ? "Because:" : "Instead of:"}.`);
    } else {
      send.push({
        itemId: decision.id,
        kind: "decision",
        text: decision.title,
        because: decision.because.map((id) => ({ id, text: requirementText.get(id) ?? "(missing)" })),
        insteadOf: decision.insteadOf,
        tradeOff: decision.tradeOff,
        quality: decision.qualityText,
      });
    }
    if (!sketched.has(decision.id)) {
      skip(sketchItemId(decision.id), "sketch", "Not judged: there is no sketch to check.");
    } else {
      send.push({ itemId: sketchItemId(decision.id), kind: "sketch", text: decision.title, sketch: decision.sketchCode });
    }
  }
  return { send, skipped };
}

type RunEntry = { verdict: "sound" | "weak" | "unsound" | "uncertain"; reason?: string; quotes: string[] };

/**
 * One run's reply, checked: known items only, a valid verdict, a reason of 25 words or fewer, and only
 * the quotes found in their source. An entry with no verified quote becomes uncertain.
 */
export function readJustifyRun(
  value: unknown,
  sent: JudgeInput[],
  sources: { doc: string; brief: string; messages: ChatMessage[] },
  discarded: { count: number } = { count: 0 },
): Map<string, RunEntry> {
  const entries = new Map<string, RunEntry>();
  if (!Array.isArray(value)) throw new Error("items must be an array.");
  const ids = new Set(sent.map((item) => item.itemId));
  const chat = sources.messages.map((message) => message.content).join("\n");
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.itemId !== "string" || !ids.has(raw.itemId) || entries.has(raw.itemId)) continue;
    const verdict = raw.verdict;
    if (verdict !== "sound" && verdict !== "weak" && verdict !== "unsound") continue;
    const quotes: string[] = [];
    for (const quote of Array.isArray(raw.quotes) ? raw.quotes : []) {
      if (!isRecord(quote) || typeof quote.text !== "string") continue;
      const source = quote.source === "chat" ? chat : quote.source === "brief" ? sources.brief : sources.doc;
      if (quoteFound(source, quote.text)) quotes.push(quote.text);
      else discarded.count += 1;
    }
    const reason = typeof raw.reason === "string" ? raw.reason.split(/\s+/).slice(0, 25).join(" ") : undefined;
    entries.set(raw.itemId, quotes.length ? { verdict, reason, quotes } : { verdict: "uncertain", reason, quotes: [] });
  }
  return entries;
}

/** Combines the runs per item: a unanimous verdict stands; a split vote, or a missing run, is uncertain. */
export function combineJustifyRuns(sent: JudgeInput[], runs: Map<string, RunEntry>[], skipped: JustifyItem[] = []): JustifyItem[] {
  const judged = sent.map((item): JustifyItem => {
    const entries = runs.map((run) => run.get(item.itemId));
    const verdicts = entries.map((entry) => entry?.verdict ?? "uncertain");
    const agreed = unanimous(verdicts);
    const settled = agreed !== null && agreed !== "uncertain";
    const verdict = settled ? agreed : "uncertain";
    const agreeing = entries.filter((entry): entry is RunEntry => Boolean(entry) && entry!.verdict === verdict);
    return {
      itemId: item.itemId,
      kind: item.kind,
      verdict,
      reason: settled ? agreeing[0]?.reason : "The judge's runs didn't agree, or didn't back their verdict with a quote.",
      quotes: [...new Set(agreeing.flatMap((entry) => entry.quotes))],
      runs: verdicts,
      method: settled ? "ai_verified_quote" : "ai_judgment",
    };
  });
  return [...judged, ...skipped].sort((a, b) => {
    const [x, y] = [docOrder(a.itemId), docOrder(b.itemId)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
}

/** Doc order: requirements, then each decision followed by its sketch. */
function docOrder(itemId: string): [number, number, number] {
  const match = itemId.match(/^([RD])(\d+)(-sketch)?$/);
  if (!match) return [9, 0, 0];
  return ["RD".indexOf(match[1]), Number(match[2]), match[3] ? 1 : 0];
}

/** The evidence sent with each justify run. */
export const justifyEvidence = (caseDefinition: CaseDefinition, items: JudgeInput[]) => ({
  rubricAnchors: caseDefinition.rubricAnchors,
  items,
});
