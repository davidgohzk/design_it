// The webs at the top of the Design Document section: every item once, in columns, joined by the
// links between them. Traceability shows how far each requirement got, Source → Requirement →
// Decision → Design → Components, from the references alone. Rationale draws the same shape and
// colours each item and link by the judge's verdict of it.
import { usableSketches } from "@/designDoc/consistency";
import type { ParsedDecision, ParsedDesignDoc } from "@/designDoc/parse";
import { rationaleEvidence } from "@/review/judge/summaryReview";
import type { AssessmentResult } from "@/review/types";

export type FlowSource = { kind: "brief" | "chat"; messageIndex?: number; excerpt: string };

/** The first link missing, left to right; carried_through when none is. */
export type FlowStatus = "no_source" | "no_decision" | "not_drawn" | "carried_through";

/** What a node opens in the work on the left. */
export type FlowTarget =
  | { kind: "brief"; quotes: string[] }
  | { kind: "chat"; messageIndex: number; quotes: string[] }
  | { kind: "item"; id: string }
  | { kind: "sketch"; id: string }
  | { kind: "box"; id: string };

export type WebNode = {
  key: string;
  column: string;
  label: string;
  /** The node's words (markdown for items, a box's label). */
  text: string;
  /** Its natural place in its column: brief then chats in order, R1…, D1…, boxes as the diagram lists them. */
  rank: number;
  /** How it is drawn; each web maps its tones to colours. */
  tone: string;
  target: FlowTarget;
};

export type WebEdge = { from: string; to: string; tone: string; reason?: string };
export type WebGraph = { nodes: WebNode[]; edges: WebEdge[] };

export type FlowColumn = "source" | "requirement" | "decision" | "design" | "final";
export const FLOW_COLUMNS: readonly FlowColumn[] = ["source", "requirement", "decision", "design", "final"];

const sourceKey = (source: FlowSource) => (source.kind === "brief" ? "src:brief" : `src:chat:${source.messageIndex}`);

/** Adds a source node (or a quote to one already there) and returns its key. */
function addSource(nodes: Map<string, WebNode>, source: FlowSource) {
  const key = sourceKey(source);
  const existing = nodes.get(key);
  if (existing && (existing.target.kind === "brief" || existing.target.kind === "chat")) {
    if (!existing.target.quotes.includes(source.excerpt)) {
      existing.target.quotes.push(source.excerpt);
      existing.text = existing.target.quotes.join(" · ");
    }
  } else if (!existing) {
    nodes.set(key, {
      key,
      column: "source",
      label: source.kind === "brief" ? "Brief" : `Chat #${source.messageIndex}`,
      text: source.excerpt,
      rank: source.kind === "brief" ? -1 : (source.messageIndex ?? 0),
      tone: "source",
      target:
        source.kind === "brief"
          ? { kind: "brief", quotes: [source.excerpt] }
          : { kind: "chat", messageIndex: source.messageIndex ?? 0, quotes: [source.excerpt] },
    });
  }
  return key;
}

/** Joins the edges whose two ends both exist (a decision can cite a requirement id that has no words, say). */
const keepJoined = (nodes: Map<string, WebNode>, edges: Map<string, WebEdge>) =>
  [...edges.values()].filter((edge) => nodes.has(edge.from) && nodes.has(edge.to));

const boxNodes = (doc: ParsedDesignDoc, toneOf: (nodeId: string) => string) =>
  doc.final.nodes
    .filter((node) => !node.isActor)
    .map(
      (node, index): WebNode => ({
        key: `box:${node.id}`,
        column: "final",
        label: node.id,
        text: node.label,
        rank: index,
        tone: toneOf(node.id),
        target: { kind: "box", id: node.id },
      }),
    );

const sourcesOf = (citations: ParsedDesignDoc["requirements"][number]["citations"]): FlowSource[] =>
  citations
    .filter((citation) => citation.valid)
    .map(({ source, messageIndex, excerpt }): FlowSource => ({ kind: source, messageIndex, excerpt }))
    .sort((a, b) => (a.kind === "brief" ? -1 : (a.messageIndex ?? 0)) - (b.kind === "brief" ? -1 : (b.messageIndex ?? 0)));

/** A decision's sketch is in the final diagram when any of its boxes is. */
const drawnInFinal = (decision: ParsedDecision, finalIds: ReadonlySet<string>) =>
  (decision.sketch?.nodes ?? []).some((node) => !node.isActor && finalIds.has(node.id));

/** Where each requirement's chain of references stops. */
export type FlowRow = { id: string; status: FlowStatus };

