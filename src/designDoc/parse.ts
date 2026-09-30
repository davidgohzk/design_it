// Parser for the /simple design doc (Requirements → Assumptions → Decisions, each decision with
// a Mermaid sketch) and for Mermaid flowcharts. Pure functions only: no React, no mermaid.js.
import { extractReviewReferences } from "../shared/lib/evidence";
import type { ChatMessage, ReviewReference } from "../shared/lib/types";

type NodeShape = { open: string; close: string };
export type GraphNode = { id: string; label: string; isActor: boolean };
type GraphEdge = { from: string; to: string; label?: string };
export type ParsedGraph = { nodes: GraphNode[]; edges: GraphEdge[]; parseError?: string };

export type ParsedRequirement = { id: string; text: string; citations: ReviewReference[]; line: number };
export type ParsedAssumption = { id: string; text: string; line: number };
export type ParsedDecision = {
  id: string;
  text: string;
  requirementIds: string[];
  hasBecause: boolean;
  hasTradeOff: boolean;
  line: number;
  sketchCode: string | null;
  sketch: ParsedGraph | null;
  /** 1-based lines of the opening and closing fence, so the sketch can be replaced in place. */
  sketchLines: { start: number; end: number } | null;
};
export type ParsedDesignDoc = {
  requirements: ParsedRequirement[];
  assumptions: ParsedAssumption[];
  decisions: ParsedDecision[];
  final: ParsedGraph;
  /** Computed from the sketches: node id → ids of the decisions whose sketch contains it. */
  nodeDecisions: Record<string, string[]>;
};

export const edgeKey = (edge: { from: string; to: string }) => `${edge.from}->${edge.to}`;
const isActorLabel = (label: string) => /\(actor\)/i.test(label);

// ---------------------------------------------------------------------------------------------
// Mermaid flowcharts

/** Longest openers first, so "[(" is tried before "[". */
const SHAPES: NodeShape[] = [
  { open: "(((", close: ")))" },
  { open: "((", close: "))" },
  { open: "([", close: "])" },
  { open: "[[", close: "]]" },
  { open: "[(", close: ")]" },
  { open: "[/", close: "/]" },
  { open: "[\\", close: "\\]" },
  { open: "{{", close: "}}" },
  { open: "[", close: "]" },
  { open: "(", close: ")" },
  { open: "{", close: "}" },
  { open: ">", close: "]" },
];

const HEADER = /^(?:flowchart|graph)(?:\s+(?:TB|TD|BT|RL|LR))?\s*;?$/i;
const IGNORED_STATEMENT = /^(?:subgraph|end|classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/;
const NODE_ID = /^[A-Za-z0-9_]+/;
// "-- text -->", "== text ==>" and "-. text .->"; the text may not start like an arrow.
const LABELED_LINK =
  /^(?:--|==|-\.)\s+(?:"([^"]*)"|([^\s"|\-=.>][^"|]*?))\s+(?:-{2,}>|-{3,}|={2,}>|={3,}|\.-+>|\.-+)/;
const PLAIN_LINK = /^<?(?:-{2,}>|-{3,}|={2,}>|={3,}|-\.+->|-\.+-|--[ox]|==[ox])/;
const PIPE_LABEL = /^\s*\|\s*(?:"([^"]*)"|([^|]*))\s*\|/;

type NodeRef = { id: string; label?: string };
class MermaidSyntaxError extends Error {}

