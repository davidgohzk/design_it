import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SECTIONS } from "./destinations";
import { prefersReducedMotion } from "./hooks";
import { AmbitionSection } from "./sections/AmbitionSection";
import { ClosingSection } from "./sections/ClosingSection";
import { FeedbackSection } from "./sections/FeedbackSection";
import { HeroSection } from "./sections/HeroSection";
import { NgoSection } from "./sections/NgoSection";
import { ProcessSection } from "./sections/ProcessSection";
import { SiteFooter, SiteHeader } from "./sections/SiteChrome";
import "./landing.css";

export default function LandingPage() {
  const { hash, key } = useLocation();

  // Section links land on "/#<id>" inside the HashRouter, so the browser never scrolls on its own.
  // `key` re-runs this when the same link is followed twice.
  useEffect(() => {
    const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  }, [hash, key]);

  return (
    <div className="lp">
      <SiteHeader />
      <main id={SECTIONS.main} tabIndex={-1}>
        <HeroSection />
        <ProcessSection />
        <NgoSection />
        <FeedbackSection />
        <AmbitionSection />
        <ClosingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
