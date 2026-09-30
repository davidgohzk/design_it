// Process measures (§8), shown in the admin view in research mode and included in the session export.
import { parseMermaidFlowchart } from "../designDoc/parse";
import type { ChatMessage } from "../types";
import type { AssessmentResult } from "./types";

export type FinalTurnLike = { source: "ai" | "merge" | "manual" | "seed"; code: string; at: number };
export type AIEventLike = { kind: "sketch" | "final"; ok: boolean };

export type ProcessMeasures = {
  questions: number;
  /** ms from the start to the client message that surfaced the first fact; null if none surfaced. */
  timeToFirstSurfacedFactMs: number | null;
  timeOnTaskMs: number;
  sketchPrompts: number;
  finalPrompts: number;
  /** Share of the final diagram's boxes whose first appearance came from an AI turn; null with no boxes. */
  aiCreatedNodeShare: number | null;
};

export function computeProcessMeasures({
  startedAt,
  endedAt,
  messages,
  messageTimes,
  aiEvents,
  finalHistory,
  finalCode,
  result,
}: {
  startedAt: number;
  endedAt: number;
  messages: ChatMessage[];
  messageTimes: number[];
  aiEvents: AIEventLike[];
  finalHistory: FinalTurnLike[];
  finalCode: string;
  result: AssessmentResult | null;
}): ProcessMeasures {
  const surfacedTimes = (result?.found.facts ?? [])
    .filter((fact) => fact.state === "surfaced" && fact.messageIndex !== undefined)
    .map((fact) => messageTimes[fact.messageIndex!])
    .filter((at): at is number => typeof at === "number");

  const firstSource = new Map<string, FinalTurnLike["source"]>();
  for (const turn of finalHistory) {
    for (const node of parseMermaidFlowchart(turn.code).nodes) {
      if (!firstSource.has(node.id)) firstSource.set(node.id, turn.source);
    }
  }
  const finalNodes = parseMermaidFlowchart(finalCode).nodes;
  const aiNodes = finalNodes.filter((node) => firstSource.get(node.id) === "ai").length;

  return {
    questions: messages.filter((message) => message.role === "user").length,
    timeToFirstSurfacedFactMs: surfacedTimes.length ? Math.min(...surfacedTimes) - startedAt : null,
    timeOnTaskMs: Math.max(0, endedAt - startedAt),
    sketchPrompts: aiEvents.filter((event) => event.kind === "sketch").length,
    finalPrompts: aiEvents.filter((event) => event.kind === "final").length,
    aiCreatedNodeShare: finalNodes.length ? aiNodes / finalNodes.length : null,
  };
}