/** Splits outside double quotes; used for "%%" comments and ";" statement separators. */
function splitOutsideQuotes(text: string, separator: string) {
  const parts: string[] = [];
  let inQuote = false;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '"') inQuote = !inQuote;
    else if (!inQuote && text.startsWith(separator, index)) {
      parts.push(text.slice(start, index));
      start = index + separator.length;
      index += separator.length - 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

function readNode(text: string, position: number): { node: NodeRef; end: number } | null {
  const idMatch = text.slice(position).match(NODE_ID);
  if (!idMatch) return null;
  const id = idMatch[0];
  let end = position + id.length;
  const shape = SHAPES.find((candidate) => text.startsWith(candidate.open, end));
  let label: string | undefined;
  if (shape) {
    const labelStart = end + shape.open.length;
    let closeAt: number;
    if (text[labelStart] === '"') {
      const quoteEnd = text.indexOf('"', labelStart + 1);
      if (quoteEnd < 0) throw new MermaidSyntaxError(`the label of "${id}" has no closing quote`);
      label = text.slice(labelStart + 1, quoteEnd);
      closeAt = quoteEnd + 1;
      while (text[closeAt] === " ") closeAt += 1;
      if (!text.startsWith(shape.close, closeAt)) {
        throw new MermaidSyntaxError(`the box "${id}" is not closed with ${shape.close}`);
      }
    } else {
      closeAt = text.indexOf(shape.close, labelStart);
      if (closeAt < 0) throw new MermaidSyntaxError(`the box "${id}" is not closed with ${shape.close}`);
      label = text.slice(labelStart, closeAt);
    }
    end = closeAt + shape.close.length;
    label = label.trim();
  }
  const classSuffix = text.slice(end).match(/^:::[\w-]+/);
  if (classSuffix) end += classSuffix[0].length;
  return { node: { id, label }, end };
}

function readNodeGroup(text: string, position: number) {
  const nodes: NodeRef[] = [];
  let cursor = position;
  for (;;) {
    const read = readNode(text, cursor);
    if (!read) return nodes.length ? { nodes, end: cursor } : null;
    nodes.push(read.node);
    cursor = read.end;
    const amp = text.slice(cursor).match(/^\s*&\s*/);
    if (!amp) return { nodes, end: cursor };
    cursor += amp[0].length;
  }
}

function readLink(text: string, position: number): { label?: string; end: number } | null {
  const rest = text.slice(position);
  const labeled = rest.match(LABELED_LINK);
  if (labeled) {
    return { label: (labeled[1] ?? labeled[2]).trim(), end: position + labeled[0].length };
  }
  const plain = rest.match(PLAIN_LINK);
  if (!plain) return null;
  let end = position + plain[0].length;
  const pipe = text.slice(end).match(PIPE_LABEL);
  let label: string | undefined;
  if (pipe) {
    label = (pipe[1] ?? pipe[2]).trim() || undefined;
    end += pipe[0].length;
  }
  return { label, end };
}

const skipSpaces = (text: string, position: number) => {
  let cursor = position;
  while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
  return cursor;
};

/** Reads one statement: a node group, then any number of (link, node group) pairs. */
function readStatement(statement: string, addNode: (node: NodeRef) => void, addEdge: (edge: GraphEdge) => void) {
  let cursor = skipSpaces(statement, 0);
  const first = readNodeGroup(statement, cursor);
  if (!first) throw new MermaidSyntaxError(`couldn't read "${statement.trim()}"`);
  first.nodes.forEach(addNode);
  let previous = first.nodes;
  cursor = skipSpaces(statement, first.end);
  while (cursor < statement.length) {
    const link = readLink(statement, cursor);
    if (!link) throw new MermaidSyntaxError(`couldn't read "${statement.slice(cursor).trim()}"`);
    cursor = skipSpaces(statement, link.end);
    const next = readNodeGroup(statement, cursor);
    if (!next) throw new MermaidSyntaxError("a connection needs a box at both ends");
    next.nodes.forEach(addNode);
    for (const from of previous) {
      for (const to of next.nodes) {
        addEdge(link.label ? { from: from.id, to: to.id, label: link.label } : { from: from.id, to: to.id });
      }
    }
    previous = next.nodes;
    cursor = skipSpaces(statement, next.end);
  }
}

export function parseMermaidFlowchart(code: string): ParsedGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const addNode = ({ id, label }: NodeRef) => {
    if (label === undefined) {
      if (!nodes.has(id)) nodes.set(id, { id, label: id, isActor: false });
      return;
    }
    // A later definition with a label wins, as in Mermaid itself.
    nodes.set(id, { id, label, isActor: isActorLabel(label) });
  };
  const result = (parseError?: string): ParsedGraph =>
    parseError
      ? { nodes: [...nodes.values()], edges, parseError }
      : { nodes: [...nodes.values()], edges };

  let seenHeader = false;
  const lines = code.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = splitOutsideQuotes(lines[index], "%%")[0].trim();
    if (!line) continue;
    if (!seenHeader) {
      if (!HEADER.test(line)) return result('A diagram must start with "flowchart TD" (or another flowchart direction).');
      seenHeader = true;
      continue;
    }
    for (const statement of splitOutsideQuotes(line, ";")) {
      const trimmed = statement.trim();
      if (!trimmed || IGNORED_STATEMENT.test(trimmed)) continue;
      try {
        readStatement(trimmed, addNode, (edge) => edges.push(edge));
      } catch (error) {
        if (!(error instanceof MermaidSyntaxError)) throw error;
        return result(`Line ${index + 1}: ${error.message}.`);
      }
    }
  }
  return result();
}

