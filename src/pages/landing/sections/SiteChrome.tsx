import { useRef, useState, type KeyboardEvent } from "react";
import { NAV_LINKS, SECTIONS } from "../destinations";
import { Icon, PracticeLink, SectionLink } from "../parts";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !open) return;
    close();
    toggleRef.current?.focus();
  };

  return (
    <header className="lp-header" onKeyDown={onKeyDown}>
      <SectionLink to={SECTIONS.main} className="lp-skip">
        Skip to content
      </SectionLink>
      <div className="lp-container lp-header-bar">
        <span className="lp-wordmark">design_it</span>
        <button
          ref={toggleRef}
          type="button"
          className="lp-menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "close" : "menu"} />
          <span className="lp-sr-only">Menu</span>
        </button>
        <nav id="site-nav" className="lp-nav" data-open={open} aria-label="Main">
          <ul>
            {NAV_LINKS.map(({ id, label }) => (
              <li key={id}>
                <SectionLink to={id} className="lp-nav-link" onClick={close}>
                  {label}
                </SectionLink>
              </li>
            ))}
            <li>
              <PracticeLink className="lp-btn lp-btn--primary lp-btn--small" onClick={close}>
                Try a case
              </PracticeLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-bar">
        <span className="lp-wordmark">design_it</span>
        <nav aria-label="Footer">
          <ul>
            {NAV_LINKS.map(({ id, label }) => (
              <li key={id}>
                <SectionLink to={id} className="lp-nav-link">
                  {label}
                </SectionLink>
              </li>
            ))}
            <li>
              <PracticeLink className="lp-nav-link">Try a case</PracticeLink>
            </li>
          </ul>
        </nav>
        <p className="lp-caption">A working prototype. © 2026 design_it</p>
      </div>
    </footer>
  );
}
