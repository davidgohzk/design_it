// Process measures (§8), shown in the admin view in research mode and included in the session export.
import { parseMermaidFlowchart } from "../designDoc/parse";
import type { ChatMessage } from "../shared/lib/types";
import type { AssessmentResult } from "./types";

/** A version of the doc's final diagram. */
export type FinalTurnLike = { source: "manual" | "seed"; code: string; at: number };
/** A diagram the helper panel produced (it never edits the doc). */
export type DiagramTurnLike = { code: string; at: number };
export type AIEventLike = { kind: "diagram"; ok: boolean };

export type ProcessMeasures = {
  questions: number;
  /** ms from the start to the client message that surfaced the first fact; null if none surfaced. */
  timeToFirstSurfacedFactMs: number | null;
  timeOnTaskMs: number;
  /** Prompts sent to the diagram helper, including failed ones. */
  diagramPrompts: number;
  /**
   * Share of the final diagram's boxes that first appeared in a diagram-helper result (and were then
   * copied into the doc), rather than first being written in the doc; null with no boxes.
   */
  aiCreatedNodeShare: number | null;
};

export function computeProcessMeasures({
  startedAt,
  endedAt,
  messages,
  messageTimes,
  aiEvents,
  diagramTurns,
  finalHistory,
  finalCode,
  result,
}: {
  startedAt: number;
  endedAt: number;
  messages: ChatMessage[];
  messageTimes: number[];
  aiEvents: AIEventLike[];
  diagramTurns: DiagramTurnLike[];
  finalHistory: FinalTurnLike[];
  finalCode: string;
  result: AssessmentResult | null;
}): ProcessMeasures {
  const surfacedTimes = (result?.found.facts ?? [])
    .filter((fact) => fact.state === "surfaced" && fact.messageIndex !== undefined)
    .map((fact) => messageTimes[fact.messageIndex!])
    .filter((at): at is number => typeof at === "number");

  // Where each box id first appeared, in time order: a helper result ("ai") or the doc itself.
  const versions = [
    ...diagramTurns.map((turn) => ({ from: "ai" as const, code: turn.code, at: turn.at })),
    ...finalHistory.map((turn) => ({ from: "doc" as const, code: turn.code, at: turn.at })),
  ].sort((a, b) => a.at - b.at);
  const firstSeen = new Map<string, "ai" | "doc">();
  for (const version of versions) {
    for (const node of parseMermaidFlowchart(version.code).nodes) {
      if (!firstSeen.has(node.id)) firstSeen.set(node.id, version.from);
    }
  }
  const finalNodes = parseMermaidFlowchart(finalCode).nodes;
  const aiNodes = finalNodes.filter((node) => firstSeen.get(node.id) === "ai").length;

  return {
    questions: messages.filter((message) => message.role === "user").length,
    timeToFirstSurfacedFactMs: surfacedTimes.length ? Math.min(...surfacedTimes) - startedAt : null,
    timeOnTaskMs: Math.max(0, endedAt - startedAt),
    diagramPrompts: aiEvents.filter((event) => event.kind === "diagram").length,
    aiCreatedNodeShare: finalNodes.length ? aiNodes / finalNodes.length : null,
  };
}