// ---------------------------------------------------------------------------------------------
// Design doc

const HEADING = /^#{1,6}\s/;
const DOC_ITEM = /^\s*[-*+]\s+\*\*([RAD])(\d+)\*\*(.*)$/;
const OTHER_LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;
const FENCE_OPEN = /^(\s*)```\s*([\w-]*)\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;
const REQUIREMENT_REF = /\]\(#(R\d+)\)/g;

type OpenItem = {
  kind: "R" | "A" | "D";
  id: string;
  line: number;
  textLines: string[];
  sketch?: { code: string; start: number; end: number; closed: boolean };
};

function dedent(lines: string[], indent: string) {
  return lines.map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line.trimStart()));
}

export function parseDesignDoc(
  markdown: string,
  finalDiagram: string,
  brief: string,
  messages: ChatMessage[],
): ParsedDesignDoc {
  const items: OpenItem[] = [];
  let current: OpenItem | null = null;
  const lines = markdown.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(FENCE_OPEN);
    if (fence) {
      let close = index + 1;
      while (close < lines.length && !FENCE_CLOSE.test(lines[close])) close += 1;
      const closed = close < lines.length;
      if (fence[2].toLowerCase() === "mermaid" && current?.kind === "D" && !current.sketch) {
        current.sketch = {
          code: dedent(lines.slice(index + 1, close), fence[1]).join("\n"),
          start: index + 1,
          end: Math.min(close, lines.length - 1) + 1,
          closed,
        };
      }
      index = close;
      continue;
    }
    if (HEADING.test(line)) {
      current = null;
      continue;
    }
    const item = line.match(DOC_ITEM);
    if (item) {
      const kind = item[1] as OpenItem["kind"];
      current = { kind, id: `${kind}${item[2]}`, line: index + 1, textLines: [item[3]] };
      items.push(current);
      continue;
    }
    if (OTHER_LIST_ITEM.test(line)) {
      current = null;
      continue;
    }
    if (!line.trim()) continue;
    // Indented text continues the current item; anything else is a paragraph of its own.
    if (current && /^\s/.test(line)) current.textLines.push(line.trim());
    else current = null;
  }

  const textOf = (item: OpenItem) => item.textLines.map((part) => part.trim()).filter(Boolean).join(" ");
  const requirements: ParsedRequirement[] = [];
  const assumptions: ParsedAssumption[] = [];
  const decisions: ParsedDecision[] = [];

  for (const item of items) {
    const text = textOf(item);
    if (item.kind === "R") {
      requirements.push({
        id: item.id,
        text,
        citations: extractReviewReferences(text, brief, messages),
        line: item.line,
      });
    } else if (item.kind === "A") {
      assumptions.push({ id: item.id, text, line: item.line });
    } else {
      let sketch: ParsedGraph | null = null;
      if (item.sketch) {
        sketch = parseMermaidFlowchart(item.sketch.code);
        if (!item.sketch.closed && !sketch.parseError) {
          sketch = { ...sketch, parseError: "The sketch's ``` block is never closed." };
        }
      }
      decisions.push({
        id: item.id,
        text,
        requirementIds: [...new Set([...text.matchAll(REQUIREMENT_REF)].map((match) => match[1]))],
        hasBecause: /\bbecause\b/i.test(text),
        hasTradeOff: /trade-?off\s*:/i.test(text),
        line: item.line,
        sketchCode: item.sketch?.code ?? null,
        sketch,
        sketchLines: item.sketch ? { start: item.sketch.start, end: item.sketch.end } : null,
      });
    }
  }

  const nodeDecisions: Record<string, string[]> = {};
  for (const decision of decisions) {
    for (const node of decision.sketch?.nodes ?? []) {
      if (node.isActor) continue;
      const list = (nodeDecisions[node.id] ??= []);
      if (!list.includes(decision.id)) list.push(decision.id);
    }
  }

  return {
    requirements,
    assumptions,
    decisions,
    final: parseMermaidFlowchart(finalDiagram),
    nodeDecisions,
  };
}

/** A sketch with no boxes (like the template's bare "flowchart TD") counts as no sketch. */
export const hasSketch = (decision: ParsedDecision) => Boolean(decision.sketch && decision.sketch.nodes.length > 0);
