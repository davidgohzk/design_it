import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { FlowDiagram } from "../FlowDiagram";
import { SECTIONS } from "../destinations";
import { HERO_LINKS, anchorPoint, isHot, linkPath, type HeroFocus, type HeroLink } from "../heroLinks";
import {
  HERO,
  HERO_DIAGRAM,
  HERO_GAP,
  HERO_QUESTION,
  HERO_REPLY,
  HERO_REQUIREMENT,
  HERO_SUMMARY,
  HERO_WALKIN,
} from "../landing.content";
import { DecisionCard, PracticeLink, SectionLink, Sticker, type StickerName } from "../parts";

export function HeroSection() {
  return (
    <section className="lp-section lp-hero" aria-labelledby="hero-title">
      <div className="lp-container">
        <div className="lp-hero-copy">
          <h1 id="hero-title">{HERO.title}</h1>
          <p className="lp-lead">{HERO.body}</p>
          <div className="lp-actions">
            <PracticeLink>Try a case</PracticeLink>
            <SectionLink to={SECTIONS.ngo} className="lp-btn lp-btn--secondary">
              Bring an NGO challenge
            </SectionLink>
          </div>
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}

function HeroDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const links = useLinkPaths(stageRef);
  const [focus, setFocus] = useState<HeroFocus | null>(null);
  const point = (target: HeroFocus) => ({
    onMouseEnter: () => setFocus(target),
    onMouseLeave: () => setFocus(null),
    onFocus: () => setFocus(target),
    onBlur: () => setFocus(null),
  });
  const traced = focus === "requirement" || focus === "decision";

  return (
    <figure className="lp-demo lp-window" aria-labelledby="demo-caption">
      <figcaption id="demo-caption" className="lp-window-bar">
        {HERO.caption}
      </figcaption>
      <p className="lp-sr-only">{HERO_SUMMARY}</p>

      <div className="lp-demo-stage" ref={stageRef}>
        <div className="lp-pane lp-pane--interview">
          <PaneLabel n={1} icon="chat">
            Interview
          </PaneLabel>
          <div className="lp-chat">
            <p className="lp-msg lp-msg--client is-flagged">
              <span className="lp-who">Mei</span> {HERO_WALKIN}
              <span className="lp-tag">Heard, not addressed</span>
            </p>
            <p className="lp-msg lp-msg--you">
              <span className="lp-who">You</span> {HERO_QUESTION}
            </p>
            <p className="lp-msg lp-msg--client">
              <span className="lp-who">Mei</span> {HERO_REPLY.before}
              <mark
                className={`lp-mark${focus === "requirement" ? " is-traced" : ""}`}
                onMouseEnter={() => setFocus("reply")}
                onMouseLeave={() => setFocus(null)}
              >
                {HERO_REPLY.highlight}
              </mark>
            </p>
          </div>
        </div>

        <div className="lp-pane lp-pane--requirement">
          <PaneLabel n={2} icon="doc">
            Requirement
          </PaneLabel>
          <div
            className={`lp-req lp-req--traceable${focus === "reply" ? " is-traced" : ""}`}
            tabIndex={0}
            aria-describedby="hero-req-trace"
            {...point("requirement")}
          >
            <span className="lp-req-id">{HERO_REQUIREMENT.id}</span>
            <p>{HERO_REQUIREMENT.text}</p>
          </div>
          <p className="lp-sr-only" id="hero-req-trace">
            Traced to Mei’s reply about sticky notes
          </p>
        </div>

        <div className="lp-pane lp-pane--decision">
          <PaneLabel n={3} icon="scale">
            Decision
          </PaneLabel>
          <DecisionCard
            className={`lp-decision--traceable${focus === "requirement" ? " is-traced" : ""}`}
            tabIndex={0}
            aria-describedby="hero-decision-trace"
            {...point("decision")}
          />
          <p className="lp-sr-only" id="hero-decision-trace">
            Made for R1 and drawn as the booking flow
          </p>
        </div>

        <div className="lp-pane lp-pane--diagram">
          <PaneLabel n={4} icon="nodes">
            Diagram
          </PaneLabel>
          <FlowDiagram nodes={HERO_DIAGRAM} label="Booking flow for R1" traced={traced} />
        </div>

        <div className="lp-pane lp-pane--feedback">
          <PaneLabel n={5} icon="flag">
            Feedback
          </PaneLabel>
          <p className="lp-finding">
            <span className="lp-status">Missing connection</span> {HERO_GAP}
          </p>
        </div>

        <svg className="lp-hero-links" aria-hidden="true" focusable="false">
          {links.map(({ link, line, arrow }) => (
            <g key={link.id} className={`lp-hero-link lp-hero-link--${link.id}${isHot(link, focus) ? " is-hot" : ""}`}>
              <path d={line} />
              <path d={arrow} />
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}

/** Measures the connectors after layout and again whenever the stage resizes. */
function useLinkPaths(stageRef: RefObject<HTMLDivElement | null>) {
  const [paths, setPaths] = useState<{ link: HeroLink; line: string; arrow: string }[]>([]);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () =>
      setPaths(
        HERO_LINKS.flatMap((link) => {
          const a = anchorPoint(stage, link.from, link.fromSide);
          const b = anchorPoint(stage, link.to, link.toSide);
          return a && b ? [{ link, ...linkPath(a, link.fromSide, b, link.toSide) }] : [];
        }),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef]);
  return paths;
}

function PaneLabel({ n, icon, children }: { n: number; icon: StickerName; children: ReactNode }) {
  return (
    <p className="lp-pane-label">
      <Sticker name={icon} />
      {children}
      <span className="lp-pane-num">
        <span className="lp-sr-only">Step </span>
        {n}
      </span>
    </p>
  );
}
