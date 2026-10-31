/**
 * 06 — Who wins: one card per stakeholder.
 *
 * Each card's figure is a separate hand-drawn SVG, so the three are not one component with props.
 * Their colours are attribute fills and cannot use the --is-* tokens.
 */
export function WhoWinsSection() {
  return (
    <section className="landing-wins-section" id="is-who-wins">
      <div className="landing-section-inner">
        <div className="landing-section-heading" data-reveal>
          <span className="section-num">06</span>
          <span className="landing-section-kicker">Who wins</span>
          <h2>One problem, three wins.</h2>
        </div>
        <div
          className="landing-wins-figures"
          data-reveal
          aria-label="How design_it helps engineers, problem owners and NGOs"
        >
          <div className="stakeholder-card stakeholder-card--dev">
            <svg className="stakeholder-figure-svg" viewBox="0 0 160 180" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="148" width="144" height="8" rx="3" fill="#bfdbfe" />
              <rect x="30" y="128" width="100" height="4" rx="2" fill="#93c5fd" />
              <rect x="32" y="90" width="96" height="40" rx="4" fill="#dbeafe" stroke="#7dd3fc" strokeWidth="1.5" />
              <text x="58" y="108" fontSize="6.5" fill="#1d4ed8" fontFamily="monospace">ask(client)</text>
              <text x="58" y="122" fontSize="6.5" fill="#1d4ed8" fontFamily="monospace">design(why)</text>
              <rect x="32" y="128" width="96" height="4" rx="1" fill="#93c5fd" />
              <circle cx="80" cy="60" r="22" fill="#bfdbfe" />
              <path d="M58 56 Q80 36 102 56" fill="#93c5fd" />
              <rect x="60" y="80" width="40" height="14" rx="6" fill="#93c5fd" />
              <path d="M60 88 L44 128" stroke="#bfdbfe" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M100 88 L116 128" stroke="#bfdbfe" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M108 30 l2 5 l5 2 l-5 2 l-2 5 l-2-5 l-5-2 l5-2 Z" fill="#f2c94c" fillOpacity="0.9" />
              <path d="M122 18 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5-3.5 l-3.5-1.5 l3.5-1.5 Z" fill="#f2c94c" fillOpacity="0.6" />
            </svg>
            <div className="stakeholder-info">
              <span className="stakeholder-role stakeholder-role--dev">Engineers</span>
              <h3>Practise the skill that matters now</h3>
              <p>
                Work on real problems, any time. Get feedback that shows what you missed and why it
                mattered.
              </p>
              <div className="benefit-bubbles benefit-bubbles--dev">
                <span className="benefit-bubble">Real problems</span>
                <span className="benefit-bubble">Feedback you can act on</span>
              </div>
            </div>
          </div>

          <div className="stakeholder-card stakeholder-card--company">
            <svg className="stakeholder-figure-svg" viewBox="0 0 160 180" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="154" width="144" height="6" rx="2" fill="#a7f3d0" />
              <rect x="90" y="38" width="62" height="122" rx="3" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1.2" />
              <rect x="97" y="50" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4" />
              <rect x="120" y="50" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4" />
              <rect x="97" y="70" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4" />
              <rect x="120" y="70" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4" />
              <rect x="97" y="90" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4" />
              <rect x="120" y="90" width="16" height="12" rx="2" fill="#7dd3fc" fillOpacity="0.4" />
              <rect x="100" y="32" width="56" height="8" rx="2" fill="#7dd3fc" />
              <rect x="105" y="130" width="20" height="30" rx="3" fill="#0284c7" fillOpacity="0.3" />
              <circle cx="50" cy="68" r="20" fill="#99f6e4" />
              <path d="M30 64 Q50 46 70 64" fill="#5eead4" />
              <rect x="32" y="86" width="36" height="28" rx="7" fill="#0d9488" />
              <path d="M50 86 L47 100 L50 108 L53 100 Z" fill="#f0fdf4" />
              <rect x="72" y="80" width="22" height="28" rx="3" fill="white" stroke="#5eead4" strokeWidth="1.5" />
              <rect x="78" y="76" width="10" height="6" rx="2" fill="#5eead4" />
              <line x1="78" y1="94" x2="90" y2="94" stroke="#94a3b8" strokeWidth="1" />
              <line x1="78" y1="102" x2="90" y2="102" stroke="#94a3b8" strokeWidth="1" />
              <path d="M78 87 l2 2 l4-4" stroke="#0d9488" strokeWidth="1.5" fill="none" />
              <path d="M32 96 L14 116" stroke="#99f6e4" strokeWidth="7" strokeLinecap="round" fill="none" />
              <path d="M68 90 L72 80" stroke="#99f6e4" strokeWidth="7" strokeLinecap="round" fill="none" />
            </svg>
            <div className="stakeholder-info">
              <span className="stakeholder-role stakeholder-role--company">Companies and problem owners</span>
              <h3>Get quick technical validation</h3>
              <p>
                Post a real problem and get several independent designs, each with its reasoning
                traced back to what you said. See how engineers think, not just what they produce.
              </p>
              <div className="benefit-bubbles benefit-bubbles--company">
                <span className="benefit-bubble">Independent designs</span>
                <span className="benefit-bubble">Reasoning you can trace</span>
              </div>
            </div>
          </div>

          <div className="stakeholder-card stakeholder-card--ngo stakeholder-card--featured">
            <svg className="stakeholder-figure-svg" viewBox="0 0 160 180" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="154" width="144" height="6" rx="2" fill="#fde68a" fillOpacity="0.6" />
              <circle cx="52" cy="90" r="19" fill="#fde68a" />
              <path d="M33 86 Q52 68 71 86" fill="#fcd34d" />
              <rect x="34" y="107" width="36" height="24" rx="7" fill="#fcd34d" />
              <path d="M34 118 L16 138" stroke="#fde68a" strokeWidth="7" strokeLinecap="round" fill="none" />
              <path d="M70 118 L72 108" stroke="#fde68a" strokeWidth="7" strokeLinecap="round" fill="none" />
              <circle cx="108" cy="90" r="19" fill="#fed7aa" />
              <path d="M89 86 Q108 68 127 86" fill="#fdba74" />
              <rect x="90" y="107" width="36" height="24" rx="7" fill="#fdba74" />
              <path d="M126 118 L144 138" stroke="#fed7aa" strokeWidth="7" strokeLinecap="round" fill="none" />
              <path d="M90 118 L88 108" stroke="#fed7aa" strokeWidth="7" strokeLinecap="round" fill="none" />
              <rect x="68" y="118" width="24" height="12" rx="6" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="80" cy="46" r="14" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5" />
              <path d="M74 46 Q80 38 86 46 Q86 54 80 60 Q74 54 74 46" fill="#fbbf24" />
              <rect x="75" y="60" width="10" height="4" rx="2" fill="#f59e0b" />
              <line x1="80" y1="26" x2="80" y2="20" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="94" y1="30" x2="98" y2="26" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="98" y1="44" x2="104" y2="42" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="66" y1="30" x2="62" y2="26" stroke="#f59e0b" strokeWidth="1.5" />
              <line x1="62" y1="44" x2="56" y2="42" stroke="#f59e0b" strokeWidth="1.5" />
            </svg>
            <div className="stakeholder-info">
              <span className="stakeholder-featured-tag">Making an impact on the real world</span>
              <span className="stakeholder-role stakeholder-role--ngo">NGOs</span>
              <h3>Technical options they couldn't otherwise afford</h3>
              <p>
                Real problems from NGOs become practice cases. Many engineers' designs are combined
                into a map of possible approaches, so the NGO gets crowdsourced options for its
                problem.
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
  );
}
