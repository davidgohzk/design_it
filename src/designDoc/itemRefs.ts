// A markdown link, including a quoted title that may itself contain ")": [label](#target "title").
const MARKDOWN_LINK = /(\[[^\]]*\]\((?:[^)"]|"(?:\\.|[^"\\])*")*\))/;
const BARE_ITEM_ID = /(?<![\w#[])([RAD]\d+)\b/g;

/**
 * Turns bare mentions of items (e.g. "depends on A1", "(A2)") into the same reference chips as
 * [A1](#A1), leaving existing links and their quoted titles alone. Display only: the parser still
 * counts a decision's requirements from explicit [R1](#R1) links.
 */
export function linkBareItemIds(markdown: string) {
  return markdown
    .split(MARKDOWN_LINK)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(BARE_ITEM_ID, "[$1](#$1)")))
    .join("");
}
