// Persona replay scripts (WP4). Each script is a list of engineer messages, the facts the client must
// give somewhere in its replies, and the facts it must not. The runner lives in the backend
// (tests/replay/), which keeps an identical copy of each <case>.replay.json.
import brightpathReplay from "./brightpath.replay.json";
import communityRoomReplay from "./community-room.replay.json";

export type ReplayScript = {
  id: string;
  messages: string[];
  mustDisclose: string[];
  mustNotDisclose: string[];
};

export type ReplaySuite = { caseId: string; scripts: ReplayScript[] };

export const COMMUNITY_ROOM_REPLAY: ReplaySuite = communityRoomReplay;
export const BRIGHTPATH_REPLAY: ReplaySuite = brightpathReplay;
