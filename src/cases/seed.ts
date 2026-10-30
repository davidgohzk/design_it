// A prepopulated example for a case: its interview, design doc, final diagram, scenario answers and
// review. The review is assembled from fixed judge replies by the same code as a live one, so every
// quote is verified and every state is computed from the work; a quote that doesn't verify throws.
import { assembleReview } from "../assessment/assemble";
import type { ScenarioAnswer } from "../assessment/fit";
import { turnEvidence } from "../assessment/elicitation";
import { rationaleEvidence } from "../assessment/summaryReview";
import { justifyInputs } from "../assessment/justify";
import { extractFinalDiagram, setFinalDiagram } from "../designDoc/finalSection";
import { parseDesignDoc, QUALITIES } from "../designDoc/parse";
import type { ChatMessage, InterviewEnd } from "../shared/lib/types";
import type { CaseDefinition } from "./types";

type Verdict = "sound" | "weak" | "unsound";
type Quote = { source: "doc" | "chat" | "brief"; text: string };

/** The judge's verdict on one item. `runs` gives each run's verdict to show a split vote. */
export type SeedJudgement = { verdict: Verdict; reason: string; quote: Quote; runs?: Verdict[] };
export type SeedFit = { verdict: "handled" | "partly" | "not_handled"; reason: string; quote: { source: "answer" | "doc"; text: string } };
/**
 * How the turns judge classified one interviewer message: what the engineer was doing, and the hidden
 * requirements the question went after. `targets` holds fact ids that were still hidden at that turn;
 * whether a target actually came out is computed from the client's reply, never seeded.
 */
export type SeedTurn = { action: "clarify" | "probe" | "finish"; targets?: string[]; reasoning: string };
/** The judge's reading of one scenario: a verdict per dimension, with a quote that must verify. */
export type SeedScenario = {
  decision: Verdict;
  diagram: Verdict;
  justification: Verdict;
  reasons: { decision: string; diagram: string; justification: string };
  quote: { source: "answer" | "doc"; text: string };
};
/** One point of the ISO 25010 critique. A quote that does not verify is kept, but marked unbacked. */
export type SeedIsoPoint = { point: string; refs?: string[]; quote?: string };
/** The critique of one ISO/IEC 25010 characteristic. A characteristic left out is not_addressed. */
export type SeedIso = {
  verdict: "strong" | "adequate" | "weak";
  summary: string;
  strengths?: SeedIsoPoint[];
  weaknesses?: SeedIsoPoint[];
  improvements?: SeedIsoPoint[];
};

type SeedInput = {
  messages: ChatMessage[];
  /** The design doc before its "## Final diagram" section. */
  doc: string;
  finalDiagram: string;
  interviewEnd: InterviewEnd;
  /** When the interview began. Every message is stamped from here, so the timed rules can run. */
  interviewStart: number;
  /**
   * How long one message came after the one before it, in minutes, keyed by its index; anything else
   * uses DEFAULT_GAP_MIN. A gap longer than the pause threshold is what the pause rule reports.
   */
  gapsMin?: Record<number, number>;
  answers: ScenarioAnswer[];
  /** One judgement per item the judge sees (R#, D#, "<D#>-sketch"); items that fail lint are skipped. */
  justify: Record<string, SeedJudgement>;
  fit: Record<string, SeedFit>;
  /** One label per interviewer message, keyed by its index in `messages`, as the turns judge returns them. */
  turns: Record<number, SeedTurn>;
  /** One reading per scenario the case defines. */
  scenarioAdequacy: Record<string, SeedScenario>;
  /** The ISO 25010 critique, keyed by characteristic id. */
  iso: Record<string, SeedIso>;
  /**
   * The judge's verdict on a link of the reasoning chain, keyed as rationaleEvidence keys them
   * ("brief>R1", "chat:3>R1", "R1>D1", "D1>D1-sketch", "D1-sketch>box"). Every other link is sound:
   * a model answer's chain holds together, and listing all of them would bury the interesting ones.
   */
  rationale?: Record<string, { verdict: Verdict; reason: string }>;
  /** The coaching line per stage, as the suggest task returns it. Its refs are checked like a live one's. */
  suggestions?: { stage: string; text: string; refs: string[] }[];
  /** How the final diagram was drafted in the diagram helper, before being copied into the doc. */
  diagramPrompt: string;
};

