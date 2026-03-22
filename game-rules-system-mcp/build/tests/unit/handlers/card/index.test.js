import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cardTools } from "../../../../src/handlers/index.js";
describe("cardHandlers barrel export", () => {
    it("exports a non-empty cardTools array", () => {
        assert.ok(Array.isArray(cardTools), "cardTools should be an array");
        const expectedTools = [
            "count_zone",
            "create_deck_from_reference",
            "create_deck_from_template",
            "insert_into_deck",
            "peek_at_deck",
            "reveal_cards",
            "search_zone",
        ];
        const actualToolNames = cardTools.map((t) => t.name);
        assert.deepStrictEqual(actualToolNames.sort(), expectedTools.sort(), "cardTools should contain the expected tools");
        assert.ok(cardTools.length > 0, "cardTools should have at least one tool");
    });
    it("all entries in cardTools have a name string", () => {
        for (const tool of cardTools) {
            assert.equal(typeof tool.name, "string", `Tool name should be a string: ${JSON.stringify(tool)}`);
        }
    });
    it("all entries in cardTools have a handler function", () => {
        for (const tool of cardTools) {
            assert.equal(typeof tool.handler, "function", `Tool '${tool.name}' should have a handler function`);
        }
    });
    it("tool names are unique", () => {
        const names = cardTools.map((t) => t.name);
        const unique = new Set(names);
        assert.equal(unique.size, names.length, "All tool names should be unique");
    });
});
