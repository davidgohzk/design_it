import { useState, useEffect, useRef } from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { LandingIcon } from "./LandingIcon";
import "./landing.css";

// ─── content data ─────────────────────────────────────────────────────────────
const STATS = [
  {
    fact: "Copilot users finished a task",
    number: "55.8% faster",
    source: "Peng et al., 2023",
    url: "https://arxiv.org/abs/2302.06590",
  },
  {
    fact: "AI users felt faster, but were",
    number: "19% slower",
    source: "METR, 2025",
    url: "https://arxiv.org/abs/2507.09089",
  },
  {
    fact: "AI-written code had a security flaw in",
    number: "45% of tests",
    source: "Veracode, 2025",
    url: "https://www.businesswire.com/news/home/20250730694951/en/",
  },
];

// The build loop: AI owns one step, the human owns the rest.
const BUILD_LOOP = [
  { who: "You", icon: "interview", label: "Decide what to build" },
  { who: "You", icon: "brief", label: "Design it clearly" },
  { who: "AI", icon: "agent", label: "Write the code" },
  { who: "You", icon: "check", label: "Check the result" },
] as const;

const PRACTICE_TODAY = [
  {
    kind: "Algorithm puzzles",
    title: "Short coding problems with one right answer",
    text: "They drill the part of the job AI now does best.",
  },
  {
    kind: "System design mock interviews",
    title: "A practice interview on a ready-made prompt",
    text: "The prompt arrives already specified. Someone has done the hard part for you.",
  },
  {
    kind: "AI mock interviewers",
    title: "An AI interviewer, available any time",
    text: "But the interviewer knows the answer. A real client doesn't.",
  },
];

const DIFFERENCES = [
  "You start from a messy client, not a clean prompt.",
  "You practise any time, without booking a senior engineer.",
  "You do the whole task: interview, design doc, diagram.",
  "Every decision stays linked to the evidence behind it.",
  "Your feedback is checked against what the client actually knew.",
];

const FUNNEL_STAGES: { label: string; leaks: { state: string; text: string }[] }[] = [
  {
    label: "Found in the interview",
    leaks: [
      { state: "missed", text: "Missed: never asked" },
      { state: "assumed", text: "Assumed: wrote it without asking" },
    ],
  },
  {
    label: "Written into a requirement",
    leaks: [{ state: "dropped", text: "Dropped: heard it, never used it" }],
  },
  { label: "Used in a decision", leaks: [] },
  { label: "Drawn in the diagram", leaks: [] },
];

const FUTURE = [
  {
    kicker: "Problem library",
    title: "Real problems from NGOs and organisations",
    text: "A growing library of cases, each built from a problem someone actually has.",
  },
  {
    kicker: "Free practice",
    title: "Free design practice, for everyone",
    text: "A free platform where engineers practise the whole design task, as often as they like.",
  },
  {
    kicker: "Social enterprise",
    title: "Run for impact",
    text: "Free for engineers, with the work flowing back to the organisations that need it.",
  },
];

// ─── nav sections ─────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "is-hero", label: "Home" },
  { id: "is-current", label: "The shift" },
  { id: "is-skill", label: "The skill" },
  { id: "is-practice", label: "Practice today" },
  { id: "is-how", label: "How it works" },
  { id: "is-feedback", label: "Your feedback" },
  { id: "is-who-wins", label: "Who wins" },
  { id: "is-prototype", label: "Try it" },
  { id: "is-future", label: "Where it's going" },
];

