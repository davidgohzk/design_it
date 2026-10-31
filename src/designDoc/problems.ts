// One list of problems for the doc and the diagram, shown as squiggles in the editor and in the
// Problems panel (WP6). Pure data; the editor and panel render it.

export type ProblemSeverity = "error" | "warning" | "info";

/** A placeholder a quick fix (Ctrl/Cmd + .) can insert. */
export type QuickFix =
  | { kind: "add-instead-of"; decisionId: string; line: number }
  | { kind: "add-node-type"; nodeId: string; line: number }
  | { kind: "label-arrow"; from: string; to: string; line: number }
  | { kind: "pick-quality"; decisionId: string; line: number };

export type Problem = {
  severity: ProblemSeverity;
  /** 1-based line in the doc (the final diagram is part of the doc). */
  line: number;
  message: string;
  /** "doc" for R# / D# items, "diagram" for sketches and the final diagram. */
  source: "doc" | "diagram";
  /** The R# or D# it is about, or "final". */
  itemId?: string;
  /** The diagram box it is about, so clicking the problem can highlight it. */
  nodeId?: string;
  /** Short rule name, e.g. "no-alternative", "C3". */
  rule: string;
  fix?: QuickFix;
};

export const SEVERITY_ICON: Record<ProblemSeverity, string> = { error: "✗", warning: "⚠", info: "ℹ" };

const SEVERITY_ORDER: Record<ProblemSeverity, number> = { error: 0, warning: 1, info: 2 };

export const sortProblems = (problems: Problem[]) =>
  [...problems].sort((a, b) => a.line - b.line || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

export function countProblems(problems: Problem[]) {
  return {
    errors: problems.filter((problem) => problem.severity === "error").length,
    warnings: problems.filter((problem) => problem.severity === "warning").length,
    infos: problems.filter((problem) => problem.severity === "info").length,
  };
}