// --- Traceability: the flow of references (code only) ---------------------------------------

export type FlowGraph = WebGraph & { rows: FlowRow[] };

/**
 * Every source, requirement, decision, design (each decision's sketch) and component once, joined by
 * the references between them, each requirement coloured by where its chain of references stops.
 */
export function traceabilityGraph(doc: ParsedDesignDoc, result: AssessmentResult): FlowGraph {
  const nodes = new Map<string, WebNode>();
  const edges = new Map<string, WebEdge>();
  const link = (from: string, to: string, tone: string) => {
    if (!edges.has(`${from}>${to}`)) edges.set(`${from}>${to}`, { from, to, tone });
  };
  const finalIds = new Set(doc.final.nodes.map((node) => node.id));
  const sketched = new Set(usableSketches(doc.decisions).map((decision) => decision.id));
  const unexplained = new Set(result.keep.unjustifiedNodes);

  const requirements = doc.requirements.filter((requirement) => requirement.text.trim());
  const rows = requirements.map((requirement): FlowRow => {
    const sources = sourcesOf(requirement.citations);
    const decisions = doc.decisions.filter((decision) => decision.because.includes(requirement.id));
    const status: FlowStatus = sources.length === 0
      ? "no_source"
      : decisions.length === 0
        ? "no_decision"
        : decisions.some((decision) => drawnInFinal(decision, finalIds))
          ? "carried_through"
          : "not_drawn";
    return { id: requirement.id, status };
  });
  const statusOf = new Map(rows.map((row) => [row.id, row.status]));

  requirements.forEach((requirement, index) => {
    const key = `req:${requirement.id}`;
    const status = statusOf.get(requirement.id)!;
    for (const source of sourcesOf(requirement.citations)) link(addSource(nodes, source), key, status);
    nodes.set(key, {
      key,
      column: "requirement",
      label: requirement.id,
      text: requirement.text,
      rank: index,
      tone: status,
      target: { kind: "item", id: requirement.id },
    });
  });

  doc.decisions.forEach((decision, index) => {
    const key = `dec:${decision.id}`;
    const drawn = drawnInFinal(decision, finalIds);
    nodes.set(key, {
      key,
      column: "decision",
      label: decision.id,
      text: decision.title,
      rank: index,
      tone: drawn ? "drawn" : "undrawn",
      target: { kind: "item", id: decision.id },
    });
    for (const id of decision.because) link(`req:${id}`, key, statusOf.get(id) ?? "no_source");
    if (!sketched.has(decision.id)) return;

    const designKey = `sketch:${decision.id}`;
    const parts = (decision.sketch?.nodes ?? []).filter((node) => !node.isActor);
    nodes.set(designKey, {
      key: designKey,
      column: "design",
      label: decision.id,
      text: parts.map((node) => node.label).join(" · "),
      rank: index,
      tone: drawn ? "drawn" : "undrawn",
      target: { kind: "sketch", id: decision.id },
    });
    const tone = drawn ? "carried_through" : "not_drawn";
    link(key, designKey, tone);
    for (const node of parts) if (finalIds.has(node.id)) link(designKey, `box:${node.id}`, tone);
  });

  for (const node of boxNodes(doc, (id) => (unexplained.has(id) ? "unexplained" : "box"))) nodes.set(node.key, node);
  return { nodes: [...nodes.values()], edges: keepJoined(nodes, edges), rows };
}

// --- Rationale: the same shape, judged -------------------------------------------------------

/**
 * The rationale web: each item coloured by the judge's verdict of the item itself, each link by the
 * verdict of that link (a requirement against its quote, a decision against its requirements, a
 * sketch against its decision, and a sketch placed into the final diagram), with the judge's reason
 * carried on the link so hovering it shows why.
 */
