import { createContext, useContext } from "react";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import type { ChatMessage } from "../../lib/types";

/** What a reference chip points at, as plain text: an item's words, a box's label, a chat message. */
export type ReferenceLookup = {
  item: (id: string) => string | undefined;
  box: (id: string) => string | undefined;
  chat: (index: number) => string | undefined;
};

/** A reference takes the colour of what it points to, matching the R#/A#/D# id chips. */
const ITEM_REF_CLASS: Record<string, string> = {
  R: "simple-ref-requirement",
  A: "simple-ref-assumption",
  D: "simple-ref-decision",
};

/** The chip class for an R#, A# or D# reference. */
export const itemRefClass = (id: string) => `inline-ref ${ITEM_REF_CLASS[id[0]] ?? ""}`.trim();

/** The chip class for a box or connection in a diagram. */
export const BOX_REF_CLASS = "inline-ref simple-ref-box";

const NONE: ReferenceLookup = { item: () => undefined, box: () => undefined, chat: () => undefined };

/** Citations become their label ("Chat #2", "R1") and emphasis markers go, so an item reads as a sentence. */
export const plainText = (markdown: string) =>
  markdown
    .replace(/\[([^\]]+)\]\((?:[^()"]|"(?:[^"\\]|\\.)*")*\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function buildReferences(parsed: ParsedDesignDoc, messages: ChatMessage[] = []): ReferenceLookup {
  const items = new Map<string, string>();
  for (const item of [...parsed.requirements, ...parsed.assumptions, ...parsed.decisions]) {
    if (!items.has(item.id)) items.set(item.id, plainText(item.text));
  }
  // Final diagram labels first; a box only in a sketch still gets its sketch label.
  const boxes = new Map<string, string>();
  for (const node of parsed.final.nodes) boxes.set(node.id, node.label);
  for (const decision of parsed.decisions) {
    for (const node of decision.sketch?.nodes ?? []) if (!boxes.has(node.id)) boxes.set(node.id, node.label);
  }
  return {
    item: (id) => items.get(id) || undefined,
    box: (id) => boxes.get(id),
    chat: (index) => messages[index]?.content,
  };
}

export const ReferenceContext = createContext<ReferenceLookup>(NONE);

export const useReferences = () => useContext(ReferenceContext);
