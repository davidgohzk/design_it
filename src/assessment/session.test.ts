import { describe, expect, it } from "vitest";
import { GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { sessionCompletion } from "./session";

describe("level 0 session completed", () => {
  it("passes a transcript where every client reply arrived", () => {
    expect(sessionCompletion(GOLDEN_TRANSCRIPT)).toEqual({ completed: true, failedReplies: [] });
  });

  it("flags failed and empty client replies, not the engineer's messages", () => {
    expect(
      sessionCompletion([
        { role: "assistant", content: "Hi!" },
        { role: "user", content: "" },
        { role: "assistant", content: "Request failed: The server took too long to respond." },
        { role: "user", content: "Hello?" },
        { role: "assistant", content: "  " },
      ]),
    ).toEqual({ completed: false, failedReplies: [2, 4] });
  });
});
