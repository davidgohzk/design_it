import type { CaseFact } from "../cases";
import type { AssessmentResult } from "./types";

/** The report's summary strip: separate numbers, never an overall score (§7). */
export function summarize(result: AssessmentResult, facts: readonly CaseFact[]) {
  const excluded = new Set(result.fairness.clientFailed);
  const stateOf = new Map(result.found.facts.map((fact) => [fact.factId, fact.state]));
  // Facts the client failed to give when asked are left out of every count.
  const counted = facts.filter((fact) => fact.disclosure !== "given" && !excluded.has(fact.id));
  const surfaced = counted.filter((fact) => stateOf.get(fact.id) === "surfaced");
  const onProbe = counted.filter((fact) => fact.disclosure === "on-probe");
  const onAsk = counted.filter((fact) => fact.disclosure === "on-ask");
  const expected = result.soundness.expectedDecisions;
  return {
    factsFound: { found: surfaced.length, total: counted.length },
    onAskFound: { found: surfaced.filter((fact) => fact.disclosure === "on-ask").length, total: onAsk.length },
    onProbeFound: { found: surfaced.filter((fact) => fact.disclosure === "on-probe").length, total: onProbe.length },
    carriedThrough: {
      found: counted.filter((fact) => result.links.funnel[fact.id] === "carried_through").length,
      total: counted.length,
    },
    unexplainedBoxes: result.links.unjustified.length,
    expectedAddressed: {
      found: expected.filter((item) => item.rating !== "not_addressed").length,
      total: expected.length,
    },
    excludedFacts: [...excluded],
  };
}
