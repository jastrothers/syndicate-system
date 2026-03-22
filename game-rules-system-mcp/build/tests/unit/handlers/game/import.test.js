import test from "node:test";
import assert from "node:assert";
import { importGameTool } from "../../../../src/handlers/game/import.js";
import * as ReferenceStore from "../../../../src/services/ReferenceStore.js";
import { getRulebook } from "../../../../src/services/RulebookStore.js";
test("importGameTool", async (t) => {
    // Initialize services before running tests
    await ReferenceStore.initialize();
    await t.test("should successfully import a game, save rulebook, and save all references", async () => {
        const args = {
            game: "TestGameImport",
            version: "1.0.0",
            rulebookContent: "# Rulebook Header\n\nSome test text",
            references: [
                { name: "test_deck_1", type: "deck", tags: ["test"], content: "[]" },
                { name: "test_rule_1", type: "rule", tags: ["test"], content: "Rule text" },
            ],
        };
        const result = await importGameTool.handler(args);
        // Verify output contents
        const content = JSON.parse(result.content[0].text);
        assert.strictEqual(content.status, "success");
        assert.strictEqual(content.totalReferencesSaved, 4); // 2 provided + 1 manifest + 1 macro
        assert.ok(content.manifestReference.includes("manifest"));
        assert.ok(content.macroReference.includes("script"));
        // Verify rulebook was saved
        const rb = await getRulebook("TestGameImport");
        assert.ok(rb.metadata.title === "TestGameImport");
        // Verify references were saved by querying
        const refs = await ReferenceStore.queryReferences("TestGameImport", "1.0.0");
        assert.strictEqual(refs.length, 4);
    });
    t.after(() => {
        ReferenceStore.closeDb();
    });
});
