import { FUTURE } from "../landing.content";

/** 08 — Where it's going. */
export function FutureSection() {
  return (
    <section className="is-section is-section-light" id="is-future">
      <div className="is-container">
        <span className="section-num">08</span>
        <span className="is-label">Where it's going</span>
        <h2 className="is-h2">A free place to practise on real problems.</h2>
        <p className="is-lead">design_it is a working prototype today. This is where we're taking it.</p>
        <div className="is-card-grid">
          {FUTURE.map((f, i) => (
            <div key={f.kicker} className="is-card is-scroll-fade" style={{ transitionDelay: `${i * 100}ms` }}>
              <span className="is-card-kicker">{f.kicker}</span>
              <h3 className="is-card-title">{f.title}</h3>
              <p className="is-card-text">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
