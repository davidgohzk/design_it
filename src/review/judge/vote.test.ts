import { describe, expect, it } from "vitest";
import { majority, unanimous } from "./vote";

describe("unanimous", () => {
  it("returns the value when every run agrees", () => {
    expect(unanimous(["sound", "sound", "sound"])).toBe("sound");
  });

  it("returns null on any disagreement", () => {
    expect(unanimous(["sound", "sound", "weak"])).toBeNull();
  });

  it("returns null with no runs", () => {
    expect(unanimous([])).toBeNull();
  });

  it("accepts a single run", () => {
    expect(unanimous(["weak"])).toBe("weak");
  });
});

describe("majority", () => {
  it("returns the value more than half the runs gave", () => {
    expect(majority(["observed", "observed", "not_observed"])).toBe("observed");
  });

  it("returns the value when every run agrees", () => {
    expect(majority(["observed", "observed", "observed"])).toBe("observed");
  });

  it("returns null on a three-way split", () => {
    expect(majority(["observed", "not_observed", "uncertain"])).toBeNull();
  });

  it("returns null on an even tie", () => {
    expect(majority(["observed", "not_observed"])).toBeNull();
  });

  it("returns null with no runs", () => {
    expect(majority([])).toBeNull();
  });
});
