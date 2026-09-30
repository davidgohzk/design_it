// One JSON file per /simple session, for research (§8).
import type { ResponseMeta } from "../api";
import type { CaseDefinition } from "../cases";
import type { ParsedDesignDoc } from "../designDoc/parse";
import type { ChatMessage, TimelineEntry } from "../types";
import type { ProcessMeasures } from "./process";
import type { AssessmentResult } from "./types";

export type SessionMode = "practice" | "assessment" | "research";

export type SessionExport = {
  format: "design_it.simple-session";
  formatVersion: 1;
  exportedAt: string;
  caseId: string;
  caseVersion: number;
  mode: SessionMode;
  startedAt: string;
  transcript: { index: number; role: ChatMessage["role"]; content: string; at: string | null }[];
  designDoc: string;
  sketches: { decisionId: string; line: number; code: string | null }[];
  finalDiagram: { code: string; history: { source: string; prompt?: string; code: string; at: string }[] };
  timeline: (Omit<TimelineEntry, "at"> & { at: string })[];
  aiEvents: { kind: string; target?: string; prompt: string; at: string; ok: boolean; error?: string; model?: string; promptVersion?: string }[];
  assessment: AssessmentResult | null;
  assessmentHistory: AssessmentResult[];
  processMeasures: ProcessMeasures;
  models: {
    chat: ResponseMeta[];
    diagram: ResponseMeta[];
    assessment: { model: string; promptVersion: string } | null;
  };
};

const iso = (at: number) => new Date(at).toISOString();

const distinctMeta = (metas: ResponseMeta[]) => {
  const seen = new Map<string, ResponseMeta>();
  for (const meta of metas) {
    if (meta.model || meta.promptVersion) seen.set(`${meta.model}|${meta.promptVersion}`, meta);
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
  aiEvents,
  chatMeta,
  assessment,
  assessmentHistory,
  processMeasures,
  now = Date.now(),
}: {
  caseDefinition: CaseDefinition;
  mode: SessionMode;
  startedAt: number;
  messages: ChatMessage[];
  messageTimes: number[];
  docMarkdown: string;
  parsed: ParsedDesignDoc;
  finalCode: string;
  finalHistory: { source: string; prompt?: string; code: string; at: number }[];
  timeline: TimelineEntry[];
  aiEvents: ({ kind: string; target?: string; prompt: string; at: number; ok: boolean; error?: string } & ResponseMeta)[];
  chatMeta: ResponseMeta[];
  assessment: AssessmentResult | null;
  assessmentHistory: AssessmentResult[];
  processMeasures: ProcessMeasures;
  now?: number;
}): SessionExport {
  return {
    format: "design_it.simple-session",
    formatVersion: 1,
    exportedAt: iso(now),
    caseId: caseDefinition.id,
    caseVersion: caseDefinition.version,
    mode,
    startedAt: iso(startedAt),
    transcript: messages.map((message, index) => ({
      index,
      role: message.role,
      content: message.content,
      at: messageTimes[index] ? iso(messageTimes[index]) : null,
    })),
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
    timeline: timeline.map((entry) => ({ ...entry, at: iso(entry.at) })),
    aiEvents: aiEvents.map((event) => ({ ...event, at: iso(event.at) })),
    assessment,
    assessmentHistory,
    processMeasures,
    models: {
      chat: distinctMeta(chatMeta),
      diagram: distinctMeta(aiEvents),
      assessment: assessment ? { model: assessment.model, promptVersion: assessment.promptVersion } : null,
    },
  };
}
