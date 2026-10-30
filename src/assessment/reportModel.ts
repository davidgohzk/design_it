// What the report shows, worked out from a result (WP11). Pure: the components only lay it out.
import type { CaseDefinition, CaseFact } from "../cases";
import { hasSketch } from "../designDoc/parse";
import type { ParsedDesignDoc } from "../designDoc/parse";
import type { FactState, FactTrace } from "./funnel";
import type { AssessmentResult, Level, SessionMode } from "./types";

/** ✓ passed, ✗ failed, ⊘ skipped (nothing to check). */
export type LevelOutcome = "pass" | "fail" | "skipped";
export const OUTCOME_ICON: Record<LevelOutcome, string> = { pass: "✓", fail: "✗", skipped: "⊘" };

export type RowStatus = "pass" | "warn" | "fail" | "skipped";
export const ROW_ICON: Record<RowStatus, string> = { pass: "✓", warn: "⚠", fail: "✗", skipped: "⊘" };

const FOUND: FactState[] = ["dropped", "unused", "not_drawn", "carried_through"];

export const FACT_STATE_LABEL: Record<FactState, string> = {
  given: "given in the brief",
  client_failed: "client failed to answer",
  missed: "missed",
  assumed_silently: "assumed silently",
  dropped: "dropped",
  unused: "unused",
  not_drawn: "not drawn",
  carried_through: "carried through",
};

/** The outcome of each level, for the Checks list. */
export function levelOutcomes(result: AssessmentResult): Record<Level, LevelOutcome> {
  const { gate, ask, keep, justify, fit } = result;
  const askStates = ask.facts.map((fact) => fact.state);
  const judged = justify.items.filter((item) => item.verdict !== "skipped_lint");
  return {
    gate: gate.sessionComplete && gate.clientFailed.length === 0 && gate.leaks.length === 0 && gate.phantoms.length === 0 ? "pass" : "fail",
    ask: askStates.some((state) => state === "missed" || state === "assumed_silently") ? "fail" : "pass",
    keep:
      keep.traces.length === 0 && keep.uncitedRequirements.length + keep.unsupportedDecisions.length + keep.unjustifiedNodes.length + keep.unexplainedEdges.length === 0
        ? "skipped"
        : keep.traces.every((trace) => trace.state === "carried_through") &&
            keep.uncitedRequirements.length + keep.unsupportedDecisions.length + keep.unjustifiedNodes.length + keep.unexplainedEdges.length === 0
          ? "pass"
          : "fail",
    // Like a GitHub review: comments (weak) don't block; only "request changes" (unsound) fails.
    justify: judged.length === 0 ? "skipped" : judged.some((item) => item.verdict === "unsound") ? "fail" : "pass",
    fit: fit.scenarios.length === 0 ? "skipped" : fit.scenarios.every((scenario) => scenario.verdict === "handled") ? "pass" : "fail",
  };
}

export type AskRow = {
  fact: CaseFact;
  state: FactState;
  status: RowStatus;
  expected: string;
  actual: string;
  /** Practice mode only: the first example question. */
  tryAsking?: string;
  messageIndex?: number;
  method: AssessmentResult["ask"]["facts"][number]["method"];
};

/** Ask as test rows: found = pass, assumed openly = warn, missed / assumed silently = fail, client failed = skipped. */
export function askRows(result: AssessmentResult, caseDefinition: CaseDefinition, mode: SessionMode): AskRow[] {
  const rows: AskRow[] = [];
  for (const entry of result.ask.facts) {
    const fact = caseDefinition.facts.find((item) => item.id === entry.factId);
    if (!fact || entry.state === "given") continue;
    const status: RowStatus = FOUND.includes(entry.state) ? "pass" : entry.state === "client_failed" ? "skipped" : "fail";
    const how = fact.disclosure === "on-probe" ? "a follow-up question" : "a question in its area";
    rows.push({
      fact,
      state: entry.state,
      status,
      expected: `The client gives it in reply to ${how} (${fact.topicArea.toLowerCase()}).`,
      actual:
        status === "pass"
          ? `Found in Chat #${entry.messageIndex}.`
          : entry.state === "client_failed"
            ? `You asked in Chat #${entry.messageIndex}, but the client didn't answer. Left out of your scores.`
            : entry.state === "assumed_silently"
              ? "Never asked, but your doc states it as if the client had said it."
              : "It never came up.",
      ...(mode === "practice" && status === "fail" && fact.exampleQuestions[0] ? { tryAsking: fact.exampleQuestions[0] } : {}),
      ...(entry.messageIndex !== undefined ? { messageIndex: entry.messageIndex } : {}),
      method: entry.method,
    });
  }
  // Practice mode: the earliest problem in the chain first.
  if (mode === "practice") {
    const rank: Record<RowStatus, number> = { fail: 0, warn: 1, skipped: 2, pass: 3 };
    rows.sort((a, b) => rank[a.status] - rank[b.status]);
  }
  return rows;
}

