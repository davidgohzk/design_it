import { BRIGHTPATH_CASE } from "./brightpath";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import type { CaseDefinition } from "./types";

export const CASES: readonly CaseDefinition[] = [BRIGHTPATH_CASE, COMMUNITY_ROOM_CASE];

export function getCase(id: string): CaseDefinition {
  const found = CASES.find((definition) => definition.id === id);
  if (!found) throw new Error(`Unknown case ${id}.`);
  return found;
}

export type { CaseDefinition, CaseFact, Disclosure, ExpectedDecision } from "./types";
