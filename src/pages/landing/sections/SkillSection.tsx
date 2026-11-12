import { LandingIcon } from "../LandingIcon";

/** 02 — The skill that matters now. */
export function SkillSection() {
  return (
    <section className="landing-story-section" id="is-skill">
      <div className="landing-section-inner">
        <div className="landing-section-heading" data-reveal>
          <span className="section-num">02</span>
          <span className="landing-section-kicker">The skill that matters now</span>
          <h2>The architect's job is now everyone's job.</h2>
          <p>
            That job is drawing the real requirements out of a client who can't state them, turning
            them into a design others can build, and writing down why.
          </p>
        </div>
        <div className="landing-method-flow" data-reveal>
          <div className="flow-step">
            <div className="flow-step-circle">1</div>
            <LandingIcon name="chat" />
            <span>Start</span>
            <h3>A client who can't state their needs</h3>
            <p>They know their problem, not the technology.</p>
          </div>
          <div className="flow-connector" aria-hidden="true" />
          <div className="flow-step">
            <div className="flow-step-circle">2</div>
            <LandingIcon name="interview" />
            <span>Ask</span>
            <h3>Work out the real requirements</h3>
            <p>Draw out the facts they didn't think to mention.</p>
          </div>
          <div className="flow-connector" aria-hidden="true" />
          <div className="flow-step">
            <div className="flow-step-circle">3</div>
            <LandingIcon name="brief" />
            <span>Design</span>
            <h3>Turn them into a clear design</h3>
            <p>Requirements and decisions, written down.</p>
          </div>
          <div className="flow-connector" aria-hidden="true" />
          <div className="flow-step">
            <div className="flow-step-circle">4</div>
            <LandingIcon name="agent" />
            <span>Build</span>
            <h3>Engineers or agents build from it</h3>
            <p>A design clear enough to hand off.</p>
          </div>
        </div>
        <p className="landing-skill-note">
          …with the reason for each decision written down, so it can be checked.
        </p>
        <blockquote className="landing-quote">
          <p>
            "The hardest single part of building a software system is deciding precisely what to
            build."
          </p>
          <cite>Frederick P. Brooks, No Silver Bullet (1987)</cite>
        </blockquote>
      </div>
    </section>
  );
}
