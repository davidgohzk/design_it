import { Button, Typography } from "@mui/material";
import type { RefObject } from "react";
import { LANDING_SLIDES } from "../constants";
import { getLandingOffset } from "../utils";
import { LandingIcon } from "./LandingIcon";

type LandingPageProps = {
  landingIndex: number;
  introRef: RefObject<HTMLElement | null>;
  onIntroClick: () => void;
  onDemoClick: () => void;
};

export function LandingPage({ landingIndex, introRef, onIntroClick, onDemoClick }: LandingPageProps) {
  return (
    <>
      <section className="landing-shell">
        <div className="landing-topbar">
          <Typography variant="body2" className="landing-brand">
            design_it
          </Typography>
          <nav className="landing-nav" aria-label="Landing page navigation">
            <button type="button" onClick={onIntroClick}>Why</button>
            <button type="button" onClick={onDemoClick}>Demo</button>
          </nav>
        </div>

        <div className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">System design practice for the AI era</span>
            <h1>Turn real-world problems into clear, testable system designs.</h1>
            <p>
              design_it is a practice and assessment platform for the work software
              engineers increasingly do: discovering requirements, reasoning about
              architecture, and communicating a plan that can be implemented by people
              or AI agents.
            </p>
            <div className="landing-hero-actions">
              <Button size="large" variant="contained" color="primary" onClick={onDemoClick}>
                Enter Demo
              </Button>
              <Button size="large" variant="outlined" color="inherit" onClick={onIntroClick}>
                Read the Thesis
              </Button>
            </div>
          </div>
          <div className="landing-proof-panel" aria-label="design_it workflow preview">
            <div>
              <LandingIcon name="brief" />
              <span>01</span>
              <strong>Read the context</strong>
              <p>Start from a messy, human case brief instead of a toy prompt.</p>
            </div>
            <div>
              <LandingIcon name="chat" />
              <span>02</span>
              <strong>Interview the stakeholder</strong>
              <p>Ask questions, uncover constraints, and gather real requirements.</p>
            </div>
            <div>
              <LandingIcon name="soap" />
              <span>03</span>
              <strong>Write the design</strong>
              <p>Use evidence-backed SOAP notes to turn observations into action.</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="landing-next-arrow"
          aria-label="Go to next section"
          onClick={onIntroClick}
        >
          v
        </button>
      </section>

      <section ref={introRef} className="landing-story-section">
        <div className="landing-section-inner landing-story-grid">
          <div>
            <span className="landing-section-kicker">Why design_it exists</span>
            <h2>The bottleneck is moving from implementation to design.</h2>
          </div>
          <div className="landing-story-copy">
            <p>
              AI coding agents can now build working frontends from a few good prompts.
              That changes the job of software engineers. The scarce skill is no longer
              only writing code; it is understanding the problem, choosing the right
              architecture, and communicating the tradeoffs clearly.
            </p>
            <p>
              Most interviews still over-index on programming puzzles. design_it shifts
              practice toward the work engineers actually do: discover functional and
              non-functional requirements, speak with stakeholders, and translate messy
              context into a system that can be built.
            </p>
            <div className="landing-shift-diagram" aria-label="Shift from old interviews to design_it">
              <div>
                <LandingIcon name="interview" />
                <span>Old signal</span>
                <strong>Programming puzzles</strong>
                <p>Good for screening computational thinking, but often disconnected from daily engineering work.</p>
              </div>
              <div className="landing-diagram-arrow" aria-hidden="true">to</div>
              <div>
                <LandingIcon name="architecture" />
                <span>New signal</span>
                <strong>System reasoning</strong>
                <p>Tests requirements discovery, architecture judgment, stakeholder communication, and clarity.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-method-section">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">How it works</span>
            <h2>A system design interview that can happen asynchronously.</h2>
            <p>
              Each case gives candidates a realistic context, a stakeholder chat, and a
              structured response space. The output is not just a diagram. It is a
              reasoned design narrative.
            </p>
          </div>
          <div className="landing-method-grid">
            <article>
              <LandingIcon name="brief" />
              <span>Context</span>
              <h3>Start with the case</h3>
              <p>Understand the organization, the pain points, and the constraints.</p>
            </article>
            <article>
              <LandingIcon name="chat" />
              <span>Conversation</span>
              <h3>Ask better questions</h3>
              <p>Use the chatbot stakeholder to discover what the brief does not say.</p>
            </article>
            <article>
              <LandingIcon name="soap" />
              <span>SOAP</span>
              <h3>Make reasoning visible</h3>
              <p>Turn subjective notes, objective facts, assessment, and plan into evidence.</p>
            </article>
            <article>
              <LandingIcon name="architecture" />
              <span>Architecture</span>
              <h3>Design the system</h3>
              <p>Map components, simulate flows, and communicate implementation tradeoffs.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-wins-section">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Who wins</span>
            <h2>A shared marketplace for practice, hiring, and social impact.</h2>
          </div>
          <div className="landing-wins-panels" aria-label="How design_it benefits developers, companies, and NGOs">
            <article className="landing-win-panel">
              <div className="landing-win-panel-head">
                <LandingIcon name="architecture" />
                <span>Developers</span>
              </div>
              <h3>Build system design judgment</h3>
              <div className="landing-win-panel-flow">
                <small>Real cases</small>
                <i aria-hidden="true" />
                <small>Stakeholder chat</small>
                <i aria-hidden="true" />
                <small>Portfolio evidence</small>
              </div>
            </article>
            <article className="landing-win-panel">
              <div className="landing-win-panel-head">
                <LandingIcon name="challenge" />
                <span>Companies</span>
              </div>
              <h3>Assess work-like engineering skills</h3>
              <div className="landing-win-panel-flow">
                <small>Hosted problems</small>
                <i aria-hidden="true" />
                <small>Async evaluation</small>
                <i aria-hidden="true" />
                <small>Talent signal</small>
              </div>
            </article>
            <article className="landing-win-panel">
              <div className="landing-win-panel-head">
                <LandingIcon name="community" />
                <span>NGOs and social teams</span>
              </div>
              <h3>Turn ideas into technical plans</h3>
              <div className="landing-win-panel-flow">
                <small>Problem briefs</small>
                <i aria-hidden="true" />
                <small>Crowdsourced designs</small>
                <i aria-hidden="true" />
                <small>Execution pathway</small>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-gtm-section">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <span className="landing-section-kicker">Go to market</span>
            <h2>Build supply, prove demand, then monetize the network.</h2>
          </div>
          <div className="landing-gtm-roadmap" aria-label="Go to market roadmap">
            <article>
              <LandingIcon name="community" />
              <span>Stage 1</span>
              <h3>Source real problem statements</h3>
              <p>Work with NGOs and mission-driven organizations to create the baseline case library.</p>
            </article>
            <article>
              <LandingIcon name="architecture" />
              <span>Stage 2</span>
              <h3>Seed practice with universities</h3>
              <p>Share cases with students who need realistic system design practice for interviews.</p>
            </article>
            <article>
              <LandingIcon name="interview" />
              <span>Stage 3</span>
              <h3>Offer NGO challenge services</h3>
              <p>Help organizations post problems, review solutions, and give structured feedback.</p>
            </article>
            <article>
              <LandingIcon name="premium" />
              <span>Stage 4</span>
              <h3>Roll out premium and hiring tools</h3>
              <p>Once the user base grows, offer paid features for users, employers, and recruitment teams.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-impact-section">
        <div className="landing-section-inner landing-impact-grid">
          <div>
            <span className="landing-section-kicker">The bigger dream</span>
            <h2>Kaggle for system design, grounded in social problems.</h2>
            <p>
              NGOs and social organizations often have important ideas but need help
              turning them into technical plans. design_it can connect those problems
              with engineers who need meaningful practice and a portfolio of design work.
            </p>
            <div className="landing-ecosystem-diagram" aria-label="design_it ecosystem">
              <div className="ecosystem-node ecosystem-center">design_it</div>
              <div className="ecosystem-node ecosystem-top">
                <LandingIcon name="community" />
                NGOs
              </div>
              <div className="ecosystem-node ecosystem-left">
                <LandingIcon name="architecture" />
                Engineers
              </div>
              <div className="ecosystem-node ecosystem-right">
                <LandingIcon name="challenge" />
                Companies
              </div>
            </div>
          </div>
          <div className="landing-impact-list">
            <article>
              <LandingIcon name="community" />
              <strong>Free practice cases</strong>
              <p>The core library stays open so engineers can learn by solving real problems.</p>
            </article>
            <article>
              <LandingIcon name="premium" />
              <strong>Premium growth tools</strong>
              <p>Unlock feedback, benchmarking, deeper cases, and hiring-ready portfolios.</p>
            </article>
            <article>
              <LandingIcon name="challenge" />
              <strong>Hosted challenges</strong>
              <p>Companies and organizations can sponsor problems and surface strong talent.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-carousel-section">
        <div className="landing-carousel-header">
          <span className="landing-section-kicker">Example challenge worlds</span>
          <h2>Design systems for problems that matter.</h2>
        </div>
        <div className="landing-carousel-stage">
          {LANDING_SLIDES.map((slide, index) => {
            const offset = getLandingOffset(index, landingIndex, LANDING_SLIDES.length);
            const isActive = offset === 0;

            return (
              <article
                key={`${slide.problem}-${slide.country}`}
                className={`landing-slide${isActive ? " is-active" : ""}`}
                aria-label={`${slide.problem} in ${slide.country}`}
                style={{
                  backgroundImage: `url("${slide.image}")`,
                  backgroundPosition: slide.backgroundPosition ?? "center",
                  ["--landing-intro-color" as string]: slide.introColor,
                  ["--landing-verb-color" as string]: slide.verbColor,
                  ["--landing-problem-color" as string]: slide.problemColor,
                  ["--landing-country-color" as string]: slide.countryColor,
                  transform:
                    offset === 0
                      ? "translateX(-50%) scale(1)"
                      : offset < 0
                        ? "translateX(-108%) scale(0.88)"
                        : "translateX(8%) scale(0.88)",
                  opacity: isActive ? 1 : 0.58,
                  zIndex: isActive ? 3 : 2,
                }}
              >
                <span className="landing-slide-overlay" />
                <span className="landing-slide-copy">
                  <span className="landing-slide-title">
                    <span className="landing-title-verb">design system</span>
                    <br />
                    <span className="landing-title-base">to solve </span>
                    <span className="landing-title-problem">{slide.problem}</span>
                    <br />
                    <span className="landing-title-base">in </span>
                    <span className="landing-title-country">{slide.country}</span>
                  </span>
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-demo-cta-section">
        <div className="landing-demo-cta">
          <div>
            <span className="landing-section-kicker">Try the working prototype</span>
            <h2>Open the demo and solve a case.</h2>
            <p>
              Use the context, chat, markdown response, and system design canvas to produce
              a grounded architecture plan.
            </p>
            <Button size="large" variant="contained" color="primary" onClick={onDemoClick}>
              Enter Demo
            </Button>
          </div>
          <div className="landing-product-diagram" aria-label="Prototype feature map">
            <div><LandingIcon name="brief" /><span>Context</span></div>
            <div><LandingIcon name="chat" /><span>Stakeholder chat</span></div>
            <div><LandingIcon name="soap" /><span>SOAP response</span></div>
            <div><LandingIcon name="architecture" /><span>System canvas</span></div>
          </div>
        </div>
      </section>
    </>
  );
}
