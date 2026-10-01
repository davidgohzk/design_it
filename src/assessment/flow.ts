// The webs at the top of levels 1 and 2. Level 1's flow of references shows how far each requirement
// got, Source → Requirement → Decision → Components: code only, where a link exists when there is a
// reference (a verified quote, a decision that cites the requirement, a sketch in the final diagram).
// Level 2's web adds each decision's sketch and colours every item and link by the AI's judgment.
import { usableSketches } from "../designDoc/consistency";
import type { ParsedDesignDoc } from "../designDoc/parse";
import type { AssessmentLinks, AssessmentResult, Rating } from "./types";

export type FlowSource = { kind: "brief" | "chat"; messageIndex?: number; excerpt: string; valid: boolean };

/** The first link missing, left to right; carried_through when none is. */
export type FlowStatus = "no_source" | "no_decision" | "not_drawn" | "carried_through";

export type FlowRow = {
  id: string;
  text: string;
  /** Every citation, brief first and then chats in message order; only valid ones are references. */
  sources: FlowSource[];
  /** Decisions that cite the requirement. */
  decisions: string[];
  /** Those decisions whose sketch is in the final diagram. */
  drawn: string[];
  status: FlowStatus;
};

const sourceOrder = (source: FlowSource) => (source.kind === "brief" ? -1 : (source.messageIndex ?? 0));

export function requirementFlow(doc: ParsedDesignDoc, links: Pick<AssessmentLinks, "notDrawn">): FlowRow[] {
  const notDrawn = new Set(links.notDrawn);
  return doc.requirements
    .filter((requirement) => requirement.text.trim())
    .map((requirement): FlowRow => {
      const sources = requirement.citations
        .map(({ source, messageIndex, excerpt, valid }): FlowSource => ({ kind: source, messageIndex, excerpt, valid }))
        .sort((a, b) => sourceOrder(a) - sourceOrder(b));
      const decisions = [
        ...new Set(
          doc.decisions
            .filter((decision) => decision.requirementIds.includes(requirement.id))
            .map((decision) => decision.id),
        ),
      ];
      const drawn = decisions.filter((id) => !notDrawn.has(id));
      const status: FlowStatus = !sources.some((source) => source.valid)
        ? "no_source"
        : decisions.length === 0
          ? "no_decision"
          : drawn.length === 0
            ? "not_drawn"
            : "carried_through";
      return { id: requirement.id, text: requirement.text, sources, decisions, drawn, status };
    });
}

// ---------------------------------------------------------------------------------------------
// Webs: every item once, in columns, joined by links. Level 1's links are references (code); level
// 2's are the AI's judgments of them. Both share the ordering and the "light up its web" walk.

/** What a node opens. */
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

export type WebEdge = { from: string; to: string; tone: string };

export type WebGraph = { nodes: WebNode[]; edges: WebEdge[] };

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

const boxNodes = (doc: ParsedDesignDoc, column: string, toneOf: (nodeId: string) => string) =>
  doc.final.nodes
    .filter((node) => !node.isActor)
    .map(
      (node, index): WebNode => ({
        key: `box:${node.id}`,
        column,
        label: node.id,
        text: node.label,
        rank: index,
        tone: toneOf(node.id),
        target: { kind: "box", id: node.id },
      }),
    );

// --- Level 1: the flow of references --------------------------------------------------------

export type FlowColumn = "source" | "requirement" | "decision" | "design" | "final";
export const FLOW_COLUMNS: readonly FlowColumn[] = ["source", "requirement", "decision", "design", "final"];

/**
 * How a level 1 node is drawn: a requirement by where its chain stops; a decision, and its design
 * (sketch), by whether the sketch is in the final diagram; a box by whether any sketch explains it.
 */
export type FlowTone = FlowStatus | "source" | "drawn" | "undrawn" | "unexplained" | "box";

export type FlowNode = WebNode & { column: FlowColumn; tone: FlowTone };

/**
 * A reference, coloured like the requirement it carries. Decision → design → box links are "drawn"
 * when the sketch is in the final diagram, and "not_drawn" when it isn't (or only partly).
 */
export type FlowEdge = WebEdge & { tone: FlowStatus | "drawn" };

export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[]; rows: FlowRow[] };

export function flowGraph(
  doc: ParsedDesignDoc,
  links: Pick<AssessmentLinks, "notDrawn" | "unjustified">,
): FlowGraph {
  const rows = requirementFlow(doc, links);
  const notDrawn = new Set(links.notDrawn);
  const unexplained = new Set(links.unjustified);
  const nodes = new Map<string, WebNode>();
  const edges = new Map<string, WebEdge>();
  const link = (from: string, to: string, tone: FlowEdge["tone"]) => {
    if (!edges.has(`${from}>${to}`)) edges.set(`${from}>${to}`, { from, to, tone });
  };

  for (const row of rows) {
    for (const source of row.sources.filter((item) => item.valid)) link(addSource(nodes, source), `req:${row.id}`, row.status);
    for (const decision of row.decisions) link(`req:${row.id}`, `dec:${decision}`, row.status);
  }
  rows.forEach((row, index) => {
    nodes.set(`req:${row.id}`, {
      key: `req:${row.id}`,
      column: "requirement",
      label: row.id,
      text: row.text,
      rank: index,
      tone: row.status,
      target: { kind: "item", id: row.id },
    });
  });

  const finalIds = new Set(doc.final.nodes.map((node) => node.id));
  const sketched = new Set(usableSketches(doc.decisions).map((decision) => decision.id));
  doc.decisions.forEach((decision, index) => {
    const key = `dec:${decision.id}`;
    if (nodes.has(key)) return;
    const drawn = !notDrawn.has(decision.id);
    nodes.set(key, {
      key,
      column: "decision",
      label: decision.id,
      text: decision.text,
      rank: index,
      tone: drawn ? "drawn" : "undrawn",
      target: { kind: "item", id: decision.id },
    });
    // The decision's design: its sketch, when it has one that parses.
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
    const tone = drawn ? "drawn" : "not_drawn";
    link(key, designKey, tone);
    for (const node of parts) {
      if (finalIds.has(node.id)) link(designKey, `box:${node.id}`, tone);
    }
  });

  for (const node of boxNodes(doc, "final", (id) => (unexplained.has(id) ? "unexplained" : "box"))) {
    nodes.set(node.key, node);
  }
  return { nodes: [...nodes.values()] as FlowNode[], edges: keepJoined(nodes, edges) as FlowEdge[], rows };
}

