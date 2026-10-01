// Level 1A (§5.3): is each piece complete against the template? Code-checked, item by item, reusing the
// live lint. Only template problems live here; whether a link holds (a quote verifies, a decision is
// drawn) is level 1B.
import { usableSketches } from "../designDoc/consistency";
import { lintDesignDoc } from "../designDoc/lint";
import type { LintWarning } from "../designDoc/lint";
import type { ParsedDecision, ParsedDesignDoc } from "../designDoc/parse";

/** One problem with an item; `nodeId` points at a box in the final diagram. */
export type PieceIssue = { message: string; nodeId?: string };
/** An item with at least one problem: R#, D#, or "final" for the final diagram. */
export type FlaggedPiece = { id: string; issues: PieceIssue[] };
/** The items of one kind that have problems, out of `total`, plus problems with no item to point at. */
export type PieceList = { total: number; flagged: FlaggedPiece[]; general: string[] };

export const FINAL_DIAGRAM_ID = "final";

const ASSUMPTIONS_HEADING = /^##\s+assumptions\s*$/im;

/** The choice is whatever the decision says before its "because" (or trade-off). */
const decisionChoice = (decision: ParsedDecision) =>
  decision.text
    .split(/\bbecause\b|trade-?off\s*:/i)[0]
    .replace(/[\s—–-]+$/, "")
    .trim();

/** Collects issues per item id, in the order the ids are first given. */
function collect(ids: string[]) {
  const issues = new Map<string, PieceIssue[]>(ids.map((id) => [id, []]));
  const add = (id: string, message: string, nodeId?: string) => {
    const list = issues.get(id) ?? [];
    if (!list.some((issue) => issue.message === message)) list.push(nodeId ? { message, nodeId } : { message });
    issues.set(id, list);
  };
  const flagged = () =>
    [...issues].filter(([, list]) => list.length > 0).map(([id, list]): FlaggedPiece => ({ id, issues: list }));
  return { add, flagged };
}

const lintFor = (lint: LintWarning[], ...rules: LintWarning["rule"][]) =>
  lint.filter((warning) => rules.includes(warning.rule));

/** Requirements: each has words, a reference to the chat or the brief, and its own id. */
export function requirementPieces(doc: ParsedDesignDoc): PieceList {
  const ids = [...new Set(doc.requirements.map((item) => item.id))];
  const { add, flagged } = collect(ids);
  for (const requirement of doc.requirements) {
    if (!requirement.text.trim()) add(requirement.id, `${requirement.id} has no words.`);
    if (requirement.citations.length === 0) add(requirement.id, `${requirement.id} has no reference to the chat or the brief.`);
  }
  for (const warning of lintFor(lintDesignDoc(doc), "duplicate-id")) {
    if (ids.includes(warning.itemId)) add(warning.itemId, warning.message);
  }
  return { total: ids.length, flagged: flagged(), general: [] };
}

/** Decisions: each has a choice, a "because" citing requirements that exist, a trade-off and its own id. */
export function decisionPieces(doc: ParsedDesignDoc, docMarkdown: string): PieceList {
  const ids = [...new Set(doc.decisions.map((item) => item.id))];
  const { add, flagged } = collect(ids);
  for (const decision of doc.decisions) {
    if (!decisionChoice(decision)) add(decision.id, `${decision.id} doesn't say what was decided.`);
    if (!decision.hasBecause) add(decision.id, `${decision.id} has no "because".`);
  }
  for (const warning of lintFor(lintDesignDoc(doc), "no-requirement", "missing-ref", "no-trade-off", "duplicate-id")) {
    if (ids.includes(warning.itemId)) add(warning.itemId, warning.message);
  }
  const general = ASSUMPTIONS_HEADING.test(docMarkdown) ? [] : ['There is no "## Assumptions" section.'];
  return { total: ids.length, flagged: flagged(), general };
}

/**
 * Diagrams: each sketch parses, and the final diagram renders with every box named by a decision.
 * A decision with no sketch at all is a link problem (1B, not drawn), not a template one.
 * `mermaidError` is mermaid.parse's verdict on the final diagram, which needs the DOM and so comes from the UI.
 */
export function diagramPieces(doc: ParsedDesignDoc, mermaidError?: string | null): PieceList {
  const sketchIds = [...new Set(doc.decisions.filter((item) => item.sketchCode !== null).map((item) => item.id))];
  const { add, flagged } = collect([...sketchIds, FINAL_DIAGRAM_ID]);
  for (const warning of lintFor(lintDesignDoc(doc), "sketch-parse")) add(warning.itemId, warning.message);

  const empty = doc.final.nodes.length === 0;
  const renderError = doc.final.parseError ?? mermaidError ?? (empty ? "There is no final diagram yet." : undefined);
  if (renderError) add(FINAL_DIAGRAM_ID, renderError);
  const sketched = new Set(usableSketches(doc.decisions).flatMap((decision) => decision.sketch!.nodes.map((node) => node.id)));
  for (const node of doc.final.nodes) {
    if (node.isActor || sketched.has(node.id)) continue;
    add(FINAL_DIAGRAM_ID, "No decision's sketch has this box.", node.id);
  }
  return { total: sketchIds.length + 1, flagged: flagged(), general: [] };
}
