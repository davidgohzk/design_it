import { useEffect, useRef, useState } from "react";
import { LandingIcon } from "../LandingIcon";
import { BUILD_LOOP, STATS } from "../landing.content";

/** 01 — The shift. Owns its own stats reveal, since the ref belongs to the strip below. */
export function ShiftSection() {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsVisible(true);
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="is-stats-section" id="is-current">
      <span className="section-num">01</span>
      <span className="is-stats-label">The shift</span>
      <h2 className="is-stats-question">
        AI writes the code.
        <br />
        <span className="is-stats-accent">You design what it builds.</span>
      </h2>
      <ol className="is-build-loop" aria-label="Who does each step of building software">
        {BUILD_LOOP.flatMap((step, i) => {
          const tile = (
            <li key={step.label} className={`is-build-step${step.who === "AI" ? " is-build-step--ai" : ""}`}>
              <span className="is-build-who">{step.who}</span>
              <LandingIcon name={step.icon} />
              <span className="is-build-label">{step.label}</span>
            </li>
          );
          return i < BUILD_LOOP.length - 1
            ? [
                tile,
                <li key={`arrow-${i}`} className="is-build-arrow" aria-hidden="true">
                  →
                </li>,
              ]
            : [tile];
        })}
      </ol>
      <p className="is-stats-context-final">
        Agents build exactly what you describe. Your design is the instruction.
      </p>
      <div ref={statsRef} className={`is-stats-strip${statsVisible ? " is-stats-visible" : ""}`}>
        {STATS.map((s) => (
          <div key={s.source} className="is-stat-item">
            <span className="is-stat-label">{s.fact}</span>
            <span className="is-stat-number">{s.number}</span>
            <a className="is-stat-cite" href={s.url} target="_blank" rel="noreferrer">
              {s.source} ↗
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
