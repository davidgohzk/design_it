import { FUNNEL_STAGES } from "../landing.content";

/** 05 — What your feedback shows: the fact funnel and two example findings. */
export function FeedbackSection() {
  return (
    <section className="landing-feedback-section" id="is-feedback">
      <div className="landing-section-inner">
        <div className="landing-section-heading" data-reveal>
          <span className="section-num">05</span>
          <span className="landing-section-kicker">What your feedback shows</span>
          <h2>See exactly where your thinking lost the thread.</h2>
          <p>
            Each case hides facts the client knows but won't volunteer. Your feedback follows every
            one of them through your work and shows where it stopped.
          </p>
        </div>

        <div className="landing-funnel-grid">
          <ol className="landing-funnel is-scroll-fade" aria-label="Where each hidden fact can end up">
            {FUNNEL_STAGES.map((stage, i) => (
              <li key={stage.label} className="landing-funnel-row">
                <div className="landing-funnel-bar" style={{ width: `${100 - i * 12}%` }}>
                  <span className="landing-funnel-num">{i + 1}</span>
                  {stage.label}
                </div>
                {stage.leaks.length > 0 && (
                  <div className="landing-funnel-leaks">
                    {stage.leaks.map((leak) => (
                      <span key={leak.state} className={`landing-leak landing-leak--${leak.state}`}>
                        {leak.text}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="landing-feedback-cards">
            <span className="landing-feedback-caption">Example feedback from the Community Room case</span>
            <div className="landing-feedback-card is-scroll-fade">
              <span className="landing-leak landing-leak--missed">Missed</span>
              <h3>Why double bookings happen</h3>
              <p>You never asked, so your design does not address the sticky notes that get missed.</p>
            </div>
            <div className="landing-feedback-card is-scroll-fade" style={{ transitionDelay: "100ms" }}>
              <span className="landing-leak landing-leak--dropped">Dropped</span>
              <blockquote>"Some of them don't have smartphones, so they call or just walk in."</blockquote>
              <cite>Mei, the client, in your interview</cite>
              <p>
                You heard it, but no requirement uses it. Your design assumes everyone can make
                bookings online.
              </p>
            </div>
          </div>
        </div>

        <p className="landing-feedback-note">
          Every finding points to the exact words in your interview or your doc. Nothing is a vague
          AI opinion.
        </p>
      </div>
    </section>
  );
}
