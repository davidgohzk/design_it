import type { ParsedDecision } from "./parse";

const SKETCH_INDENT = "  ";

/** Replaces a decision's sketch block (or inserts one under the decision) with the given Mermaid code. */
export function setDecisionSketch(markdown: string, decision: ParsedDecision, code: string): string {
  const lines = markdown.split("\n");
  const block = [
    `${SKETCH_INDENT}\`\`\`mermaid`,
    ...code.split("\n").map((line) => (line ? SKETCH_INDENT + line : line)),
    `${SKETCH_INDENT}\`\`\``,
  ];
  if (decision.sketchLines) {
    const { start, end } = decision.sketchLines;
    lines.splice(start - 1, end - start + 1, ...block);
  } else {
    lines.splice(decision.line, 0, ...block);
  }
  return lines.join("\n");
}
