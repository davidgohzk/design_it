export function HeroSection({ onDemoClick }: { onDemoClick: () => void }) {
  return (
    <section className="is-hero" id="is-hero">
      <div className="is-hero-centered">
        <h1 className="is-h1-brand">design_it</h1>
        <p className="is-hero-tagline">The practice ground for the post-AI engineer.</p>
        <p className="is-hero-question">
          Practise turning a client's vague problem into a clear design that people and agents can
          build. Then see exactly what you missed.
        </p>
        <div className="is-hero-btns">
          <button className="is-btn-cta" onClick={onDemoClick}>
            Try a case
          </button>
        </div>
      </div>
    </section>
  );
}
