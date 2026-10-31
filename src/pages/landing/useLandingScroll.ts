import { useEffect, useState } from "react";
import { NAV_SECTIONS } from "./landing.content";

/**
 * The page-wide scroll behaviour: which section the sidebar highlights, and the one-shot reveal of
 * anything marked `.is-scroll-fade` or `[data-reveal]`.
 *
 * The two reveal observers query the document rather than taking refs, so they work no matter which
 * section component owns the element. A parent's effect runs after its children have mounted, so
 * everything is in the DOM by the time they run.
 */
export function useLandingScroll() {
  const [activeSection, setActiveSection] = useState("is-hero");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "0px 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".is-scroll-fade");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in-view");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return activeSection;
}
