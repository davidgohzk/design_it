import type { CaseDefinition } from "../../cases";
import type { CaseSeed } from "../../cases/seed";

/** The prepopulated work practice mode can load, each with its review. */
export type ExampleKind = "sample" | "complete";
export type WorkspaceExample = { seed: CaseSeed; label: string; name: string; title: string };

/** What a page running the workspace supplies: its case and the two examples practice mode can load. */
export type WorkspaceConfig = {
  caseDefinition: CaseDefinition;
  examples: Record<ExampleKind, WorkspaceExample>;
};

/** The standard labels for a case's flawed and complete examples. */
export const exampleConfig = (seeds: Record<ExampleKind, CaseSeed>): Record<ExampleKind, WorkspaceExample> => ({
  sample: {
    seed: seeds.sample,
    label: "Flawed example",
    name: "the flawed example",
    title: "Load a sample attempt with deliberate mistakes, so every part of the review has something to show",
  },
  complete: {
    seed: seeds.complete,
    label: "Complete example",
    name: "the complete example",
    title: "Load the complete example: a full interview, the model design doc and final diagram, and its review",
  },
});