// --- Level 2: the soundness web -------------------------------------------------------------

export type SoundnessColumn = "source" | "requirement" | "decision" | "design" | "components";
export const SOUNDNESS_COLUMNS: readonly SoundnessColumn[] = ["source", "requirement", "decision", "design", "components"];

/** A judgment's colour: the AI's rating, "unrated" when there is none, "neutral" for what isn't judged. */
export type SoundnessTone = Rating["rating"] | "unrated" | "neutral";

/** Which judgment a link stands for, so a click can find it. */
export type SoundnessLink = "quote" | "requirements" | "decision" | "diagram";

export type SoundnessEdge = WebEdge & { tone: SoundnessTone; judges: SoundnessLink };

export type SoundnessGraph = { nodes: WebNode[]; edges: SoundnessEdge[] };

/**
 * Level 2's web: Source → Requirement → Decision → Design (the decision's sketch) → Components.
 * Each item is coloured by the AI's judgment of it on its own; each link by the AI's judgment of
 * that link (a requirement against its quote, a decision against its requirements, a sketch against
 * its decision, and a sketch placed into the final diagram).
 */
export function soundnessGraph(doc: ParsedDesignDoc, soundness: AssessmentResult["soundness"]): SoundnessGraph {
  const toneOf = (ratings: Rating[]) => {
    const byId = new Map(ratings.map((rating) => [rating.id, rating.rating]));
    return (id: string): SoundnessTone => byId.get(id) ?? "unrated";
  };
  const own = {
    requirement: toneOf(soundness.requirementItems),
    decision: toneOf(soundness.decisionItems),
    sketch: toneOf(soundness.sketchItems),
  };
  const linkTone = {
    quote: toneOf(soundness.requirements),
    requirements: toneOf(soundness.decisions),
    decision: toneOf(soundness.sketches),
    diagram: toneOf(soundness.sketchIntegration),
  };
  const nodes = new Map<string, WebNode>();
  const edges = new Map<string, SoundnessEdge>();
  const link = (from: string, to: string, judges: SoundnessLink, tone: SoundnessTone) => {
    if (!edges.has(`${from}>${to}`)) edges.set(`${from}>${to}`, { from, to, tone, judges });
  };

  const requirements = doc.requirements.filter((requirement) => requirement.text.trim());
  requirements.forEach((requirement, index) => {
    const key = `req:${requirement.id}`;
    for (const citation of requirement.citations.filter((item) => item.valid)) {
      const source: FlowSource = { kind: citation.source, messageIndex: citation.messageIndex, excerpt: citation.excerpt, valid: true };
      link(addSource(nodes, source), key, "quote", linkTone.quote(requirement.id));
    }
    if (nodes.has(key)) return;
    nodes.set(key, {
      key,
      column: "requirement",
      label: requirement.id,
      text: requirement.text,
      rank: index,
      tone: own.requirement(requirement.id),
      target: { kind: "item", id: requirement.id },
    });
  });

  const finalIds = new Set(doc.final.nodes.map((node) => node.id));
  const sketched = new Set(usableSketches(doc.decisions).map((decision) => decision.id));
  doc.decisions.forEach((decision, index) => {
    const key = `dec:${decision.id}`;
    if (nodes.has(key)) return;
    nodes.set(key, {
      key,
      column: "decision",
      label: decision.id,
      text: decision.text,
      rank: index,
      tone: own.decision(decision.id),
      target: { kind: "item", id: decision.id },
    });
    for (const id of decision.requirementIds) link(`req:${id}`, key, "requirements", linkTone.requirements(decision.id));
    if (!sketched.has(decision.id)) return;

    const sketchKey = `sketch:${decision.id}`;
    const parts = (decision.sketch?.nodes ?? []).filter((node) => !node.isActor);
    nodes.set(sketchKey, {
      key: sketchKey,
      column: "design",
      label: decision.id,
      text: parts.map((node) => node.label).join(" · "),
      rank: index,
      tone: own.sketch(decision.id),
      target: { kind: "sketch", id: decision.id },
    });
    link(key, sketchKey, "decision", linkTone.decision(decision.id));
    for (const node of parts) {
      if (finalIds.has(node.id)) link(sketchKey, `box:${node.id}`, "diagram", linkTone.diagram(decision.id));
    }
  });

  for (const node of boxNodes(doc, "components", () => "neutral")) nodes.set(node.key, node);
  return { nodes: [...nodes.values()], edges: keepJoined(nodes, edges) as SoundnessEdge[] };
}

// --- Shared --------------------------------------------------------------------------------

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
