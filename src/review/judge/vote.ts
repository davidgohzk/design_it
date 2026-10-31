// How several runs of the same AI judgement are combined. The two rules live together because the
// difference between them is a deliberate choice, not an accident:
// - Justify uses `unanimous`: a verdict that changes an engineer's review needs every run to agree.
// - The Bano interview-mistake check uses `majority`: it is teaching feedback, never scored, so the
//   looser bar costs nothing and leaves fewer items unresolved.
// Either way, no agreement means `uncertain` rather than a guess.

/** The one value every run returned; null if any run disagreed, or there were no runs. */
export function unanimous<T extends string>(values: readonly T[]): T | null {
  if (values.length === 0) return null;
  return values.every((value) => value === values[0]) ? values[0] : null;
}

/** The value more than half the runs returned; null on a tie or a split with no clear winner. */
export function majority<T extends string>(values: readonly T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const [value, count] of counts) {
    if (count * 2 > values.length) return value;
  }
  return null;
}
