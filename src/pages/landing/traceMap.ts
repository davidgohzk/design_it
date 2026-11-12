/**
 * The landing page's picture of what the real review checks: each fact the client revealed is
 * followed into a requirement and then into diagram boxes. Status is derived from the links,
 * never stored, so the counts and the drawing cannot disagree.
 */

export type RequirementId = "R1" | "R2" | "R3";
export type BoxId = "form" | "staff-entry" | "calendar" | "availability";

/** `requirement: null` means the fact was heard but never became a requirement. */
export type Fact = { id: string; label: string; requirement: RequirementId | null };
export type Requirement = { id: RequirementId; label: string; boxes: BoxId[] };
export type Box = { id: BoxId; label: string };

export type FactStatus = "carried_through" | "not_drawn" | "dropped";

export type Selection = { kind: "fact"; id: string } | { kind: "requirement"; id: RequirementId };

// Row order keeps the connectors from crossing.
export const FACTS: Fact[] = [
  { id: "sticky-notes", label: "Phone bookings go on sticky notes", requirement: "R1" },
  { id: "walk-in", label: "Some people walk in to book", requirement: null },
  { id: "online", label: "Most people book online", requirement: "R2" },
  { id: "double-booked", label: "Rooms get double-booked", requirement: "R3" },
];

export const REQUIREMENTS: Requirement[] = [
  { id: "R1", label: "Staff record phone bookings", boxes: ["staff-entry", "calendar"] },
  { id: "R2", label: "Residents book online", boxes: ["form", "calendar"] },
  { id: "R3", label: "Calendar blocks clashes", boxes: ["availability"] },
];

export const BOXES: Box[] = [
  { id: "staff-entry", label: "Staff booking entry" },
  { id: "calendar", label: "Shared calendar" },
  { id: "form", label: "Booking form" },
  { id: "availability", label: "Availability check" },
];

export const COLUMN_LABELS = ["What Mei said", "Your requirements", "Your diagram"] as const;

export const INITIAL_SELECTION: Selection = { kind: "fact", id: "walk-in" };

const requirementById = new Map(REQUIREMENTS.map((r) => [r.id, r]));
const boxById = new Map(BOXES.map((b) => [b.id, b]));

export const requirementOf = (fact: Fact) => (fact.requirement ? requirementById.get(fact.requirement) : undefined);
export const boxesOf = (requirement: Requirement) => requirement.boxes.map((id) => boxById.get(id)!);

export function factStatus(fact: Fact): FactStatus {
  const requirement = requirementOf(fact);
  if (!requirement) return "dropped";
  return requirement.boxes.length ? "carried_through" : "not_drawn";
}

export function summarize(facts: Fact[] = FACTS) {
  const statuses = facts.map(factStatus);
  return {
    facts: facts.length,
    carried: statuses.filter((s) => s === "carried_through").length,
    dropped: statuses.filter((s) => s === "dropped").length,
  };
}

/** Every item the selection reaches, as `fact:<id>`, `req:<id>` and `box:<id>` keys. */
export function chainOf(selection: Selection): Set<string> {
  const chain = new Set<string>();
  const facts =
    selection.kind === "fact"
      ? FACTS.filter((f) => f.id === selection.id)
      : FACTS.filter((f) => f.requirement === selection.id);
  facts.forEach((f) => chain.add(`fact:${f.id}`));
  const requirements =
    selection.kind === "fact" ? facts.map(requirementOf).filter((r) => r !== undefined) : [requirementById.get(selection.id)!];
  for (const r of requirements) {
    chain.add(`req:${r.id}`);
    r.boxes.forEach((b) => chain.add(`box:${b}`));
  }
  return chain;
}

/* Geometry. The map is a five-track grid (card, gutter, card, gutter, card) in these proportions;
   feedback.css repeats them in `.lp-trace-grid`, so change both together. */
export const TRACKS = [1, 0.42, 1, 0.42, 1];
const total = TRACKS.reduce((a, b) => a + b, 0);
const edge = (tracks: number) => (TRACKS.slice(0, tracks).reduce((a, b) => a + b, 0) / total) * 100;
/** Left and right x of each card column, in the 0-100 viewBox. */
export const COLUMN_X = [0, 2, 4].map((i) => ({ left: edge(i), right: edge(i + 1) }));

/** Items sit centred in equal rows, so the i-th of n is at this y in the 0-100 viewBox. */
export const rowY = (i: number, n: number) => ((i + 0.5) / n) * 100;

export type Link = { from: string; to: string; d: string };
export type Stub = { from: string; d: string; end: { x: number; y: number } };

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2;
  return `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
};

/** Connectors from fact to requirement and requirement to box, plus a short stub for each dropped fact. */
export function traceGeometry(): { links: Link[]; stubs: Stub[] } {
  const reqY = new Map(REQUIREMENTS.map((r, i) => [r.id, rowY(i, REQUIREMENTS.length)]));
  const boxY = new Map(BOXES.map((b, i) => [b.id, rowY(i, BOXES.length)]));
  const links: Link[] = [];
  const stubs: Stub[] = [];
  FACTS.forEach((f, i) => {
    const y = rowY(i, FACTS.length);
    const x1 = COLUMN_X[0].right;
    if (f.requirement === null) {
      const x2 = x1 + (COLUMN_X[1].left - x1) * 0.45;
      stubs.push({ from: `fact:${f.id}`, d: `M${x1} ${y} L${x2} ${y}`, end: { x: x2, y } });
      return;
    }
    links.push({ from: `fact:${f.id}`, to: `req:${f.requirement}`, d: curve(x1, y, COLUMN_X[1].left, reqY.get(f.requirement)!) });
  });
  for (const r of REQUIREMENTS) {
    for (const b of r.boxes) {
      links.push({ from: `req:${r.id}`, to: `box:${b}`, d: curve(COLUMN_X[1].right, reqY.get(r.id)!, COLUMN_X[2].left, boxY.get(b)!) });
    }
  }
  return { links, stubs };
}
