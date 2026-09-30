const FENCE = "```";

/** The empty design doc every case starts from: the three sections, one blank item each, and the final diagram. */
export const EMPTY_DESIGN_DOC_TEMPLATE = `## Requirements
- **R1**

## Assumptions
- **A1**

## Decisions
- **D1**  — because [R1](#R1). Trade-off:
  ${FENCE}mermaid
  flowchart TD
  ${FENCE}

## Final diagram
${FENCE}mermaid
flowchart TD
${FENCE}
`;
