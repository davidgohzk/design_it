import { useNavigate } from "react-router-dom";
import { FeedbackSection } from "./sections/FeedbackSection";
import { FutureSection } from "./sections/FutureSection";
import { HeroSection } from "./sections/HeroSection";
import { HowItWorksSection } from "./sections/HowItWorksSection";
import { LandingFooter } from "./sections/LandingFooter";
import { PracticeTodaySection } from "./sections/PracticeTodaySection";
import { ShiftSection } from "./sections/ShiftSection";
import { SideNav } from "./sections/SideNav";
import { SkillSection } from "./sections/SkillSection";
import { TryItSection } from "./sections/TryItSection";
import { WhoWinsSection } from "./sections/WhoWinsSection";
import { useLandingScroll } from "./useLandingScroll";
import "./landing.css";

/**
 * The landing page: the nav, then one component per numbered section, in the order the sidebar
 * lists them. The copy lives in landing.content.ts and the scroll behaviour in useLandingScroll.
 *
 * Each section owns its own <section id>, and those ids are what NAV_SECTIONS points at, so adding
 * a section means adding it here and in that list.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  // `void`: navigate returns a promise in react-router 7, and a click handler must return nothing.
  const onDemoClick = () => void navigate("/demo");
  const activeSection = useLandingScroll();

  return (
    <div className="is-root">
      <nav className="is-nav">
        <span className="is-nav-brand">design_it</span>
      </nav>

      <SideNav activeSection={activeSection} onDemoClick={onDemoClick} />

      <HeroSection onDemoClick={onDemoClick} />
      <ShiftSection />
      <SkillSection />
      <PracticeTodaySection />
      <HowItWorksSection />
      <FeedbackSection />
      <WhoWinsSection />
      <TryItSection onDemoClick={onDemoClick} />
      <FutureSection />
      <LandingFooter onDemoClick={onDemoClick} />
    </div>
  );
}
