// The decision colours on the review's copy of the design doc: one per decision, painted on its sketch
// and on what it adds to the final diagram, and switched on or off in the doc itself.
import { useMemo, useState } from "react";
import { usableSketches } from "../../../designDoc/consistency";
import { edgeKey } from "../../../designDoc/parse";
import type { ParsedDecision } from "../../../designDoc/parse";
import type { DocColors } from "../panels/DocPreview";
import type { DiagramPaint, EdgePaint, NodePaint } from "../panels/highlight";

/** One colour per decision, in doc order; distinct on white and readable as a tint. */
const PALETTE = ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626"];

/**
 * What the enabled decisions' sketches colour in a diagram. A box or connection takes the colour of
 * the first enabled decision (in doc order) that draws it; a box more than one draws is marked
 * shared. Actors are left plain: many sketches draw them.
 */
function paintFor(decisions: ParsedDecision[], enabled: Set<string>, colorOf: Map<string, string>): DiagramPaint {
  const nodes: Record<string, NodePaint> = {};
  const edges = new Map<string, EdgePaint>();
  for (const decision of usableSketches(decisions)) {
    if (!enabled.has(decision.id)) continue;
    const color = colorOf.get(decision.id)!;
    for (const node of decision.sketch!.nodes) {
      if (node.isActor) continue;
      if (nodes[node.id]) nodes[node.id].shared = true;
      else nodes[node.id] = { color };
    }
    for (const edge of decision.sketch!.edges) {
      if (!edges.has(edgeKey(edge))) edges.set(edgeKey(edge), { from: edge.from, to: edge.to, color });
    }
  }
  return { nodes, edges: [...edges.values()] };
}

/**
 * The colour state for one review. Every decision starts coloured; this keeps the ones switched off,
 * so a re-run's new decisions start coloured too.
 */
export function useSketchColorState(decisions: ParsedDecision[]): DocColors {
  const [disabled, setDisabled] = useState<Set<string>>(() => new Set());
  return useMemo(() => {
    const colorOf = new Map(decisions.map((decision, index) => [decision.id, PALETTE[index % PALETTE.length]]));
    const enabled = new Set(decisions.map((decision) => decision.id).filter((id) => !disabled.has(id)));
    const sketches = Object.fromEntries(
      decisions.map((decision) => [decision.id, paintFor([decision], enabled, colorOf)]),
    );
    return {
      colorOf,
      enabled,
      toggle: (decisionId) =>
        setDisabled((previous) => {
          const next = new Set(previous);
          if (next.has(decisionId)) next.delete(decisionId);
          else next.add(decisionId);
          return next;
        }),
      all: () => setDisabled(new Set()),
      none: () => setDisabled(new Set(decisions.map((decision) => decision.id))),
      paint: { final: paintFor(decisions, enabled, colorOf), sketches },
    };
  }, [decisions, disabled]);
}
