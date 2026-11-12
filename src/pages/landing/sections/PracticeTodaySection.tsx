import { DIFFERENCES, PRACTICE_TODAY } from "../landing.content";

/** 03 — Where engineers practise today. */
export function PracticeTodaySection() {
  return (
    <section className="is-section is-section-white" id="is-practice">
      <div className="is-container">
        <span className="section-num">03</span>
        <span className="is-label">Where engineers practise today</span>
        <h2 className="is-h2">Practice today hands you a clean problem.</h2>
        <p className="is-lead">
          Engineers already have plenty of places to practise. None of them start where real work
          starts: with a client who doesn't know what to ask for.
        </p>

        <div className="is-card-grid">
          {PRACTICE_TODAY.map((p, i) => (
            <div key={p.kind} className="is-card is-scroll-fade" style={{ transitionDelay: `${i * 100}ms` }}>
              <span className="is-card-kicker">{p.kind}</span>
              <h3 className="is-card-title">{p.title}</h3>
              <p className="is-card-text">{p.text}</p>
            </div>
          ))}
        </div>

        <div className="is-diff is-scroll-fade">
          <h3 className="is-diff-title">What design_it does differently</h3>
          <ul className="is-diff-list">
            {DIFFERENCES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>

        <p className="is-closing">
          Nothing else lets engineers practise the whole task, from messy client to justified
          design, on their own.
        </p>
      </div>
    </section>
  );
}
