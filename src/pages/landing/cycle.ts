// The ambition cycle's geometry, in the 800 x 680 box that its SVG and its HTML labels share.
// Stages sit on the ring, so each arc runs under the cards at both ends and only its middle shows.

export const CYCLE_BOX = { width: 800, height: 680 };
export const RING = { cx: 400, cy: 390, r: 270 };

// Stage 1 at the top, then clockwise to 2 (lower right) and 3 (lower left).
export const STAGE_ANGLES = [-90, 30, 150] as const;

const round = (n: number) => Math.round(n * 10) / 10;

export function ringPoint(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: round(RING.cx + RING.r * Math.cos(rad)), y: round(RING.cy + RING.r * Math.sin(rad)) };
}

/** A clockwise arc along the ring, from one angle to a later one less than a full turn away. */
export function ringArc(from: number, to: number) {
  const a = ringPoint(from);
  const b = ringPoint(to);
  const large = to - from > 180 ? 1 : 0;
  return `M${a.x} ${a.y} A${RING.r} ${RING.r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** The whole ring as one closed path, for the travelling dot. */
export const RING_LOOP = `${ringArc(-90, 90)} A${RING.r} ${RING.r} 0 0 1 ${ringPoint(270).x} ${ringPoint(270).y}`;

/** A point as percentages of the box. CSS custom properties, so the stacked layout can ignore them. */
const boxPosition = (p: { x: number; y: number }) => ({
  "--x": `${round((p.x / CYCLE_BOX.width) * 100)}%`,
  "--y": `${round((p.y / CYCLE_BOX.height) * 100)}%`,
});

export const stagePosition = (index: number) => boxPosition(ringPoint(STAGE_ANGLES[index]));
export const CENTRE_POSITION = boxPosition({ x: RING.cx, y: RING.cy });
/** Where the return label starts: just inside the return arc, below its arrow at 210 degrees. */
export const RETURN_POSITION = boxPosition(ringPoint(200));

/** The arc leaving a stage, with an arrow at its midpoint pointing the way round. */
export function stageLink(index: number) {
  const from = STAGE_ANGLES[index];
  const mid = ringPoint(from + 60);
  return { d: ringArc(from, from + 120), arrow: `translate(${mid.x} ${mid.y}) rotate(${from + 60 + 90})` };
}