/** "3 passed · 1 failed · 1 skipped" (and warnings, when there are any). */
export function summaryLine(rows: { status: RowStatus }[]) {
  const count = (status: RowStatus) => rows.filter((row) => row.status === status).length;
  const parts = [`${count("pass")} passed`, `${count("fail")} failed`];
  if (count("warn")) parts.push(`${count("warn")} warning${count("warn") === 1 ? "" : "s"}`);
  parts.push(`${count("skipped")} skipped`);
  return parts.join(" · ");
}

export type TraceFrame = { label: string; ok: boolean; detail: string };

/** One Keep trace as a stack trace: Fact → R# → D# → sketch → final, with the first break marked. */
export function traceFrames(trace: FactTrace, doc: ParsedDesignDoc): { frames: TraceFrame[]; brokenAt: number | null } {
  const decisions = doc.decisions.filter((decision) => trace.decisionIds.includes(decision.id));
  const sketched = decisions.filter(hasSketch);
  const frames: TraceFrame[] = [
    { label: trace.factId, ok: true, detail: "found in the interview" },
    {
      label: trace.requirementIds.join(", ") || "R#",
      ok: trace.requirementIds.length > 0,
      detail: trace.requirementIds.length ? "requirement cites the chat" : "no requirement cites the message that gave it",
    },
    {
      label: trace.decisionIds.join(", ") || "D#",
      ok: trace.decisionIds.length > 0,
      detail: trace.decisionIds.length ? "decision is because of it" : "no decision is because of that requirement",
    },
    {
      label: "sketch",
      ok: sketched.length > 0,
      detail: sketched.length ? `${sketched.map((decision) => decision.id).join(", ")} sketched` : "no sketch for those decisions",
    },
    {
      label: "final",
      ok: trace.drawn,
      detail: trace.drawn ? "in the final diagram" : "the sketch isn't in the final diagram (C1 / C2)",
    },
  ];
  const broken = frames.findIndex((frame) => !frame.ok);
  return { frames, brokenAt: broken < 0 ? null : broken };
}

/** Keep traces, earliest break first in practice mode. */
export function orderedTraces(result: AssessmentResult, mode: SessionMode) {
  const rank: Record<string, number> = { dropped: 0, unused: 1, not_drawn: 2, carried_through: 3 };
  const traces = [...result.keep.traces];
  return mode === "practice" ? traces.sort((a, b) => (rank[a.state] ?? 9) - (rank[b.state] ?? 9)) : traces;
}

export type SummaryNumbers = {
  onProbe: { found: number; eligible: number } | null;
  carriedThrough: { carried: number; found: number };
  unjustifiedBoxes: number;
  assumedSilently: number;
};

/** The summary strip: separate numbers, never a total. */
export function summaryNumbers(result: AssessmentResult): SummaryNumbers {
  return {
    onProbe: result.ask.onProbe.eligible > 0 ? result.ask.onProbe : null,
    carriedThrough: {
      carried: result.keep.traces.filter((trace) => trace.state === "carried_through").length,
      found: result.keep.traces.length,
    },
    unjustifiedBoxes: result.keep.unjustifiedNodes.length,
    assumedSilently: result.ask.facts.filter((fact) => fact.state === "assumed_silently").length,
  };
}

