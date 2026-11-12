import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONTACT_HREF, PRACTICE_PATH, type SectionId } from "./destinations";
import { CONTACT_UNAVAILABLE, DECISION } from "./landing.content";

type LinkProps = { children: ReactNode; className?: string; onClick?: () => void };

/** A link to a section of this page. LandingPage scrolls to and focuses the target. */
export function SectionLink({ to, ...props }: LinkProps & { to: SectionId }) {
  return <Link to={{ pathname: "/", hash: to }} {...props} />;
}

export function PracticeLink({ children, className = "lp-btn lp-btn--primary", onClick }: LinkProps) {
  return (
    <Link to={PRACTICE_PATH} className={className} onClick={onClick}>
      {children}
      <Icon name="arrow" />
    </Link>
  );
}

/** An NGO or collaboration action. Until a real destination exists it says so instead of linking. */
export function ContactAction({ children }: { children: ReactNode }) {
  const noteId = useId();
  if (CONTACT_HREF) {
    return (
      <a className="lp-btn lp-btn--secondary" href={CONTACT_HREF}>
        {children}
      </a>
    );
  }
  return (
    <div className="lp-contact">
      <span className="lp-btn lp-btn--unavailable" role="link" aria-disabled="true" aria-describedby={noteId}>
        {children}
      </span>
      <p className="lp-contact-note" id={noteId}>
        <span className="lp-status">Not yet available</span> {CONTACT_UNAVAILABLE}
      </p>
    </div>
  );
}

/** The inspectable explanation behind R1, shared by the opening walkthrough and the Develop preview. */
export function DecisionExplanation({ open, onToggle }: { open: boolean; onToggle: (open: boolean) => void }) {
  const panelId = useId();
  const headingId = useId();
  const client = DECISION.filter((row) => row.source === "client");
  const engineer = DECISION.filter((row) => row.source === "engineer");
  return (
    <div className="lp-decision">
      <button
        type="button"
        className="lp-why"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(!open)}
      >
        Why this decision?
        <Icon name={open ? "minus" : "plus"} />
      </button>
      <div className="lp-decision-panel" id={panelId} role="region" aria-labelledby={headingId} hidden={!open}>
        <p className="lp-eyebrow" id={headingId}>
          Illustrative decision explanation
        </p>
        <DecisionGroup title="From the client" rows={client} tone="client" />
        <DecisionGroup title="Engineering reasoning (not confirmed by the client)" rows={engineer} tone="engineer" />
      </div>
    </div>
  );
}

function DecisionGroup({ title, rows, tone }: { title: string; rows: typeof DECISION; tone: string }) {
  return (
    <div className={`lp-decision-group lp-decision-group--${tone}`}>
      <h4>{title}</h4>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const ICONS = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  pause: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5l11 7-11 7z" />,
  replay: <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" />,
  phone: <path d="M6 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z" />,
} as const;

export function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="lp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </g>
    </svg>
  );
}
