const FENCE = "```";

/**
 * The empty design doc every case starts from: the two sections, one blank item each with its
 * labelled fields, and the final diagram.
 */
export const EMPTY_DESIGN_DOC_TEMPLATE = `## Requirements
- **R1**

## Decisions
- **D1**
  - Because: [R1](#R1)
  - Instead of:
  - Trade-off:
  - Quality:
  ${FENCE}mermaid
  flowchart TD
  ${FENCE}

## Final diagram
${FENCE}mermaid
flowchart TD
${FENCE}
`;

export type ItemTemplate = "requirement" | "decision";

/** The next free number for each kind of item, e.g. { R: 6, A: 3, D: 6 }. */
export function nextItemNumbers(markdown: string) {
  const next = { R: 1, A: 1, D: 1 };
  for (const match of markdown.matchAll(/\*\*([RD])(\d+)\*\*/g)) {
    const kind = match[1] as keyof typeof next;
    next[kind] = Math.max(next[kind], Number(match[2]) + 1);
  }
  return next;
}

/**
 * The snippets the command palette and "/" insert, numbered after the doc's last item, with
 * ${n:placeholder} tab stops (CodeMirror snippet syntax). Tab moves between the fields.
 */
export function itemSnippet(kind: ItemTemplate, markdown: string): string {
  const next = nextItemNumbers(markdown);
  if (kind === "requirement") return `- **R${next.R}** \${1:what you learned} — \${2:cite the chat or brief}`;
  return [
    `- **D${next.D}** \${1:what you chose}`,
    "  - Because: ${2:[R1](#R1)}",
    "  - Instead of: ${3:the alternative}",
    "  - Trade-off: ${4:what it costs}",
    "  - Quality: ${5:reliability}",
    `  ${FENCE}mermaid`,
    "  flowchart TD",
    '    ${6:Box["Name [container]"]}',
    `  ${FENCE}`,
  ].join("\n");
}

export const ITEM_TEMPLATE_LABELS: Record<ItemTemplate, string> = {
  requirement: "New requirement",
  decision: "New decision",
};
