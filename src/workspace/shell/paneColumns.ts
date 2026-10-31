/** A pane, then a 6px divider before each later one. */
export function columnTemplate(sizes: number[], count: number): string {
  const widths = Array.from({ length: count }, (_, index) => sizes[index] ?? 1);
  return widths.flatMap((size, index) => (index ? ["6px", `minmax(0, ${size}fr)`] : [`minmax(0, ${size}fr)`])).join(" ");
}
