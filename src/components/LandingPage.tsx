import { Button, Typography } from "@mui/material";
import { useEffect } from "react";
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
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section className="landing-shell">
        <div className="hero-orbs" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
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
          <div className="landing-proof-panel landing-proof-panel--animated" aria-label="design_it workflow preview">
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

      <section className="landing-demo-cta-section">
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

      <section ref={introRef} className="landing-story-section">
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

      <section className="landing-method-section">
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
            <svg className="method-scene-svg" viewBox="0 0 840 160" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            </div>
            <div className="flow-connector" aria-hidden="true" />
            <div className="flow-step">
              <div className="flow-step-circle">4</div>
              <LandingIcon name="architecture" />
              <span>Architecture</span>
              <h3>Design the system</h3>
              <p>Map components, simulate flows, and communicate implementation tradeoffs.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-wins-section">
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

      <section className="landing-gtm-section">
        <div className="landing-section-inner">
          <div className="landing-section-heading" data-reveal>
            <span className="section-num">04</span>
            <span className="landing-section-kicker">Go to market</span>
            <h2>Build supply, prove demand, then monetize the network.</h2>
          </div>
          <div className="landing-gtm-timeline" aria-label="Go to market roadmap">
            <div className="gtm-road-wrap" aria-hidden="true">
              <svg className="gtm-road-svg" viewBox="0 0 1000 40" preserveAspectRatio="none" fill="none">
                <line x1="0" y1="20" x2="1000" y2="20" stroke="#006f9a" strokeWidth="2" strokeDasharray="8,6" strokeOpacity="0.3"/>
                <polygon points="125,13 133,20 125,27 117,20" fill="#006f9a" fillOpacity="0.75"/>
                <polygon points="375,13 383,20 375,27 367,20" fill="#006f9a" fillOpacity="0.75"/>
                <polygon points="625,13 633,20 625,27 617,20" fill="#006f9a" fillOpacity="0.75"/>
                <polygon points="875,13 883,20 875,27 867,20" fill="#006f9a" fillOpacity="0.75"/>
              </svg>
            </div>
            <div className="gtm-milestones" data-reveal>
              <div className="gtm-milestone gtm-milestone--ngo">
                <div className="gtm-stage-num">1</div>
                <svg className="gtm-milestone-svg" viewBox="0 0 80 80" aria-hidden="true" fill="none">
                  <circle cx="24" cy="22" r="11" fill="#99f6e4"/>
                  <rect x="14" y="32" width="20" height="16" rx="5" fill="#5eead4"/>
                  <circle cx="56" cy="22" r="11" fill="#bfdbfe"/>
                  <rect x="46" y="32" width="20" height="16" rx="5" fill="#93c5fd"/>
                  <rect x="28" y="40" width="24" height="10" rx="5" fill="#52c7b8" stroke="#0d9488" strokeWidth="1"/>
                  <rect x="20" y="56" width="40" height="24" rx="2" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1"/>
                  <rect x="24" y="60" width="8" height="6" rx="1" fill="#7dd3fc" fillOpacity="0.5"/>
                  <rect x="36" y="60" width="8" height="6" rx="1" fill="#7dd3fc" fillOpacity="0.5"/>
                  <rect x="48" y="60" width="8" height="6" rx="1" fill="#7dd3fc" fillOpacity="0.5"/>
                  <rect x="32" y="68" width="16" height="12" rx="2" fill="#93c5fd" fillOpacity="0.5"/>
                </svg>
                <h3>Source real problem statements</h3>
                <p>Work with NGOs and mission-driven organizations to create the baseline case library.</p>
              </div>
              <div className="gtm-milestone gtm-milestone--uni">
                <div className="gtm-stage-num">2</div>
                <svg className="gtm-milestone-svg" viewBox="0 0 80 80" aria-hidden="true" fill="none">
                  <polygon points="40,10 68,24 40,38 12,24" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
                  <rect x="62" y="24" width="3" height="18" rx="1.5" fill="#f59e0b"/>
                  <circle cx="63.5" cy="44" r="4" fill="#f59e0b"/>
                  <circle cx="40" cy="52" r="12" fill="#fde68a"/>
                  <rect x="8" y="58" width="26" height="20" rx="3" fill="white" stroke="#86efac" strokeWidth="1.2"/>
                  <line x1="21" y1="58" x2="21" y2="78" stroke="#86efac" strokeWidth="1"/>
                  <line x1="12" y1="65" x2="19" y2="65" stroke="#94a3b8" strokeWidth="1"/>
                  <line x1="12" y1="70" x2="19" y2="70" stroke="#94a3b8" strokeWidth="1"/>
                  <line x1="23" y1="65" x2="31" y2="65" stroke="#94a3b8" strokeWidth="1"/>
                  <line x1="23" y1="70" x2="31" y2="70" stroke="#94a3b8" strokeWidth="1"/>
                  <rect x="46" y="58" width="28" height="20" rx="2" fill="#dbeafe" stroke="#7dd3fc" strokeWidth="1"/>
                  <rect x="50" y="62" width="6" height="6" rx="1" fill="#7dd3fc" fillOpacity="0.5"/>
                  <rect x="58" y="62" width="6" height="6" rx="1" fill="#7dd3fc" fillOpacity="0.5"/>
                  <rect x="55" y="68" width="10" height="10" rx="1" fill="#93c5fd" fillOpacity="0.5"/>
                </svg>
                <h3>Seed practice with universities</h3>
                <p>Share cases with students who need realistic system design practice for interviews.</p>
              </div>
              <div className="gtm-milestone gtm-milestone--challenge">
                <div className="gtm-stage-num">3</div>
                <svg className="gtm-milestone-svg" viewBox="0 0 80 80" aria-hidden="true" fill="none">
                  <circle cx="36" cy="20" r="13" fill="#99f6e4"/>
                  <rect x="24" y="31" width="24" height="18" rx="6" fill="#5eead4"/>
                  <rect x="46" y="16" width="28" height="36" rx="4" fill="white" stroke="#52c7b8" strokeWidth="1.5"/>
                  <rect x="52" y="12" width="16" height="8" rx="3" fill="#52c7b8"/>
                  <line x1="52" y1="30" x2="68" y2="30" stroke="#cbd5e1" strokeWidth="1.2"/>
                  <line x1="52" y1="38" x2="68" y2="38" stroke="#cbd5e1" strokeWidth="1.2"/>
                  <line x1="52" y1="46" x2="62" y2="46" stroke="#cbd5e1" strokeWidth="1.2"/>
                  <path d="M52 24 l3 3 l6-6" stroke="#0d9488" strokeWidth="1.5" fill="none"/>
                  <path d="M20 58 Q8 66 6 58 Q8 50 20 58" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.2"/>
                  <path d="M4 58 L0 54 M4 58 L0 62" stroke="#86efac" strokeWidth="1.2" fill="none"/>
                  <path d="M44 66 Q56 74 58 66 Q56 58 44 66" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.2"/>
                  <path d="M60 66 L64 70 M60 66 L64 62" stroke="#86efac" strokeWidth="1.2" fill="none"/>
                </svg>
                <h3>Offer NGO challenge services</h3>
                <p>Help organizations post problems, review solutions, and give structured feedback.</p>
              </div>
              <div className="gtm-milestone gtm-milestone--premium">
                <div className="gtm-stage-num">4</div>
                <svg className="gtm-milestone-svg" viewBox="0 0 80 80" aria-hidden="true" fill="none">
                  <path d="M40 8 L45.5 24.5 L63 24.5 L49.5 34.5 L55 51 L40 41 L25 51 L30.5 34.5 L17 24.5 L34.5 24.5 Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
                  <text x="37" y="36" fontSize="12" fill="#d97706" fontWeight="800" fontFamily="sans-serif">$</text>
                  <circle cx="22" cy="64" r="10" fill="#bfdbfe"/>
                  <rect x="13" y="74" width="18" height="6" rx="3" fill="#93c5fd"/>
                  <circle cx="58" cy="64" r="10" fill="#99f6e4"/>
                  <rect x="49" y="74" width="18" height="6" rx="3" fill="#5eead4"/>
                  <path d="M32 68 Q40 72 48 68" stroke="#52c7b8" strokeWidth="2" fill="none"/>
                </svg>
                <h3>Roll out premium and hiring tools</h3>
                <p>Once the user base grows, offer paid features for users, employers, and recruitment teams.</p>
              </div>
            </div>
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

    </>
  );
}
