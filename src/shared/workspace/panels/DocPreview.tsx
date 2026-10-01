import { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import type { CSSProperties, Ref } from "react";
import { Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import type { EdgeRef } from "../../../assessment/types";
import { hasSketch } from "../../../designDoc/parse";
import type { ParsedDecision, ParsedDesignDoc } from "../../../designDoc/parse";
import { linkBareItemIds } from "../../../designDoc/itemRefs";
import { MermaidBlock } from "../../components/MermaidBlock";
import { citationComponents } from "./citationLinks";
import type { CitationHandlers } from "./citationLinks";
import { DiagramRefText } from "./DiagramRefText";
import type { DiagramRefHandlers } from "./DiagramRefText";
import { flashDiagram, flashElementById, paintDiagram } from "./highlight";
import type { DiagramPaint } from "./highlight";
import { buildReferences, ReferenceContext } from "./references";

export type DocWarning = { line: number; itemId?: string; message: string };

/** Jump to something in this preview; every lookup stays inside it, even if another copy is mounted. */
export type DocPreviewHandle = {
  showItem: (id: string) => boolean;
  showSketch: (decisionId: string) => boolean;
  showDiagram: (target: { nodes?: string[]; edges?: EdgeRef[] }) => boolean;
};

/**
 * One colour per decision, painted on its sketch and on what it adds to the final diagram, each
 * switched on or off right here in the doc.
 */
export type DocColors = {
  colorOf: Map<string, string>;
  enabled: Set<string>;
  toggle: (decisionId: string) => void;
  all: () => void;
  none: () => void;
  paint: { final: DiagramPaint; sketches: Record<string, DiagramPaint> };
};

const NO_PAINT: DiagramPaint = { nodes: {}, edges: [] };

/** A decision's colour, switched on or off: a swatch beside the decision, or a chip by the final diagram. */
function ColorToggle({ id, colors, label }: { id: string; colors: DocColors; label?: string }) {
  const on = colors.enabled.has(id);
  return (
    <button
      type="button"
      className={["doc-color", label ? "is-chip" : "is-swatch", on && "is-on"].filter(Boolean).join(" ")}
      style={{ "--doc-color": colors.colorOf.get(id) } as CSSProperties}
      aria-pressed={on}
      aria-label={label ? undefined : `Colour ${id}`}
      title={on ? `Stop colouring ${id}` : `Colour ${id} on its sketch and the final diagram`}
      onClick={() => colors.toggle(id)}
    >
      {label}
    </button>
  );
}

function ItemWarnings({ messages, refs }: { messages: string[]; refs: DiagramRefHandlers }) {
  if (messages.length === 0) return null;
  return (
    <ul className="simple-inline-warnings">
      {messages.map((message, index) => (
        <li key={index}>
          ⚠ <DiagramRefText text={message} {...refs} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The design doc as a reader sees it: requirements, assumptions, decisions with their sketches, and
 * the final diagram. Used by the doc panel's Preview and by the review's copy of the submitted doc.
 */
export function DocPreview({
  parsed,
  finalCode,
  citation,
  warnings = [],
  sketchIssues = {},
  finalIssues = [],
  emptyFinalHint = "No final diagram yet.",
  colors,
  ref,
}: {
  parsed: ParsedDesignDoc;
  finalCode: string;
  citation: CitationHandlers;
  /** Live format checks, shown under their item (§5.3). */
  warnings?: DocWarning[];
  /** Per-decision messages about its sketch: Mermaid errors and consistency checks (§5.4). */
  sketchIssues?: Record<string, string[]>;
  /** Messages about the final diagram: Mermaid errors and unexplained boxes or connections. */
  finalIssues?: string[];
  emptyFinalHint?: string;
  /** Decision colours, with their switches, on the sketches and the final diagram (the review's copy). */
  colors?: DocColors;
  ref?: Ref<DocPreviewHandle>;
}) {
  // The preview's own element; every lookup stays inside it.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  const handle = useMemo<DocPreviewHandle>(
    () => ({
      showItem: (id) => (root ? flashElementById(`doc-${id}`, root) : false),
      showSketch: (decisionId) => (root ? flashElementById(`sketch-${decisionId}`, root) : false),
      // The final diagram first, then the sketches.
      showDiagram: (target) => flashDiagram([root?.querySelector("#doc-final"), root], target),
    }),
    [root],
  );
  useImperativeHandle(ref, () => handle, [handle]);

  // Mermaid draws asynchronously, so the paint is put back each time a diagram (re)draws.
  const [drawn, setDrawn] = useState(0);
  const onDrawn = useCallback(() => setDrawn((count) => count + 1), []);
  const paint = colors?.paint;
  useEffect(() => {
    if (!paint || !root) return;
    paintDiagram(root.querySelector("#doc-final"), paint.final.nodes, paint.final.edges);
    for (const decision of parsed.decisions) {
      const sketch = paint.sketches[decision.id] ?? NO_PAINT;
      paintDiagram(root.querySelector(`#${CSS.escape(`sketch-${decision.id}`)}`), sketch.nodes, sketch.edges);
    }
  }, [paint, root, drawn, parsed]);
  const onRender = paint ? onDrawn : undefined;

  const diagramRefs = useMemo<DiagramRefHandlers>(
    () => ({
      onNode: (nodeId) => handle.showDiagram({ nodes: [nodeId] }),
      onEdge: (edge) => handle.showDiagram({ nodes: [edge.from, edge.to], edges: [edge] }),
    }),
    [handle],
  );

  const components = useMemo(
    () =>
      citationComponents({
        ...citation,
        onItem: (id) => {
          citation.onItem?.(id);
          // Scroll to the item and flash it, so the click shows even when the item is already on screen.
          handle.showItem(id);
        },
      }),
    [citation, handle],
  );

  // Hovering a reference chip shows what it points at.
  const references = useMemo(() => buildReferences(parsed), [parsed]);

  const warningsFor = (id: string, line: number) =>
    warnings.filter((warning) => warning.itemId === id && warning.line === line).map((warning) => warning.message);

  const renderSketch = (decision: ParsedDecision) => (
    <div className="simple-sketch" id={`sketch-${decision.id}`}>
      {hasSketch(decision) && !decision.sketch?.parseError ? (
        <MermaidBlock chart={decision.sketchCode ?? ""} onRender={onRender} />
      ) : (
        <div className="simple-sketch-empty">{decision.sketch?.parseError ?? "No sketch yet."}</div>
      )}
      <ItemWarnings messages={sketchIssues[decision.id] ?? []} refs={diagramRefs} />
    </div>
  );

  const itemText = (text: string) => (
    <ReactMarkdown components={components}>{linkBareItemIds(text) || "*(empty)*"}</ReactMarkdown>
  );

  const isEmpty = parsed.requirements.length + parsed.assumptions.length + parsed.decisions.length === 0;

  return (
    <ReferenceContext.Provider value={references}>
      <div ref={setRoot} className="preview markdown-body scrollable simple-preview">
        {isEmpty && (
          <Typography variant="body2" color="text.secondary">
            Nothing to preview yet. Add items like <code>- **R1** …</code> under the three headings.
          </Typography>
        )}
        {parsed.requirements.length > 0 && <h3>Requirements</h3>}
        <ul className="simple-doc-list">
          {parsed.requirements.map((item) => (
            <li key={`${item.id}-${item.line}`} id={`doc-${item.id}`}>
              <span className="simple-id-chip">{item.id}</span> {itemText(item.text)}
              <ItemWarnings messages={warningsFor(item.id, item.line)} refs={diagramRefs} />
            </li>
          ))}
        </ul>
        {parsed.assumptions.length > 0 && <h3>Assumptions</h3>}
        <ul className="simple-doc-list">
          {parsed.assumptions.map((item) => (
            <li key={`${item.id}-${item.line}`} id={`doc-${item.id}`}>
              <span className="simple-id-chip simple-id-chip-assumption">{item.id}</span> {itemText(item.text)}
              <ItemWarnings messages={warningsFor(item.id, item.line)} refs={diagramRefs} />
            </li>
          ))}
        </ul>
        {parsed.decisions.length > 0 && <h3>Decisions</h3>}
        <ul className="simple-doc-list">
          {parsed.decisions.map((item) => (
            <li key={`${item.id}-${item.line}`} id={`doc-${item.id}`}>
              {colors && <ColorToggle id={item.id} colors={colors} />}
              <span className="simple-id-chip simple-id-chip-decision">{item.id}</span> {itemText(item.text)}
              <ItemWarnings messages={warningsFor(item.id, item.line)} refs={diagramRefs} />
              {renderSketch(item)}
            </li>
          ))}
        </ul>
        <h3>Final diagram</h3>
        {colors && parsed.decisions.length > 0 && (
          <div className="doc-colors">
            <span className="doc-colors-label">Colour by decision</span>
            {parsed.decisions.map((decision) => (
              <ColorToggle key={`${decision.id}-${decision.line}`} id={decision.id} colors={colors} label={decision.id} />
            ))}
            <button type="button" className="doc-colors-action" onClick={colors.all}>
              All
            </button>
            <button type="button" className="doc-colors-action" onClick={colors.none}>
              None
            </button>
            <span className="doc-colors-hint">A dashed border: drawn by more than one coloured decision.</span>
          </div>
        )}
        <div className="simple-sketch simple-doc-final" id="doc-final">
          {parsed.final.parseError ? (
            <code className="simple-mermaid-error">{parsed.final.parseError}</code>
          ) : parsed.final.nodes.length === 0 ? (
            <div className="simple-sketch-empty">{emptyFinalHint}</div>
          ) : (
            // Plain Mermaid: the final diagram stands on its own and doesn't point back at decisions.
            <MermaidBlock chart={finalCode} naturalSize onRender={onRender} />
          )}
          <ItemWarnings messages={finalIssues} refs={diagramRefs} />
        </div>
      </div>
    </ReferenceContext.Provider>
  );
}
