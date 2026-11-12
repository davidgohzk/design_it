// The hero's connector arrows. Each runs from the edge of the pane holding one element to the edge
// of the pane holding another, level with each element, so the arrows sit in the gaps between panes.

export type Side = "left" | "right";
type Point = { x: number; y: number };

/** What the visitor is pointing at in the hero. */
export type HeroFocus = "reply" | "requirement" | "decision";

export type HeroLink = {
  id: "reply" | "requirement" | "decision" | "gap";
  from: string;
  fromSide: Side;
  to: string;
  toSide: Side;
  /** The focuses that light this arrow. */
  hotWhen: HeroFocus[];
};

// R1 lights the whole chain from Mei's reply to the diagram; the decision lights only its own two arrows.
export const HERO_LINKS: HeroLink[] = [
  { id: "reply", from: ".lp-mark", fromSide: "right", to: ".lp-req", toSide: "left", hotWhen: ["reply", "requirement"] },
  { id: "requirement", from: ".lp-req", fromSide: "right", to: ".lp-decision-head", toSide: "left", hotWhen: ["requirement", "decision"] },
  { id: "decision", from: ".lp-decision-head", fromSide: "right", to: ".lp-fd-btn", toSide: "left", hotWhen: ["requirement", "decision"] },
  { id: "gap", from: ".lp-msg.is-flagged", fromSide: "left", to: ".lp-finding", toSide: "left", hotWhen: [] },
];

export const isHot = (link: HeroLink, focus: HeroFocus | null) => focus !== null && link.hotWhen.includes(focus);

const OUT: Record<Side, number> = { left: -1, right: 1 };

/** A curve leaving `a` outward from its side and entering `b` from its side, with an arrowhead at `b`. */
export function linkPath(a: Point, aSide: Side, b: Point, bSide: Side) {
  // Same-side links (left to left) still need room to bow out, so the pull never drops to zero.
  const pull = Math.max(28, Math.abs(b.x - a.x) / 2);
  const line = `M${a.x} ${a.y} C${a.x + OUT[aSide] * pull} ${a.y} ${b.x + OUT[bSide] * pull} ${b.y} ${b.x} ${b.y}`;
  const back = b.x + OUT[bSide] * 8;
  const arrow = `M${back} ${b.y - 6} L${b.x} ${b.y} L${back} ${b.y + 6}`;
  return { line, arrow };
}

/** Offsets within `root`, ignoring transforms, so the entrance animation cannot skew the measurement. */
export function boxIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

/** Where `selector`'s element meets the given side of its pane, in `root` coordinates. */
export function anchorPoint(root: HTMLElement, selector: string, side: Side): Point | null {
  const el = root.querySelector<HTMLElement>(selector);
  const pane = el?.closest<HTMLElement>(".lp-pane");
  if (!el || !pane) return null;
  const box = boxIn(el, root);
  const edge = boxIn(pane, root);
  return { x: side === "left" ? edge.x : edge.x + edge.width, y: box.y + box.height / 2 };
}
