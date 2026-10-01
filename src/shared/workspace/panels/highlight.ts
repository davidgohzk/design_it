import { flashElementClass, flashTextMatch } from "../../lib/utils";

const FLASH_MS = 2500;

/**
 * Where to look. The review shows its own copy of the chat and doc while the workspace's copy stays
 * mounted (hidden), so the same ids exist twice; a root keeps each lookup to one copy.
 */
type Root = ParentNode;

const byId = (root: Root, id: string) => root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);

/** Scrolls to a chat message and flashes the quoted text in it (or the whole bubble). */
export function flashChatMessage(index: number, text?: string, root: Root = document) {
  const bubble = byId(root, `chat-msg-${index}`);
  if (!bubble) return;
  bubble.scrollIntoView({ behavior: "smooth", block: "center" });
  const cleanup = text ? flashTextMatch(bubble, text, "chat-text-highlight") : null;
  if (!cleanup) bubble.classList.add("quote-highlight");
  setTimeout(() => {
    cleanup?.();
    bubble.classList.remove("quote-highlight");
  }, FLASH_MS);
}

/** Flashes a quoted excerpt inside a container, falling back to the whole container. */
export function flashTextIn(container: HTMLElement | null, text: string) {
  if (!container) return;
  const cleanup =
    flashTextMatch(container, text, "cs-text-highlight") ??
    flashElementClass(container, "context-panel-highlight");
  setTimeout(cleanup, FLASH_MS);
}

/** Scrolls to an element by id and flashes it. Returns whether it was found. */
export function flashElementById(id: string, root: Root = document) {
  const element = byId(root, id);
  if (!element) return false;
  setTimeout(flashElementClass(element, "simple-flash"), FLASH_MS);
  return true;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A box's group in a Mermaid flowchart: id "<svg id>-flowchart-<node id>-<n>". */
const nodeElements = (svg: SVGSVGElement, nodeId: string) => {
  const pattern = new RegExp(`^${escapeRegExp(svg.id)}-flowchart-${escapeRegExp(nodeId)}-\\d+$`);
  return [...svg.querySelectorAll("g.node")].filter((group) => pattern.test(group.id));
};

/** A connection's path: data-id "L_<from>_<to>_<n>". */
const edgeElements = (svg: SVGSVGElement, { from, to }: { from: string; to: string }) => {
  const pattern = new RegExp(`^L_${escapeRegExp(from)}_${escapeRegExp(to)}_\\d+$`);
  return [...svg.querySelectorAll("path[data-id]")].filter((path) => pattern.test(path.getAttribute("data-id") ?? ""));
};

/**
 * Flashes boxes and connections in every Mermaid diagram under the given containers (ids, or elements),
 * scrolling to the first match; containers are searched in order, so list the final diagram first.
 * Returns whether any matched.
 */
export function flashDiagram(
  containers: (string | Element | null | undefined)[],
  { nodes = [], edges = [] }: { nodes?: string[]; edges?: { from: string; to: string }[] },
) {
  const hits = new Set<Element>();
  for (const container of containers) {
    const element = typeof container === "string" ? document.getElementById(container) : container;
    const svgs = element?.querySelectorAll<SVGSVGElement>(".mermaid-diagram svg") ?? [];
    for (const svg of svgs) {
      for (const nodeId of nodes) nodeElements(svg, nodeId).forEach((element) => hits.add(element));
      for (const edge of edges) edgeElements(svg, edge).forEach((element) => hits.add(element));
    }
  }
  if (hits.size === 0) return false;
  hits.values().next().value?.scrollIntoView({ behavior: "smooth", block: "center" });
  for (const element of hits) element.classList.add("diagram-hit");
  setTimeout(() => hits.forEach((element) => element.classList.remove("diagram-hit")), FLASH_MS);
  return true;
}

/** A box's colour; `shared` marks a box that more than one painted sketch draws. */
export type NodePaint = { color: string; shared?: boolean };
export type EdgePaint = { from: string; to: string; color: string };
/** What to colour in one diagram: its boxes by id, and its connections. */
export type DiagramPaint = { nodes: Record<string, NodePaint>; edges: EdgePaint[] };

const SHAPES = "rect, path, polygon, circle, ellipse";
/** The element's own inline style before painting, so clearing restores it exactly. */
const PAINT_ATTR = "data-paint-style";

function paint(element: SVGElement, styles: Record<string, string>) {
  if (!element.hasAttribute(PAINT_ATTR)) element.setAttribute(PAINT_ATTR, element.getAttribute("style") ?? "");
  // Not !important, so a flash (.diagram-hit) still shows on top of the paint.
  for (const [property, value] of Object.entries(styles)) element.style.setProperty(property, value);
}

function clearPaint(root: ParentNode) {
  for (const element of root.querySelectorAll<SVGElement>(`[${PAINT_ATTR}]`)) {
    const original = element.getAttribute(PAINT_ATTR) ?? "";
    if (original) element.setAttribute("style", original);
    else element.removeAttribute("style");
    element.removeAttribute(PAINT_ATTR);
  }
}

/**
 * Colours boxes and connections in every Mermaid diagram under a container, replacing whatever it
 * painted before. Unlike a flash, the colours stay until the next call.
 */
export function paintDiagram(
  container: Element | null | undefined,
  nodes: Record<string, NodePaint>,
  edges: EdgePaint[] = [],
) {
  for (const svg of container?.querySelectorAll<SVGSVGElement>(".mermaid-diagram svg") ?? []) {
    clearPaint(svg);
    for (const [nodeId, { color, shared }] of Object.entries(nodes)) {
      for (const group of nodeElements(svg, nodeId)) {
        for (const shape of group.querySelectorAll<SVGElement>(SHAPES)) {
          paint(shape, {
            fill: `${color}33`,
            stroke: color,
            "stroke-width": shared ? "3.5px" : "2px",
            ...(shared ? { "stroke-dasharray": "6 3" } : {}),
          });
        }
      }
    }
    for (const { from, to, color } of edges) {
      for (const path of edgeElements(svg, { from, to })) paint(path as SVGElement, { stroke: color, "stroke-width": "2.5px" });
    }
  }
}

/** The id of the Mermaid box a click landed on, or null when it missed every box. */
export function nodeIdAt(target: EventTarget | null) {
  const group = target instanceof Element ? target.closest("g.node") : null;
  const svg = group?.closest("svg");
  if (!group || !svg) return null;
  const pattern = new RegExp(`^${escapeRegExp(svg.id)}-flowchart-(.+)-\\d+$`);
  return group.id.match(pattern)?.[1] ?? null;
}
