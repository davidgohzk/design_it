import { useState } from "react";
import { SECTIONS } from "../destinations";
import { FEEDBACK } from "../landing.content";

type Evidence = "interview" | "design";

/** Both excerpts are always visible; the controls only highlight one, so focus stays put. */
export function FeedbackSection() {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const control = (which: Evidence, label: string) => (
    <button
      type="button"
      className="lp-ctl"
      aria-pressed={evidence === which}
      aria-controls={`evidence-${which}`}
      onClick={() => setEvidence(evidence === which ? null : which)}
    >
      {label}
    </button>
  );

  return (
    <section className="lp-section lp-feedback" id={SECTIONS.feedback} tabIndex={-1} aria-labelledby="feedback-title">
      <div className="lp-container">
        <header className="lp-intro lp-intro--centred">
          <p className="lp-eyebrow">Example feedback</p>
          <h2 id="feedback-title">{FEEDBACK.title}</h2>
          <p className="lp-caption">{FEEDBACK.label}</p>
        </header>

        <div className="lp-evidence">
          <figure
            id="evidence-interview"
            className={`lp-excerpt${evidence === "interview" ? " is-selected" : ""}`}
            aria-labelledby="evidence-interview-label"
          >
            <p className="lp-pane-label" id="evidence-interview-label">
              Interview evidence
            </p>
            <blockquote>
              <p>
                <span className="lp-who">Mei</span> {FEEDBACK.quote}
              </p>
            </blockquote>
          </figure>
          <figure
            id="evidence-design"
            className={`lp-excerpt${evidence === "design" ? " is-selected" : ""}`}
            aria-labelledby="evidence-design-label"
          >
            <p className="lp-pane-label" id="evidence-design-label">
              {FEEDBACK.requirementLabel}
            </p>
            <div className="lp-req">
              <span className="lp-req-id">R2</span>
              <p>{FEEDBACK.requirement}</p>
            </div>
          </figure>

          <div className="lp-finding-card lp-evidence-finding">
            <h3 className="lp-status">{FEEDBACK.findingHeading}</h3>
            <p>{FEEDBACK.finding}</p>
            <h3 className="lp-revisit-heading">{FEEDBACK.promptHeading}</h3>
            <p>{FEEDBACK.prompt}</p>
            <div className="lp-evidence-controls">
              {control("interview", "View interview evidence")}
              {control("design", "View design evidence")}
            </div>
          </div>
        </div>

        <p className="lp-closing-line">{FEEDBACK.closing}</p>
      </div>
    </section>
  );
}
