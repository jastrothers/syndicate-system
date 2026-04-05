import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionTools } from "../../../../src/handlers/index.js";

// ── Tool registration ─────────────────────────────────────────────────────────

describe("sessionTools registration", () => {
  it("exports twelve tools", () => {
    assert.equal(sessionTools.length, 12);
  });

  it("contains the expected tool names", () => {
    const names = sessionTools.map((t: any) => t.name);
    const expectedTools = [
      "create_session",
      "delete_playtest_session",
      "get_action_history",
      "get_game_state",
      "get_session_stats",
      "list_sessions",
      "log_playtest_note",
      "record_action",
      "roll_dice",
      "update_game_state",
      "validate_action",
      "zone_action",
    ];
    assert.deepEqual(names.sort(), expectedTools.sort());
  });
});
