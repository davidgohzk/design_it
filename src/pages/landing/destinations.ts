// Every place a homepage action can lead. Section ids are fragments under the "/" route, so a link
// to one becomes "#/#how-it-works" and never reaches the router's wildcard.

export const PRACTICE_PATH = "/demo";

export const CONTACT_EMAIL = "david.gohzhekai@gmail.com";

export const contactHref = (subject: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

export const CONTACT_HREF: string = contactHref("design_it NGO challenge");

export const SECTIONS = {
  main: "main",
  how: "how-it-works",
  ngo: "for-ngos",
  feedback: "example-feedback",
  ambition: "our-ambition",
  closing: "get-involved",
} as const;

export type SectionId = (typeof SECTIONS)[keyof typeof SECTIONS];

export const NAV_LINKS: { id: SectionId; label: string }[] = [
  { id: SECTIONS.how, label: "How it works" },
  { id: SECTIONS.ngo, label: "For NGOs" },
  { id: SECTIONS.feedback, label: "Example feedback" },
];
