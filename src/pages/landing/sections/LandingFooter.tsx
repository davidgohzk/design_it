export function LandingFooter({ onDemoClick }: { onDemoClick: () => void }) {
  return (
    <footer className="is-footer" id="is-footer">
      <span className="is-footer-wordmark">design_it</span>
      <p className="is-footer-tagline">The practice ground for the post-AI engineer.</p>
      <p className="is-footer-body">
        Practise turning a client's vague problem into a clear design that people and agents can
        build. Then see exactly what you missed.
      </p>
      <button className="is-footer-cta" onClick={onDemoClick}>
        Try a case
      </button>
      <p className="is-footer-copy">© 2026 design_it</p>
    </footer>
  );
}