export function rationaleGraph(doc: ParsedDesignDoc, result: AssessmentResult): WebGraph {
  const nodes = new Map<string, WebNode>();
  const edges = new Map<string, WebEdge>();
  const itemVerdict = new Map(result.justify.items.map((item) => [item.itemId, item.verdict as string]));
  const judged = new Map((result.rationale ?? []).map((item) => [item.id, item]));
  const finalIds = new Set(doc.final.nodes.map((node) => node.id));
  const sketched = new Set(usableSketches(doc.decisions).map((decision) => decision.id));
  const tone = (id: string) => itemVerdict.get(id) ?? "uncertain";

  /** Rationale links are keyed by the ids rationaleEvidence uses, which name items, not web nodes. */
  const linkIds = new Set(rationaleEvidence(doc).map((item) => item.id));
  const link = (from: string, to: string, linkId: string) => {
    const key = `${from}>${to}`;
    if (edges.has(key)) return;
    const verdict = judged.get(linkId);
    edges.set(key, {
      from,
      to,
      tone: verdict?.verdict ?? (linkIds.has(linkId) ? "uncertain" : "neutral"),
      ...(verdict?.reason ? { reason: verdict.reason } : {}),
    });
  };

  const requirements = doc.requirements.filter((requirement) => requirement.text.trim());
  requirements.forEach((requirement, index) => {
    const key = `req:${requirement.id}`;
    for (const source of sourcesOf(requirement.citations)) {
      const from = source.kind === "brief" ? "brief" : `chat:${source.messageIndex}`;
      link(addSource(nodes, source), key, `${from}>${requirement.id}`);
    }
    nodes.set(key, {
      key,
      column: "requirement",
      label: requirement.id,
      text: requirement.text,
      rank: index,
      tone: tone(requirement.id),
      target: { kind: "item", id: requirement.id },
    });
  });

  doc.decisions.forEach((decision, index) => {
    const key = `dec:${decision.id}`;
    nodes.set(key, {
      key,
      column: "decision",
      label: decision.id,
      text: decision.title,
      rank: index,
      tone: tone(decision.id),
      target: { kind: "item", id: decision.id },
    });
    for (const id of decision.because) link(`req:${id}`, key, `${id}>${decision.id}`);
    if (!sketched.has(decision.id)) return;

    const designKey = `sketch:${decision.id}`;
    const parts = (decision.sketch?.nodes ?? []).filter((node) => !node.isActor);
    nodes.set(designKey, {
      key: designKey,
      column: "design",
      label: decision.id,
      text: parts.map((node) => node.label).join(" · "),
      rank: index,
      tone: tone(`${decision.id}-sketch`),
      target: { kind: "sketch", id: decision.id },
    });
    link(key, designKey, `${decision.id}>${decision.id}-sketch`);
    for (const node of parts) {
      if (finalIds.has(node.id)) link(designKey, `box:${node.id}`, `${decision.id}-sketch>${node.id}`);
    }
  });

  for (const node of boxNodes(doc, () => "neutral")) nodes.set(node.key, node);
  return { nodes: [...nodes.values()], edges: keepJoined(nodes, edges) };
}

// --- Shared ---------------------------------------------------------------------------------

/**
 * Each column's node keys, top to bottom. The anchor column keeps its natural order; every other
 * column follows it, each node placed by the average position of what it's linked to in the column
 * nearer the anchor, so the lines cross as little as they can. Unlinked nodes go last.
 */
export function orderFlow(graph: WebGraph, columns: readonly string[], anchor: string): Record<string, string[]> {
  const byColumn = (column: string) =>
    graph.nodes.filter((node) => node.column === column).sort((a, b) => a.rank - b.rank);
  const order: Record<string, string[]> = {};
  const anchorIndex = columns.indexOf(anchor);
  order[anchor] = byColumn(anchor).map((node) => node.key);

  const follow = (column: string, nearer: string) => {
    const position = new Map(order[nearer].map((key, index) => [key, index]));
    const place = (node: WebNode) => {
      const linked = graph.edges
        .map((edge) => (edge.from === node.key ? edge.to : edge.to === node.key ? edge.from : null))
        .filter((key): key is string => key !== null && position.has(key))
        .map((key) => position.get(key)!);
      return linked.length ? linked.reduce((sum, value) => sum + value, 0) / linked.length : Number.POSITIVE_INFINITY;
    };
    order[column] = byColumn(column)
      .map((node) => ({ node, place: place(node) }))
      .sort((a, b) => (a.place === b.place ? a.node.rank - b.node.rank : a.place - b.place))
      .map(({ node }) => node.key);
  };
  for (let index = anchorIndex + 1; index < columns.length; index += 1) follow(columns[index], columns[index - 1]);
  for (let index = anchorIndex - 1; index >= 0; index -= 1) follow(columns[index], columns[index + 1]);
  return order;
}

/** A node's web: everything it reaches to the right, everything that reaches it from the left, and itself. */
export function flowWeb(graph: WebGraph, key: string): Set<string> {
  const web = new Set([key]);
  const walk = (start: string, next: (edge: WebEdge) => string | null) => {
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      for (const edge of graph.edges) {
        const reached = next(edge) === current ? (edge.from === current ? edge.to : edge.from) : null;
        if (reached && !web.has(reached)) {
          web.add(reached);
          queue.push(reached);
        }
      }
    }
  };
  walk(key, (edge) => edge.from);
  walk(key, (edge) => edge.to);
  return web;
}
