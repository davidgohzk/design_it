import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { LANDING_SLIDES } from "../constants";
import { getLandingOffset } from "../utils";
import "../InfoSite.css";

// ─── tiny SVG icon helper ────────────────────────────────────────────────────
function Ico({ children }: { children: ReactNode }) {
  return (
    <svg
      className="is-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const Icons = {
  GraduationCap: () => (
    <Ico>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </Ico>
  ),
  Building: () => (
    <Ico>
      <rect x="3" y="2" width="18" height="20" rx="1" />
      <path d="M9 22V12h6v10" />
      <line x1="9" y1="6" x2="10" y2="6" />
      <line x1="14" y1="6" x2="15" y2="6" />
      <line x1="9" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="15" y2="10" />
    </Ico>
  ),
  Globe: () => (
    <Ico>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Ico>
  ),
  BookOpen: () => (
    <Ico>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Ico>
  ),
  MessageSquare: () => (
    <Ico>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Ico>
  ),
  PenLine: () => (
    <Ico>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Ico>
  ),
  Layout: () => (
    <Ico>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </Ico>
  ),
  Users: () => (
    <Ico>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Ico>
  ),
  Layers: () => (
    <Ico>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </Ico>
  ),
  DollarSign: () => (
    <Ico>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Ico>
  ),
  TrendingUp: () => (
    <Ico>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Ico>
  ),
};

// ─── competition data (table format, 5 dimensions) ───────────────────────────
type DimVal = boolean | "partial";

const PLATFORMS: {
  name: string;
  url?: string;
  async: DimVal;
  realWorld: DimVal;
  hiring: DimVal;
  narrative: DimVal;
  portfolio: DimVal;
  highlight?: boolean;
}[] = [
  {
    name: "ByteByteGo",
    url: "https://bytebytego.com",
    async: false,
    realWorld: false,
    hiring: false,
    narrative: false,
    portfolio: false,
  },
  {
    name: "Educative / Grokking",
    url: "https://www.educative.io",
    async: false,
    realWorld: false,
    hiring: "partial",
    narrative: false,
    portfolio: false,
  },
  {
    name: "Exponent",
    url: "https://www.tryexponent.com",
    async: "partial",
    realWorld: "partial",
    hiring: "partial",
    narrative: false,
    portfolio: false,
  },
  {
    name: "interviewing.io",
    url: "https://interviewing.io",
    async: false,
    realWorld: "partial",
    hiring: true,
    narrative: false,
    portfolio: false,
  },
  {
    name: "HackerRank",
    url: "https://www.hackerrank.com",
    async: true,
    realWorld: false,
    hiring: true,
    narrative: false,
    portfolio: false,
  },
  {
    name: "design_it",
    async: true,
    realWorld: true,
    hiring: true,
    narrative: true,
    portfolio: true,
    highlight: true,
  },
];

const TABLE_DIMS: { key: keyof (typeof PLATFORMS)[0]; label: string }[] = [
  { key: "async", label: "Async Practice" },
  { key: "realWorld", label: "Real-World Cases" },
  { key: "hiring", label: "Hiring Signal" },
  { key: "narrative", label: "Reasoned Narrative" },
  { key: "portfolio", label: "Portfolio Artifact" },
];

function compCell(val: DimVal) {
  if (val === true) return <span className="is-chk">✓</span>;
  if (val === "partial") return <span className="is-par">~</span>;
  return <span className="is-crs">✗</span>;
}

// ─── nav sections ─────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "is-hero", label: "Home" },
  { id: "is-current", label: "Current Situation" },
  { id: "is-problem", label: "The Gap" },
  { id: "is-challenge-worlds", label: "Challenge Worlds" },
  { id: "is-solution", label: "Solution" },
  { id: "is-competition", label: "Competition" },
  { id: "is-market", label: "Market Opportunity" },
  { id: "is-tiers", label: "Problem Library" },
  { id: "is-gtm", label: "Strategy & Roadmap" },
];

// ─── main component ───────────────────────────────────────────────────────────
type Props = { onDemoClick: () => void };

