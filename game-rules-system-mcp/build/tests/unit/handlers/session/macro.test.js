import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { macroTools } from "../../../../src/handlers/session/macro.js";
const evaluateGameStateTool = macroTools.find(t => t.name === "evaluate_game_state");
const setupGameFromManifestTool = macroTools.find(t => t.name === "setup_game_from_manifest");
const executeMacroActionTool = macroTools.find(t => t.name === "execute_macro_action");
describe("evaluateGameStateTool", () => {
    it("has the correct tool name", () => {
        assert.equal(evaluateGameStateTool.name, "evaluate_game_state");
    });
    it("schema accepts valid expression and sessionId", () => {
        const valid = evaluateGameStateTool.schema.safeParse({ sessionId: "s1", expression: "state.lifePoints + 1" });
        assert.ok(valid.success);
    });
    it("schema rejects missing sessionId", () => {
        const invalid = evaluateGameStateTool.schema.safeParse({ expression: "1 + 1" });
        assert.ok(!invalid.success);
    });
});
describe("setupGameFromManifestTool", () => {
    it("has the correct tool name", () => {
        assert.equal(setupGameFromManifestTool.name, "setup_game_from_manifest");
    });
    it("schema accepts valid sessionId and manifestReferenceName", () => {
        const valid = setupGameFromManifestTool.schema.safeParse({ sessionId: "s1", manifestReferenceName: "setup_man" });
        assert.ok(valid.success);
    });
});
describe("executeMacroActionTool", () => {
    it("has the correct tool name", () => {
        assert.equal(executeMacroActionTool.name, "execute_macro_action");
    });
    it("schema accepts script reference and inputs", () => {
        const valid = executeMacroActionTool.schema.safeParse({ sessionId: "s1", macroScriptReferenceName: "turn_logic", inputs: { foo: "bar" } });
        assert.ok(valid.success);
    });
});
