import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rollDiceTool } from "../../../../src/handlers/session/dice.js";
// ── roll_dice ────────────────────────────────────────────────────────────────
describe("rollDiceTool", () => {
    it("has the correct tool name", () => {
        assert.equal(rollDiceTool.name, "roll_dice");
    });
    it("schema requires notation", () => {
        const valid = rollDiceTool.schema.safeParse({ notation: "2d6" });
        assert.ok(valid.success);
        const invalid = rollDiceTool.schema.safeParse({});
        assert.ok(!invalid.success, "Missing notation should fail");
    });
    it("schema accepts optional seed", () => {
        const result = rollDiceTool.schema.safeParse({ notation: "1d20", seed: 42 });
        assert.ok(result.success);
    });
    it("schema accepts optional sessionId and actor", () => {
        const result = rollDiceTool.schema.safeParse({
            notation: "3d8+2",
            sessionId: "abc-123",
            actor: "Player 1",
        });
        assert.ok(result.success);
    });
    it("schema defaults actor to 'System'", () => {
        const result = rollDiceTool.schema.safeParse({ notation: "1d6" });
        assert.ok(result.success);
        assert.equal(result.data.actor, "System");
    });
});
