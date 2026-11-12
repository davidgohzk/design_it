import { describe, expect, it } from "vitest";
import { CONTACT_HREF, contactHref } from "./destinations";

describe("contact links", () => {
  it("opens an email about an NGO challenge by default", () => {
    expect(CONTACT_HREF).toBe("mailto:david.gohzhekai@gmail.com?subject=design_it%20NGO%20challenge");
  });

  it("encodes a custom subject", () => {
    expect(contactHref("design_it collaboration")).toBe(
      "mailto:david.gohzhekai@gmail.com?subject=design_it%20collaboration",
    );
  });
});
