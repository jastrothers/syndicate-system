import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionTools } from "../../../../src/handlers/index.js";

// ── Tool registration ─────────────────────────────────────────────────────────

describe("sessionTools registration", () => {
  it("exports twelve tools", () => {
    assert.equal(sessionTools.length, 13); // Changed from 12 to 13
  });

  it("contains the expected tool names", () => {
    const names = sessionTools.map((t: any) => t.name);
    const expectedTools = [
      "create_session",
      "draw_from_deck",
      "evaluate_game_state",
      "execute_macro_action", // Added
      "get_action_history",
      "get_game_state",
      "log_playtest_note",
      "move_entity",
      "record_action",
      "setup_game_from_manifest", // Added
      "shuffle_deck",
      "update_game_state",
      "validate_action"
    ];
    assert.deepEqual(names.sort(), expectedTools.sort()); // Updated to use expectedTools and sort both
  });
});
