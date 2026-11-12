import { useRef, useState } from "react";
import { SECTIONS } from "../destinations";
import { useHeroPlayback } from "../hooks";
import {
  DECISION,
  HERO,
  HERO_DIAGRAM,
  HERO_DIAGRAM_REASON,
  HERO_GAP,
  HERO_OPENING,
  HERO_QUESTION,
  HERO_REPLY,
  HERO_REQUIREMENT,
  HERO_SUMMARY,
  HERO_WALKIN,
} from "../landing.content";
import { DecisionExplanation, Icon, PracticeLink, SectionLink } from "../parts";
import { reached } from "../playback";

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
        <div className="lp-hero-support">
          {HERO.support.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const { frame, reduced, started, done, paused, dispatch } = useHeroPlayback(stageRef);
  const [whyOpen, setWhyOpen] = useState(false);
  const at = (id: Parameters<typeof reached>[1]) => reached(frame, id);
  const shown = (id: Parameters<typeof reached>[1]) => `lp-reveal${at(id) ? " is-shown" : ""}`;
  const typing = frame.step === "typing";

  const toggleWhy = (open: boolean) => {
    if (open) dispatch({ type: "pause" });
    setWhyOpen(open);
  };
  const replay = () => {
    setWhyOpen(false);
    dispatch({ type: "replay" });
  };

  return (
    <figure className="lp-demo" aria-labelledby="demo-caption">
      <figcaption id="demo-caption" className="lp-demo-caption">
        {HERO.caption}
      </figcaption>
      <p className="lp-sr-only">{HERO_SUMMARY}</p>

      <div className="lp-demo-stage" ref={stageRef}>
        <div className="lp-pane lp-pane--interview">
          <p className="lp-pane-label">
            <span className="lp-num">1</span> Interview
          </p>
          <div className="lp-chat">
            <p className="lp-msg lp-msg--client">
              <span className="lp-who">Mei</span> {HERO_OPENING}
            </p>
            <p className={`lp-msg lp-msg--client${at("walkin") ? " is-flagged" : ""}`}>
              <span className="lp-who">Mei</span> {HERO_WALKIN}
              {at("walkin") && <span className="lp-tag lp-tag--peach">Heard, not addressed</span>}
            </p>
            <p className="lp-msg lp-msg--you">
              <span className="lp-who">You</span>
              <span className="lp-sr-only">{at("typing") ? HERO_QUESTION : ""}</span>
              <span aria-hidden="true">
                {HERO_QUESTION.slice(0, frame.typed)}
                {typing && <span className="lp-caret" />}
                {/* Keeps the bubble at its final width so typing does not reflow the pane. */}
                <span className="lp-ghost">{HERO_QUESTION.slice(frame.typed)}</span>
              </span>
            </p>
            <p className={`lp-msg lp-msg--client ${shown("reply")}`}>
              <span className="lp-who">Mei</span> {HERO_REPLY.before}
              <mark className="lp-mark">{HERO_REPLY.highlight}</mark>
            </p>
          </div>
        </div>

        <div className="lp-pane lp-pane--requirement">
          <p className="lp-pane-label">
            <span className="lp-num">2</span> Requirement
          </p>
          <div className={shown("requirement")}>
            <div className="lp-req">
              <span className="lp-req-id">{HERO_REQUIREMENT.id}</span>
              <p>{HERO_REQUIREMENT.text}</p>
            </div>
            <p className="lp-trace-note">Traced to Mei’s reply about sticky notes</p>
            <DecisionExplanation open={whyOpen} onToggle={toggleWhy} />
          </div>
        </div>

        <div className="lp-pane lp-pane--diagram">
          <p className="lp-pane-label">
            <span className="lp-num">3</span> Diagram
          </p>
          <ol className={`lp-flow ${at("diagram") ? "is-lit" : ""}`} aria-label="Booking flow for R1">
            {HERO_DIAGRAM.map((node) => (
              <li key={node}>{node}</li>
            ))}
          </ol>
          <p className={`lp-reason ${shown("diagram")}`}>
            <span className="lp-reason-tag">Why it fits R1</span> {HERO_DIAGRAM_REASON}
          </p>
        </div>

        <div className={`lp-pane lp-pane--feedback ${shown("gap")}`}>
          <p className="lp-pane-label">
            <span className="lp-num">4</span> Feedback
          </p>
          <p className="lp-finding">
            <span className="lp-status">Missing connection</span> {HERO_GAP}
          </p>
        </div>
      </div>

      <div className="lp-demo-controls">
        {!reduced && !done && started && (
          <button type="button" className="lp-ctl" onClick={() => dispatch({ type: paused ? "resume" : "pause" })}>
            <Icon name={paused ? "play" : "pause"} />
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        {!reduced && (
          <button type="button" className="lp-ctl" onClick={replay}>
            <Icon name="replay" />
            Replay walkthrough
          </button>
        )}
        <details className="lp-transcript">
          <summary>Read walkthrough</summary>
          <ol>
            <li>Mei (simulated client): “{HERO_OPENING}”</li>
            <li>Mei: “{HERO_WALKIN}”</li>
            <li>You ask: “{HERO_QUESTION}”</li>
            <li>
              Mei: “{HERO_REPLY.before}
              {HERO_REPLY.highlight}”
            </li>
            <li>
              Requirement {HERO_REQUIREMENT.id}: {HERO_REQUIREMENT.text}
            </li>
            <li>
              Diagram: {HERO_DIAGRAM.join(" → ")}. {HERO_DIAGRAM_REASON}
            </li>
            <li>
              Decision explanation:
              <ul>
                {DECISION.map((row) => (
                  <li key={row.label}>
                    {row.label} ({row.source === "client" ? "client evidence" : "engineering reasoning"}): {row.text}
                  </li>
                ))}
              </ul>
            </li>
            <li>Feedback: {HERO_GAP}</li>
          </ol>
        </details>
      </div>
    </figure>
  );
}
