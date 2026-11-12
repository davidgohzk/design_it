import { useRef } from "react";
import { SECTIONS } from "../destinations";
import { useTraceOnce } from "../hooks";
import { AMBITION } from "../landing.content";
import { ContactAction } from "../parts";

/**
 * The three stages are plain HTML placed by percentage inside a fixed-aspect box, and the SVG behind
 * them shares that box, so the connectors meet the stages at every desktop width. Below 1024px the
 * box becomes a vertical sequence and the SVG is hidden.
 */
export function AmbitionSection() {
  const cycleRef = useRef<HTMLDivElement>(null);
  useTraceOnce(cycleRef);
  return (
    <section className="lp-section lp-ambition" id={SECTIONS.ambition} tabIndex={-1} aria-labelledby="ambition-title">
      <div className="lp-container">
        <header className="lp-intro lp-intro--centred">
          <p className="lp-eyebrow">Our ambition</p>
          <h2 id="ambition-title">{AMBITION.title}</h2>
          <p className="lp-lead">{AMBITION.body}</p>
          <p className="lp-body lp-ai">{AMBITION.ai}</p>
        </header>

        <p className="lp-caption lp-cycle-caption">{AMBITION.caption}</p>
        <div className="lp-cycle" ref={cycleRef}>
          <svg className="lp-cycle-lines" viewBox="0 0 1200 640" aria-hidden="true">
            <defs>
              <marker id="cycle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0 0L10 5L0 10z" fill="currentColor" />
              </marker>
            </defs>
            <path className="lp-trace-path" d="M730 170 L930 352" markerEnd="url(#cycle-arrow)" />
            <path className="lp-trace-path" d="M790 400 L410 400" markerEnd="url(#cycle-arrow)" />
            <path className="lp-trace-path lp-trace-path--return" d="M250 352 L470 170" markerEnd="url(#cycle-arrow)" />
          </svg>
          <p className="lp-cycle-centre">{AMBITION.centre}</p>
          <ol className="lp-cycle-stages">
            {AMBITION.stages.map((stage, i) => (
              <li key={stage.title} className={`lp-cycle-item lp-cycle-item--${i + 1}`}>
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
          <p className="lp-cycle-return">
            <span aria-hidden="true">↺ </span>
            {AMBITION.returnLabel}
            <span className="lp-sr-only">: stage 3 leads back to stage 1</span>
          </p>
        </div>

        <div className="lp-ambition-cta">
          <ContactAction>{AMBITION.action}</ContactAction>
        </div>
      </div>
    </section>
  );
}
