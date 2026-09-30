// The final diagram lives at the end of the design doc, as a Mermaid block under "## Final diagram".
// These helpers read and write that block; everything else treats its code as the final diagram.

const FINAL_HEADING = /^##\s+final diagram\s*$/i;
const HEADING = /^#{1,6}\s/;
const FENCE_OPEN = /^(\s*)```\s*mermaid\s*$/i;
const FENCE_CLOSE = /^\s*```\s*$/;
const FENCE = "```";

type FinalBlock = {
  /** 0-based index of the "## Final diagram" heading. */
  heading: number;
  /** 0-based indexes of the opening and closing fence, when there is a block. */
  open?: number;
  close?: number;
  indent: string;
};

function findFinalBlock(lines: string[]): FinalBlock | null {
  const heading = lines.findIndex((line) => FINAL_HEADING.test(line));
  if (heading < 0) return null;
  for (let index = heading + 1; index < lines.length; index += 1) {
    if (HEADING.test(lines[index])) break;
    const fence = lines[index].match(FENCE_OPEN);
    if (!fence) continue;
    let close = index + 1;
    while (close < lines.length && !FENCE_CLOSE.test(lines[close])) close += 1;
    return { heading, open: index, close, indent: fence[1] };
  }
  return { heading, indent: "" };
}

/** The final diagram's Mermaid code, or "" when the doc has no final diagram block. */
export function extractFinalDiagram(markdown: string): string {
  const lines = markdown.split("\n");
  const block = findFinalBlock(lines);
  if (!block || block.open === undefined) return "";
  return lines
    .slice(block.open + 1, block.close)
    .map((line) => (line.startsWith(block.indent) ? line.slice(block.indent.length) : line.trimStart()))
    .join("\n")
    .trim();
}

/** 1-based line of the final diagram's opening fence, for pointing warnings at it. */
export function finalDiagramLine(markdown: string): number | null {
  const block = findFinalBlock(markdown.split("\n"));
  return block?.open !== undefined ? block.open + 1 : block ? block.heading + 1 : null;
}

/** Writes the final diagram into the doc: replaces the block, adds one under the heading, or appends the section. */
export function setFinalDiagram(markdown: string, code: string): string {
  const lines = markdown.split("\n");
  const block = findFinalBlock(lines);
  const fenced = [`${FENCE}mermaid`, ...code.trim().split("\n"), FENCE];
  if (!block) {
    const trimmed = markdown.replace(/\s+$/, "");
    return `${trimmed}${trimmed ? "\n\n" : ""}## Final diagram\n${fenced.join("\n")}\n`;
  }
  if (block.open === undefined) {
    lines.splice(block.heading + 1, 0, ...fenced);
  } else {
    const indented = fenced.map((line) => (line ? block.indent + line : line));
    lines.splice(block.open, (block.close ?? lines.length - 1) - block.open + 1, ...indented);
  }
  return lines.join("\n");
}