// ─── main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const onDemoClick = () => navigate("/demo");
  const onSimpleClick = () => navigate("/simple");
  const scrollTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const [statsVisible, setStatsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("is-hero");
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

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "0px 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".is-scroll-fade");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in-view");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="is-root">
      {/* ── sticky nav (brand only) ── */}
      <nav className="is-nav">
        <span className="is-nav-brand">design_it</span>
      </nav>

      {/* ── left sidebar nav ── */}
      <nav className="is-sidenav" aria-label="Page sections">
        {NAV_SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            className={`is-sidenav-item${activeSection === id ? " is-sidenav-active" : ""}`}
            onClick={() => scrollTo(id)}
            aria-label={`Go to ${label}`}
          >
            <span className="is-sidenav-dot" />
            <span className="is-sidenav-label">{label}</span>
          </button>
        ))}
        <div className="is-sidenav-sep" />
        <button
          className="is-sidenav-item is-sidenav-demo"
          onClick={onDemoClick}
          aria-label="Open demo"
        >
          <span className="is-sidenav-dot" />
          <span className="is-sidenav-label">Demo</span>
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-hero" id="is-hero">
        <div className="is-hero-centered">
          <h1 className="is-h1-brand">design_it</h1>
          <p className="is-hero-tagline">
            The practice ground for the post-AI engineer.
          </p>
          <p className="is-hero-question">
            Practise turning a client's vague problem into a clear design that
            people and agents can build. Then see exactly what you missed.
          </p>
          <div className="is-hero-btns">
            <button className="is-btn-cta" onClick={onSimpleClick}>
              Try a case
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          01 — THE SHIFT (AI writes the code, you design it)
          ══════════════════════════════════════════════════════════════════════ */}
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
              <li
                key={step.label}
                className={`is-build-step${step.who === "AI" ? " is-build-step--ai" : ""}`}
              >
                <span className="is-build-who">{step.who}</span>
                <LandingIcon name={step.icon} />
                <span className="is-build-label">{step.label}</span>
              </li>
            );
            return i < BUILD_LOOP.length - 1
              ? [tile, <li key={`arrow-${i}`} className="is-build-arrow" aria-hidden="true">→</li>]
              : [tile];
          })}
        </ol>
        <p className="is-stats-context-final">
          Agents build exactly what you describe. Your design is the instruction.
        </p>
        <div
          ref={statsRef}
          className={`is-stats-strip${statsVisible ? " is-stats-visible" : ""}`}
        >
          {STATS.map((s) => (
            <div key={s.source} className="is-stat-item">
              <span className="is-stat-label">{s.fact}</span>
              <span className="is-stat-number">{s.number}</span>
              <a
                className="is-stat-cite"
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                {s.source} ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          02 — THE SKILL THAT MATTERS NOW
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-story-section" id="is-skill">
        <div className="landing-section-inner">
          <div className="landing-section-heading" data-reveal>
            <span className="section-num">02</span>
            <span className="landing-section-kicker">The skill that matters now</span>
            <h2>The architect's job is now everyone's job.</h2>
            <p>
              That job is drawing the real requirements out of a client who
              can't state them, turning them into a design others can build,
              and writing down why.
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
              <p>Requirements, assumptions and decisions, written down.</p>
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
            …with the reason for each decision written down, so it can be
            checked.
          </p>
          <blockquote className="landing-quote">
            <p>
              "The hardest single part of building a software system is deciding
              precisely what to build."
            </p>
            <cite>Frederick P. Brooks, No Silver Bullet (1987)</cite>
          </blockquote>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          03 — WHERE ENGINEERS PRACTISE TODAY
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-section is-section-white" id="is-practice">
        <div className="is-container">
          <span className="section-num">03</span>
          <span className="is-label">Where engineers practise today</span>
          <h2 className="is-h2">Practice today hands you a clean problem.</h2>
          <p className="is-lead">
            Engineers already have plenty of places to practise. None of them
            start where real work starts: with a client who doesn't know what
            to ask for.
          </p>

          <div className="is-card-grid">
            {PRACTICE_TODAY.map((p, i) => (
              <div
                key={p.kind}
                className="is-card is-scroll-fade"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="is-card-kicker">{p.kind}</span>
                <h3 className="is-card-title">{p.title}</h3>
                <p className="is-card-text">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="is-diff is-scroll-fade">
            <h3 className="is-diff-title">What design_it does differently</h3>
            <ul className="is-diff-list">
              {DIFFERENCES.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>

          <p className="is-closing">
            Nothing else lets engineers practise the whole task, from messy
            client to justified design, on their own.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          04 — HOW IT WORKS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-method-section" id="is-how">
        <div className="landing-section-inner">
          <div className="landing-section-heading" data-reveal>
            <span className="section-num">04</span>
            <span className="landing-section-kicker">How it works</span>
            <h2>Three steps, each linked to the one before.</h2>
            <p>
              You work through one case from the first question to the final
              diagram. Each step points back to the last, so anyone can follow
              your reasoning from start to finish.
            </p>
          </div>
          <div className="method-scene-wrap">
            <div className="method-scene-chrome" aria-hidden="true">
              <div className="chrome-dots">
                <span className="chrome-dot chrome-dot-r" />
                <span className="chrome-dot chrome-dot-y" />
                <span className="chrome-dot chrome-dot-g" />
              </div>
              <span className="chrome-label">BrightPath — child-welfare alerts</span>
            </div>
            <svg className="method-scene-svg" viewBox="0 0 1060 172" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* ── A: interview ── */}
              <rect x="10" y="14" width="310" height="148" rx="6" fill="white" stroke="#7dd3fc" strokeWidth="1.5"/>
              <text x="24" y="32" fontSize="8" fill="#0284c7" fontWeight="700" fontFamily="sans-serif">A · INTERVIEW</text>
              <rect x="24" y="44" width="196" height="26" rx="8" fill="#f0f9ff" stroke="#006f9a" strokeWidth="1.2"/>
              <text x="34" y="61" fontSize="7" fill="#006f9a" fontFamily="sans-serif">Reports get buried in our WhatsApp group.</text>
              <rect x="116" y="78" width="190" height="26" rx="8" fill="#f0fdfa" stroke="#52c7b8" strokeWidth="1.2"/>
              <text x="126" y="95" fontSize="7" fill="#0d9488" fontFamily="sans-serif">Who needs to see a report first?</text>
              <rect x="24" y="112" width="196" height="38" rx="8" fill="#f0f9ff" stroke="#006f9a" strokeWidth="1.2"/>
              <text x="34" y="127" fontSize="7" fill="#006f9a" fontFamily="sans-serif">The child's case manager. Serious</text>
              <text x="34" y="140" fontSize="7" fill="#006f9a" fontFamily="sans-serif">ones go to a supervisor too.</text>

              <path d="M326 88 L360 88" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3"/>
              <path d="M354 83 L361 88 L354 93" fill="none" stroke="#52c7b8" strokeWidth="2"/>

              {/* ── B: design doc ── */}
              <rect x="370" y="14" width="320" height="148" rx="6" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5"/>
              <text x="384" y="32" fontSize="8" fill="#15803d" fontWeight="700" fontFamily="sans-serif">B · DESIGN DOC</text>
              {([
                { y: 44, id: "R1", text: "Alert the child's case manager", cite: "← chat", tag: "#dcfce7", ink: "#15803d", chip: "#86efac" },
                { y: 68, id: "R2", text: "Loop in a supervisor if serious", cite: "← chat", tag: "#dcfce7", ink: "#15803d", chip: "#86efac" },
                { y: 92, id: "A1", text: "Most reports arrive in office hours", cite: "assumed", tag: "#fef3c7", ink: "#b45309", chip: "#fcd34d" },
                { y: 116, id: "D1", text: "Route each alert by case owner", cite: "← R1", tag: "#e0f2fe", ink: "#0369a1", chip: "#7dd3fc" },
                { y: 140, id: "D2", text: "Escalate when nobody responds", cite: "← R2", tag: "#e0f2fe", ink: "#0369a1", chip: "#7dd3fc" },
              ] as const).map((row) => (
                <g key={row.id}>
                  <rect x="384" y={row.y} width="22" height="14" rx="3" fill={row.tag}/>
                  <text x="388" y={row.y + 10} fontSize="7" fill={row.ink} fontWeight="700" fontFamily="sans-serif">{row.id}</text>
                  <text x="414" y={row.y + 10} fontSize="7" fill="#374151" fontFamily="sans-serif">{row.text}</text>
                  <rect x="612" y={row.y} width="64" height="14" rx="7" fill="white" stroke={row.chip} strokeWidth="1"/>
                  <text x="644" y={row.y + 10} fontSize="6.5" fill={row.ink} fontFamily="sans-serif" textAnchor="middle">{row.cite}</text>
                </g>
              ))}

              <path d="M696 88 L722 88" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3"/>
              <path d="M716 83 L723 88 L716 93" fill="none" stroke="#52c7b8" strokeWidth="2"/>

              {/* ── C: diagram ── */}
              <rect x="730" y="14" width="320" height="148" rx="6" fill="#f0f9ff" stroke="#7dd3fc" strokeWidth="1.5"/>
              <text x="744" y="32" fontSize="8" fill="#0284c7" fontWeight="700" fontFamily="sans-serif">C · DIAGRAM</text>
              {([
                { x: 748, y: 48, name: "Alert router", from: "from D1" },
                { x: 916, y: 48, name: "Case manager app", from: "from D1" },
                { x: 748, y: 112, name: "Escalation check", from: "from D2" },
                { x: 916, y: 112, name: "Supervisor alert", from: "from D2" },
              ] as const).map((box) => (
                <g key={box.name}>
                  <rect x={box.x} y={box.y} width="118" height="36" rx="4" fill="white" stroke="#006f9a" strokeWidth="1.5"/>
                  <text x={box.x + 10} y={box.y + 15} fontSize="7.5" fill="#152330" fontWeight="700" fontFamily="sans-serif">{box.name}</text>
                  <text x={box.x + 10} y={box.y + 28} fontSize="6.5" fill="#0369a1" fontFamily="sans-serif">{box.from}</text>
                </g>
              ))}
              <line x1="866" y1="66" x2="914" y2="66" stroke="#52c7b8" strokeWidth="1.2"/>
              <path d="M908 62 L914 66 L908 70" fill="none" stroke="#52c7b8" strokeWidth="1.2"/>
              <line x1="807" y1="84" x2="807" y2="110" stroke="#52c7b8" strokeWidth="1.2"/>
              <path d="M803 104 L807 110 L811 104" fill="none" stroke="#52c7b8" strokeWidth="1.2"/>
              <line x1="866" y1="130" x2="914" y2="130" stroke="#52c7b8" strokeWidth="1.2"/>
              <path d="M908 126 L914 130 L908 134" fill="none" stroke="#52c7b8" strokeWidth="1.2"/>
            </svg>
          </div>

          <div className="landing-method-flow" data-reveal>
            <div className="flow-step">
              <div className="flow-step-circle">A</div>
              <LandingIcon name="chat" />
              <span>Interview</span>
              <h3>Interview the AI client</h3>
              <p>
                The AI plays a client who knows their situation but not much
                about technology. They can't list their requirements. You draw
                them out with the right questions.
              </p>
            </div>
            <div className="flow-connector" aria-hidden="true" />
            <div className="flow-step">
              <div className="flow-step-circle">B</div>
              <LandingIcon name="brief" />
              <span>Design doc</span>
              <h3>Write a design doc</h3>
              <p>
                Every requirement cites the conversation. Every decision cites
                the requirements it serves.
              </p>
            </div>
            <div className="flow-connector" aria-hidden="true" />
            <div className="flow-step">
              <div className="flow-step-circle">C</div>
              <LandingIcon name="architecture" />
              <span>Diagram</span>
              <h3>Draw a justified diagram</h3>
              <p>Every box names the decision behind it. AI help is allowed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          05 — WHAT YOUR FEEDBACK SHOWS (fact funnel)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-feedback-section" id="is-feedback">
        <div className="landing-section-inner">
          <div className="landing-section-heading" data-reveal>
            <span className="section-num">05</span>
            <span className="landing-section-kicker">What your feedback shows</span>
            <h2>See exactly where your thinking lost the thread.</h2>
            <p>
              Each case hides facts the client knows but won't volunteer. Your
              feedback follows every one of them through your work and shows
              where it stopped.
            </p>
          </div>

          <div className="landing-funnel-grid">
            <ol className="landing-funnel is-scroll-fade" aria-label="Where each hidden fact can end up">
              {FUNNEL_STAGES.map((stage, i) => (
                <li key={stage.label} className="landing-funnel-row">
                  <div
                    className="landing-funnel-bar"
                    style={{ width: `${100 - i * 12}%` }}
                  >
                    <span className="landing-funnel-num">{i + 1}</span>
                    {stage.label}
                  </div>
                  {stage.leaks.length > 0 && (
                    <div className="landing-funnel-leaks">
                      {stage.leaks.map((leak) => (
                        <span
                          key={leak.state}
                          className={`landing-leak landing-leak--${leak.state}`}
                        >
                          {leak.text}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>

            <div className="landing-feedback-cards">
              <span className="landing-feedback-caption">
                Example feedback from the BrightPath case
              </span>
              <div className="landing-feedback-card is-scroll-fade">
                <span className="landing-leak landing-leak--missed">Missed</span>
                <h3>Who is told about serious incidents</h3>
                <p>
                  You never asked, so your design has no one to escalate to when
                  a case manager doesn't respond.
                </p>
              </div>
              <div
                className="landing-feedback-card is-scroll-fade"
                style={{ transitionDelay: "100ms" }}
              >
                <span className="landing-leak landing-leak--dropped">Dropped</span>
                <blockquote>"Our field workers often have patchy connectivity."</blockquote>
                <cite>Sarah, the client, in your interview</cite>
                <p>
                  You heard it, but no requirement uses it. Your design assumes a
                  steady connection.
                </p>
              </div>
            </div>
          </div>

          <p className="landing-feedback-note">
            Every finding points to the exact words in your interview or your
            doc. Nothing is a vague AI opinion.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          06 — WHO WINS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-wins-section" id="is-who-wins">
        <div className="landing-section-inner">
          <div className="landing-section-heading" data-reveal>
            <span className="section-num">06</span>
            <span className="landing-section-kicker">Who wins</span>
            <h2>One problem, three wins.</h2>
          </div>
          <div className="landing-wins-figures" data-reveal aria-label="How design_it helps engineers, problem owners and NGOs">
            <div className="stakeholder-card stakeholder-card--dev">
              <svg className="stakeholder-figure-svg" viewBox="0 0 160 180" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="148" width="144" height="8" rx="3" fill="#bfdbfe"/>
                <rect x="30" y="128" width="100" height="4" rx="2" fill="#93c5fd"/>
                <rect x="32" y="90" width="96" height="40" rx="4" fill="#dbeafe" stroke="#7dd3fc" strokeWidth="1.5"/>
                <text x="58" y="108" fontSize="6.5" fill="#1d4ed8" fontFamily="monospace">ask(client)</text>
                <text x="58" y="122" fontSize="6.5" fill="#1d4ed8" fontFamily="monospace">design(why)</text>
                <rect x="32" y="128" width="96" height="4" rx="1" fill="#93c5fd"/>
                <circle cx="80" cy="60" r="22" fill="#bfdbfe"/>
                <path d="M58 56 Q80 36 102 56" fill="#93c5fd"/>
                <rect x="60" y="80" width="40" height="14" rx="6" fill="#93c5fd"/>
                <path d="M60 88 L44 128" stroke="#bfdbfe" strokeWidth="8" strokeLinecap="round" fill="none"/>
                <path d="M100 88 L116 128" stroke="#bfdbfe" strokeWidth="8" strokeLinecap="round" fill="none"/>
                <path d="M108 30 l2 5 l5 2 l-5 2 l-2 5 l-2-5 l-5-2 l5-2 Z" fill="#f2c94c" fillOpacity="0.9"/>
                <path d="M122 18 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5-3.5 l-3.5-1.5 l3.5-1.5 Z" fill="#f2c94c" fillOpacity="0.6"/>
              </svg>
              <div className="stakeholder-info">
                <span className="stakeholder-role stakeholder-role--dev">Engineers</span>
                <h3>Practise the skill that matters now</h3>
                <p>
                  Work on real problems, any time. Get feedback that shows what
                  you missed and why it mattered.
                </p>
                <div className="benefit-bubbles benefit-bubbles--dev">
                  <span className="benefit-bubble">Real problems</span>
                  <span className="benefit-bubble">Feedback you can act on</span>
                </div>
              </div>
            </div>

            <div className="stakeholder-card stakeholder-card--company">
              <svg className="stakeholder-figure-svg" viewBox="0 0 160 180" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="154" width="144" height="6" rx="2" fill="#a7f3d0"/>
                <rect x="90" y="38" width="62" height="122" rx="3" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1.2"/>
                <rect x="97" y="50" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4"/>
                <rect x="120" y="50" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4"/>
                <rect x="97" y="70" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4"/>
                <rect x="120" y="70" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4"/>
                <rect x="97" y="90" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4"/>
                <rect x="120" y="90" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4"/>
                <rect x="100" y="32" width="56" height="8" rx="2" fill="#7dd3fc"/>
                <rect x="105" y="130" width="20" height="30" rx="3" fill="#0284c7" fillOpacity="0.3"/>
                <circle cx="50" cy="68" r="20" fill="#99f6e4"/>
                <path d="M30 64 Q50 46 70 64" fill="#5eead4"/>
                <rect x="32" y="86" width="36" height="28" rx="7" fill="#0d9488"/>
                <path d="M50 86 L47 100 L50 108 L53 100 Z" fill="#f0fdf4"/>
                <rect x="72" y="80" width="22" height="28" rx="3" fill="white" stroke="#5eead4" strokeWidth="1.5"/>
                <rect x="78" y="76" width="10" height="6" rx="2" fill="#5eead4"/>
                <line x1="78" y1="94" x2="90" y2="94" stroke="#94a3b8" strokeWidth="1"/>
                <line x1="78" y1="102" x2="90" y2="102" stroke="#94a3b8" strokeWidth="1"/>
                <path d="M78 87 l2 2 l4-4" stroke="#0d9488" strokeWidth="1.5" fill="none"/>
                <path d="M32 96 L14 116" stroke="#99f6e4" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <path d="M68 90 L72 80" stroke="#99f6e4" strokeWidth="7" strokeLinecap="round" fill="none"/>
              </svg>
              <div className="stakeholder-info">
                <span className="stakeholder-role stakeholder-role--company">Companies and problem owners</span>
                <h3>Get quick technical validation</h3>
                <p>
                  Post a real problem and get several independent designs, each
                  with its reasoning traced back to what you said. See how
                  engineers think, not just what they produce.
                </p>
                <div className="benefit-bubbles benefit-bubbles--company">
                  <span className="benefit-bubble">Independent designs</span>
                  <span className="benefit-bubble">Reasoning you can trace</span>
                </div>
              </div>
            </div>

            <div className="stakeholder-card stakeholder-card--ngo stakeholder-card--featured">
              <svg className="stakeholder-figure-svg" viewBox="0 0 160 180" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="154" width="144" height="6" rx="2" fill="#fde68a" fillOpacity="0.6"/>
                <circle cx="52" cy="90" r="19" fill="#fde68a"/>
                <path d="M33 86 Q52 68 71 86" fill="#fcd34d"/>
                <rect x="34" y="107" width="36" height="24" rx="7" fill="#fcd34d"/>
                <path d="M34 118 L16 138" stroke="#fde68a" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <path d="M70 118 L72 108" stroke="#fde68a" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <circle cx="108" cy="90" r="19" fill="#fed7aa"/>
                <path d="M89 86 Q108 68 127 86" fill="#fdba74"/>
                <rect x="90" y="107" width="36" height="24" rx="7" fill="#fdba74"/>
                <path d="M126 118 L144 138" stroke="#fed7aa" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <path d="M90 118 L88 108" stroke="#fed7aa" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <rect x="68" y="118" width="24" height="12" rx="6" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
                <circle cx="80" cy="46" r="14" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
                <path d="M74 46 Q80 38 86 46 Q86 54 80 60 Q74 54 74 46" fill="#fbbf24"/>
                <rect x="75" y="60" width="10" height="4" rx="2" fill="#f59e0b"/>
                <line x1="80" y1="26" x2="80" y2="20" stroke="#f59e0b" strokeWidth="1.5"/>
                <line x1="94" y1="30" x2="98" y2="26" stroke="#f59e0b" strokeWidth="1.5"/>
                <line x1="98" y1="44" x2="104" y2="42" stroke="#f59e0b" strokeWidth="1.5"/>
                <line x1="66" y1="30" x2="62" y2="26" stroke="#f59e0b" strokeWidth="1.5"/>
                <line x1="62" y1="44" x2="56" y2="42" stroke="#f59e0b" strokeWidth="1.5"/>
              </svg>
              <div className="stakeholder-info">
                <span className="stakeholder-featured-tag">Making an impact on the real world</span>
                <span className="stakeholder-role stakeholder-role--ngo">NGOs</span>
                <h3>Technical options they couldn't otherwise afford</h3>
                <p>
                  Real problems from NGOs become practice cases. Many engineers'
                  designs are combined into a map of possible approaches, so the
                  NGO gets crowdsourced options for its problem.
                </p>
                <div className="benefit-bubbles benefit-bubbles--ngo">
                  <span className="benefit-bubble">Real problems become cases</span>
                  <span className="benefit-bubble">A map of approaches</span>
                </div>
              </div>
            </div>
          </div>

          <ol className="landing-loop is-scroll-fade" aria-label="How a problem moves through design_it">
            <li>A problem owner posts a problem</li>
            <li aria-hidden="true" className="landing-loop-arrow">→</li>
            <li>Engineers practise on it</li>
            <li aria-hidden="true" className="landing-loop-arrow">→</li>
            <li>Designs with their reasoning flow back</li>
          </ol>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          07 — TRY IT
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-demo-cta-section" id="is-prototype">
        <div className="landing-demo-cta">
          <div className="demo-cta-copy" data-reveal>
            <span className="section-num">07</span>
            <span className="landing-section-kicker">Try it</span>
            <h2>Pick a case and start asking.</h2>
            <p>
              New to design_it? Start with the warm-up, then try the full case.
            </p>
            <div className="demo-case">
              <span className="demo-case-meta">Warm-up · about 10 minutes</span>
              <strong>Community room booking</strong>
              <span className="demo-case-desc">
                A community centre keeps double-booking its rooms. Find out why.
              </span>
              <Button variant="contained" color="primary" onClick={onSimpleClick}>
                Start the warm-up
              </Button>
            </div>
            <div className="demo-case">
              <span className="demo-case-meta">Full case</span>
              <strong>BrightPath child-welfare alerts</strong>
              <span className="demo-case-desc">
                Incident reports about at-risk children get lost. Design what
                fixes it.
              </span>
              <Button variant="outlined" color="primary" onClick={onDemoClick}>
                Open the full case
              </Button>
            </div>
          </div>
          <div className="demo-mockup-wrap" aria-label="App interface preview">
            <svg className="demo-mockup-svg" viewBox="0 0 500 336" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* window background */}
              <rect width="500" height="336" rx="10" fill="#0a1520"/>
              {/* title bar */}
              <rect width="500" height="28" rx="10" fill="#162533"/>
              <rect y="18" width="500" height="10" fill="#162533"/>
              <circle cx="16" cy="14" r="5" fill="#ff5f57"/>
              <circle cx="32" cy="14" r="5" fill="#ffbd2e"/>
              <circle cx="48" cy="14" r="5" fill="#28c840"/>
              <text x="250" y="19" fontSize="8" fill="rgba(248,251,255,0.35)" fontFamily="sans-serif" textAnchor="middle">design_it — BrightPath case</text>
              {/* panel dividers */}
              <line x1="166" y1="28" x2="166" y2="336" stroke="rgba(248,251,255,0.07)" strokeWidth="1"/>
              <line x1="332" y1="28" x2="332" y2="336" stroke="rgba(248,251,255,0.07)" strokeWidth="1"/>

              {/* ── LEFT PANEL: Design doc ── */}
              <text x="12" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">DESIGN DOC</text>
              <rect x="10" y="54" width="130" height="5" rx="2" fill="rgba(248,251,255,0.25)"/>
              <rect x="10" y="65" width="148" height="4" rx="2" fill="rgba(248,251,255,0.1)"/>
              <rect x="10" y="74" width="140" height="4" rx="2" fill="rgba(248,251,255,0.1)"/>
              <rect x="10" y="83" width="152" height="4" rx="2" fill="rgba(248,251,255,0.08)"/>
              <rect x="10" y="92" width="136" height="4" rx="2" fill="rgba(248,251,255,0.08)"/>
              <line x1="10" y1="104" x2="156" y2="104" stroke="rgba(248,251,255,0.07)" strokeWidth="1"/>
              <rect x="10" y="112" width="98" height="4" rx="2" fill="rgba(248,251,255,0.18)"/>
              <rect x="10" y="122" width="150" height="4" rx="2" fill="rgba(248,251,255,0.08)"/>
              <rect x="10" y="131" width="142" height="4" rx="2" fill="rgba(248,251,255,0.08)"/>
              <rect x="10" y="140" width="154" height="4" rx="2" fill="rgba(248,251,255,0.08)"/>
              <rect x="10" y="149" width="126" height="4" rx="2" fill="rgba(248,251,255,0.08)"/>
              <line x1="10" y1="161" x2="156" y2="161" stroke="rgba(248,251,255,0.07)" strokeWidth="1"/>
              <rect x="10" y="169" width="112" height="4" rx="2" fill="rgba(248,251,255,0.18)"/>
              <rect x="10" y="179" width="148" height="4" rx="2" fill="rgba(248,251,255,0.07)"/>
              <rect x="10" y="188" width="138" height="4" rx="2" fill="rgba(248,251,255,0.07)"/>
              <rect x="10" y="197" width="144" height="4" rx="2" fill="rgba(248,251,255,0.07)"/>

              {/* ── MIDDLE PANEL: Chat ── */}
              <text x="178" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">INTERVIEW</text>
              {/* client bubble 1 */}
              <rect x="174" y="54" width="116" height="34" rx="6" fill="rgba(0,111,154,0.28)"/>
              <text x="182" y="68" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">Our alerts get buried</text>
              <text x="182" y="80" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">in WhatsApp.</text>
              {/* engineer bubble */}
              <rect x="196" y="94" width="114" height="24" rx="6" fill="rgba(82,199,184,0.22)"/>
              <text x="204" y="110" fontSize="6.5" fill="rgba(248,251,255,0.85)" fontFamily="sans-serif">Who should see an alert?</text>
              {/* client bubble 2 */}
              <rect x="174" y="124" width="120" height="34" rx="6" fill="rgba(0,111,154,0.28)"/>
              <text x="182" y="138" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">The child's case manager.</text>
              <text x="182" y="150" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">There are twelve of them.</text>
              {/* engineer bubble 2 */}
              <rect x="196" y="164" width="114" height="24" rx="6" fill="rgba(82,199,184,0.22)"/>
              <text x="204" y="180" fontSize="6.5" fill="rgba(248,251,255,0.85)" fontFamily="sans-serif">And if nobody responds?</text>
              {/* typing indicator */}
              <rect x="174" y="194" width="52" height="22" rx="8" fill="rgba(0,111,154,0.22)"/>
              <circle className="mock-typing-dot" cx="188" cy="205" r="3.5" fill="rgba(248,251,255,0.55)"/>
              <circle className="mock-typing-dot" cx="200" cy="205" r="3.5" fill="rgba(248,251,255,0.55)"/>
              <circle className="mock-typing-dot" cx="212" cy="205" r="3.5" fill="rgba(248,251,255,0.55)"/>
              {/* chat input */}
              <rect x="174" y="300" width="148" height="26" rx="6" fill="rgba(248,251,255,0.05)" stroke="rgba(248,251,255,0.1)" strokeWidth="1"/>
              <text x="182" y="317" fontSize="7" fill="rgba(248,251,255,0.25)" fontFamily="sans-serif">Ask the client...</text>
              <rect className="mock-cursor" x="182" y="308" width="1" height="10" rx="1" fill="rgba(82,199,184,0.8)"/>

              {/* ── RIGHT PANEL: Diagram ── */}
              <text x="344" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">DIAGRAM</text>
              {/* dot grid */}
              {[348,368,388,408,428,448,468,488].map(x =>
                [62,82,102,122,142,162,182,202,222].map(y => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(248,251,255,0.06)"/>
                ))
              )}
              {/* Report form node (animated) */}
              <rect className="mock-node-pulse" x="336" y="72" width="78" height="30" rx="4" fill="#162533" stroke="rgba(82,199,184,0.6)" strokeWidth="1.5"/>
              <text x="375" y="91" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Report form</text>
              {/* Records node */}
              <rect x="414" y="124" width="74" height="30" rx="4" fill="#162533" stroke="rgba(0,111,154,0.55)" strokeWidth="1.5"/>
              <text x="451" y="143" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Records</text>
              {/* Alerts node */}
              <rect x="336" y="124" width="68" height="30" rx="4" fill="#162533" stroke="rgba(242,201,76,0.5)" strokeWidth="1.5"/>
              <text x="370" y="143" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Alerts</text>
              {/* Escalation node */}
              <rect x="414" y="176" width="74" height="30" rx="4" fill="#162533" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5"/>
              <text x="451" y="195" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Escalation</text>
              {/* edges */}
              <path d="M414 87 L488 87 L488 124" stroke="rgba(0,111,154,0.4)" strokeWidth="1.2" fill="none"/>
              <path d="M375 102 L370 124" stroke="rgba(242,201,76,0.4)" strokeWidth="1.2"/>
              <path d="M451 154 L451 176" stroke="rgba(0,111,154,0.35)" strokeWidth="1.2"/>
              <path d="M404 139 L414 139" stroke="rgba(82,199,184,0.3)" strokeWidth="1.2"/>
              {/* animated flow packet */}
              <circle className="mock-packet" cx="375" cy="102" r="3" fill="rgba(82,199,184,0.9)"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          08 — WHERE IT'S GOING
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-section is-section-light" id="is-future">
        <div className="is-container">
          <span className="section-num">08</span>
          <span className="is-label">Where it's going</span>
          <h2 className="is-h2">A free place to practise on real problems.</h2>
          <p className="is-lead">
            design_it is a working prototype today. This is where we're taking
            it.
          </p>
          <div className="is-card-grid">
            {FUTURE.map((f, i) => (
              <div
                key={f.kicker}
                className="is-card is-scroll-fade"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="is-card-kicker">{f.kicker}</span>
                <h3 className="is-card-title">{f.title}</h3>
                <p className="is-card-text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════════════════════ */}
      <footer className="is-footer" id="is-footer">
        <span className="is-footer-wordmark">design_it</span>
        <p className="is-footer-tagline">
          The practice ground for the post-AI engineer.
        </p>
        <p className="is-footer-body">
          Practise turning a client's vague problem into a clear design that
          people and agents can build. Then see exactly what you missed.
        </p>
        <button className="is-footer-cta" onClick={onSimpleClick}>
          Try a case
        </button>
        <p className="is-footer-copy">© 2026 design_it</p>
      </footer>
    </div>
  );
}
