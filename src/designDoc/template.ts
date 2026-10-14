const FENCE = "```";

/**
 * The empty design doc every case starts from: the three sections, one blank item each with its
 * labelled fields, and the final diagram.
 */
export const EMPTY_DESIGN_DOC_TEMPLATE = `## Requirements
- **R1**

## Assumptions
- **A1**
  - Would confirm by asking:

## Decisions
- **D1**
  - Because: [R1](#R1)
  - Instead of:
  - Trade-off:
  - Quality:
  ${FENCE}mermaid
  flowchart LR
  ${FENCE}

## Final diagram
${FENCE}mermaid
flowchart LR
${FENCE}
`;

/** The snippets the command palette and "/" insert, with ${n:placeholder} tab stops (CodeMirror snippet syntax). */
export const ITEM_SNIPPETS = {
  requirement: "- **R${1:n}** ${2:what you learned} — ${3:cite the chat or brief}",
  assumption: "- **A${1:n}** ${2:what you believe but haven't confirmed}\n  - Would confirm by asking: ${3:question}",
  decision: [
    "- **D${1:n}** ${2:what you chose}",
    "  - Because: ${3:[R1](#R1)}",
    "  - Instead of: ${4:the alternative}",
    "  - Trade-off: ${5:what it costs}",
    "  - Quality: ${6:reliability}",
    `  ${FENCE}mermaid`,
    "  flowchart LR",
    "    ${7:Box[\"Name [container]\"]}",
    `  ${FENCE}`,
  ].join("\n"),
} as const;
