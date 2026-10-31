// Process measures (§8), shown in the admin view in research mode and included in the session export.
import type { ChatMessage } from "@/lib/types";
import { FOUND_STATES } from "./funnel";
import type { AssessmentResult } from "@/review/types";

export type ProcessMeasures = {
  questions: number;
  /** ms from the start to the client message that surfaced the first fact; null if none surfaced. */
  timeToFirstSurfacedFactMs: number | null;
  timeOnTaskMs: number;
};

export function computeProcessMeasures({
  startedAt,
  endedAt,
  messages,
  messageTimes,
  result,
}: {
  startedAt: number;
  endedAt: number;
  messages: ChatMessage[];
  messageTimes: number[];
  result: AssessmentResult | null;
}): ProcessMeasures {
  const surfacedTimes = (result?.ask.facts ?? [])
    .filter((fact) => FOUND_STATES.includes(fact.state) && fact.messageIndex !== undefined)
    .map((fact) => messageTimes[fact.messageIndex!])
    .filter((at): at is number => typeof at === "number");

  return {
    questions: messages.filter((message) => message.role === "user").length,
    timeToFirstSurfacedFactMs: surfacedTimes.length ? Math.min(...surfacedTimes) - startedAt : null,
    timeOnTaskMs: Math.max(0, endedAt - startedAt),
  };
}
