import { describe, expect, it } from "vitest";
import { GOLDEN_TRANSCRIPT } from "../cases/community-room/fixtures";
import { stopBucket, tagMessage, tagMessages, withoutGreeting } from "./questionTags";

const has = (text: string, tag: string, previous?: string) => tagMessage(text, previous).includes(tag as never);

describe("How you worked: one positive and one negative example per tag", () => {
  it("open", () => {
    expect(has("Hi Mei! What happens today when someone wants to book a room?", "open")).toBe(true);
    expect(has("Do you use a paper book?", "open")).toBe(false);
  });

  it("closed", () => {
    expect(has("Do you use a paper book?", "closed")).toBe(true);
    expect(has("Tell me about your bookings.", "closed")).toBe(false);
  });

  it("multi_question", () => {
    expect(has("How many rooms? And how many bookings?", "multi_question")).toBe(true);
    expect(has("How many rooms do you have?", "multi_question")).toBe(false);
  });

  it("leading", () => {
    expect(has("You need an online system, don't you?", "leading")).toBe(true);
    expect(has("What would help most?", "leading")).toBe(false);
  });

  it("solution_asking", () => {
    expect(has("Should we use a mobile app for this?", "solution_asking")).toBe(true);
    expect(has("How do people book today?", "solution_asking")).toBe(false);
  });

  it("jargon", () => {
    expect(has("Where is your booking database hosted?", "jargon")).toBe(true);
    expect(has("Where do you write the bookings down?", "jargon")).toBe(false);
  });

  it("follow_up", () => {
    const reply = "It's usually the phone bookings. Whoever answers writes it on a sticky note.";
    expect(has("Who answers the phone bookings, and where does the sticky note go?", "follow_up", reply)).toBe(true);
    expect(has("How many rooms do you have?", "follow_up", reply)).toBe(false);
  });

  it("summarise_back", () => {
    expect(has("So to confirm, two staff share one computer?", "summarise_back")).toBe(true);
    expect(has("Who shares the computer?", "summarise_back")).toBe(false);
  });
});

describe("tagging a transcript", () => {
  it("tags each engineer message against the client reply before it, and counts tags", () => {
    const { tags, counts } = tagMessages(GOLDEN_TRANSCRIPT);
    expect(tags.map((entry) => entry.messageIndex)).toEqual([1, 3, 5, 7, 9]);
    expect(tags.every((entry) => entry.tags.includes("open"))).toBe(true);
    expect(counts.open).toBe(5);
    expect(counts.jargon).toBe(0);
  });

  it("skips a greeting and a name before the question", () => {
    expect(withoutGreeting("Hi Mei! What happens today?")).toBe("what happens today?");
    expect(withoutGreeting("Thanks, that helps. Who works at the desk?")).toBe("that helps. who works at the desk?");
  });
});

describe("why the interview stopped", () => {
  it("buckets the one-line reason by keywords", () => {
    expect(stopBucket("Running out of time")).toBe("time");
    expect(stopBucket("I think I've covered everything")).toBe("covered");
    expect(stopBucket("I have enough to start designing")).toBe("enough_to_start");
    expect(stopBucket("She kept saying she's not sure")).toBe("client_ran_out");
    expect(stopBucket("Felt right")).toBe("other");
    expect(stopBucket("")).toBe("other");
  });
});
