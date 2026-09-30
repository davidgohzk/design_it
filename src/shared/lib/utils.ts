import { createTwoFilesPatch } from "diff";
import type { ChatRole } from "./types";

export const roleLabel = (role: ChatRole) => (role === "user" ? "You" : "Client");

export const normalizeQuoteText = (text: string) => text.replace(/\s+/g, " ").trim();

export const escapeMarkdownTitle = (text: string) =>
  normalizeQuoteText(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const makePatch = (before: string, after: string) =>
  createTwoFilesPatch("report.md", "report.md", before, after);

export const patchStats = (patch: string) => {
  let added = 0;
  let removed = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }
  return `+${added} -${removed} lines`;
};

export const getQuotePosition = (rect: DOMRect) => {
  const popupWidth = 88;
  const viewportPadding = 12;
  const centeredLeft = rect.left + rect.width / 2;

  return {
    top: Math.max(12, rect.top - 44),
    left: clamp(
      centeredLeft,
      viewportPadding + popupWidth / 2,
      window.innerWidth - viewportPadding - popupWidth / 2,
    ),
  };
};

const canonicalizeSearchChar = (char: string) => {
  if (/\s/.test(char)) return " ";
  if ("-–—―".includes(char)) return "-";
  if ("'‘’‚‛".includes(char)) return "'";
  if ("\"“”„‟".includes(char)) return "\"";
  return char.toLowerCase();
};

function buildNormalizedSearchText(rawText: string) {
  let text = "";
  const indexMap: number[] = [];

  for (let i = 0; i < rawText.length; i += 1) {
    const normalizedChar = canonicalizeSearchChar(rawText[i]);
    if (normalizedChar === " ") {
      if (!text || text.endsWith(" ")) continue;
    }
    text += normalizedChar;
    indexMap.push(i);
  }

  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    indexMap.pop();
  }

  return { text, indexMap };
}

export function flashTextMatch(container: HTMLElement, targetText: string, className: string) {
  const normalizedTarget = buildNormalizedSearchText(targetText).text;
  if (!normalizedTarget) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: globalThis.Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const rawText = textNode.textContent ?? "";
    const normalizedNode = buildNormalizedSearchText(rawText);
    const normalizedMatchStart = normalizedNode.text.indexOf(normalizedTarget);
    const directStart = rawText.indexOf(targetText);
    const matchStart =
      directStart >= 0
        ? directStart
        : normalizedMatchStart >= 0
          ? normalizedNode.indexMap[normalizedMatchStart]
          : -1;

    if (matchStart < 0) continue;

    const matchEnd =
      directStart >= 0
        ? matchStart + targetText.length
        : normalizedNode.indexMap[normalizedMatchStart + normalizedTarget.length - 1] + 1;
    const matchText = rawText.slice(matchStart, matchEnd);
    const before = rawText.slice(0, matchStart);
    const after = rawText.slice(matchEnd);
    const mark = document.createElement("mark");
    mark.className = className;
    mark.textContent = matchText;

    const parent = textNode.parentNode;
    if (!parent) return null;

    parent.insertBefore(document.createTextNode(before), textNode);
    parent.insertBefore(mark, textNode);
    parent.insertBefore(document.createTextNode(after), textNode);
    parent.removeChild(textNode);
    mark.scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      if (mark.parentNode) {
        mark.parentNode.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
      }
    };
  }

  return null;
}

export function flashElementClass(element: HTMLElement, className: string) {
  element.classList.add(className);
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  return () => element.classList.remove(className);
}
