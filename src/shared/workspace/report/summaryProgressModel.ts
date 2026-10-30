import type { ExtraCheck, ExtraProgress, LevelProgress, LevelStatus } from "../../../assessment/run";
import type { Level } from "../../../assessment/types";

export type SummaryStep = { label: string; status: LevelStatus };
export type SummarySectionProgress = {
  key: string;
  title: string;
  description: string;
  status: LevelStatus | "partial";
  steps: SummaryStep[];
};

const sectionStatus = (steps: SummaryStep[]): SummarySectionProgress["status"] => {
  const statuses = steps.map((step) => step.status);
  if (statuses.includes("running")) return "running";
  if (statuses.every((status) => status === "skipped")) return "skipped";
  if (statuses.every((status) => status === "done" || status === "skipped")) return "done";
  if (statuses.some((status) => status === "done" || status === "skipped")) return "partial";
  return "waiting";
};

/** Align the running work with the five sections that replace it in the finished summary. */
export function summaryProgress(
  progress: Partial<Record<Level, LevelProgress>>,
  extraProgress: Partial<Record<ExtraCheck, ExtraProgress>>,
): SummarySectionProgress[] {
  const level = (name: Level): LevelStatus => progress[name]?.status ?? "waiting";
  const extra = (name: ExtraCheck): LevelStatus => extraProgress[name]?.status ?? "waiting";
  const sections: Omit<SummarySectionProgress, "status">[] = [
    {
      key: "chatbot", title: "1. AI Client Chatbot", description: "Checking the simulated client and interview session.",
      steps: [{ label: "Client and session checks", status: level("gate") }],
    },
    {
      key: "elicitation", title: "2. Requirement Elicitation", description: "Measuring hidden requirement coverage and questioning strategy.",
      steps: [{ label: "IRE, ESR and TKQR", status: level("ask") }, { label: "Bano labelling", status: extra("bano") }],
    },
    {
      key: "design", title: "3. Design Document", description: "Checking traceability and the rationale for decisions and diagram links.",
      steps: [{ label: "Traceability", status: level("keep") }, { label: "Design justification", status: level("justify") }, { label: "Rationale links", status: extra("rationale") }],
    },
    {
      key: "scenarios", title: "4. Scenario Adequacy", description: "Checking each scenario's decision, diagram and justification links.",
      steps: [{ label: "Scenario answers", status: level("fit") }],
    },
    {
      key: "overall", title: "5. Overall design · ISO/IEC 25010", description: "Critiquing the design against the ISO/IEC 25010 quality characteristics.",
      steps: [{ label: "ISO 25010 critique", status: extra("iso") }],
    },
  ];
  return sections.map((section) => ({ ...section, status: sectionStatus(section.steps) }));
}
