import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "./LandingPage";
import { FEEDBACK, HERO, NGO } from "./landing.content";
import { FACTS, REQUIREMENTS } from "./traceMap";

describe("homepage example and audience", () => {
  it("shows learners consistent illustrative feedback before the exploratory NGO invitation", () => {
    const html = renderToStaticMarkup(<MemoryRouter><LandingPage /></MemoryRouter>);
    const feedbackStart = html.indexOf('id="example-feedback"');
    const ngoStart = html.indexOf('id="for-ngos"');

    expect(feedbackStart).toBeGreaterThan(-1);
    expect(ngoStart).toBeGreaterThan(feedbackStart);
    expect(HERO.caption).toContain("Illustrative");
    expect(html).toContain(HERO.caption);
    expect(REQUIREMENTS.some((requirement) => requirement.label.includes("phone bookings"))).toBe(true);
    expect(FACTS.filter((fact) => fact.requirement === null).map((fact) => fact.id)).toEqual(["walk-in"]);
    expect(FEEDBACK.finding).toContain("walk-in bookings");
    expect(FEEDBACK.prompt).toContain("alongside phone and online bookings");
    expect(html).toContain(FEEDBACK.finding);
    expect(html).not.toContain("requirements only support online bookings");
    expect(NGO.body).toContain("exploring");
    expect(html).toContain(NGO.body);
  });
});
