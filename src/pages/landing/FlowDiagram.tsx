import { useState, type CSSProperties } from "react";
import type { FlowNode } from "./landing.content";

type Props = {
  nodes: readonly FlowNode[];
  label: string;
  orientation?: "column" | "row";
  /** Lights every node and connector, for when something elsewhere traces into this flow. */
  traced?: boolean;
};

// Each connector is its own small SVG between two nodes, so it never has to line up with a shared
// overlay. Column nodes alternate sides, and the curve stays inside the band where both nodes overlap.
const LINKS = {
  column: { box: "0 0 96 36", line: "M16 1 C16 22, 80 12, 80 33", arrow: "M75 28 L80 34 L85 28" },
  row: { box: "0 0 44 32", line: "M2 16 C14 4, 24 16, 36 16", arrow: "M31 11 L37 16 L31 21" },
} as const;

export function FlowDiagram({ nodes, label, orientation = "column", traced = false }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const link = LINKS[orientation];
  const hotIndex = nodes.findIndex((n) => n.id === hovered);
  const chosen = nodes.find((n) => n.id === selected);
  const isHot = (i: number) => traced || i === hotIndex;

  return (
    <div className={`lp-fd lp-fd--${orientation}${traced || hovered ? " has-focus" : ""}`}>
      <ol className="lp-fd-nodes" aria-label={label}>
        {nodes.map((node, i) => (
          <li key={node.id} className="lp-fd-node" style={{ "--i": i } as CSSProperties}>
            {i > 0 && (
              <svg
                className={`lp-fd-link${isHot(i) || isHot(i - 1) ? " is-hot" : ""}`}
                viewBox={link.box}
                aria-hidden="true"
                focusable="false"
              >
                <path className="lp-fd-line" d={link.line} />
                <path className="lp-fd-arrow" d={link.arrow} />
              </svg>
            )}
            <button
              type="button"
              className={`lp-fd-btn${isHot(i) ? " is-hot" : ""}`}
              aria-pressed={selected === node.id}
              onClick={() => setSelected(selected === node.id ? null : node.id)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(node.id)}
              onBlur={() => setHovered(null)}
            >
              {node.label}
            </button>
          </li>
        ))}
      </ol>
      <p className={`lp-fd-caption${chosen ? " is-open" : ""}`} aria-live="polite">
        {chosen ? (
          <>
            <strong>{chosen.label}.</strong> {chosen.detail}
          </>
        ) : (
          <span className="lp-fd-hint">Select a step to see what it does.</span>
        )}
      </p>
    </div>
  );
}