const SEED_TIME = Date.parse("2026-09-30T09:00:00+08:00");
const RUNS = 3;
/** How long apart seeded messages are, unless the seed says otherwise. */
const DEFAULT_GAP_MIN = 2;

/**
 * The interview on a clock: every message stamped, so the rules that need one can run instead of
 * reporting that this session has no timestamps. A seeded gap is how many minutes after the message
 * before it this one came.
 */
const stamped = (messages: ChatMessage[], start: number, gapsMin: Record<number, number>): ChatMessage[] => {
  let at = start;
  return messages.map((message, index) => {
    if (index > 0) at += (gapsMin[index] ?? DEFAULT_GAP_MIN) * 60_000;
    return { ...message, ts: at };
  });
};

export function buildSeed(CASE: CaseDefinition, input: SeedInput) {
  const { doc: docBody, finalDiagram, interviewEnd, answers, justify, fit, turns, scenarioAdequacy, iso, rationale, suggestions, diagramPrompt } = input;
  const messages = stamped(input.messages, input.interviewStart, input.gapsMin ?? {});
  // The design doc ends with its final diagram, as a Mermaid block under "## Final diagram".
  const docMarkdown = setFinalDiagram(docBody, finalDiagram);
  const finalCode = extractFinalDiagram(docMarkdown);

  // Every item the judge would see needs a seeded judgement, and nothing else may have one.
  const { send } = justifyInputs(parseDesignDoc(docMarkdown, finalCode, CASE.briefMarkdown, messages));
  const sent = send.map((item) => item.itemId);
  const missing = sent.filter((id) => !justify[id]);
  const extra = Object.keys(justify).filter((id) => !sent.includes(id));
  if (missing.length || extra.length) {
    throw new Error(`${CASE.id} seed: judge items missing ${missing.join(", ") || "none"}, extra ${extra.join(", ") || "none"}`);
  }
  const justifyRuns = Array.from({ length: RUNS }, (_, run) =>
    sent.map((itemId) => {
      const { verdict, reason, quote, runs } = justify[itemId];
      return { itemId, verdict: runs?.[run] ?? verdict, reason, quotes: [quote] };
    }),
  );
  const fitReply = Object.entries(fit).map(([scenarioId, { verdict, reason, quote }]) => ({ scenarioId, verdict, reason, quotes: [quote] }));

  // Every interviewer message needs a label and nothing else may have one, so the example's
  // elicitation measures are as complete as a live review's. A target must still have been hidden at
  // that turn, which is the same allow-list readTurnLabels applies to a live reply.
  const evidence = turnEvidence(CASE, messages);
  const expected = evidence.turns.map((turn) => turn.messageIndex);
  const labelled = Object.keys(turns).map(Number);
  const unlabelled = expected.filter((index) => !labelled.includes(index));
  const notATurn = labelled.filter((index) => !expected.includes(index));
  if (unlabelled.length || notATurn.length) {
    throw new Error(`${CASE.id} seed: turn labels missing ${unlabelled.join(", ") || "none"}, extra ${notATurn.join(", ") || "none"}`);
  }
  const scenarioReply = CASE.scenarios.map((scenario) => {
    const seeded = scenarioAdequacy[scenario.id];
    if (!seeded) throw new Error(`${CASE.id} seed: scenario ${scenario.id} has no adequacy reading.`);
    const { decision, diagram, justification, reasons, quote } = seeded;
    return { scenarioId: scenario.id, decision, diagram, justification, reasons, quotes: [quote] };
  });
  const extraScenarios = Object.keys(scenarioAdequacy).filter((id) => !CASE.scenarios.some((scenario) => scenario.id === id));
  if (extraScenarios.length) throw new Error(`${CASE.id} seed: ${extraScenarios.join(", ")} is not a scenario of this case.`);

  const isoReply = Object.entries(iso).map(([id, { verdict, summary, strengths, weaknesses, improvements }]) => ({
    id,
    verdict,
    summary,
    strengths: strengths ?? [],
    weaknesses: weaknesses ?? [],
    improvements: improvements ?? [],
  }));
  const notACharacteristic = Object.keys(iso).filter((id) => !(QUALITIES as readonly string[]).includes(id));
  if (notACharacteristic.length) throw new Error(`${CASE.id} seed: ${notACharacteristic.join(", ")} is not an ISO 25010 characteristic.`);

  const turnLabels = evidence.turns.map((turn) => {
    const label = turns[turn.messageIndex];
    const hidden = new Set(turn.remainingRequirements.map((fact) => fact.id));
    const stale = (label.targets ?? []).filter((id) => !hidden.has(id));
    if (stale.length) {
      throw new Error(`${CASE.id} seed: turn ${turn.messageIndex} targets ${stale.join(", ")}, which the client had already given.`);
    }
    return {
      messageIndex: turn.messageIndex,
      action_type: label.action,
      relevant_implicit_requirement_ids: label.targets ?? [],
      is_relevant_to_implicit_requirements: (label.targets ?? []).length > 0,
      reasoning: label.reasoning,
    };
  });

  // One verdict per link of the reasoning chain. A model answer's chain holds together, so a link is
  // sound unless the seed says otherwise, and its quote is taken from the text the link joins, which
  // is what makes it verify the way a live reply's quote has to.
  const rationaleReply = rationaleEvidence(parseDesignDoc(docMarkdown, finalCode, CASE.briefMarkdown, messages)).map((link) => {
    const seeded = rationale?.[link.id];
    const source = link.sourceText.trim() || link.targetText.trim();
    return {
      id: link.id,
      verdict: seeded?.verdict ?? "sound",
      reason: seeded?.reason ?? "Follows from what it cites.",
      quote: source.split(/\s+/).slice(0, 6).join(" "),
    };
  });
  const notALink = Object.keys(rationale ?? {}).filter((id) => !rationaleReply.some((link) => link.id === id));
  if (notALink.length) throw new Error(`${CASE.id} seed: ${notALink.join(", ")} is not a link of this doc's reasoning chain.`);

  const review = assembleReview(
    { caseDefinition: CASE, messages, docMarkdown, finalCode, mode: "practice", interviewEnd, answers },
    {
      justifyRuns,
      fit: fitReply,
      turnLabels,
      scenarioAdequacy: scenarioReply,
      iso: isoReply,
      rationale: rationaleReply,
      suggestions,
      models: ["prepopulated example"],
    },
    SEED_TIME,
  );
  if (review.verification.discardedQuotes > 0) throw new Error(`A quote or reference in a ${CASE.id} seed review doesn't verify.`);
  if (review.suggestions.length !== (suggestions?.length ?? 0)) throw new Error(`A suggestion in a ${CASE.id} seed names something that isn't in the work.`);

  const diagramTurns = [{ prompt: diagramPrompt, code: finalCode, at: Date.parse("2026-09-30T08:50:00+08:00") }];
  return { messages, docMarkdown, finalCode, diagramTurns, interviewEnd, answers, review };
}

export type CaseSeed = ReturnType<typeof buildSeed>;

/** Shorthands for seed judgements. */
export const fromDoc = (text: string): Quote => ({ source: "doc", text });
export const fromChat = (text: string): Quote => ({ source: "chat", text });
export const fromAnswer = (text: string) => ({ source: "answer" as const, text });
