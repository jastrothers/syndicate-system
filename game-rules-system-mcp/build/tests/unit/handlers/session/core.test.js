import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSessionTool, getGameStateTool, updateGameStateTool, logPlaytestNoteTool, } from "../../../../src/handlers/session/core.js";
// ── create_session ────────────────────────────────────────────────────────────
describe("createSessionTool", () => {
    it("has the correct tool name", () => {
        assert.equal(createSessionTool.name, "create_session");
    });
    it("schema requires rulebookName", () => {
        const valid = createSessionTool.schema.safeParse({ rulebookName: "heist" });
        assert.ok(valid.success);
        const invalid = createSessionTool.schema.safeParse({});
        assert.ok(!invalid.success, "Missing rulebookName should fail");
    });
    it("schema accepts optional rulebookVersion", () => {
        const result = createSessionTool.schema.safeParse({
            rulebookName: "heist",
            rulebookVersion: "1.0.0",
        });
        assert.ok(result.success);
    });
});
// ── get_game_state ────────────────────────────────────────────────────────────
describe("getGameStateTool", () => {
    it("has the correct tool name", () => {
        assert.equal(getGameStateTool.name, "get_game_state");
    });
    it("schema requires sessionId", () => {
        const valid = getGameStateTool.schema.safeParse({ sessionId: "abc-123" });
        assert.ok(valid.success);
        const invalid = getGameStateTool.schema.safeParse({});
        assert.ok(!invalid.success, "Missing sessionId should fail");
    });
});
// ── update_game_state ─────────────────────────────────────────────────────────
describe("updateGameStateTool", () => {
    it("has the correct tool name", () => {
        assert.equal(updateGameStateTool.name, "update_game_state");
    });
    it("schema requires sessionId and a patch object", () => {
        const valid = updateGameStateTool.schema.safeParse({
            sessionId: "s1",
            patch: { player1_hp: 10 },
        });
        assert.ok(valid.success);
    });
});
// ── log_playtest_note ─────────────────────────────────────────────────────────
describe("logPlaytestNoteTool", () => {
    it("has the correct tool name", () => {
        assert.equal(logPlaytestNoteTool.name, "log_playtest_note");
    });
    it("schema requires note and sessionId", () => {
        const valid = logPlaytestNoteTool.schema.safeParse({ sessionId: "s1", note: "Guards are too slow." });
        assert.ok(valid.success);
        const invalid = logPlaytestNoteTool.schema.safeParse({ note: "Missing session" });
        assert.ok(!invalid.success);
    });
    it("schema defaults category to 'General'", () => {
        const result = logPlaytestNoteTool.schema.safeParse({ sessionId: "s1", note: "Test note." });
        assert.ok(result.success);
        assert.equal(result.data.category, "General");
    });
});
