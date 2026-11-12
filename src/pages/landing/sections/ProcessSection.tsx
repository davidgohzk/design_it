import { useState } from "react";
import { SECTIONS } from "../destinations";
import {
  BRIEF,
  FEEDBACK,
  HERO_DIAGRAM,
  HERO_DIAGRAM_REASON,
  HERO_REQUIREMENT,
  INTERVIEW_EXCERPT,
  PROCESS,
  PROCESS_STEPS,
  type ProcessStepId,
} from "../landing.content";
import { DecisionExplanation, PracticeLink } from "../parts";

/**
 * Desktop shows a step selector beside one preview; below 768px CSS swaps to the stacked list. Every
 * preview sits in the same grid cell, so the cell is always as tall as the tallest and switching
 * steps never moves the page.
 */
export function ProcessSection() {
  const [selected, setSelected] = useState<ProcessStepId>("explore");
  return (
    <section className="lp-section lp-process" id={SECTIONS.how} tabIndex={-1} aria-labelledby="process-title">
      <div className="lp-container">
        <header className="lp-intro lp-intro--centred">
          <p className="lp-eyebrow">How it works</p>
          <h2 id="process-title">{PROCESS.title}</h2>
          <p className="lp-quote">{PROCESS.quote}</p>
          <p className="lp-lead">{PROCESS.intro}</p>
        </header>

        <div className="lp-process-desktop">
          <ol className="lp-steps">
            {PROCESS_STEPS.map((step, i) => (
              <li key={step.id}>
                <button
                  type="button"
                  className="lp-step"
                  aria-pressed={selected === step.id}
                  aria-controls={`preview-${step.id}`}
                  onClick={() => setSelected(step.id)}
                >
                  <span className="lp-step-num">{i + 1}</span>
                  <span>
                    <span className="lp-step-title">{step.title}</span>
                    <span className="lp-step-text">{step.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="lp-previews">
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.id}
                id={`preview-${step.id}`}
                className="lp-preview"
                role="region"
                aria-label={`${step.title}: illustrative preview`}
                data-active={selected === step.id}
              >
                <StepPreview step={step.id} />
              </div>
            ))}
          </div>
        </div>

        <ol className="lp-process-mobile">
          {PROCESS_STEPS.map((step, i) => (
            <li key={step.id}>
              <h3>
                <span className="lp-step-num">{i + 1}</span> {step.title}
              </h3>
              <p>{step.text}</p>
              <div className="lp-preview">
                <StepPreview step={step.id} />
              </div>
            </li>
          ))}
        </ol>

        <div className="lp-process-cta">
          <PracticeLink>{PROCESS.action}</PracticeLink>
          <p className="lp-caption">{PROCESS.caption}</p>
        </div>
      </div>
    </section>
  );
}

function StepPreview({ step }: { step: ProcessStepId }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const label = <p className="lp-preview-label">Illustrative preview</p>;
  switch (step) {
    case "explore":
      return (
        <>
          {label}
          <article className="lp-doc">
            <p className="lp-eyebrow">Opening brief</p>
            <h3>{BRIEF.heading}</h3>
            {BRIEF.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="lp-doc-prompt">What do you need to understand first?</p>
          </article>
        </>
      );
    case "interview":
      return (
        <>
          {label}
          <div className="lp-chat lp-doc">
            {INTERVIEW_EXCERPT.map((msg) => (
              <p key={msg.text} className={`lp-msg lp-msg--${msg.who === "Mei" ? "client" : "you"}`}>
                <span className="lp-who">{msg.who}</span> {msg.text}
              </p>
            ))}
          </div>
        </>
      );
    case "develop":
      return (
        <>
          {label}
          <div className="lp-doc lp-develop">
            <div className="lp-req">
              <span className="lp-req-id">{HERO_REQUIREMENT.id}</span>
              <p>{HERO_REQUIREMENT.text}</p>
            </div>
            <ol className="lp-flow lp-flow--row is-lit" aria-label="Booking flow for R1">
              {HERO_DIAGRAM.map((node) => (
                <li key={node}>{node}</li>
              ))}
            </ol>
            <p className="lp-reason is-shown">
              <span className="lp-reason-tag">Why it fits R1</span> {HERO_DIAGRAM_REASON}
            </p>
            <DecisionExplanation open={whyOpen} onToggle={setWhyOpen} />
          </div>
        </>
      );
    case "review":
      return (
        <>
          {label}
          <div className="lp-doc">
            <p className="lp-quote-small">{FEEDBACK.quote}</p>
            <div className="lp-finding-card">
              <p className="lp-status">{FEEDBACK.findingHeading}</p>
              <p>{FEEDBACK.finding}</p>
              <p className="lp-revisit">
                <strong>{FEEDBACK.promptHeading}:</strong> {FEEDBACK.prompt}
              </p>
            </div>
          </div>
        </>
      );
  }
}
