import { SECTIONS } from "../destinations";
import { CLOSING } from "../landing.content";
import { ContactAction, PracticeLink } from "../parts";

export function ClosingSection() {
  return (
    <section className="lp-section lp-closing" id={SECTIONS.closing} tabIndex={-1} aria-labelledby="closing-title">
      <div className="lp-container lp-intro--centred">
        <h2 id="closing-title">{CLOSING.title}</h2>
        <PracticeLink>{CLOSING.primary}</PracticeLink>
        <p className="lp-invite">{CLOSING.invitation}</p>
        <ContactAction>{CLOSING.secondary}</ContactAction>
      </div>
    </section>
  );
}
