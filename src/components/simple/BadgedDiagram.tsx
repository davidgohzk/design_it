import { useEffect, useRef, useState } from "react";
import mermaid from "../../mermaid";

const SVG_NS = "http://www.w3.org/2000/svg";

type BadgedDiagramProps = {
  code: string;
  /** Computed from the sketches: node id → decision ids. Drawn as badges by the UI, never typed into labels. */
  nodeDecisions: Record<string, string[]>;
  /** Non-actor nodes that no sketch explains; outlined as a warning. */
  unjustifiedNodes?: string[];
  onBadgeClick?: (decisionId: string) => void;
  className?: string;
};

function addBadges(
  container: HTMLElement,
  renderId: string,
  nodeDecisions: Record<string, string[]>,
  unjustified: Set<string>,
  onBadgeClick: (decisionId: string) => void,
) {
  const svg = container.querySelector("svg");
  if (svg) svg.style.overflow = "visible";
  const idPattern = new RegExp(`^${renderId}-flowchart-(.+)-\\d+$`);
  for (const node of container.querySelectorAll<SVGGElement>("g.node")) {
    const nodeId = node.id.match(idPattern)?.[1];
    if (!nodeId) continue;
    if (unjustified.has(nodeId)) node.classList.add("simple-node-unjustified");
    const decisions = nodeDecisions[nodeId] ?? [];
    if (decisions.length === 0) continue;
    const box = node.getBBox();
    // Pills are laid out right to left along the node's top edge.
    let right = box.x + box.width + 6;
    for (const decisionId of [...decisions].reverse()) {
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "simple-badge");
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      group.dataset.decision = decisionId;
      const text = document.createElementNS(SVG_NS, "text");
      text.textContent = decisionId;
      const rect = document.createElementNS(SVG_NS, "rect");
      // Inline styles: Mermaid's id-scoped ".node rect" / ".node text" rules would beat a class.
      rect.setAttribute("style", "fill:#166534;stroke:none;cursor:pointer");
      text.setAttribute(
        "style",
        "fill:#fff;stroke:none;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none",
      );
      group.append(rect, text);
      node.appendChild(group);
      const width = text.getComputedTextLength() + 10;
      right -= width + 2;
      rect.setAttribute("x", String(right));
      rect.setAttribute("y", String(box.y - 10));
      rect.setAttribute("width", String(width));
      rect.setAttribute("height", "15");
      rect.setAttribute("rx", "7.5");
      text.setAttribute("x", String(right + width / 2));
      text.setAttribute("y", String(box.y + 1.5));
      text.setAttribute("text-anchor", "middle");
      group.addEventListener("click", (event) => {
        event.stopPropagation();
        onBadgeClick(decisionId);
      });
    }
  }
}

/** Renders Mermaid and draws each node's computed decisions as clickable badges. */
export function BadgedDiagram({ code, nodeDecisions, unjustifiedNodes = [], onBadgeClick, className }: BadgedDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickRef = useRef(onBadgeClick);
  const [error, setError] = useState<string | null>(null);
  const badgesKey = JSON.stringify([nodeDecisions, unjustifiedNodes]);

  useEffect(() => {
    clickRef.current = onBadgeClick;
  }, [onBadgeClick]);

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      try {
        setError(null);
        const renderId = `final-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(renderId, code);
        const container = containerRef.current;
        if (disposed || !container) return;
        container.innerHTML = svg;
        const [decisions, unjustified] = JSON.parse(badgesKey) as [Record<string, string[]>, string[]];
        addBadges(container, renderId, decisions, new Set(unjustified), (id) => clickRef.current?.(id));
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : "Could not render the diagram.");
      }
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [code, badgesKey]);

  if (error) return <code className="simple-mermaid-error">{`Mermaid error: ${error}`}</code>;
  return (
    <div className={className ? `mermaid-wrap ${className}` : "mermaid-wrap"}>
      <div ref={containerRef} className="mermaid-diagram simple-badged-diagram" />
    </div>
  );
}
