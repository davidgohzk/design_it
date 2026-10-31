// What the report's graphs draw, worked out from a result. Pure: the SVG components only lay it out.
//
// Every series here is a *status* (good / warning / critical / neutral), not a set of categories, so
// each slice carries an icon and its count as text and the colours are the report's own --ok / --warn
// / --bad tokens. Red and amber are nearly identical under deuteranopia, so that secondary encoding is
// required, never decoration.
import type { FitResult } from "@/review/levels/fit";
import type { FactState } from "@/review/levels/funnel";
import type { JustifyItem } from "@/review/levels/justify";
import { QUESTION_TAGS } from "@/review/levels/questionTags";
import type { QuestionTag } from "@/review/levels/questionTags";
import { FACT_STATE_LABEL } from "./reportModel";
import type { AssessmentResult } from "@/review/types";

/** How a slice reads: its colour token and the icon that carries the same meaning without colour. */
export type Tone = "good" | "warn" | "bad" | "neutral";
export const TONE_ICON: Record<Tone, string> = { good: "✓", warn: "⚠", bad: "✗", neutral: "⊘" };

export type Slice = { key: string; label: string; count: number; tone: Tone };
export type FunnelStage = { key: string; label: string; count: number; lost: number };

/** Facts leak out between stages; this is where. Found facts only — given facts never enter it. */
export function factFunnel(result: AssessmentResult): FunnelStage[] {
  const { traces } = result.keep;
  const counts = [
    { key: "found", label: "Found in the interview", count: traces.length },
    { key: "requirement", label: "Written as a requirement", count: traces.filter((t) => t.requirementIds.length > 0).length },
    { key: "decision", label: "Used by a decision", count: traces.filter((t) => t.decisionIds.length > 0).length },
    { key: "final", label: "Drawn in the final diagram", count: traces.filter((t) => t.drawn).length },
  ];
  return counts.map((stage, index) => ({ ...stage, lost: index === 0 ? 0 : counts[index - 1].count - stage.count }));
}

const STATE_TONE: Record<FactState, Tone> = {
  carried_through: "good",
  not_drawn: "warn",
  unused: "warn",
  dropped: "warn",
  assumed_silently: "bad",
  missed: "bad",
  client_failed: "neutral",
  given: "neutral",
};

/** Funnel order, so the bar reads from "went all the way" to "never came up". */
const STATE_ORDER: FactState[] = [
  "carried_through",
  "not_drawn",
  "unused",
  "dropped",
  "assumed_silently",
  "missed",
  "client_failed",
  "given",
];

/** Every fact by the state it ended in. */
export function factStateCounts(result: AssessmentResult): Slice[] {
  const counts = new Map<FactState, number>();
  for (const fact of result.ask.facts) counts.set(fact.state, (counts.get(fact.state) ?? 0) + 1);
  return STATE_ORDER.filter((state) => counts.get(state)).map((state) => ({
    key: state,
    label: FACT_STATE_LABEL[state],
    count: counts.get(state)!,
    tone: STATE_TONE[state],
  }));
}

const JUSTIFY_TONE: Record<JustifyItem["verdict"], Tone> = {
  sound: "good",
  weak: "warn",
  unsound: "bad",
  uncertain: "neutral",
  skipped_lint: "neutral",
};
const JUSTIFY_LABEL: Record<JustifyItem["verdict"], string> = {
  sound: "sound",
  weak: "weak",
  unsound: "unsound",
  uncertain: "uncertain",
  skipped_lint: "not judged",
};
const JUSTIFY_ORDER: JustifyItem["verdict"][] = ["sound", "weak", "unsound", "uncertain", "skipped_lint"];

const FIT_TONE: Record<FitResult["verdict"], Tone> = { handled: "good", partly: "warn", not_handled: "bad", uncertain: "neutral" };
const FIT_LABEL: Record<FitResult["verdict"], string> = {
  handled: "handled",
  partly: "partly handled",
  not_handled: "not handled",
  uncertain: "uncertain",
};
const FIT_ORDER: FitResult["verdict"][] = ["handled", "partly", "not_handled", "uncertain"];

function tally<K extends string>(values: K[], order: K[], label: Record<K, string>, tone: Record<K, Tone>): Slice[] {
  const counts = new Map<K, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return order.filter((key) => counts.get(key)).map((key) => ({ key, label: label[key], count: counts.get(key)!, tone: tone[key] }));
}

/** Justify's items and Fit's scenarios, each by verdict. */
export function verdictCounts(result: AssessmentResult): { justify: Slice[]; fit: Slice[] } {
  return {
    justify: tally(result.justify.items.map((item) => item.verdict), JUSTIFY_ORDER, JUSTIFY_LABEL, JUSTIFY_TONE),
    fit: tally(result.fit.scenarios.map((scenario) => scenario.verdict), FIT_ORDER, FIT_LABEL, FIT_TONE),
  };
}

export type TagRow = { tag: QuestionTag; label: string; count: number };

/** How the engineer asked, biggest first. Teaching only: these are never scored. */
export function tagCounts(result: AssessmentResult): TagRow[] {
  return QUESTION_TAGS.map((tag) => ({ tag, label: tag.replace(/_/g, " "), count: result.process.counts[tag] ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || QUESTION_TAGS.indexOf(a.tag) - QUESTION_TAGS.indexOf(b.tag));
}

/** The three things that happen in a session, as the timeline draws them. */
export type EventKind = "question" | "fact" | "wrote";
export type TimelineMark = { kind: EventKind; atMs: number; label: string };
export type SessionTimeline = { marks: TimelineMark[]; durationMs: number };

export const EVENT_LABEL: Record<EventKind, string> = {
  question: "You asked",
  fact: "A fact came out",
  wrote: "You wrote an item",
};

/**
 * When each question was asked, each fact came out and each R# / A# / D# was written, as offsets from
 * the first message. Returns no marks when the transcript has no timestamps (a seeded example).
 */
export function sessionTimeline(
  result: AssessmentResult,
  messages: { role: string; content: string; ts?: number }[],
  edits: { at: number; type: string; diff?: string }[] = [],
): SessionTimeline {
  const start = messages.find((message) => message.ts !== undefined)?.ts;
  if (start === undefined) return { marks: [], durationMs: 0 };
  const marks: TimelineMark[] = [];
  messages.forEach((message, index) => {
    if (message.ts === undefined || message.role !== "user") return;
    marks.push({ kind: "question", atMs: message.ts - start, label: `#${index}` });
  });
  for (const fact of result.ask.facts) {
    const at = fact.messageIndex !== undefined ? messages[fact.messageIndex]?.ts : undefined;
    if (at !== undefined) marks.push({ kind: "fact", atMs: at - start, label: fact.factId });
  }
  for (const edit of edits) {
    if (edit.type !== "editor") continue;
    for (const match of (edit.diff ?? "").matchAll(/^\+- \*\*([RAD]\d+)\*\*/gm)) {
      marks.push({ kind: "wrote", atMs: edit.at - start, label: match[1] });
    }
  }
  marks.sort((a, b) => a.atMs - b.atMs);
  return { marks, durationMs: Math.max(0, ...marks.map((mark) => mark.atMs)) };
}
