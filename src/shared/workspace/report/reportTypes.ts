import { createContext, useContext } from "react";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import type { ChatMessage } from "../../lib/types";

/** The work as it was when Review was clicked; the report never reads the live doc. */
export type ReportSnapshot = {
  messages: ChatMessage[];
  docMarkdown: string;
  finalCode: string;
  parsed: ParsedDesignDoc;
};

type DiagramTarget = { nodes?: string[]; edges?: { from: string; to: string }[] };

/**
 * Where report links go. Everything lands in the submitted work on the left: a chat message, the
 * brief, an item, a sketch, or a box or connection in the doc's diagrams.
 */
export type ReportNav = {
  chat: (index: number, quote?: string) => void;
  brief: (quote: string) => void;
  item: (id: string) => void;
  sketch: (decisionId: string) => void;
  node: (nodeId: string) => void;
  edge: (from: string, to: string) => void;
  /** Boxes and connections together (a whole sketch, say), in the doc's diagrams. */
  diagram: (target: DiagramTarget) => void;
};

/** Which level bands and sections are folded away. */
export type LayerCollapse = { isOpen: (layerId: string) => boolean; toggle: (layerId: string) => void };

export const LayerCollapseContext = createContext<LayerCollapse>({ isOpen: () => true, toggle: () => {} });

export const useLayerCollapse = () => useContext(LayerCollapseContext);
