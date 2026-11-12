import { NAV_SECTIONS } from "../landing.content";

/** The left rail. `activeSection` comes from useLandingScroll, which watches the section ids. */
export function SideNav({ activeSection, onDemoClick }: { activeSection: string; onDemoClick: () => void }) {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
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
      <button className="is-sidenav-item is-sidenav-demo" onClick={onDemoClick} aria-label="Open demo">
        <span className="is-sidenav-dot" />
        <span className="is-sidenav-label">Demo</span>
      </button>
    </nav>
  );
}
