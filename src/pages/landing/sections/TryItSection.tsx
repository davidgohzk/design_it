import { Button } from "@mui/material";

/** 07 — Try it, beside a mock-up of the workspace. The mock-up's colours are SVG attribute fills. */
export function TryItSection({ onDemoClick }: { onDemoClick: () => void }) {
  return (
    <section className="landing-demo-cta-section" id="is-prototype">
      <div className="landing-demo-cta">
        <div className="demo-cta-copy" data-reveal>
          <span className="section-num">07</span>
          <span className="landing-section-kicker">Try it</span>
          <h2>Start asking.</h2>
          <p>
            Explore the Community Room booking case and find out why rooms are being double-booked.
          </p>
          <div className="demo-case">
            <span className="demo-case-meta">Demo · about 10 minutes</span>
            <strong>Community room booking</strong>
            <span className="demo-case-desc">
              A community centre keeps double-booking its rooms. Find out why.
            </span>
            <Button variant="contained" color="primary" onClick={onDemoClick}>
              Open the demo
            </Button>
          </div>
        </div>
        <div className="demo-mockup-wrap" aria-label="App interface preview">
          <svg className="demo-mockup-svg" viewBox="0 0 500 336" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* window background */}
            <rect width="500" height="336" rx="10" fill="#0a1520" />
            {/* title bar */}
            <rect width="500" height="28" rx="10" fill="#162533" />
            <rect y="18" width="500" height="10" fill="#162533" />
            <circle cx="16" cy="14" r="5" fill="#ff5f57" />
            <circle cx="32" cy="14" r="5" fill="#ffbd2e" />
            <circle cx="48" cy="14" r="5" fill="#28c840" />
            <text x="250" y="19" fontSize="8" fill="rgba(248,251,255,0.35)" fontFamily="sans-serif" textAnchor="middle">design_it — Community Room demo</text>
            {/* panel dividers */}
            <line x1="166" y1="28" x2="166" y2="336" stroke="rgba(248,251,255,0.07)" strokeWidth="1" />
            <line x1="332" y1="28" x2="332" y2="336" stroke="rgba(248,251,255,0.07)" strokeWidth="1" />

            {/* ── LEFT PANEL: Design doc ── */}
            <text x="12" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">DESIGN DOC</text>
            <rect x="10" y="54" width="130" height="5" rx="2" fill="rgba(248,251,255,0.25)" />
            <rect x="10" y="65" width="148" height="4" rx="2" fill="rgba(248,251,255,0.1)" />
            <rect x="10" y="74" width="140" height="4" rx="2" fill="rgba(248,251,255,0.1)" />
            <rect x="10" y="83" width="152" height="4" rx="2" fill="rgba(248,251,255,0.08)" />
            <rect x="10" y="92" width="136" height="4" rx="2" fill="rgba(248,251,255,0.08)" />
            <line x1="10" y1="104" x2="156" y2="104" stroke="rgba(248,251,255,0.07)" strokeWidth="1" />
            <rect x="10" y="112" width="98" height="4" rx="2" fill="rgba(248,251,255,0.18)" />
            <rect x="10" y="122" width="150" height="4" rx="2" fill="rgba(248,251,255,0.08)" />
            <rect x="10" y="131" width="142" height="4" rx="2" fill="rgba(248,251,255,0.08)" />
            <rect x="10" y="140" width="154" height="4" rx="2" fill="rgba(248,251,255,0.08)" />
            <rect x="10" y="149" width="126" height="4" rx="2" fill="rgba(248,251,255,0.08)" />
            <line x1="10" y1="161" x2="156" y2="161" stroke="rgba(248,251,255,0.07)" strokeWidth="1" />
            <rect x="10" y="169" width="112" height="4" rx="2" fill="rgba(248,251,255,0.18)" />
            <rect x="10" y="179" width="148" height="4" rx="2" fill="rgba(248,251,255,0.07)" />
            <rect x="10" y="188" width="138" height="4" rx="2" fill="rgba(248,251,255,0.07)" />
            <rect x="10" y="197" width="144" height="4" rx="2" fill="rgba(248,251,255,0.07)" />

            {/* ── MIDDLE PANEL: Chat ── */}
            <text x="178" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">INTERVIEW</text>
            {/* client bubble 1 */}
            <rect x="174" y="54" width="116" height="34" rx="6" fill="rgba(0,111,154,0.28)" />
            <text x="182" y="68" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">Rooms keep getting</text>
            <text x="182" y="80" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">double-booked.</text>
            {/* engineer bubble */}
            <rect x="196" y="94" width="114" height="24" rx="6" fill="rgba(82,199,184,0.22)" />
            <text x="204" y="110" fontSize="6.5" fill="rgba(248,251,255,0.85)" fontFamily="sans-serif">How do bookings work?</text>
            {/* client bubble 2 */}
            <rect x="174" y="124" width="120" height="34" rx="6" fill="rgba(0,111,154,0.28)" />
            <text x="182" y="138" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">Phone bookings go on</text>
            <text x="182" y="150" fontSize="6.5" fill="rgba(248,251,255,0.8)" fontFamily="sans-serif">sticky notes.</text>
            {/* engineer bubble 2 */}
            <rect x="196" y="164" width="114" height="24" rx="6" fill="rgba(82,199,184,0.22)" />
            <text x="204" y="180" fontSize="6.5" fill="rgba(248,251,255,0.85)" fontFamily="sans-serif">Who takes bookings?</text>
            {/* typing indicator */}
            <rect x="174" y="194" width="52" height="22" rx="8" fill="rgba(0,111,154,0.22)" />
            <circle className="mock-typing-dot" cx="188" cy="205" r="3.5" fill="rgba(248,251,255,0.55)" />
            <circle className="mock-typing-dot" cx="200" cy="205" r="3.5" fill="rgba(248,251,255,0.55)" />
            <circle className="mock-typing-dot" cx="212" cy="205" r="3.5" fill="rgba(248,251,255,0.55)" />
            {/* chat input */}
            <rect x="174" y="300" width="148" height="26" rx="6" fill="rgba(248,251,255,0.05)" stroke="rgba(248,251,255,0.1)" strokeWidth="1" />
            <text x="182" y="317" fontSize="7" fill="rgba(248,251,255,0.25)" fontFamily="sans-serif">Ask the client...</text>
            <rect className="mock-cursor" x="182" y="308" width="1" height="10" rx="1" fill="rgba(82,199,184,0.8)" />

            {/* ── RIGHT PANEL: Diagram ── */}
            <text x="344" y="46" fontSize="7.5" fill="rgba(82,199,184,0.85)" fontWeight="700" fontFamily="sans-serif">DIAGRAM</text>
            {/* dot grid */}
            {[348, 368, 388, 408, 428, 448, 468, 488].map((x) =>
              [62, 82, 102, 122, 142, 162, 182, 202, 222].map((y) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(248,251,255,0.06)" />
              )),
            )}
            {/* Booking form node (animated) */}
            <rect className="mock-node-pulse" x="336" y="72" width="78" height="30" rx="4" fill="#162533" stroke="rgba(82,199,184,0.6)" strokeWidth="1.5" />
            <text x="375" y="91" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Booking form</text>
            {/* Records node */}
            <rect x="414" y="124" width="74" height="30" rx="4" fill="#162533" stroke="rgba(0,111,154,0.55)" strokeWidth="1.5" />
            <text x="451" y="143" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Records</text>
            {/* Calendar node */}
            <rect x="336" y="124" width="68" height="30" rx="4" fill="#162533" stroke="rgba(242,201,76,0.5)" strokeWidth="1.5" />
            <text x="370" y="143" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Calendar</text>
            {/* Booking check node */}
            <rect x="414" y="176" width="74" height="30" rx="4" fill="#162533" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
            <text x="451" y="195" fontSize="7.5" fill="rgba(248,251,255,0.85)" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">Booking check</text>
            {/* edges */}
            <path d="M414 87 L488 87 L488 124" stroke="rgba(0,111,154,0.4)" strokeWidth="1.2" fill="none" />
            <path d="M375 102 L370 124" stroke="rgba(242,201,76,0.4)" strokeWidth="1.2" />
            <path d="M451 154 L451 176" stroke="rgba(0,111,154,0.35)" strokeWidth="1.2" />
            <path d="M404 139 L414 139" stroke="rgba(82,199,184,0.3)" strokeWidth="1.2" />
            {/* animated flow packet */}
            <circle className="mock-packet" cx="375" cy="102" r="3" fill="rgba(82,199,184,0.9)" />
          </svg>
        </div>
      </div>
    </section>
  );
}
