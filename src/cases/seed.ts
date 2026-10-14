// A prepopulated example for a case: its interview, design doc, final diagram, walkthrough answers and
// review. The review is assembled from fixed judge replies by the same code as a live one, so every
// quote is verified and every state is computed from the work; a quote that doesn't verify throws.
import { assembleReview } from "../assessment/assemble";
import type { ScenarioAnswer } from "../assessment/fit";
import { justifyInputs } from "../assessment/justify";
import { extractFinalDiagram, setFinalDiagram } from "../designDoc/finalSection";
import { parseDesignDoc } from "../designDoc/parse";
import type { ChatMessage, InterviewEnd } from "../shared/lib/types";
import type { CaseDefinition } from "./types";

type Verdict = "sound" | "weak" | "unsound";
type Quote = { source: "doc" | "chat" | "brief"; text: string };

/** The judge's verdict on one item. `runs` gives each run's verdict to show a split vote. */
export type SeedJudgement = { verdict: Verdict; reason: string; quote: Quote; runs?: Verdict[] };
export type SeedFit = { verdict: "handled" | "partly" | "not_handled"; reason: string; quote: { source: "answer" | "doc"; text: string } };

type SeedInput = {
  messages: ChatMessage[];
  /** The design doc before its "## Final diagram" section. */
  doc: string;
  finalDiagram: string;
  interviewEnd: InterviewEnd;
  answers: ScenarioAnswer[];
  /** One judgement per item the judge sees (R#, D#, "<D#>-sketch"); items that fail lint are skipped. */
  justify: Record<string, SeedJudgement>;
  fit: Record<string, SeedFit>;
  /** How the final diagram was drafted in the diagram helper, before being copied into the doc. */
  diagramPrompt: string;
};

const SEED_TIME = Date.parse("2026-09-30T09:00:00+08:00");
const RUNS = 3;

export function buildSeed(CASE: CaseDefinition, input: SeedInput) {
  const { messages, doc: docBody, finalDiagram, interviewEnd, answers, justify, fit, diagramPrompt } = input;
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

  const review = assembleReview(
    { caseDefinition: CASE, messages, docMarkdown, finalCode, mode: "practice", interviewEnd, answers },
    { justifyRuns, fit: fitReply, models: ["prepopulated example"] },
    SEED_TIME,
  );
  if (review.verification.discardedQuotes > 0) throw new Error(`A quote in a ${CASE.id} seed review doesn't verify.`);

  const diagramTurns = [{ prompt: diagramPrompt, code: finalCode, at: Date.parse("2026-09-30T08:50:00+08:00") }];
  return { messages, docMarkdown, finalCode, diagramTurns, interviewEnd, answers, review };
}

export type CaseSeed = ReturnType<typeof buildSeed>;

/** Shorthands for seed judgements. */
export const fromDoc = (text: string): Quote => ({ source: "doc", text });
export const fromChat = (text: string): Quote => ({ source: "chat", text });
export const fromAnswer = (text: string) => ({ source: "answer" as const, text });
