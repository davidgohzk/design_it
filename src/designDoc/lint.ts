// Live format checks for the design doc (§5.3). These check the format, not the skill:
// dropped facts and unused requirements are level-2 results and appear only in the report.
import { hasSketch } from "./parse";
import type { ParsedDesignDoc } from "./parse";

export type LintWarning = {
  line: number;
  itemId: string;
  rule:
    | "no-citation"
    | "citation-unverified"
    | "duplicate-id"
    | "no-requirement"
    | "no-trade-off"
    | "missing-ref"
    | "no-sketch"
    | "sketch-parse";
  message: string;
};

export function lintDesignDoc(doc: ParsedDesignDoc): LintWarning[] {
  const warnings: LintWarning[] = [];
  const items = [...doc.requirements, ...doc.assumptions, ...doc.decisions];

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      warnings.push({ line: item.line, itemId: item.id, rule: "duplicate-id", message: `Two items are called ${item.id}.` });
    }
    seen.add(item.id);
  }

  for (const requirement of doc.requirements) {
    const { id, line, citations } = requirement;
    if (citations.length === 0) {
      warnings.push({ line, itemId: id, rule: "no-citation", message: `${id} has no citation.` });
      continue;
    }
    for (const citation of citations) {
      if (citation.valid) continue;
      const place = citation.source === "brief" ? "the brief" : "the chat";
      const message =
        citation.source === "chat" && citation.invalidReason?.includes("not a client response")
          ? `${id} cites your own message; cite what the client said.`
          : `${id}'s quote isn't in ${place} anymore.`;
      warnings.push({ line, itemId: id, rule: "citation-unverified", message });
    }
  }

  const requirementIds = new Set(doc.requirements.map((requirement) => requirement.id));
  for (const decision of doc.decisions) {
    const { id, line } = decision;
    if (decision.requirementIds.length === 0) {
      warnings.push({ line, itemId: id, rule: "no-requirement", message: `${id} doesn't say which requirement it's because of.` });
    }
    for (const ref of decision.requirementIds) {
      if (!requirementIds.has(ref)) {
        warnings.push({ line, itemId: id, rule: "missing-ref", message: `${id} refers to ${ref}, which doesn't exist.` });
      }
    }
    if (!decision.hasTradeOff) {
      warnings.push({ line, itemId: id, rule: "no-trade-off", message: `${id} has no trade-off.` });
    }
    if (decision.sketch?.parseError) {
      warnings.push({
        line: decision.sketchLines?.start ?? line,
        itemId: id,
        rule: "sketch-parse",
        message: `${id}'s sketch: ${decision.sketch.parseError}`,
      });
    } else if (!hasSketch(decision)) {
      warnings.push({ line, itemId: id, rule: "no-sketch", message: `${id} has no sketch.` });
    }
  }

  return warnings.sort((a, b) => a.line - b.line);
}