/** The fair-session banner, or null when the session was fair and complete. */
export function fairnessBanner(result: AssessmentResult, caseDefinition: CaseDefinition): string | null {
  const parts: string[] = [];
  const excluded = result.gate.clientFailed.length;
  if (excluded) {
    const labels = result.gate.clientFailed.map((failure) => caseDefinition.facts.find((fact) => fact.id === failure.factId)?.label ?? failure.factId);
    parts.push(
      `${excluded} fact${excluded === 1 ? " was" : "s were"} excluded: you asked well, but the client didn't answer (${labels.join(", ")}).`,
    );
  }
  if (result.gate.failedReplies.length) {
    parts.push(`${result.gate.failedReplies.length} client repl${result.gate.failedReplies.length === 1 ? "y" : "ies"} failed to arrive.`);
  }
  if (!result.gate.failedReplies.length && !result.gate.sessionComplete) parts.push("The interview was never ended with End interview.");
  return parts.length ? parts.join(" ") : null;
}

/** Practice advice for How you worked, from the tag counts. */
export function processAdvice(result: AssessmentResult): string[] {
  const { counts } = result.process;
  const questions = result.process.tags.length;
  const advice: string[] = [];
  if (!questions) return ["You didn't ask the client anything."];
  if ((counts.open ?? 0) < questions / 2) advice.push("Most of your questions were closed. Open ones (what, why, how) let the client tell you what you didn't know to ask.");
  if (!counts.follow_up) advice.push("None of your questions followed up on what the client just said. Hidden facts usually come out on a follow-up.");
  if (counts.leading) advice.push(`${counts.leading} question${counts.leading === 1 ? " suggested" : "s suggested"} its own answer. Ask without hinting at what you expect.`);
  if (counts.solution_asking) advice.push("You asked the client to choose a solution. Ask about the problem; choosing is your job.");
  if (counts.jargon) advice.push(`You used technical words ${counts.jargon} time${counts.jargon === 1 ? "" : "s"}. A non-technical client may not follow them.`);
  if (counts.multi_question) advice.push("Some messages asked several questions at once; the client may answer only one.");
  if (!counts.summarise_back) advice.push("Try summarising back (\"So to confirm, …\") to check you understood.");
  return advice.length ? advice : ["Good interviewing habits throughout."];
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/**
 * The "What you did" line each level opens with: a plain recap of the engineer's own work, with no
 * verdict in it. Code only — it is counted off the result, so it never needs checking.
 */
export function levelRecap(result: AssessmentResult, doc: ParsedDesignDoc): Record<Level, string> {
  const { gate, ask, keep, justify, fit } = result;
  const questions = ask.facts.filter((fact) => fact.state !== "given");
  const found = questions.filter((fact) => FOUND.includes(fact.state)).length;
  const judged = justify.items.filter((item) => item.verdict !== "skipped_lint").length;
  const carried = keep.traces.filter((trace) => trace.state === "carried_through").length;
  const answered = fit.scenarios.filter((scenario) => scenario.pickedDecisionIds.length > 0).length;
  return {
    gate: `You asked ${plural(result.process.tags.length, "question")} over the interview, and ${
      gate.sessionComplete ? "ended it with End interview" : "never ended it with End interview"
    }.`,
    ask: `Of the ${plural(questions.length, "fact")} the client was holding, you got ${found} out of them${
      gate.clientFailed.length ? `, and ${plural(gate.clientFailed.length, "other")} ${gate.clientFailed.length === 1 ? "is" : "are"} left out because the client didn't answer` : ""
    }.`,
    keep: `You wrote ${plural(doc.requirements.length, "requirement")} and ${plural(
      doc.decisions.length,
      "decision",
    )}, and drew ${plural(doc.final.nodes.length, "box", "boxes")} in the final diagram. ${carried} of the ${keep.traces.length} facts you found reach that diagram.`,
    justify: `${plural(judged, "item")} in your doc could be read as a step from a fact to a decision, so ${
      judged === 1 ? "it was" : "they were"
    } judged${justify.items.length > judged ? `; ${justify.items.length - judged} were skipped because they didn't have the parts to judge` : ""}.`,
    fit: `You walked your design through ${plural(fit.scenarios.length, "scenario")}${
      fit.scenarios.length ? `, picking decisions for ${answered} of them` : ""
    }.`,
  };
}
