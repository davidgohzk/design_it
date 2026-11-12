import { useRef, useState, type CSSProperties } from "react";
import { CENTRE_POSITION, CYCLE_BOX, RETURN_POSITION, RING_LOOP, stageLink, stagePosition } from "../cycle";
import { SECTIONS } from "../destinations";
import { useReducedMotion, useTraceOnce } from "../hooks";
import { AMBITION, type Tone } from "../landing.content";
import { ContactAction, Eyebrow } from "../parts";

const STAGE_TONES: Tone[] = ["yellow", "green", "purple"];

/**
 * The stages are plain HTML placed on a ring inside a fixed-aspect box, and the SVG behind them
 * shares that box (see cycle.ts), so the arcs meet the stages at every desktop width. Below 1200px
 * the box becomes a vertical sequence and the SVG is hidden. The copy comes first in the DOM so the
 * stacked layout reads text first; CSS moves the ring to the left from 1024px.
 */
export function AmbitionSection() {
  const cycleRef = useRef<HTMLDivElement>(null);
  useTraceOnce(cycleRef);
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const arcClass = (i: number) => `lp-cycle-arc${active === i ? " is-hot" : active === null ? "" : " is-dim"}`;

  return (
    <section className="lp-section lp-ambition" id={SECTIONS.ambition} tabIndex={-1} aria-labelledby="ambition-title">
      <div className="lp-container lp-split lp-ambition-split">
        <header className="lp-intro">
          <Eyebrow icon="spark">Our ambition</Eyebrow>
          <h2 id="ambition-title">{AMBITION.title}</h2>
          <p className="lp-lead">{AMBITION.body}</p>
          <p className="lp-body lp-ai">{AMBITION.ai}</p>
          <div className="lp-ambition-cta">
            <ContactAction subject="design_it collaboration">{AMBITION.action}</ContactAction>
          </div>
        </header>

        <div className="lp-ambition-visual">
          <p className="lp-caption lp-cycle-caption">{AMBITION.caption}</p>
          <div className="lp-cycle" ref={cycleRef}>
            <svg
              className="lp-cycle-lines"
              viewBox={`0 0 ${CYCLE_BOX.width} ${CYCLE_BOX.height}`}
              aria-hidden="true"
              focusable="false"
            >
              {AMBITION.stages.map((stage, i) => {
                const link = stageLink(i);
                return (
                  <g key={stage.title} className={`${arcClass(i)}${i === 2 ? " lp-cycle-arc--return" : ""}`}>
                    <path className="lp-cycle-path" d={link.d} />
                    <path className="lp-cycle-chevron" d="M-9 -8 L3 0 L-9 8" transform={link.arrow} />
                  </g>
                );
              })}
              {!reduced && (
                <circle className="lp-cycle-dot" r="7">
                  <animateMotion dur="14s" repeatCount="indefinite" path={RING_LOOP} />
                </circle>
              )}
            </svg>
            <p className="lp-cycle-centre" style={CENTRE_POSITION as CSSProperties}>
              {AMBITION.centre}
            </p>
            <ol className="lp-cycle-stages">
              {AMBITION.stages.map((stage, i) => (
                // Focusable so keyboard visitors get the same arc highlight as pointer hover.
                <li
                  key={stage.title}
                  className={`lp-cycle-item lp-tone--${STAGE_TONES[i]}`}
                  style={stagePosition(i) as CSSProperties}
                  tabIndex={0}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <h3 className="lp-cycle-stage">
                    <span className="lp-step-num">{i + 1}</span> {stage.title}
                  </h3>
                  <div className="lp-cycle-audience">
                    <h4>{stage.audience}</h4>
                    <p>{stage.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="lp-cycle-return" style={RETURN_POSITION as CSSProperties}>
              <span aria-hidden="true">↺ </span>
              {AMBITION.returnLabel}
              <span className="lp-sr-only">: stage 3 leads back to stage 1</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
