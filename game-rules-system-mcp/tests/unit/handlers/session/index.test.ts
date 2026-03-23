import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionTools } from "../../../../src/handlers/index.js";

// ── Tool registration ─────────────────────────────────────────────────────────

describe("sessionTools registration", () => {
  it("exports fourteen tools", () => {
    assert.equal(sessionTools.length, 14);
  });

  it("contains the expected tool names", () => {
    const names = sessionTools.map((t: any) => t.name);
    const expectedTools = [
      "create_session",
      "delete_playtest_session",
      "draw_from_deck",
      "evaluate_game_state",
      "execute_macro_action",
      "get_action_history",
      "get_game_state",
      "log_playtest_note",
      "move_entity",
      "record_action",
      "setup_game_from_manifest",
      "shuffle_deck",
      "update_game_state",
      "validate_action",
    ];
    assert.deepEqual(names.sort(), expectedTools.sort());
  });
});
