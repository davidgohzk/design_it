import type { CaseDefinition } from "../cases";
import type { ChatMessage, InterviewEnd } from "../shared/lib/types";
import { disclosedIn } from "./matching";

export type InterviewAction = "clarify" | "probe" | "finish" | "unclassified";
export type TurnLabel = {
  messageIndex: number;
  actionType: InterviewAction;
  targetIds: string[];
  reasoning: string;
};
export type ElicitationTurn = TurnLabel & {
  turn: number;
  questioningTurn?: number;
  newlyElicitedIds: string[];
  keyQuestion: boolean;
  effective: boolean;
};
export type Ratio = { numerator: number; denominator: number; value: number | null };
export type ElicitationResult = {
  promptVersion?: string;
  turns: ElicitationTurn[];
  ire: Ratio;
  clarificationEsr: Ratio;
  probingEsr: Ratio;
  tkqr: Ratio;
  elicitedIds: string[];
  /**
   * False when no turn could be classified, so the strategy measures (ESR, TKQR) and the Action
   * column have nothing behind them. `labelErrors` says why, when the judge was the reason.
   */
  labelsAvailable: boolean;
  labelErrors?: string[];
};

/**
 * The evidence for the turns judge: the transcript once, then one entry per interviewer turn. The
 * transcript is sent once rather than re-sent per turn, so a whole interview fits in one call and
 * stays inside the judge's token budget.
 */
export function turnEvidence(caseDefinition: CaseDefinition, messages: ChatMessage[]) {
  const hidden = caseDefinition.facts.filter((fact) => fact.disclosure !== "given");
  const remaining = new Set(hidden.map((fact) => fact.id));
  const turns: { messageIndex: number; latestUtterance: string; remainingRequirements: { id: string; detail: string }[] }[] = [];
  messages.forEach((message, messageIndex) => {
    if (message.role === "user") {
      turns.push({
        messageIndex,
        latestUtterance: message.content,
        remainingRequirements: hidden.filter((fact) => remaining.has(fact.id)).map(({ id, detail }) => ({ id, detail })),
      });
    } else if (message.role === "assistant") {
      for (const id of disclosedIn(caseDefinition.facts, message)) remaining.delete(id);
    }
  });
  const transcript = messages.map(({ role, content }, messageIndex) => ({ messageIndex, role, content }));
  return { initialRequirements: caseDefinition.briefMarkdown, transcript, turns };
}

export function readTurnLabels(raw: unknown, caseDefinition: CaseDefinition, messages: ChatMessage[]): TurnLabel[] {
  if (!Array.isArray(raw)) return [];
  const contexts = new Map(turnEvidence(caseDefinition, messages).turns.map((turn) => [turn.messageIndex, turn]));
  const seen = new Set<number>();
  const labels: TurnLabel[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const index = entry.messageIndex;
    if (typeof index !== "number" || !contexts.has(index) || seen.has(index)) continue;
    const action = entry.action_type;
    if (action !== "clarify" && action !== "probe" && action !== "finish") continue;
    const allowed = new Set(contexts.get(index)!.remainingRequirements.map((fact) => fact.id));
    const ids = Array.isArray(entry.relevant_implicit_requirement_ids)
      ? [...new Set(entry.relevant_implicit_requirement_ids.filter((id): id is string => typeof id === "string" && allowed.has(id)))]
      : [];
    labels.push({ messageIndex: index, actionType: action, targetIds: action === "finish" ? [] : ids, reasoning: typeof entry.reasoning === "string" ? entry.reasoning.slice(0, 300) : "" });
    seen.add(index);
  }
  return labels;
}

const ratio = (numerator: number, denominator: number): Ratio => ({ numerator, denominator, value: denominator ? numerator / denominator : null });

/** Scores are calculated from verified client disclosures; labels only describe interviewer intent. */
export function computeElicitation(
  caseDefinition: CaseDefinition,
  messages: ChatMessage[],
  labels: TurnLabel[],
  interviewEnd?: InterviewEnd | null,
  labelErrors: string[] = [],
): ElicitationResult {
  const hidden = caseDefinition.facts.filter((fact) => fact.disclosure !== "given");
  const hiddenIds = new Set(hidden.map((fact) => fact.id));
  const elicited = new Set<string>();
  const creditedTargets = new Set<string>();
  const byIndex = new Map(labels.map((label) => [label.messageIndex, label]));
  const turns: ElicitationTurn[] = [];
  let questioningTurn = 0;
  messages.forEach((message, index) => {
    if (message.role !== "user") return;
    const label = byIndex.get(index) ?? { messageIndex: index, actionType: "unclassified" as const, targetIds: [], reasoning: "Turn classification unavailable." };
    const next = messages.slice(index + 1).find((candidate) => candidate.role === "assistant" || candidate.role === "user");
    const newlyElicitedIds = next?.role === "assistant"
      ? disclosedIn(caseDefinition.facts, next).filter((id) => hiddenIds.has(id) && !elicited.has(id))
      : [];
    const targetIds = label.targetIds.filter((id) => hiddenIds.has(id) && !elicited.has(id));
    const keyQuestion = label.actionType !== "finish" && label.actionType !== "unclassified" && targetIds.some((id) => !creditedTargets.has(id));
    if (label.actionType !== "finish" && label.actionType !== "unclassified") {
      questioningTurn += 1;
      for (const id of targetIds) creditedTargets.add(id);
    }
    for (const id of newlyElicitedIds) elicited.add(id);
    turns.push({ ...label, turn: turns.length + 1, ...(label.actionType === "finish" || label.actionType === "unclassified" ? {} : { questioningTurn }), newlyElicitedIds, keyQuestion, effective: newlyElicitedIds.length > 0 });
  });
  if (interviewEnd) turns.push({ messageIndex: -1, actionType: "finish", targetIds: [], reasoning: interviewEnd.reason || "Interview ended.", turn: turns.length + 1, newlyElicitedIds: [], keyQuestion: false, effective: false });
  const strategy = (action: InterviewAction) => {
    const relevant = turns.filter((turn) => turn.actionType === action);
    return ratio(relevant.filter((turn) => turn.effective).length, relevant.length);
  };
  const questions = turns.filter((turn) => turn.questioningTurn !== undefined);
  const discount = (turn: number) => 1 / Math.log2(turn + 1);
  const actual = questions.reduce((sum, turn) => sum + (turn.keyQuestion ? discount(turn.questioningTurn!) : 0), 0);
  const ideal = Array.from({ length: Math.min(questions.length, hidden.length) }, (_, i) => discount(i + 1)).reduce((a, b) => a + b, 0);
  return {
    turns,
    ire: ratio(elicited.size, hidden.length),
    clarificationEsr: strategy("clarify"),
    probingEsr: strategy("probe"),
    tkqr: { numerator: actual, denominator: ideal, value: ideal ? Math.min(1, actual / ideal) : null },
    elicitedIds: [...elicited],
    labelsAvailable: labels.length > 0,
    ...(labelErrors.length ? { labelErrors } : {}),
  };
}
