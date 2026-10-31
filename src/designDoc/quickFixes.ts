// Quick fixes (Ctrl/Cmd + .) for the first four lint rules: each inserts a placeholder and selects it,
// so the engineer types straight over it. Pure: takes the doc text, returns one edit.
import type { QuickFix } from "./problems";

export type DocEdit = { from: number; to: number; insert: string; cursor: number; label: string };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const QUICK_FIX_LABELS: Record<QuickFix["kind"], string> = {
  "add-instead-of": "Add an Instead of: line",
  "add-node-type": "Add a [type] to this box",
  "label-arrow": "Label this arrow",
  "pick-quality": "Use an ISO 25010 quality",
};

function lineStart(lines: string[], line: number) {
  let offset = 0;
  for (let index = 0; index < line - 1 && index < lines.length; index += 1) offset += lines[index].length + 1;
  return offset;
}

export function quickFixEdit(doc: string, fix: QuickFix): DocEdit | null {
  const lines = doc.split("\n");
  if (fix.line < 1 || fix.line > lines.length) return null;
  const start = lineStart(lines, fix.line);
  const text = lines[fix.line - 1];
  const label = QUICK_FIX_LABELS[fix.kind];

  if (fix.kind === "add-instead-of") {
    const placeholder = "the alternative you considered";
    // Labelled: a new field after Because: (or after the decision line). Inline: append to the line.
    let after = fix.line;
    for (let index = fix.line; index < lines.length && /^\s+- /.test(lines[index]); index += 1) {
      if (/^\s+-\s+because\s*:/i.test(lines[index])) after = index + 1;
    }
    const labelled = /^\s+-\s+(because|trade-?off|quality)\s*:/i.test(lines[fix.line] ?? "");
    if (labelled) {
      const at = lineStart(lines, after) + lines[after - 1].length;
      const insert = `\n  - Instead of: ${placeholder}`;
      return { from: at, to: at, insert, cursor: at + insert.length, label };
    }
    const at = start + text.length;
    const insert = ` Instead of: ${placeholder}.`;
    return { from: at, to: at, insert, cursor: at + insert.length - 1, label };
  }

  if (fix.kind === "pick-quality") {
    const match = text.match(/^(\s*-\s*quality\s*:\s*)(.*)$/i);
    if (!match) return null;
    const from = start + match[1].length;
    return { from, to: start + text.length, insert: "reliability", cursor: from + "reliability".length, label };
  }

  if (fix.kind === "add-node-type") {
    const id = escapeRegExp(fix.nodeId);
    const quoted = new RegExp(`(^|[^\\w])${id}\\s*[[({>]{1,3}"([^"]*)"`).exec(text);
    if (quoted) {
      const closeQuote = quoted.index + quoted[0].length - 1;
      const insert = " [container]";
      return { from: start + closeQuote, to: start + closeQuote, insert, cursor: start + closeQuote + insert.length, label };
    }
    const bare = new RegExp(`(^|[^\\w])${id}\\s*([[({>]{1,3})([^\\])}"]*)`).exec(text);
    if (bare && bare[3] !== undefined) {
      const labelEnd = bare.index + bare[0].length;
      const insert = " [container]";
      return { from: start + labelEnd, to: start + labelEnd, insert, cursor: start + labelEnd + insert.length, label };
    }
    const plain = new RegExp(`(^|[^\\w])(${id})(?![\\w\\[({])`).exec(text);
    if (!plain) return null;
    const from = start + plain.index + plain[1].length;
    const insert = `${fix.nodeId}["${fix.nodeId} [container]"]`;
    return { from, to: from + fix.nodeId.length, insert, cursor: from + insert.length, label };
  }

  // label-arrow: put |"label"| straight after the arrow between the two boxes.
  const arrow = new RegExp(
    `(^|[^\\w])${escapeRegExp(fix.from)}(?:\\s*[[({>][^\\n]*?[\\])}])?\\s*(-{2,}>|-{3,}|={2,}>|={3,}|-\\.+->|-\\.+-)(?!\\s*\\|)`,
  ).exec(text);
  if (!arrow) return null;
  const at = start + arrow.index + arrow[0].length;
  const insert = '|"label"|';
  return { from: at, to: at, insert, cursor: at + insert.length - 2, label };
}
