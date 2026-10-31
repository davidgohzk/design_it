// Builds the one problem list (WP6) from the format checks, the Mermaid errors and C1–C5, each placed
// on the doc line it is about: the item, the field, or the box or arrow inside a diagram.
import type { ConsistencyResult } from "./consistency";
import { finalDiagramLines } from "./finalSection";
import type { LintWarning } from "./lint";
import type { ParsedDesignDoc } from "./parse";
import type { Problem } from "./problems";
import { sortProblems } from "./problems";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The first line in [start, end] that mentions a node id as a box (or as either end of an arrow). */
export function diagramLineOf(lines: string[], start: number, end: number, nodeId: string, toId?: string) {
  const id = new RegExp(`(^|[^\\w])${escapeRegExp(nodeId)}(?![\\w])`);
  const other = toId ? new RegExp(`(^|[^\\w])${escapeRegExp(toId)}(?![\\w])`) : null;
  for (let line = start; line <= Math.min(end, lines.length); line += 1) {
    const text = lines[line - 1] ?? "";
    if (id.test(text) && (!other || (other.test(text) && /--|==|-\./.test(text)))) return line;
  }
  return null;
}

export function buildProblems({
  markdown,
  doc,
  lint,
  consistency,
  mermaidErrors = {},
}: {
  markdown: string;
  doc: ParsedDesignDoc;
  lint: LintWarning[];
  consistency: ConsistencyResult;
  /** Mermaid's own parse errors, keyed "final" or "sketch:<decision line>". */
  mermaidErrors?: Record<string, string | null | undefined>;
}): Problem[] {
  const lines = markdown.split("\n");
  const finalRange = finalDiagramLines(markdown);
  const problems: Problem[] = lint.map((warning) => ({
    severity: warning.severity,
    line: warning.line,
    message: warning.message,
    source: warning.source,
    itemId: warning.itemId,
    ...(warning.nodeId ? { nodeId: warning.nodeId } : {}),
    rule: warning.rule,
    ...(warning.fix ? { fix: warning.fix } : {}),
  }));

  for (const decision of doc.decisions) {
    const error = mermaidErrors[`sketch:${decision.line}`];
    if (error) {
      problems.push({
        severity: "error",
        line: decision.sketchLines?.start ?? decision.line,
        message: `${decision.id}'s sketch: ${error}`,
        source: "diagram",
        itemId: decision.id,
        rule: "mermaid",
      });
    }
  }
  const finalError = doc.final.parseError ?? mermaidErrors.final;
  if (finalError && finalRange) {
    problems.push({
      severity: "error",
      line: finalRange.start - 1,
      message: `Final diagram: ${finalError}`,
      source: "diagram",
      itemId: "final",
      rule: "mermaid",
    });
  }

  const sketchRange = (decisionId?: string) => {
    const decision = doc.decisions.find((item) => item.id === decisionId);
    return decision?.sketchLines ? { start: decision.sketchLines.start, end: decision.sketchLines.end } : null;
  };
  for (const issue of consistency.issues) {
    const inSketch = issue.check === "C1" || issue.check === "C2";
    const range = inSketch ? sketchRange(issue.decisionId) : finalRange;
    const fallback = inSketch
      ? (doc.decisions.find((item) => item.id === issue.decisionId)?.line ?? 1)
      : (finalRange ? finalRange.start - 1 : 1);
    const line =
      (range &&
        (issue.edge
          ? diagramLineOf(lines, range.start, range.end, issue.edge.from, issue.edge.to)
          : issue.nodeId
            ? diagramLineOf(lines, range.start, range.end, issue.nodeId)
            : null)) ??
      fallback;
    problems.push({
      severity: "warning",
      line,
      message: issue.message,
      source: "diagram",
      itemId: inSketch ? issue.decisionId : "final",
      ...(issue.nodeId ? { nodeId: issue.nodeId } : issue.edge ? { nodeId: issue.edge.from } : {}),
      rule: issue.check,
    });
  }
  return sortProblems(problems);
}
