// The AI half of the interview-mistake check: one task covering all eleven judged items, sampled
// three times.
//
// The same two rules the rest of the review follows apply here:
// - No unverified AI output reaches the UI. Every quote must appear in the engineer message it is
//   attributed to; an item claimed as observed with no quote that verifies becomes `uncertain`.
// - No agreement means `uncertain`. Bano takes the majority of three (teaching feedback, never
//   scored), where Justify takes unanimity; both rules live in vote.ts with a note on why.
import { isRecord } from "../../shared/lib/evidence";
import type { ChatMessage } from "../../shared/lib/types";
import { quoteFound } from "../quotes";
import { majority } from "../vote";
import { BANO_AI_IDS, BANO_ITEM } from "./checklist";
import type { BanoEvidence, BanoInput, BanoStatus } from "./types";

/** How many times the judge is asked. */
export const BANO_RUNS = 3;

/** One item as a single run decided it. */
export type BanoRunEntry = { status: Exclude<BanoStatus, "see_ask" | "not_applicable" | "info">; note?: string; evidence: BanoEvidence[] };

/** One item after the runs are combined. */
export type BanoAiEntry = BanoRunEntry & { runs: BanoStatus[] };

/**
 * What the judge sees: the numbered transcript, the brief, and for each item our one-line definition
 * with a worked example of the mistake and of a good question for this case. The examples live in the
 * checklist, so one prompt serves every case.
 */
export function banoEvidence(input: BanoInput) {
  const { caseDefinition, messages } = input;
  return {
    brief: caseDefinition.briefMarkdown,
    client: `${caseDefinition.clientName}, ${caseDefinition.clientRole}`,
    transcript: messages.map((message, index) => ({
      messageIndex: index,
      who: message.role === "user" ? "engineer" : "client",
      text: message.content,
    })),
    items: BANO_AI_IDS.map((id) => {
      const item = BANO_ITEM.get(id);
      return {
        id,
        mistake: item?.mistake,
        definition: item?.ai?.definition,
        mistakeExample: item?.ai?.mistakeExample[caseDefinition.id],
        goodExample: item?.ai?.goodExample[caseDefinition.id],
      };
    }),
  };
}

/**
 * One run's reply, checked: known ids only, a boolean verdict, a reason of 25 words or fewer, and only
 * the quotes found in the engineer message they name. Observed with no verified quote is `uncertain`.
 */
export function readBanoRun(
  value: unknown,
  messages: readonly ChatMessage[],
  discarded: { count: number } = { count: 0 },
): Map<string, BanoRunEntry> {
  const entries = new Map<string, BanoRunEntry>();
  if (!Array.isArray(value)) throw new Error("items must be an array.");
  const known = new Set(BANO_AI_IDS);
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== "string" || !known.has(raw.id) || entries.has(raw.id)) continue;
    if (typeof raw.observed !== "boolean") continue;
    const note = typeof raw.reason === "string" ? raw.reason.split(/\s+/).slice(0, 25).join(" ") : undefined;
    if (!raw.observed) {
      entries.set(raw.id, { status: "not_observed", ...(note ? { note } : {}), evidence: [] });
      continue;
    }
    const evidence: BanoEvidence[] = [];
    for (const item of Array.isArray(raw.evidence) ? raw.evidence : []) {
      if (!isRecord(item) || typeof item.messageIndex !== "number" || typeof item.quote !== "string") continue;
      const message = messages[item.messageIndex];
      if (message?.role === "user" && quoteFound(message.content, item.quote)) {
        evidence.push({ messageIndex: item.messageIndex, quote: item.quote });
      } else {
        discarded.count += 1;
      }
    }
    entries.set(
      raw.id,
      evidence.length
        ? { status: "observed", ...(note ? { note } : {}), evidence }
        : { status: "uncertain", note: "The judge said this happened but didn't quote words the engineer wrote.", evidence: [] },
    );
  }
  return entries;
}

/** Combines the runs per item: the majority status stands, and a split or a missing run is `uncertain`. */
export function combineBanoRuns(runs: readonly Map<string, BanoRunEntry>[]): Map<string, BanoAiEntry> {
  const combined = new Map<string, BanoAiEntry>();
  if (runs.length === 0) return combined;
  for (const id of BANO_AI_IDS) {
    const entries = runs.map((run) => run.get(id));
    const statuses = entries.map((entry) => entry?.status ?? "uncertain");
    const winner = majority(statuses);
    if (winner === null || winner === "uncertain") {
      combined.set(id, { status: "uncertain", note: "The judge's runs didn't agree.", evidence: [], runs: statuses });
      continue;
    }
    const agreeing = entries.filter((entry): entry is BanoRunEntry => entry?.status === winner);
    combined.set(id, {
      status: winner,
      ...(agreeing[0]?.note ? { note: agreeing[0].note } : {}),
      evidence: agreeing.flatMap((entry) => entry.evidence),
      runs: statuses,
    });
  }
  return combined;
}
