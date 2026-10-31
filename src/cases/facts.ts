import type { CaseFact, Disclosure } from "./types";

/** The fact fields both repos share through <case>.facts.json; the backend keeps an identical copy. */
export type SharedFact = Pick<
  CaseFact,
  "id" | "detail" | "disclosure" | "cues" | "topicArea" | "keywords" | "signaturePhrases" | "parentFactId" | "probeCues"
>;
/** The fields only the frontend needs, written in the case file. */
export type FrontendFact = Pick<CaseFact, "label" | "whyItMatters" | "exampleQuestions">;

type FactsFile = { caseId: string; facts: (Omit<SharedFact, "disclosure"> & { disclosure: string })[] };

const DISCLOSURES: readonly Disclosure[] = ["given", "on-ask", "on-probe"];

/**
 * A case's facts: the shared fields from its facts file, in file order, plus the frontend-only fields
 * from `extra`. Throws if the two don't list the same ids.
 */
export function caseFacts(file: FactsFile, extra: Record<string, FrontendFact>): CaseFact[] {
  const missing = Object.keys(extra).filter((id) => !file.facts.some((fact) => fact.id === id));
  if (missing.length) throw new Error(`${file.caseId}: no shared fact for ${missing.join(", ")}`);
  return file.facts.map((fact) => {
    if (!(DISCLOSURES as readonly string[]).includes(fact.disclosure)) {
      throw new Error(`${file.caseId}: ${fact.id} has an unknown disclosure "${fact.disclosure}"`);
    }
    const own = extra[fact.id];
    if (!own) throw new Error(`${file.caseId}: ${fact.id} has no label or example questions`);
    return { ...fact, disclosure: fact.disclosure as Disclosure, ...own };
  });
}
