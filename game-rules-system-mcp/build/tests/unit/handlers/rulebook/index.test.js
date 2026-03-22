import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rulebookTools } from "../../../../src/handlers/index.js";
// ── Tool registration ─────────────────────────────────────────────────────────
describe("rulebookTools registration", () => {
    it("exports ten tools", () => {
        assert.equal(rulebookTools.length, 10);
    });
    it("contains the expected tool names", () => {
        const names = rulebookTools.map((t) => t.name);
        assert.deepEqual(names.sort(), [
            "compare_rulebooks",
            "compile_markdown_rulebook",
            "create_version",
            "delete_rule",
            "get_full_rulebook_markdown",
            "get_rulebook_structure",
            "list_rulebooks",
            "list_versions",
            "read_rule_section",
            "update_rule",
        ]);
    });
});
