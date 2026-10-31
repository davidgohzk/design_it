// One JSON file per session, for research (WP12): the transcript with its disclosure and guard logs
// and per-turn models, timestamps, the doc's history, sketches, the final diagram's history, the
// walkthrough answers, the review with every judge run, the intake, and 👍 / 👎 feedback.
// importSessionExport reads a file back into the same inputs, so an export round-trips.
// The review carries its own interview-mistake report inside `process.bano`, so nothing here needs to
// know about it; scripts/bano-labelling-sheet.ts reads it straight out of an exported file.
import type { ResponseMeta } from "@/lib/api";
import type { CaseDefinition } from "@/cases";
import { isRecord } from "@/lib/evidence";
import type { ParsedDesignDoc } from "@/designDoc/parse";
import type { ChatMessage, InterviewEnd, TimelineEntry } from "@/lib/types";
import type { ScenarioAnswer } from "@/review/levels/fit";
import type { Intake } from "./intake";
import type { ProcessMeasures } from "@/review/levels/process";
import type { AssessmentResult, SessionMode } from "@/review/types";

export const SESSION_FORMAT = "design_it.session";

export type FeedbackRecord = { caseId: string; item: string; verdict: "right" | "wrong"; timestamp: number };

export type SessionExportInput = {
  caseDefinition: Pick<CaseDefinition, "id">;
  mode: SessionMode;
  startedAt: number;
  messages: ChatMessage[];
  messageTimes: number[];
  docMarkdown: string;
  parsed: Pick<ParsedDesignDoc, "decisions">;
  finalCode: string;
  finalHistory: { source: string; code: string; at: number }[];
  timeline: TimelineEntry[];
  chatMeta: ResponseMeta[];
  interviewEnd?: InterviewEnd | null;
  answers?: ScenarioAnswer[];
  intake?: Intake | null;
  feedback?: FeedbackRecord[];
  assessment: AssessmentResult | null;
  assessmentHistory: AssessmentResult[];
  processMeasures: ProcessMeasures;
  now?: number;
};

export type SessionExport = ReturnType<typeof buildSessionExport>;

const iso = (at: number) => new Date(at).toISOString();
const ms = (at: string) => Date.parse(at);

const distinctMeta = (metas: ResponseMeta[]) => {
  const seen = new Map<string, ResponseMeta>();
  for (const meta of metas) {
    if (meta.model) seen.set(meta.model, meta);
  }
  return [...seen.values()];
};

export function buildSessionExport({
  caseDefinition,
  mode,
  startedAt,
  messages,
  messageTimes,
  docMarkdown,
  parsed,
  finalCode,
  finalHistory,
  timeline,
  chatMeta,
  interviewEnd = null,
  answers = [],
  intake = null,
  feedback = [],
  assessment,
  assessmentHistory,
  processMeasures,
  now = Date.now(),
}: SessionExportInput) {
  return {
    format: SESSION_FORMAT,
    exportedAt: iso(now),
    caseId: caseDefinition.id,
    mode,
    startedAt: iso(startedAt),
    intake,
    transcript: messages.map((message, index) => ({
      index,
      role: message.role,
      content: message.content,
      at: messageTimes[index] ? iso(messageTimes[index]) : null,
      ...(message.disclosedFactIds ? { disclosedFactIds: message.disclosedFactIds } : {}),
      ...(message.guard ? { guard: message.guard } : {}),
      ...(message.model ? { model: message.model } : {}),
    })),
    interviewEnd: interviewEnd ? { ...interviewEnd, at: iso(interviewEnd.at) } : null,
    designDoc: docMarkdown,
    sketches: parsed.decisions.map((decision) => ({
      decisionId: decision.id,
      line: decision.line,
      code: decision.sketchCode,
    })),
    finalDiagram: {
      code: finalCode,
      history: finalHistory.map((turn) => ({ ...turn, at: iso(turn.at) })),
    },
    /** Every edit to the doc (as diffs), citation and chat message, in order. */
    timeline: timeline.map((entry) => ({ ...entry, at: iso(entry.at) })),
    scenarioAnswers: answers,
    /** The review, with every judge run (justify.items[].runs). */
    assessment,
    assessmentHistory,
    processMeasures,
    feedback,
    models: {
      chat: distinctMeta(chatMeta),
      assessment: assessment ? { model: assessment.model } : null,
    },
  };
}

/** Reads an exported session back into the exporter's inputs. Throws on a file that isn't one. */
export function importSessionExport(value: unknown): Omit<SessionExportInput, "now"> & { exportedAt: number } {
  if (!isRecord(value) || value.format !== SESSION_FORMAT) throw new Error("This isn't a design_it session file.");
  const data = value as unknown as SessionExport;
  const messageTimes = data.transcript.map((entry) => (entry.at ? ms(entry.at) : 0));
  const messages: ChatMessage[] = data.transcript.map((entry) => ({
    role: entry.role,
    content: entry.content,
    ...(entry.at ? { ts: ms(entry.at) } : {}),
    ...(entry.disclosedFactIds ? { disclosedFactIds: entry.disclosedFactIds } : {}),
    ...(entry.guard ? { guard: entry.guard } : {}),
    ...(entry.model ? { model: entry.model } : {}),
  }));
  return {
    exportedAt: ms(data.exportedAt),
    caseDefinition: { id: data.caseId },
    mode: data.mode,
    startedAt: ms(data.startedAt),
    messages,
    messageTimes,
    docMarkdown: data.designDoc,
    parsed: {
      decisions: data.sketches.map((sketch) => ({ id: sketch.decisionId, line: sketch.line, sketchCode: sketch.code })) as ParsedDesignDoc["decisions"],
    },
    finalCode: data.finalDiagram.code,
    finalHistory: data.finalDiagram.history.map((turn) => ({ ...turn, at: ms(turn.at) })),
    timeline: data.timeline.map((entry) => ({ ...entry, at: ms(entry.at) })) as TimelineEntry[],
    chatMeta: data.models.chat,
    interviewEnd: data.interviewEnd ? { ...data.interviewEnd, at: ms(data.interviewEnd.at) } : null,
    answers: data.scenarioAnswers,
    intake: data.intake,
    feedback: data.feedback,
    assessment: data.assessment,
    assessmentHistory: data.assessmentHistory,
    processMeasures: data.processMeasures,
  };
}
