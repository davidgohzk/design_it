import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@mui/material";
import { LANDING_SLIDES } from "../constants";
import { getLandingOffset } from "../utils";
import { LandingIcon } from "./LandingIcon";
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
    async: "partial",
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
  { id: "is-prototype", label: "Try it" },
  { id: "is-why", label: "Why design_it" },
  { id: "is-how", label: "How it works" },
  { id: "is-who-wins", label: "Who wins" },
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
  const [fwStep, setFwStep] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [hoveredMarket, setHoveredMarket] = useState<
    "TAM" | "SAM" | "SOM" | null
  >(null);
  const [activeSection, setActiveSection] = useState("is-hero");
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setInterval(() => setFwStep((p) => (p + 1) % 4), 1200);
    return () => window.clearInterval(t);
  }, []);

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
              onClick={() => scrollTo("is-prototype")}
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
          SECTION 3 — TRY THE WORKING PROTOTYPE
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-demo-cta-section" id="is-prototype">
        <div className="landing-demo-cta">
          <div className="demo-cta-copy" data-reveal>
            <span className="landing-section-kicker">Try the working prototype</span>
            <h2>Open the demo and solve a case.</h2>
            <p>
              Use the context, chat, markdown response, and system design canvas to produce
              a grounded architecture plan.
            </p>
            <Button size="large" variant="contained" color="primary" onClick={onDemoClick}>
              Enter Demo
            </Button>
            <div className="demo-feature-list">
              <div className="demo-feature"><LandingIcon name="brief" /><span>Read the case brief</span></div>
              <div className="demo-feature"><LandingIcon name="chat" /><span>Chat with the stakeholder</span></div>
              <div className="demo-feature"><LandingIcon name="architecture" /><span>Design the system</span></div>
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
              <text x="250" y="19" fontSize="8" fill="rgba(248,251,255,0.35)" fontFamily="sans-serif" textAnchor="middle">design_it — System Design Practice</text>
              {/* panel dividers */}
              <line x1="166" y1="28" x2="166" y2="336" stroke="rgba(248,251,255,0.07)" strokeWidth="1"/>
              <line x1="332" y1="28" x2="332" y2="336" stroke="rgba(248,251,255,0.07)" strokeWidth="1"/>

              {/* ── LEFT PANEL: Context ── */}
              <text x="12" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">CONTEXT</text>
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
              <text x="178" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">CHAT</text>
              {/* system bubble 1 */}
              <rect x="174" y="54" width="116" height="34" rx="6" fill="rgba(0,111,154,0.28)"/>
              <text x="182" y="68" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">You are the CTO of a</text>
              <text x="182" y="80" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">health startup, 50k DAU.</text>
              {/* user bubble */}
              <rect x="196" y="94" width="114" height="24" rx="6" fill="rgba(82,199,184,0.22)"/>
              <text x="204" y="110" fontSize="6.5" fill="rgba(248,251,255,0.85)" fontFamily="sans-serif">What are uptime requirements?</text>
              {/* system bubble 2 */}
              <rect x="174" y="124" width="120" height="34" rx="6" fill="rgba(0,111,154,0.28)"/>
              <text x="182" y="138" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">We need 99.9% uptime</text>
              <text x="182" y="150" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">and sub-200ms p99.</text>
              {/* user bubble 2 */}
              <rect x="196" y="164" width="114" height="24" rx="6" fill="rgba(82,199,184,0.22)"/>
              <text x="204" y="180" fontSize="6.5" fill="rgba(248,251,255,0.85)" fontFamily="sans-serif">Any third-party integrations?</text>
              {/* typing indicator */}
              <rect x="174" y="194" width="52" height="22" rx="8" fill="rgba(0,111,154,0.22)"/>
              <circle className="mock-typing-dot" cx="188" cy="205" r="3.5" fill="rgba(248,251,255,0.55)"/>
              <circle className="mock-typing-dot" cx="200" cy="205" r="3.5" fill="rgba(248,251,255,0.55)"/>
              <circle className="mock-typing-dot" cx="212" cy="205" r="3.5" fill="rgba(248,251,255,0.55)"/>
              {/* chat input */}
              <rect x="174" y="300" width="148" height="26" rx="6" fill="rgba(248,251,255,0.05)" stroke="rgba(248,251,255,0.1)" strokeWidth="1"/>
              <text x="182" y="317" fontSize="7" fill="rgba(248,251,255,0.25)" fontFamily="sans-serif">Ask the stakeholder...</text>
              <rect className="mock-cursor" x="182" y="308" width="1" height="10" rx="1" fill="rgba(82,199,184,0.8)"/>

              {/* ── RIGHT PANEL: Canvas ── */}
              <text x="344" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">CANVAS</text>
              {/* dot grid */}
              {[348,368,388,408,428,448,468,488].map(x =>
                [62,82,102,122,142,162,182,202,222].map(y => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(248,251,255,0.06)"/>
                ))
              )}
              {/* API Server node (animated) */}
              <rect className="mock-node-pulse" x="336" y="72" width="78" height="30" rx="4" fill="#162533" stroke="rgba(82,199,184,0.6)" strokeWidth="1.5"/>
              <text x="375" y="91" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">API Server</text>
              {/* DB node */}
              <rect x="414" y="124" width="74" height="30" rx="4" fill="#162533" stroke="rgba(0,111,154,0.55)" strokeWidth="1.5"/>
              <text x="451" y="143" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Database</text>
              {/* Cache node */}
              <rect x="336" y="124" width="68" height="30" rx="4" fill="#162533" stroke="rgba(242,201,76,0.5)" strokeWidth="1.5"/>
              <text x="370" y="143" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Cache</text>
              {/* CDN node */}
              <rect x="414" y="176" width="74" height="30" rx="4" fill="#162533" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5"/>
              <text x="451" y="195" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">CDN</text>
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
          SECTION 4 — WHY DESIGN_IT EXISTS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-story-section" id="is-why">
        <div className="landing-section-inner landing-story-grid">
          <div data-reveal>
            <span className="section-num">01</span>
            <span className="landing-section-kicker">Why design_it exists</span>
            <h2>The bottleneck is moving from implementation to design.</h2>
            <p className="landing-story-lead">
              AI is making implementation <em>better</em>. Writing code is faster, cheaper, and more accessible than ever. That raises the bar for everything upstream — the design behind the code has to be <em>better</em> too.
            </p>
          </div>
          <div className="landing-story-copy">
            <div className="landing-shift-diagram" data-reveal aria-label="Shift from old interviews to design_it">
              <div className="shift-panel shift-panel--old">
                <svg className="shift-illustration" viewBox="0 0 180 160" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="10" width="136" height="90" rx="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5"/>
                  <rect x="12" y="96" width="136" height="6" rx="2" fill="#e2e8f0"/>
                  <text x="24" y="36" fontSize="9" fill="#94a3b8" fontFamily="monospace">O(n²)</text>
                  <text x="24" y="52" fontSize="9" fill="#94a3b8" fontFamily="monospace">while</text>
                  <text x="24" y="68" fontSize="9" fill="#94a3b8" fontFamily="monospace">{'{ }'}</text>
                  <circle cx="118" cy="32" r="9" fill="none" stroke="#cbd5e1" strokeWidth="1.5"/>
                  <text x="115" y="35" fontSize="7" fill="#94a3b8">5</text>
                  <circle cx="103" cy="54" r="9" fill="none" stroke="#cbd5e1" strokeWidth="1.5"/>
                  <text x="100" y="57" fontSize="7" fill="#94a3b8">3</text>
                  <circle cx="133" cy="54" r="9" fill="none" stroke="#cbd5e1" strokeWidth="1.5"/>
                  <text x="130" y="57" fontSize="7" fill="#94a3b8">8</text>
                  <circle cx="96" cy="76" r="7" fill="none" stroke="#cbd5e1" strokeWidth="1.2"/>
                  <circle cx="110" cy="76" r="7" fill="none" stroke="#cbd5e1" strokeWidth="1.2"/>
                  <line x1="111" y1="41" x2="104" y2="45" stroke="#cbd5e1" strokeWidth="1"/>
                  <line x1="125" y1="41" x2="132" y2="45" stroke="#cbd5e1" strokeWidth="1"/>
                  <line x1="100" y1="63" x2="99" y2="69" stroke="#cbd5e1" strokeWidth="1"/>
                  <line x1="106" y1="63" x2="108" y2="69" stroke="#cbd5e1" strokeWidth="1"/>
                  <line x1="40" y1="102" x2="28" y2="130" stroke="#cbd5e1" strokeWidth="2"/>
                  <line x1="120" y1="102" x2="132" y2="130" stroke="#cbd5e1" strokeWidth="2"/>
                  <line x1="80" y1="102" x2="80" y2="130" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3"/>
                  <circle cx="158" cy="112" r="12" fill="#e2e8f0"/>
                  <path d="M148 116 Q110 100 82 83" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <rect x="146" y="124" width="24" height="18" rx="6" fill="#e2e8f0"/>
                </svg>
                <span className="shift-label">Old signal</span>
                <strong>Programming puzzles</strong>
                <div className="shift-traits">
                  <span className="shift-trait">Sorting algorithms</span>
                  <span className="shift-trait">Data structures</span>
                  <span className="shift-trait">Time complexity</span>
                </div>
              </div>
              <div className="landing-diagram-arrow" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none" style={{width: 28, height: 28}}>
                  <path d="M4 20h32M24 11l10 9-10 9" stroke="#006f9a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="shift-panel shift-panel--new">
                <svg className="shift-illustration" viewBox="0 0 180 160" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="10" width="136" height="90" rx="6" fill="#e8faf8" stroke="#52c7b8" strokeWidth="1.5"/>
                  <rect x="16" y="14" width="128" height="82" rx="4" fill="#f0fdfb"/>
                  <rect x="22" y="26" width="38" height="22" rx="3" fill="none" stroke="#52c7b8" strokeWidth="1.5"/>
                  <text x="26" y="41" fontSize="7.5" fill="#0d9488" fontFamily="sans-serif" fontWeight="700">API Layer</text>
                  <rect x="110" y="26" width="38" height="22" rx="3" fill="none" stroke="#006f9a" strokeWidth="1.5"/>
                  <text x="114" y="41" fontSize="7.5" fill="#006f9a" fontFamily="sans-serif" fontWeight="700">Database</text>
                  <rect x="66" y="68" width="38" height="22" rx="3" fill="none" stroke="#c49a00" strokeWidth="1.5"/>
                  <text x="70" y="83" fontSize="7.5" fill="#c49a00" fontFamily="sans-serif" fontWeight="700">Cache</text>
                  <line x1="60" y1="37" x2="110" y2="37" stroke="#52c7b8" strokeWidth="1.5"/>
                  <path d="M104 33 L110 37 L104 41" fill="none" stroke="#52c7b8" strokeWidth="1.2"/>
                  <line x1="41" y1="48" x2="76" y2="68" stroke="#52c7b8" strokeWidth="1.2"/>
                  <path d="M73 64 L76 68 L72 71" fill="none" stroke="#52c7b8" strokeWidth="1.2"/>
                  <line x1="129" y1="48" x2="104" y2="68" stroke="#006f9a" strokeWidth="1.2"/>
                  <path d="M106 64 L104 68 L101 64" fill="none" stroke="#006f9a" strokeWidth="1.2"/>
                  <rect x="71" y="100" width="18" height="10" rx="2" fill="#a7f3d0"/>
                  <rect x="60" y="110" width="40" height="5" rx="2" fill="#a7f3d0"/>
                  <circle cx="158" cy="116" r="12" fill="#99f6e4"/>
                  <rect x="146" y="128" width="24" height="16" rx="6" fill="#5eead4"/>
                  <circle cx="143" cy="106" r="3" fill="#52c7b8" fillOpacity="0.5"/>
                  <circle cx="134" cy="97" r="5" fill="#52c7b8" fillOpacity="0.35"/>
                  <circle cx="122" cy="86" r="7" fill="#52c7b8" fillOpacity="0.2"/>
                </svg>
                <span className="shift-label">New signal</span>
                <strong>System reasoning</strong>
                <div className="shift-traits">
                  <span className="shift-trait">Requirements discovery</span>
                  <span className="shift-trait">Stakeholder clarity</span>
                  <span className="shift-trait">Architecture tradeoffs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — HOW IT WORKS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-method-section" id="is-how">
        <div className="landing-section-inner">
          <div className="landing-section-heading" data-reveal>
            <span className="section-num">02</span>
            <span className="landing-section-kicker">How it works</span>
            <h2>A system design interview that can happen asynchronously.</h2>
            <p>
              Each case gives candidates a realistic context, a stakeholder chat, and a
              structured response space. The output is not just a diagram. It is a
              reasoned design narrative.
            </p>
          </div>
          <div className="method-scene-wrap">
            <div className="method-scene-chrome" aria-hidden="true">
              <div className="chrome-dots">
                <span className="chrome-dot chrome-dot-r" />
                <span className="chrome-dot chrome-dot-y" />
                <span className="chrome-dot chrome-dot-g" />
              </div>
              <span className="chrome-label">Health Platform — System Design Case</span>
            </div>
            <svg className="method-scene-svg" viewBox="0 0 1060 160" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="30" width="90" height="110" rx="6" fill="white" stroke="#7dd3fc" strokeWidth="1.5"/>
              <rect x="18" y="18" width="74" height="18" rx="3" fill="#7dd3fc" fillOpacity="0.3" stroke="#7dd3fc" strokeWidth="1"/>
              <text x="28" y="31" fontSize="7.5" fill="#0284c7" fontWeight="700" fontFamily="sans-serif">BRIEF</text>
              <line x1="22" y1="56" x2="88" y2="56" stroke="#e2e8f0" strokeWidth="1.5"/>
              <line x1="22" y1="70" x2="88" y2="70" stroke="#e2e8f0" strokeWidth="1.5"/>
              <line x1="22" y1="84" x2="78" y2="84" stroke="#e2e8f0" strokeWidth="1.5"/>
              <line x1="22" y1="98" x2="84" y2="98" stroke="#e2e8f0" strokeWidth="1.5"/>
              <line x1="22" y1="112" x2="70" y2="112" stroke="#e2e8f0" strokeWidth="1.5"/>
              <circle cx="55" cy="13" r="10" fill="#bfdbfe"/>
              <path d="M47 22 Q55 18 63 22" stroke="#bfdbfe" strokeWidth="5" strokeLinecap="round" fill="none"/>
              <path d="M108 85 L148 85" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3"/>
              <path d="M142 80 L149 85 L142 90" fill="none" stroke="#52c7b8" strokeWidth="2"/>
              <circle cx="190" cy="13" r="10" fill="#99f6e4"/>
              <path d="M182 22 Q190 18 198 22" stroke="#99f6e4" strokeWidth="5" strokeLinecap="round" fill="none"/>
              <circle cx="300" cy="13" r="10" fill="#7dd3fc"/>
              <path d="M292 22 Q300 18 308 22" stroke="#7dd3fc" strokeWidth="5" strokeLinecap="round" fill="none"/>
              <rect x="160" y="34" width="110" height="34" rx="8" fill="white" stroke="#52c7b8" strokeWidth="1.2"/>
              <path d="M190 34 L185 26 L202 34" fill="white" stroke="#52c7b8" strokeWidth="1" strokeLinejoin="round"/>
              <text x="170" y="52" fontSize="7" fill="#0d9488" fontFamily="sans-serif">What are the latency</text>
              <text x="170" y="63" fontSize="7" fill="#0d9488" fontFamily="sans-serif">requirements?</text>
              <rect x="172" y="82" width="118" height="34" rx="8" fill="white" stroke="#006f9a" strokeWidth="1.2"/>
              <path d="M300 82 L305 74 L290 82" fill="white" stroke="#006f9a" strokeWidth="1" strokeLinejoin="round"/>
              <text x="182" y="100" fontSize="7" fill="#006f9a" fontFamily="sans-serif">Under 200ms. We have</text>
              <text x="182" y="111" fontSize="7" fill="#006f9a" fontFamily="sans-serif">50k daily active users.</text>
              <path d="M318 85 L358 85" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3"/>
              <path d="M352 80 L359 85 L352 90" fill="none" stroke="#52c7b8" strokeWidth="2"/>
              <rect x="370" y="20" width="108" height="130" rx="6" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5"/>
              <rect x="400" y="12" width="48" height="14" rx="4" fill="#86efac"/>
              <text x="407" y="23" fontSize="7.5" fill="#15803d" fontWeight="700" fontFamily="sans-serif">SOAP</text>
              <circle cx="385" cy="50" r="5" fill="none" stroke="#86efac" strokeWidth="1.5"/>
              <text x="382" y="53" fontSize="7" fill="#15803d" fontWeight="700">S</text>
              <text x="396" y="53" fontSize="7" fill="#374151" fontFamily="sans-serif">Mobile-first users</text>
              <circle cx="385" cy="72" r="5" fill="none" stroke="#86efac" strokeWidth="1.5"/>
              <text x="382" y="75" fontSize="7" fill="#15803d" fontWeight="700">O</text>
              <text x="396" y="75" fontSize="7" fill="#374151" fontFamily="sans-serif">50k DAU, 200ms SLA</text>
              <circle cx="385" cy="94" r="5" fill="none" stroke="#86efac" strokeWidth="1.5"/>
              <text x="382" y="97" fontSize="7" fill="#15803d" fontWeight="700">A</text>
              <text x="396" y="97" fontSize="7" fill="#374151" fontFamily="sans-serif">Offline-first approach</text>
              <circle cx="385" cy="116" r="5" fill="none" stroke="#86efac" strokeWidth="1.5"/>
              <text x="382" y="119" fontSize="7" fill="#15803d" fontWeight="700">P</text>
              <text x="396" y="119" fontSize="7" fill="#374151" fontFamily="sans-serif">CDN + sync layer</text>
              <path d="M486 85 L526 85" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3"/>
              <path d="M520 80 L527 85 L520 90" fill="none" stroke="#52c7b8" strokeWidth="2"/>
              <rect x="538" y="14" width="294" height="142" rx="8" fill="#f0f9ff" stroke="#7dd3fc" strokeWidth="1.5"/>
              <text x="554" y="33" fontSize="8" fill="#0284c7" fontWeight="700" fontFamily="sans-serif">Architecture Canvas</text>
              <rect x="554" y="44" width="62" height="28" rx="4" fill="none" stroke="#52c7b8" strokeWidth="1.5"/>
              <text x="560" y="62" fontSize="7.5" fill="#0d9488" fontWeight="700" fontFamily="sans-serif">Mobile App</text>
              <rect x="646" y="44" width="56" height="28" rx="4" fill="none" stroke="#006f9a" strokeWidth="1.5"/>
              <text x="653" y="62" fontSize="7.5" fill="#006f9a" fontWeight="700" fontFamily="sans-serif">API GW</text>
              <rect x="726" y="44" width="50" height="28" rx="4" fill="none" stroke="#94a3b8" strokeWidth="1.5"/>
              <text x="731" y="62" fontSize="7.5" fill="#64748b" fontWeight="700" fontFamily="sans-serif">CDN</text>
              <rect x="554" y="108" width="56" height="28" rx="4" fill="none" stroke="#c49a00" strokeWidth="1.5"/>
              <text x="560" y="126" fontSize="7.5" fill="#c49a00" fontWeight="700" fontFamily="sans-serif">Database</text>
              <rect x="646" y="108" width="50" height="28" rx="4" fill="none" stroke="#52c7b8" strokeWidth="1.5"/>
              <text x="651" y="126" fontSize="7.5" fill="#0d9488" fontWeight="700" fontFamily="sans-serif">Cache</text>
              <line x1="616" y1="58" x2="646" y2="58" stroke="#52c7b8" strokeWidth="1.2"/>
              <path d="M640 54 L646 58 L640 62" fill="none" stroke="#52c7b8" strokeWidth="1.2"/>
              <line x1="702" y1="58" x2="726" y2="58" stroke="#94a3b8" strokeWidth="1.2"/>
              <path d="M720 54 L726 58 L720 62" fill="none" stroke="#94a3b8" strokeWidth="1.2"/>
              <line x1="582" y1="72" x2="582" y2="108" stroke="#c49a00" strokeWidth="1.2"/>
              <path d="M578 102 L582 108 L586 102" fill="none" stroke="#c49a00" strokeWidth="1.2"/>
              <line x1="671" y1="72" x2="671" y2="108" stroke="#52c7b8" strokeWidth="1.2"/>
              <path d="M667 102 L671 108 L675 102" fill="none" stroke="#52c7b8" strokeWidth="1.2"/>
              <path d="M 832 85 L 872 85" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3"/>
              <path d="M 866 80 L 873 85 L 866 90" fill="none" stroke="#52c7b8" strokeWidth="2"/>
              <rect x="878" y="14" width="168" height="142" rx="8" fill="#faf5ff" stroke="#c084fc" strokeWidth="1.5"/>
              <rect x="878" y="14" width="168" height="22" rx="8" fill="#e9d5ff"/>
              <rect x="878" y="28" width="168" height="8" fill="#e9d5ff"/>
              <text x="888" y="29" fontSize="7.5" fill="#7e22ce" fontWeight="700" fontFamily="sans-serif">AI FEEDBACK</text>
              <circle cx="1032" cy="25" r="11" fill="#7e22ce"/>
              <text x="1025" y="29" fontSize="8.5" fill="white" fontWeight="800" fontFamily="sans-serif">82</text>
              <circle cx="890" cy="53" r="4" fill="#86efac"/>
              <text x="899" y="57" fontSize="6.5" fill="#374151" fontFamily="sans-serif">Good latency reasoning</text>
              <circle cx="890" cy="71" r="4" fill="#fca5a5"/>
              <text x="899" y="75" fontSize="6.5" fill="#374151" fontFamily="sans-serif">Missing auth layer</text>
              <circle cx="890" cy="89" r="4" fill="#fca5a5"/>
              <text x="899" y="93" fontSize="6.5" fill="#374151" fontFamily="sans-serif">Consider rate limiting</text>
              <circle cx="890" cy="107" r="4" fill="#fcd34d"/>
              <text x="899" y="111" fontSize="6.5" fill="#374151" fontFamily="sans-serif">CDN placement unclear</text>
              <circle cx="890" cy="125" r="4" fill="#86efac"/>
              <text x="899" y="129" fontSize="6.5" fill="#374151" fontFamily="sans-serif">Solid SOAP structure</text>
            </svg>
          </div>

          <div className="landing-method-flow" data-reveal>
            <div className="flow-step">
              <div className="flow-step-circle">1</div>
              <LandingIcon name="brief" />
              <span>Context</span>
              <h3>Start with the case</h3>
              <p>Understand the organization, the pain points, and the constraints.</p>
            </div>
            <div className="flow-connector" aria-hidden="true" />
            <div className="flow-step">
              <div className="flow-step-circle">2</div>
              <LandingIcon name="chat" />
              <span>Conversation</span>
              <h3>Ask better questions</h3>
              <p>Use the chatbot stakeholder to discover what the brief does not say.</p>
            </div>
            <div className="flow-connector" aria-hidden="true" />
            <div className="flow-step">
              <div className="flow-step-circle">3</div>
              <LandingIcon name="soap" />
              <span>SOAP</span>
              <h3>Make reasoning visible</h3>
              <p>Turn subjective notes, objective facts, assessment, and plan into evidence.</p>
              <p style={{ fontSize: "0.76rem", fontStyle: "italic", color: "rgba(21,35,48,0.5)", marginTop: -4 }}>Borrowed from medicine — doctors have used SOAP notes to structure clinical reasoning for decades.</p>
            </div>
            <div className="flow-connector" aria-hidden="true" />
            <div className="flow-step">
              <div className="flow-step-circle">4</div>
              <LandingIcon name="architecture" />
              <span>Architecture</span>
              <h3>Design the system</h3>
              <p>Map components, simulate flows, and communicate implementation tradeoffs.</p>
            </div>
            <div className="flow-connector" aria-hidden="true" />
            <div className="flow-step">
              <div className="flow-step-circle">5</div>
              <LandingIcon name="agent" />
              <span>AI Feedback</span>
              <h3>Get instant critique</h3>
              <p>Receive targeted feedback on your reasoning, gaps, and design decisions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — WHO WINS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-wins-section" id="is-who-wins">
        <div className="landing-section-inner">
          <div className="landing-section-heading" data-reveal>
            <span className="section-num">03</span>
            <span className="landing-section-kicker">Who wins</span>
            <h2>A shared marketplace for practice, hiring, and social impact.</h2>
          </div>
          <div className="landing-wins-figures" data-reveal aria-label="How design_it benefits developers, companies, and NGOs">
            <div className="stakeholder-card stakeholder-card--dev">
              <svg className="stakeholder-figure-svg" viewBox="0 0 160 180" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="148" width="144" height="8" rx="3" fill="#bfdbfe"/>
                <rect x="30" y="128" width="100" height="4" rx="2" fill="#93c5fd"/>
                <rect x="32" y="90" width="96" height="40" rx="4" fill="#dbeafe" stroke="#7dd3fc" strokeWidth="1.5"/>
                <text x="42" y="108" fontSize="7" fill="#1d4ed8" fontFamily="monospace">import Design</text>
                <text x="42" y="122" fontSize="7" fill="#1d4ed8" fontFamily="monospace">build(canvas)</text>
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
                <span className="stakeholder-role stakeholder-role--dev">Developer</span>
                <h3>Build system design judgment</h3>
                <div className="benefit-bubbles benefit-bubbles--dev">
                  <span className="benefit-bubble">Real cases</span>
                  <span className="benefit-bubble">Stakeholder chat</span>
                  <span className="benefit-bubble">Portfolio evidence</span>
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
                <span className="stakeholder-role stakeholder-role--company">Company</span>
                <h3>Assess work-like engineering skills</h3>
                <div className="benefit-bubbles benefit-bubbles--company">
                  <span className="benefit-bubble">Hosted problems</span>
                  <span className="benefit-bubble">Async evaluation</span>
                  <span className="benefit-bubble">Talent signal</span>
                </div>
              </div>
            </div>

            <div className="stakeholder-card stakeholder-card--ngo">
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
                <span className="stakeholder-role stakeholder-role--ngo">NGOs and social teams</span>
                <h3>Turn ideas into technical plans</h3>
                <div className="benefit-bubbles benefit-bubbles--ngo">
                  <span className="benefit-bubble">Problem briefs</span>
                  <span className="benefit-bubble">Crowdsourced designs</span>
                  <span className="benefit-bubble">Execution pathway</span>
                </div>
              </div>
            </div>
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
              {/* 360×360 container, arc circle radius 100 centered at (180,180).
                  Arc endpoints use ±25° offset so arrowheads land in the gap
                  between nodes rather than on top of icon circles or labels. */}
              <svg
                className="is-fw-arcs"
                viewBox="0 0 360 360"
                aria-hidden="true"
              >
                <defs>
                  <marker id="fw-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(0,188,212,0.35)" />
                  </marker>
                  <marker id="fw-arr-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                    <path d="M0,0 L7,3.5 L0,7 Z" fill="rgba(0,188,212,1)" />
                  </marker>
                </defs>
                {([
                  // Arc 0 top→right:   start 25° past top,   end 25° before right
                  "M 222.3,89.4   A 100 100 0 0 1 270.6,137.7",
                  // Arc 1 right→bottom: start 45° past right (clears label at y≈214-237), end 25° before bottom
                  "M 250.7,250.7  A 100 100 0 0 1 222.3,270.6",
                  // Arc 2 bottom→left:  start 25° past bottom, end 45° before left (clears label at y≈214-237)
                  "M 137.7,270.6  A 100 100 0 0 1 109.3,250.7",
                  // Arc 3 left→top:    start 25° past left,  end 25° before top
                  "M 89.4,137.7   A 100 100 0 0 1 137.7,89.4",
                ] as const).map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    markerEnd={fwStep === i ? "url(#fw-arr-active)" : "url(#fw-arr)"}
                    style={{
                      stroke: fwStep === i ? "rgba(0,188,212,0.9)" : "rgba(0,188,212,0.22)",
                      strokeWidth: fwStep === i ? 2.5 : 1.5,
                      transition: "stroke 0.4s ease, stroke-width 0.3s ease",
                    }}
                  />
                ))}
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
              ).map((node, i) => (
                <div
                  key={node.pos}
                  className={`is-fw-node is-fw-${node.pos}${fwStep === i ? " is-fw-active" : ""}`}
                >
                  <div className="is-fw-icon">{node.icon}</div>
                  <div className="is-fw-text">
                    <div className="is-fw-label">{node.label}</div>
                    <div className="is-fw-sub">{node.sub}</div>
                  </div>
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
          CAROUSEL — Challenge Worlds
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