export function InfoSite({ onDemoClick }: Props) {
  const scrollTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const [slideIndex, setSlideIndex] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [hoveredMarket, setHoveredMarket] = useState<
    "TAM" | "SAM" | "SOM" | null
  >(null);
  const [activeSection, setActiveSection] = useState("is-hero");
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setInterval(
      () => setSlideIndex((p) => (p + 1) % LANDING_SLIDES.length),
      5500,
    );
    return () => window.clearInterval(t);
  }, []);

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

  const wfSteps = [
    {
      num: "01",
      icon: <Icons.BookOpen />,
      title: "Read the context",
      sub: "Messy, human case brief — not a toy prompt.",
    },
    {
      num: "02",
      icon: <Icons.MessageSquare />,
      title: "Interview the stakeholder",
      sub: "AI withholds info. Ask better questions.",
    },
    {
      num: "03",
      icon: <Icons.PenLine />,
      title: "Write the design",
      sub: "SOAP notes: structured reasoning, not bullets.",
    },
    {
      num: "04",
      icon: <Icons.Layout />,
      title: "Build the canvas",
      sub: "Architecture diagram as a portfolio artifact.",
    },
  ];

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
          SECTION 1 — HERO (centred, no workflow strip)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-hero" id="is-hero">
        <div className="is-hero-centered">
          <h1 className="is-h1-brand">design_it</h1>
          <p className="is-hero-tagline">
            The practice ground for the post-AI engineer.
          </p>
          <p className="is-hero-question">
            We are building the platform that turns system design from a
            bottleneck into a skill — grounded in real problems, measured by
            real reasoning.
          </p>
          <div className="is-hero-btns">
            <button
              className="is-btn-primary"
              onClick={() => scrollTo("is-problem")}
            >
              Understand the Problem
            </button>
            <button className="is-btn-cta" onClick={onDemoClick}>
              Open Prototype
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — CURRENT SITUATION (stats + bottleneck + workflow)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-stats-section" id="is-current">
        <span className="is-stats-label">The Current Situation</span>
        <h2 className="is-stats-question">
          AI writes the code.
          <br />
          Who designs the system?
        </h2>
        <div
          ref={statsRef}
          className={`is-stats-strip${statsVisible ? " is-stats-visible" : ""}`}
        >
          <div className="is-stat-item">
            <span className="is-stat-number">84%</span>
            <span className="is-stat-label">
              of developers now use AI assistants daily{" "}
              <a
                className="is-stat-cite"
                href="https://survey.stackoverflow.co/2024/"
                target="_blank"
                rel="noreferrer"
              >
                ↗
              </a>
            </span>
          </div>
          <div className="is-stat-item">
            <span className="is-stat-number">~20%</span>
            <span className="is-stat-label">
              fall in junior developer employment (age 22–25), 2022–2025
            </span>
          </div>
          <div className="is-stat-item">
            <span className="is-stat-number">$10.7B</span>
            <span className="is-stat-label">SEA EdTech market today</span>
          </div>
        </div>
        <p className="is-stats-context">
          The bottleneck has shifted — from writing code to designing systems,
          reasoning about architecture, and communicating decisions.
        </p>
        <p className="is-stats-context-final">
          design_it tackles this through reasoned design narrative and
          established practices from the medical field.
        </p>
        <div className="is-cur-wf-wrap">
          <div className="is-wf-circles">
            {wfSteps.flatMap((s, i) => {
              const node = (
                <div key={s.num} className="is-wf-circle-node">
                  <div className="is-wf-circle-icon">{s.icon}</div>
                  <div className="is-wf-step-num">{s.num}</div>
                  <div className="is-wf-step-title">{s.title}</div>
                  <div className="is-wf-step-sub">{s.sub}</div>
                </div>
              );
              const arrow =
                i < 3 ? (
                  <div
                    key={`wfa${i}`}
                    className="is-wf-circle-arrow"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ) : null;
              return arrow ? [node, arrow] : [node];
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — PROBLEM (circle orbit)
          ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="is-section is-section-white is-section-deco"
        id="is-problem"
      >
        <div className="is-container">
          <span className="is-label">The Gap</span>
          <h2 className="is-h2">Three users, a world of potential</h2>
          <p className="is-lead">
            The system design skill gap is hurting engineers, companies, and
            social organisations — in different ways, for the same reason.
          </p>
          <p className="is-lead-artifact">
            There is no structured, real-world practice environment that
            produces verifiable design reasoning.
          </p>

          <div className="is-prob-cards-row">
            {/* Engineers */}
            <div className="is-problem-card is-scroll-fade">
              <div className="is-card-icon">
                <Icons.GraduationCap />
              </div>
              <h3 className="is-card-title">Engineers</h3>
              <p className="is-card-body">
                No platform offers async, real-world system design practice with
                structured output. Resources teach patterns — not reasoned
                design under realistic constraints.
              </p>
              <div className="is-stat-callout">
                <span className="is-callout-num">78%</span>
                of assessments don't reflect real work
                <div className="is-stat-source">
                  Source:{" "}
                  <a
                    href="https://www.hackerrank.com/research/developer-skills/2024"
                    target="_blank"
                    rel="noreferrer"
                  >
                    HackerRank Developer Skills Report 2024
                  </a>
                  , n=13,732
                </div>
              </div>
              <p className="is-card-benefit">
                Real async practice under realistic constraints — and a
                portfolio artifact that proves your reasoning.
              </p>
            </div>

            {/* Companies */}
            <div
              className="is-problem-card is-scroll-fade"
              style={{ transitionDelay: "100ms" }}
            >
              <div className="is-card-icon">
                <Icons.Building />
              </div>
              <h3 className="is-card-title">Companies</h3>
              <p className="is-card-body">
                Existing assessments can't verify design reasoning — coding
                tests are AI-cheatable, whiteboards are biased and don't reflect
                real work.
              </p>
              <div className="is-stat-callout">
                <span className="is-callout-num">$2.16B</span>
                technical assessment market — with no dominant player for system
                design
              </div>
              <p className="is-card-benefit">
                Assess system design reasoning through structured narrative
                output — not whiteboard performance.
              </p>
            </div>

            {/* NGOs */}
            <div
              className="is-problem-card is-scroll-fade"
              style={{ transitionDelay: "200ms" }}
            >
              <div className="is-card-icon">
                <Icons.Globe />
              </div>
              <h3 className="is-card-title">NGOs & Social Organisations</h3>
              <p className="is-card-body">
                Social organisations can't translate mission-critical ideas into
                technical plans. Pro-bono tech matching is ad-hoc, slow, and
                produces no accountable output.
              </p>
              <div className="is-stat-callout">
                <span className="is-callout-num">350M</span>
                learners served by NGO-affiliated educators globally
                <div className="is-stat-source">
                  Source:{" "}
                  <a
                    href="https://www.unesco.org/gem-report/en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    UNESCO
                  </a>
                </div>
              </div>
              <p className="is-card-benefit">
                Turn a mission-critical idea into a concrete technical plan,
                with pro-bono engineering engagement built in.
              </p>
            </div>
          </div>

          <div className="is-prob-connect-statement is-scroll-fade">
            <div className="is-prob-connect-icons" aria-hidden="true">
              <Icons.GraduationCap />
              <span className="is-connect-plus">+</span>
              <Icons.Building />
              <span className="is-connect-plus">+</span>
              <Icons.Globe />
            </div>
            <p className="is-lead-artifact">
              Engineers gain verifiable practice. Companies get a reliable
              hiring signal. NGOs find a path from idea to a technical plan.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CAROUSEL — after Problem
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-carousel-section" id="is-challenge-worlds">
        <div className="landing-carousel-header is-scroll-fade">
          <h2>
            <span className="landing-h2-design">Design</span> systems for
            problems that <span className="landing-h2-matter">matter.</span>
          </h2>
        </div>
        <div
          className="landing-carousel-stage is-scroll-fade"
          style={{ transitionDelay: "100ms" }}
        >
          {LANDING_SLIDES.map((slide, index) => {
            const offset = getLandingOffset(
              index,
              slideIndex,
              LANDING_SLIDES.length,
            );
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
                    <span className="landing-title-problem">
                      {slide.problem}
                    </span>
                    <br />
                    <span className="landing-title-base">in </span>
                    <span className="landing-title-country">
                      {slide.country}
                    </span>
                  </span>
                </span>
              </article>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — SOLUTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-section is-section-light" id="is-solution">
        <div className="is-container">
          <span className="is-label">The Solution</span>
          <h2 className="is-h2">
            A new kind of system design practice — async, structured, real
          </h2>
          <p className="is-lead">
            design_it gives engineers a realistic case brief, a simulated
            stakeholder to interview, a structured SOAP reasoning framework, and
            an architecture canvas. The output is not just a diagram.
          </p>
          <p className="is-lead-artifact">
            It is a reasoned design narrative — a portable hiring artifact.
          </p>

          <div className="is-steps-flow">
            {[
              {
                num: "01 · Read the context",
                watermark: "01",
                title: "Start from the brief",
                body: "A messy, human case brief — not a toy prompt. Real problems from companies, open-source projects, and NGOs.",
              },
              {
                num: "02 · Interview the stakeholder",
                watermark: "02",
                title: "Uncover constraints",
                body: "Ask questions. Uncover constraints. An AI stakeholder withholds information — just like a real interview.",
              },
              {
                num: "03 · Write the design",
                watermark: "03",
                title: "Structure your reasoning",
                body: "Use SOAP to write a markdown design document with justification — structured, reviewable, and ready to share.",
              },
              {
                num: "04 · Build the canvas",
                watermark: "04",
                title: "Communicate the architecture",
                body: "Map components, simulate flows, and communicate trade-offs. The output is a portfolio artifact, not a whiteboard.",
              },
            ].flatMap((s, i, arr) => {
              const card = (
                <div
                  key={s.num}
                  className="is-step is-scroll-fade"
                  data-num={s.watermark}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <span className="is-step-num">{s.num}</span>
                  <h4 className="is-step-title">{s.title}</h4>
                  <p className="is-step-body">{s.body}</p>
                </div>
              );
              if (i < arr.length - 1) {
                return [
                  card,
                  <div
                    key={`arr${i}`}
                    className="is-step-arrow"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>,
                ];
              }
              return [card];
            })}
          </div>

          {/* SOAP callout — dark variant */}
          <div className="is-soap-callout is-scroll-fade">
            <div className="is-soap-header">
              <span className="is-soap-icon">
                <Icons.PenLine />
              </span>
              <span className="is-soap-label">Why SOAP?</span>
            </div>
            <p className="is-soap-body">
              SOAP (Subjective, Objective, Assessment, Plan) is the
              peer-reviewed clinical reasoning standard used in medical
              education to train structured thinking under ambiguity.
            </p>
            <p className="is-soap-source">
              Validated by:{" "}
              <a
                href="https://doi.org/10.3402/meo.v19.23905"
                target="_blank"
                rel="noreferrer"
              >
                Wu et al., Medical Education Online 2014
              </a>
              {" · "}
              <a
                href="https://doi.org/10.3389/fpsyg.2025.1591300"
                target="_blank"
                rel="noreferrer"
              >
                Karaca &amp; Mert, Frontiers in Psychology 2025
              </a>
              {" · "}
              <a
                href="https://journal.aall.org.au/index.php/jall/article/view/71"
                target="_blank"
                rel="noreferrer"
              >
                Reidsema &amp; Mort, Journal of Academic Language and Learning
                2009
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — COMPETITIVE LANDSCAPE (table format)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-section is-section-white" id="is-competition">
        <div className="is-container">
          <span className="is-label">Competitive Landscape</span>
          <h2 className="is-h2">
            No one owns the reasoned design document as a hiring artifact
          </h2>
          <p className="is-lead">
            Existing platforms either teach system design content (ByteByteGo,
            Educative) or assess coding skill (HackerRank, Codility). None
            produce a structured, reviewable design narrative as a portable
            hiring artifact. That is the gap design_it fills.
          </p>

          <div className="is-comp-table-wrap is-scroll-fade">
            <table className="is-comp-table">
              <thead>
                <tr>
                  <th className="is-comp-th is-comp-th-platform">Platform</th>
                  {TABLE_DIMS.map((d) => (
                    <th key={String(d.key)} className="is-comp-th">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((p) => (
                  <tr
                    key={p.name}
                    className={p.highlight ? "is-comp-row-hl" : ""}
                  >
                    <td className="is-comp-td is-comp-td-name">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="is-comp-platform-link"
                        >
                          {p.name}
                        </a>
                      ) : (
                        p.name
                      )}
                    </td>
                    {TABLE_DIMS.map((d) => (
                      <td
                        key={String(d.key)}
                        className="is-comp-td is-comp-td-cell"
                      >
                        {compCell(p[d.key] as DimVal)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — MARKET SIZE (interactive circles)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-section is-section-light" id="is-market">
        <div className="is-container">
          <span className="is-label">Market Size & Opportunity</span>
          <h2 className="is-h2">A $8–10B addressable market by 2033</h2>
          <p className="is-lead">
            design_it operates at the intersection of three large and growing
            markets: <strong>technical hiring assessment</strong>,{" "}
            <strong>developer education</strong>, and{" "}
            <strong>Southeast Asia EdTech</strong>.
          </p>

          <div className="is-market-split is-scroll-fade">
            {/* left: interactive concentric circles */}
            <div className="is-market-circles-wrap">
              <svg className="is-market-circles-svg" viewBox="0 0 260 260">
                {[
                  {
                    id: "TAM" as const,
                    r: 118,
                    fill: "rgba(21,101,192,0.05)",
                    stroke: "rgba(21,101,192,0.2)",
                  },
                  {
                    id: "SAM" as const,
                    r: 78,
                    fill: "rgba(21,101,192,0.09)",
                    stroke: "rgba(21,101,192,0.35)",
                  },
                  {
                    id: "SOM" as const,
                    r: 38,
                    fill: "rgba(21,101,192,0.18)",
                    stroke: "rgba(21,101,192,0.6)",
                  },
                ].map((c) => (
                  <circle
                    key={c.id}
                    cx="130"
                    cy="130"
                    r={c.r}
                    fill={
                      hoveredMarket === c.id ? "rgba(21,101,192,0.24)" : c.fill
                    }
                    stroke={c.stroke}
                    strokeWidth={hoveredMarket === c.id ? 3 : 1.5}
                    style={{ cursor: "pointer", transition: "all 200ms" }}
                    onMouseEnter={() => setHoveredMarket(c.id)}
                    onMouseLeave={() => setHoveredMarket(null)}
                  />
                ))}
                <text
                  x="130"
                  y="32"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#1565C0"
                >
                  TAM
                </text>
                <text
                  x="130"
                  y="72"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#1565C0"
                >
                  SAM
                </text>
                <text
                  x="130"
                  y="133"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#1565C0"
                >
                  SOM
                </text>
              </svg>
            </div>

            {/* right: vertical stack */}
            <div className="is-market-stack">
              {[
                {
                  id: "TAM" as const,
                  number: "$8–10B",
                  desc: "Total by 2033 · Technical assessment + system design prep + EdTech global",
                  source: (
                    <>
                      <a
                        href="https://www.globenewswire.com"
                        target="_blank"
                        rel="noreferrer"
                      >
                        GlobeNewswire
                      </a>{" "}
                      Jan 2025 ·{" "}
                      <a
                        href="https://www.imarcgroup.com"
                        target="_blank"
                        rel="noreferrer"
                      >
                        IMARC Group
                      </a>
                    </>
                  ),
                },
                {
                  id: "SAM" as const,
                  number: "$1.5–2.5B",
                  desc: "By 2030 · SEA + India developer premium subscriptions & B2B challenges",
                  source: "$10.7B SEA EdTech today · 14.7% CAGR",
                },
                {
                  id: "SOM" as const,
                  number: "$15–40M",
                  desc: "Year 5 · 50K–200K premium users + 30–80 B2B hosted challenge contracts",
                  source:
                    "150M+ GitHub developers globally · 17M+ India · 5M+ SEA",
                },
              ].map((row) => (
                <div
                  key={row.id}
                  className={`is-market-row${hoveredMarket === row.id ? " is-market-row-active" : ""}`}
                  onMouseEnter={() => setHoveredMarket(row.id)}
                  onMouseLeave={() => setHoveredMarket(null)}
                >
                  <span className="is-market-row-label">{row.id}</span>
                  <div>
                    <div className="is-market-row-number">{row.number}</div>
                    <div className="is-market-row-desc">{row.desc}</div>
                    <div className="is-market-row-source">{row.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 — TIERED PROBLEM LIBRARY (circular flywheel)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-section is-section-white" id="is-tiers">
        <div className="is-container">
          <span className="is-label">Product Strategy</span>
          <h2 className="is-h2">The Tiered Problem Library</h2>
          <p className="is-lead">
            The case library is design_it's core content moat. Cases are
            structured across three tiers — each with a different acquisition
            strategy, access model, and revenue mechanism. Each Tier 3 corporate
            challenge produces a proprietary case that replenishes Tier 1 and 2
            and eventually trains the AI feedback engine. This is a compounding
            data advantage competitors cannot buy.
          </p>

          {/* circular flywheel */}
          <div
            className="is-fw-circle-wrap is-scroll-fade"
            aria-label="Product flywheel loop"
          >
            <div className="is-fw-circle">
              <svg
                className="is-fw-arcs"
                viewBox="0 0 320 320"
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="fw-arr"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(0,188,212,0.6)" />
                  </marker>
                </defs>
                <path
                  d="M 160,80  A 80 80 0 0 1 240,160"
                  fill="none"
                  stroke="rgba(0,188,212,0.35)"
                  strokeWidth="1.5"
                  markerEnd="url(#fw-arr)"
                />
                <path
                  d="M 240,160 A 80 80 0 0 1 160,240"
                  fill="none"
                  stroke="rgba(0,188,212,0.35)"
                  strokeWidth="1.5"
                  markerEnd="url(#fw-arr)"
                />
                <path
                  d="M 160,240 A 80 80 0 0 1  80,160"
                  fill="none"
                  stroke="rgba(0,188,212,0.35)"
                  strokeWidth="1.5"
                  markerEnd="url(#fw-arr)"
                />
                <path
                  d="M  80,160 A 80 80 0 0 1 160, 80"
                  fill="none"
                  stroke="rgba(0,188,212,0.35)"
                  strokeWidth="1.5"
                  markerEnd="url(#fw-arr)"
                />
              </svg>
              {(
                [
                  {
                    icon: <Icons.Users />,
                    label: "Free tier",
                    sub: "Drives signups",
                    pos: "top",
                  },
                  {
                    icon: <Icons.DollarSign />,
                    label: "Premium",
                    sub: "Attracts companies",
                    pos: "right",
                  },
                  {
                    icon: <Icons.Building />,
                    label: "Corporate challenges",
                    sub: "Produces new cases",
                    pos: "bottom",
                  },
                  {
                    icon: <Icons.Layers />,
                    label: "Cases",
                    sub: "Improves the free tier",
                    pos: "left",
                  },
                ] as const
              ).map((node) => (
                <div key={node.pos} className={`is-fw-node is-fw-${node.pos}`}>
                  <div className="is-fw-icon">{node.icon}</div>
                  <div className="is-fw-label">{node.label}</div>
                  <div className="is-fw-sub">{node.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="is-tiers-table-wrap is-scroll-fade">
            <table className="is-tiers-table">
              <thead>
                <tr>
                  <th className="is-tiers-th is-tiers-th-label" />
                  <th className="is-tiers-th">
                    <span className="is-tier-num">Tier 1</span>
                    <span className="is-tier-badge is-badge-free">Free</span>
                    <div className="is-tiers-th-name">
                      Free Practice Library
                    </div>
                  </th>
                  <th className="is-tiers-th">
                    <span className="is-tier-num">Tier 2</span>
                    <span className="is-tier-badge is-badge-premium">
                      Premium
                    </span>
                    <div className="is-tiers-th-name">Premium Case Library</div>
                    <div className="is-tiers-th-price">$8–15 / month</div>
                  </th>
                  <th className="is-tiers-th">
                    <span className="is-tier-num">Tier 3</span>
                    <span className="is-tier-badge is-badge-sponsor">
                      Sponsored
                    </span>
                    <div className="is-tiers-th-name">Corporate Challenges</div>
                    <div className="is-tiers-th-price">
                      $15K–$80K / challenge
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="is-tiers-row-label">Sources</td>
                  <td className="is-tiers-td">
                    <ul className="is-tier-list">
                      <li>Open-source RFCs (CNCF, Apache, Linux Foundation)</li>
                      <li>Community war stories</li>
                      <li>University research problems</li>
                      <li>NGO flagship cases</li>
                    </ul>
                  </td>
                  <td className="is-tiers-td">
                    <ul className="is-tier-list">
                      <li>Startup war stories from YC / Antler alumni</li>
                      <li>Series A–C company decisions (anonymised)</li>
                      <li>University research labs (NUS, NTU, HKUST, IIT)</li>
                    </ul>
                  </td>
                  <td className="is-tiers-td">
                    <ul className="is-tier-list">
                      <li>SEA tech companies (Grab, GoTo, Sea Group)</li>
                      <li>Government digital bodies (GovTech SG)</li>
                      <li>Global NGOs (UNICEF Innovation, WFP Tech)</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <td className="is-tiers-row-label">Example</td>
                  <td className="is-tiers-td is-tiers-td-example">
                    "Design the caching layer for a 50K DAU health app."
                  </td>
                  <td className="is-tiers-td is-tiers-td-example">
                    "How a SEA neobank rearchitected its fraud detection
                    pipeline for 2M transactions/day."
                  </td>
                  <td className="is-tiers-td is-tiers-td-example">
                    "Design the infrastructure for a national digital health
                    record platform serving 30M citizens."
                  </td>
                </tr>
                <tr>
                  <td className="is-tiers-row-label">Access</td>
                  <td className="is-tiers-td">
                    Free. No login to browse. Email capture on attempt.
                  </td>
                  <td className="is-tiers-td">
                    Individual subscription or university bundle ($5K–$20K/yr)
                  </td>
                  <td className="is-tiers-td">
                    B2B contract. Includes curation, rubric, and talent
                    shortlist.
                  </td>
                </tr>
                <tr>
                  <td className="is-tiers-row-label">Purpose</td>
                  <td className="is-tiers-td">
                    Top-of-funnel. Organic growth and SEO.
                  </td>
                  <td className="is-tiers-td">
                    Core revenue. 10–15% free-to-paid conversion target.
                  </td>
                  <td className="is-tiers-td">
                    Highest-margin. Produces proprietary cases and a talent
                    pipeline.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8 — STRATEGY & ROADMAP (Roadmap first, then GTM)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="is-section is-section-light" id="is-gtm">
        <div className="is-container">
          <span className="is-label">Strategy & Roadmap</span>
          <h2 className="is-h2">From prototype to platform</h2>
          <p className="is-lead">
            The go-to-market strategy follows a three-phase approach over 18
            months, starting with content and community, then proving
            willingness to pay, then scaling the B2B revenue engine.
          </p>

          {/* Product Roadmap FIRST */}
          <h3 className="is-subsection-title">Product Roadmap</h3>
          <div className="is-roadmap-wrap is-scroll-fade">
            <div className="is-roadmap-grid">
              <div className="is-roadmap-card is-scroll-fade">
                <span className="is-roadmap-phase">Phase 1 — Building</span>
                <h3 className="is-roadmap-title">Core platform built</h3>
                <ul className="is-roadmap-list">
                  <li>SOAP editor + case brief reader</li>
                  <li>AI stakeholder chat (Groq / LLM)</li>
                  <li>System design canvas (ReactFlow)</li>
                  <li>3 NGO seed case studies</li>
                </ul>
              </div>

              <div
                className="is-roadmap-card is-scroll-fade"
                style={{ transitionDelay: "100ms" }}
              >
                <span className="is-roadmap-phase">Phase 2 — Beta</span>
                <h3 className="is-roadmap-title">Prove willingness to pay</h3>
                <ul className="is-roadmap-list">
                  <li>Premium case library (15–20 cases)</li>
                  <li>University pilot (NUS Computing)</li>
                  <li>SOAP rubric AI feedback layer</li>
                  <li>First corporate sponsored challenge</li>
                </ul>
              </div>

              <div
                className="is-roadmap-card is-scroll-fade"
                style={{ transitionDelay: "200ms" }}
              >
                <span className="is-roadmap-phase">Phase 3 — Launch</span>
                <h3 className="is-roadmap-title">Scale the network</h3>
                <ul className="is-roadmap-list">
                  <li>SEA expansion</li>
                  <li>Public challenge leaderboard</li>
                  <li>ATS / hiring suite integration</li>
                  <li>10K registered users</li>
                </ul>
              </div>

              <div
                className="is-roadmap-card is-scroll-fade"
                style={{ transitionDelay: "300ms" }}
              >
                <span className="is-roadmap-phase">Phase 4 — Scale</span>
                <h3 className="is-roadmap-title">Platform maturity</h3>
                <ul className="is-roadmap-list">
                  <li>50K+ users milestone</li>
                  <li>Full SEA regional rollout</li>
                  <li>Annual Grand Challenge event</li>
                  <li>20+ university partners</li>
                </ul>
              </div>
            </div>
          </div>

          {/* GTM Phases SECOND */}
          <h3 className="is-subsection-title is-subsection-mt">
            Go-to-Market Phases
          </h3>
          <div className="is-phases-wrap is-scroll-fade">
            <div className="is-phases-grid">
              <div className="is-phase-card is-scroll-fade">
                <span className="is-phase-period">Month 1–6</span>
                <h3 className="is-phase-title">Build & Validate</h3>
                <div className="is-phase-section-label">Goals</div>
                <ul className="is-phase-list is-roadmap-list">
                  <li>Working product</li>
                  <li>15–20 cases in library</li>
                  <li>NUS Computing pilot</li>
                </ul>
                <div className="is-phase-section-label">Actions</div>
                <ul className="is-phase-list is-roadmap-list">
                  <li>
                    Source Tier 1 cases from open-source RFCs and startup
                    network
                  </li>
                  <li>Launch prototype to 20–30 NUS engineers for dogfood</li>
                  <li>Seed on Product Hunt and r/cscareerquestions</li>
                </ul>
                <div className="is-phase-kpis">
                  <div className="is-phase-section-label">KPIs</div>
                  <ul className="is-phase-list is-roadmap-list">
                    <li>500–1,000 registered users</li>
                    <li>3 university pilots</li>
                  </ul>
                </div>
              </div>

              <div
                className="is-phase-card is-scroll-fade"
                style={{ transitionDelay: "100ms" }}
              >
                <span className="is-phase-period">Month 7–12</span>
                <h3 className="is-phase-title">Traction</h3>
                <div className="is-phase-section-label">Goals</div>
                <ul className="is-phase-list is-roadmap-list">
                  <li>Premium tier live</li>
                  <li>First B2B revenue</li>
                  <li>10K users</li>
                </ul>
                <div className="is-phase-section-label">Actions</div>
                <ul className="is-phase-list is-roadmap-list">
                  <li>Launch premium subscription</li>
                  <li>
                    Pitch 3–5 SEA tech companies on hosted challenges ($15K–$30K
                    each)
                  </li>
                  <li>Expand to 8–10 university partners across SEA</li>
                  <li>
                    Build referral loop: public portfolio sharing +
                    invite-a-peer mechanic
                  </li>
                </ul>
                <div className="is-phase-kpis">
                  <div className="is-phase-section-label">KPIs</div>
                  <ul className="is-phase-list is-roadmap-list">
                    <li>10K registered users</li>
                    <li>3–5 paying B2B pilots</li>
                    <li>$50–100K ARR</li>
                  </ul>
                </div>
              </div>

              <div
                className="is-phase-card is-scroll-fade"
                style={{ transitionDelay: "200ms" }}
              >
                <span className="is-phase-period">Month 13–18</span>
                <h3 className="is-phase-title">Scale & Monetise</h3>
                <div className="is-phase-section-label">Goals</div>
                <ul className="is-phase-list is-roadmap-list">
                  <li>$400–500K ARR</li>
                  <li>50K users</li>
                  <li>Southeast Asia market</li>
                </ul>
                <div className="is-phase-section-label">Actions</div>
                <ul className="is-phase-list is-roadmap-list">
                  <li>Ship AI feedback layer (SOAP rubric scoring)</li>
                  <li>Expand to Southeast Asia (SG, MY, TH, PH, ID)</li>
                  <li>
                    Run first annual Grand Challenge — flagship public
                    competition
                  </li>
                  <li>Build full hiring suite with ATS integration</li>
                </ul>
                <div className="is-phase-kpis">
                  <div className="is-phase-section-label">KPIs</div>
                  <ul className="is-phase-list is-roadmap-list">
                    <li>50K+ users</li>
                    <li>20+ university partners</li>
                    <li>$400–500K ARR</li>
                  </ul>
                </div>
              </div>
            </div>
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
          We are building the platform that turns system design from a
          bottleneck into a skill — grounded in real problems, measured by real
          reasoning.
        </p>
        <button className="is-footer-cta" onClick={onDemoClick}>
          Open Prototype
        </button>
        <p className="is-footer-copy">© 2026 design_it</p>
      </footer>
    </div>
  );
}
