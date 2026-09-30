// Level 1B / 1C (§5.3): is each piece complete against the template? Code-checked, reusing the live lint.
import { usableSketches } from "../designDoc/consistency";
import { lintDesignDoc } from "../designDoc/lint";
import type { LintWarning } from "../designDoc/lint";
import type { ParsedDecision, ParsedDesignDoc } from "../designDoc/parse";

export type PieceCheck = {
  label: string;
  passed: boolean;
  /** Ids of the items that fail it (R#, D# or a box id). */
  failing: string[];
  /** Why it failed, when there are no items to point at. */
  detail?: string;
};

const ASSUMPTIONS_HEADING = /^##\s+assumptions\s*$/im;

/** The choice is whatever the decision says before its "because" (or trade-off). */
export const decisionChoice = (decision: ParsedDecision) =>
  decision.text
    .split(/\bbecause\b|trade-?off\s*:/i)[0]
    .replace(/[\s—–-]+$/, "")
    .trim();

const unique = (ids: string[]) => [...new Set(ids)];

function check(label: string, failing: string[]): PieceCheck {
  const ids = unique(failing);
  return { label, passed: ids.length === 0, failing: ids };
}

export function designDocChecks(doc: ParsedDesignDoc, docMarkdown: string): PieceCheck[] {
  const lint = lintDesignDoc(doc);
  const flagged = (...rules: LintWarning["rule"][]) =>
    lint.filter((warning) => rules.includes(warning.rule)).map((warning) => warning.itemId);
  const hasAssumptions = ASSUMPTIONS_HEADING.test(docMarkdown);
  return [
    check("Every requirement has a citation", flagged("no-citation", "citation-unverified")),
    {
      label: "Assumptions section present",
      passed: hasAssumptions,
      failing: [],
      detail: hasAssumptions ? undefined : 'There is no "## Assumptions" section.',
    },
    check(
      "Every decision has a choice",
      doc.decisions.filter((decision) => !decisionChoice(decision)).map((decision) => decision.id),
    ),
    check(
      "Every decision has a because, citing a requirement",
      [...doc.decisions.filter((decision) => !decision.hasBecause).map((decision) => decision.id), ...flagged("no-requirement")],
    ),
    check("Every decision has a trade-off", flagged("no-trade-off")),
  ];
}

/** `mermaidError` is mermaid.parse's verdict on the final diagram, which needs the DOM and so comes from the UI. */
export function diagramChecks(doc: ParsedDesignDoc, mermaidError?: string | null): PieceCheck[] {
  const empty = doc.final.nodes.length === 0;
  const renderError = doc.final.parseError ?? mermaidError ?? (empty ? "There is no final diagram yet." : undefined);
  const sketched = new Set(usableSketches(doc.decisions).flatMap((decision) => decision.sketch!.nodes.map((node) => node.id)));
  return [
    { label: "Renders", passed: !renderError, failing: [], detail: renderError },
    check(
      "Every box names a decision",
      doc.final.nodes.filter((node) => !node.isActor && !sketched.has(node.id)).map((node) => node.id),
    ),
  ];
}
