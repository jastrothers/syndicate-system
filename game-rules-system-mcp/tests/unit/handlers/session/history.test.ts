import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  recordActionTool,
  getActionHistoryTool,
  validateActionTool,
} from "../../../../src/handlers/session/history.js";

// ── record_action ─────────────────────────────────────────────────────────────

describe("recordActionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(recordActionTool.name, "record_action");
  });

  it("schema validates required fields", () => {
    const valid = recordActionTool.schema.safeParse({
      sessionId: "s1",
      actionType: "move",
      actor: "Player1",
      data: { from: "A1", to: "B2" },
    });
    assert.ok(valid.success);
  });
});

// ── get_action_history ────────────────────────────────────────────────────────

describe("getActionHistoryTool", () => {
  it("has the correct tool name", () => {
    assert.equal(getActionHistoryTool.name, "get_action_history");
  });

  it("schema requires only sessionId", () => {
    const valid = getActionHistoryTool.schema.safeParse({ sessionId: "s1" });
    assert.ok(valid.success);
  });
});

// ── validate_action ───────────────────────────────────────────────────────────

describe("validateActionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(validateActionTool.name, "validate_action");
  });

  it("schema requires sessionId, actionData, and rulePath", () => {
    const valid = validateActionTool.schema.safeParse({
      sessionId: "s1",
      actionData: { player: "Player1", action: "move" },
      rulePath: "movement.standard",
    });
    assert.ok(valid.success);

    const invalid = validateActionTool.schema.safeParse({
      sessionId: "s1",
      actionData: { player: "Player1" },
    });
    assert.ok(!invalid.success, "Missing rulePath should fail");
  });
});
