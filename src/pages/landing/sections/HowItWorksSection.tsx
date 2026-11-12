import { LandingIcon } from "../LandingIcon";

/**
 * 04 — How it works, with the three-panel illustration.
 *
 * The SVG's colours are attribute fills, not CSS, so they cannot use the --is-* tokens. They are
 * left as literals here rather than threaded through props, since the drawing is one fixed picture.
 */
export function HowItWorksSection() {
  return (
    <section className="landing-method-section" id="is-how">
      <div className="landing-section-inner">
        <div className="landing-section-heading" data-reveal>
          <span className="section-num">04</span>
          <span className="landing-section-kicker">How it works</span>
          <h2>Three steps, each linked to the one before.</h2>
          <p>
            You work through one case from the first question to the final diagram. Each step points
            back to the last, so anyone can follow your reasoning from start to finish.
          </p>
        </div>
        <div className="method-scene-wrap">
          <div className="method-scene-chrome" aria-hidden="true">
            <div className="chrome-dots">
              <span className="chrome-dot chrome-dot-r" />
              <span className="chrome-dot chrome-dot-y" />
              <span className="chrome-dot chrome-dot-g" />
            </div>
            <span className="chrome-label">Community Room — booking</span>
          </div>
          <svg
            className="method-scene-svg"
            viewBox="0 0 1060 172"
            aria-hidden="true"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ── A: interview ── */}
            <rect x="10" y="14" width="310" height="148" rx="6" fill="white" stroke="#7dd3fc" strokeWidth="1.5" />
            <text x="24" y="32" fontSize="8" fill="#0284c7" fontWeight="700" fontFamily="sans-serif">A · INTERVIEW</text>
            <rect x="24" y="44" width="196" height="26" rx="8" fill="#f0f9ff" stroke="#006f9a" strokeWidth="1.2" />
            <text x="34" y="61" fontSize="7" fill="#006f9a" fontFamily="sans-serif">Room bookings keep clashing.</text>
            <rect x="116" y="78" width="190" height="26" rx="8" fill="#f0fdfa" stroke="#52c7b8" strokeWidth="1.2" />
            <text x="126" y="95" fontSize="7" fill="#0d9488" fontFamily="sans-serif">Why do double bookings happen?</text>
            <rect x="24" y="112" width="196" height="38" rx="8" fill="#f0f9ff" stroke="#006f9a" strokeWidth="1.2" />
            <text x="34" y="127" fontSize="7" fill="#006f9a" fontFamily="sans-serif">Phone bookings go on sticky notes.</text>
            <text x="34" y="140" fontSize="7" fill="#006f9a" fontFamily="sans-serif">Sometimes they miss the booking book.</text>

            <path d="M326 88 L360 88" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3" />
            <path d="M354 83 L361 88 L354 93" fill="none" stroke="#52c7b8" strokeWidth="2" />

            {/* ── B: design doc ── */}
            <rect x="370" y="14" width="320" height="148" rx="6" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
            <text x="384" y="32" fontSize="8" fill="#15803d" fontWeight="700" fontFamily="sans-serif">B · DESIGN DOC</text>
            {(
              [
                { y: 44, id: "R1", text: "One shared booking record", cite: "← chat", tag: "#dcfce7", ink: "#15803d", chip: "#86efac" },
                { y: 68, id: "R2", text: "Phone bookings can be recorded", cite: "← chat", tag: "#dcfce7", ink: "#15803d", chip: "#86efac" },
                { y: 116, id: "D1", text: "Use one booking calendar", cite: "← R1", tag: "#e0f2fe", ink: "#0369a1", chip: "#7dd3fc" },
                { y: 140, id: "D2", text: "Staff enter every booking", cite: "← R2", tag: "#e0f2fe", ink: "#0369a1", chip: "#7dd3fc" },
              ] as const
            ).map((row) => (
              <g key={row.id}>
                <rect x="384" y={row.y} width="22" height="14" rx="3" fill={row.tag} />
                <text x="388" y={row.y + 10} fontSize="7" fill={row.ink} fontWeight="700" fontFamily="sans-serif">{row.id}</text>
                <text x="414" y={row.y + 10} fontSize="7" fill="#374151" fontFamily="sans-serif">{row.text}</text>
                <rect x="612" y={row.y} width="64" height="14" rx="7" fill="white" stroke={row.chip} strokeWidth="1" />
                <text x="644" y={row.y + 10} fontSize="6.5" fill={row.ink} fontFamily="sans-serif" textAnchor="middle">{row.cite}</text>
              </g>
            ))}

            <path d="M696 88 L722 88" stroke="#52c7b8" strokeWidth="2" strokeDasharray="5,3" />
            <path d="M716 83 L723 88 L716 93" fill="none" stroke="#52c7b8" strokeWidth="2" />

            {/* ── C: diagram ── */}
            <rect x="730" y="14" width="320" height="148" rx="6" fill="#f0f9ff" stroke="#7dd3fc" strokeWidth="1.5" />
            <text x="744" y="32" fontSize="8" fill="#0284c7" fontWeight="700" fontFamily="sans-serif">C · DIAGRAM</text>
            {(
              [
                { x: 748, y: 48, name: "Desk computer", from: "from D1" },
                { x: 916, y: 48, name: "Booking calendar", from: "from D1" },
                { x: 748, y: 112, name: "Booking check", from: "from D2" },
                { x: 916, y: 112, name: "Room schedule", from: "from D2" },
              ] as const
            ).map((box) => (
              <g key={box.name}>
                <rect x={box.x} y={box.y} width="118" height="36" rx="4" fill="white" stroke="#006f9a" strokeWidth="1.5" />
                <text x={box.x + 10} y={box.y + 15} fontSize="7.5" fill="#152330" fontWeight="700" fontFamily="sans-serif">{box.name}</text>
                <text x={box.x + 10} y={box.y + 28} fontSize="6.5" fill="#0369a1" fontFamily="sans-serif">{box.from}</text>
              </g>
            ))}
            <line x1="866" y1="66" x2="914" y2="66" stroke="#52c7b8" strokeWidth="1.2" />
            <path d="M908 62 L914 66 L908 70" fill="none" stroke="#52c7b8" strokeWidth="1.2" />
            <line x1="807" y1="84" x2="807" y2="110" stroke="#52c7b8" strokeWidth="1.2" />
            <path d="M803 104 L807 110 L811 104" fill="none" stroke="#52c7b8" strokeWidth="1.2" />
            <line x1="866" y1="130" x2="914" y2="130" stroke="#52c7b8" strokeWidth="1.2" />
            <path d="M908 126 L914 130 L908 134" fill="none" stroke="#52c7b8" strokeWidth="1.2" />
          </svg>
        </div>

        <div className="landing-method-flow" data-reveal>
          <div className="flow-step">
            <div className="flow-step-circle">A</div>
            <LandingIcon name="chat" />
            <span>Interview</span>
            <h3>Interview the AI client</h3>
            <p>
              The AI plays a client who knows their situation but not much about technology. They
              can't list their requirements. You draw them out with the right questions.
            </p>
          </div>
          <div className="flow-connector" aria-hidden="true" />
          <div className="flow-step">
            <div className="flow-step-circle">B</div>
            <LandingIcon name="brief" />
            <span>Design doc</span>
            <h3>Write a design doc</h3>
            <p>
              Every requirement cites the conversation. Every decision cites the requirements it
              serves.
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
  );
}
