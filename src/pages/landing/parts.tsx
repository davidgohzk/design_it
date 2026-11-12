import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONTACT_HREF, PRACTICE_PATH, contactHref, type SectionId } from "./destinations";
import { DECISION, type DecisionRow, type Tone } from "./landing.content";

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

/** An NGO or collaboration email. The address stays in the href, never on the page. */
export function ContactAction({ children, subject, className = "lp-btn lp-btn--secondary" }: LinkProps & { subject?: string }) {
  return (
    <a className={className} href={subject ? contactHref(subject) : CONTACT_HREF}>
      {children}
    </a>
  );
}

/** A section's label: a sticker, then a quiet caption. */
export function Eyebrow({ icon, children }: { icon: StickerName; children: ReactNode }) {
  return (
    <p className="lp-eyebrow">
      <Sticker name={icon} />
      {children}
    </p>
  );
}

const ROW_LOOK: Record<DecisionRow["id"], StickerName> = { evidence: "chat", instead: "swap", tradeoff: "scale" };
const SOURCE: Record<DecisionRow["source"], { tag: string; tone: Tone }> = {
  client: { tag: "From Mei", tone: "blue" },
  engineer: { tag: "Your reasoning", tone: "purple" },
};

/** The decision behind R1, shared by the hero and the Develop preview. */
export function DecisionCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`lp-decision ${className}`} {...props}>
      <p className="lp-decision-head">{DECISION.headline}</p>
      <dl className="lp-decision-rows">
        {DECISION.rows.map((row) => {
          const { tag, tone } = SOURCE[row.source];
          return (
            <div key={row.id} className={`lp-decision-row lp-tone--${tone}`}>
              <dt>
                <Sticker name={ROW_LOOK[row.id]} />
                {row.label}
                <span className="lp-decision-src">{tag}</span>
              </dt>
              <dd>{row.text}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const ICONS = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
} as const;

/** Plain line glyphs for controls. Pictures use Sticker. */
export function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="lp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </g>
    </svg>
  );
}

/** The logo: the underscore in "design_it" is drawn as a trace line between two nodes. */
export function Wordmark() {
  return (
    <span className="lp-wordmark" role="img" aria-label="design_it">
      design
      <svg viewBox="-2 0 64 32" aria-hidden="true" focusable="false">
        <line x1="8" y1="23" x2="52" y2="23" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <circle cx="8" cy="23" r="8.5" fill="var(--lp-blue)" stroke="currentColor" strokeWidth="3.5" />
        <circle cx="52" cy="23" r="8.5" fill="var(--lp-green)" stroke="currentColor" strokeWidth="3.5" />
      </svg>
      it
    </span>
  );
}

// Sticker art on a 32 x 32 grid. Every shape gets the black outline from CSS; the class picks its fill.
const STICKERS = {
  chat: (
    <>
      <path className="b" d="M4 7a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H14l-7 6v-6a3 3 0 0 1-3-3z" />
      <path d="M10 11h12M10 15.5h7" />
    </>
  ),
  doc: (
    <>
      <path className="y" d="M7 3h12l7 7v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path className="w" d="M19 3v7h7z" />
      <path d="M10.5 16h11M10.5 20h11M10.5 24h6" />
    </>
  ),
  scale: (
    <>
      <path d="M16 6v19M5 9h22M5 9l-3.5 9M5 9l3.5 9M27 9l-3.5 9M27 9l3.5 9" />
      <path className="p" d="M1.5 18h7a3.5 3.5 0 0 1-7 0zM23.5 18h7a3.5 3.5 0 0 1-7 0z" />
      <path className="p" d="M10 25h12v4H10z" />
      <circle className="y" cx="16" cy="6" r="2.5" />
    </>
  ),
  nodes: (
    <>
      <path d="M13 8h6M8 12v9a3 3 0 0 0 3 3h7M24 12v7" />
      <rect className="g" x="2" y="3" width="11" height="9" rx="2" />
      <circle className="y" cx="24" cy="8" r="4.5" />
      <rect className="b" x="18" y="19" width="12" height="10" rx="2" />
    </>
  ),
  flag: (
    <>
      <path className="r" d="M7 5h18l-4.5 6 4.5 6H7z" />
      <path d="M7 3v26" />
    </>
  ),
  route: (
    <>
      <path className="o" d="M3 28v-6h7v-6h7v-6h7V4h5v24z" />
      <circle className="b" cx="6.5" cy="13" r="3" />
    </>
  ),
  heart: (
    <>
      <path className="r" d="M16 28S4 21.5 4 12a6.5 6.5 0 0 1 12-3.5A6.5 6.5 0 0 1 28 12c0 9.5-12 16-12 16z" />
      <path className="w" d="M9 11a3 3 0 0 1 3-3" />
    </>
  ),
  spark: (
    <>
      <path className="y" d="M14 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
      <path className="p" d="M26 2.5l1.3 3.2 3.2 1.3-3.2 1.3L26 11.5l-1.3-3.2L21.5 7l3.2-1.3z" />
    </>
  ),
  phone: (
    <path
      className="g"
      d="M8 4h5l3 7-4 2.5a14 14 0 0 0 6.5 6.5L21 16l7 3v5a3 3 0 0 1-3 3A22 22 0 0 1 5 7a3 3 0 0 1 3-3z"
    />
  ),
  swap: (
    <>
      <path className="b" d="M3 7h15V3l9 6.5-9 6.5v-4H3z" />
      <path className="o" d="M29 20.5H14v-4l-9 6.5 9 6.5v-4h15z" />
    </>
  ),
  chain: (
    <>
      <rect className="g" x="2" y="10" width="15" height="12" rx="6" />
      <rect className="b" x="15" y="10" width="15" height="12" rx="6" />
      <path className="w" d="M11 14.5h10v3H11z" />
    </>
  ),
  gauge: (
    <>
      <path className="p" d="M3 24a13 13 0 0 1 26 0z" />
      <path className="w" d="M8 24a8 8 0 0 1 16 0z" />
      <path d="M16 24l6-9" />
      <circle className="y" cx="16" cy="24" r="2.5" />
    </>
  ),
  pencil: (
    <>
      <path className="o" d="M5 23L20 8l5 5-15 15H5z" />
      <path className="r" d="M20 8l3-3a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3l-3 3z" />
      <path className="w" d="M5 23v5h5z" />
    </>
  ),
  bulb: (
    <>
      <path className="y" d="M16 3a9 9 0 0 0-5.5 16.1V22h11v-2.9A9 9 0 0 0 16 3z" />
      <path className="w" d="M10.5 22h11v3a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z" />
      <path d="M13 13l3 3 3-3M16 16v6" />
    </>
  ),
} as const;

export type StickerName = keyof typeof STICKERS;

/** A Notion-style sticker: bold fills inside a thick black outline. Decorative; text always carries the meaning. */
export function Sticker({ name }: { name: StickerName }) {
  return (
    <svg className="lp-sticker" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {STICKERS[name]}
    </svg>
  );
}
