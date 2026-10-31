// The pane beside the review: the submitted doc and chat, both mounted, nothing editable.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "@/cases/community-room";
import { COMMUNITY_ROOM_SEED } from "@/examples/community-room/seed";
import { parseDesignDoc } from "@/designDoc/parse";
import { ReviewSourcePane } from "./ReviewSourcePane";

const snapshot = {
  messages: COMMUNITY_ROOM_SEED.messages,
  docMarkdown: COMMUNITY_ROOM_SEED.docMarkdown,
  finalCode: COMMUNITY_ROOM_SEED.finalCode,
  parsed: parseDesignDoc(COMMUNITY_ROOM_SEED.docMarkdown, COMMUNITY_ROOM_SEED.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, COMMUNITY_ROOM_SEED.messages),
};

const html = renderToStaticMarkup(<ReviewSourcePane snapshot={snapshot} caseDefinition={COMMUNITY_ROOM_CASE} />);
const text = html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("the submitted work beside the review", () => {
  it("shows the design doc, with the chat mounted behind its tab", () => {
    expect(text).toContain("Your work, as reviewed");
    expect(text).toContain("R1");
    // Both tabs are rendered, so a jump lands without waiting for a re-render; the chat one is hidden.
    expect(html).toContain("hidden=\"\"");
    expect(text).toContain(COMMUNITY_ROOM_CASE.clientName);
  });

  it("is read-only: nothing here can be sent or edited", () => {
    expect(text).not.toContain("End interview");
    expect(html).not.toContain("<textarea");
  });
});
