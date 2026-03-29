import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rulebookTools } from "../../../../src/handlers/index.js";

// ── Tool registration ─────────────────────────────────────────────────────────

describe("rulebookTools registration", () => {
  it("exports the correct number of tools", () => {
    assert.equal(rulebookTools.length, 17);
  });

  it("contains the expected tool names", () => {
    const names = rulebookTools.map((t: any) => t.name);
    assert.deepEqual(names.sort(), [
      "compile_markdown_rulebook",
      "create_version",
      "delete_component",
      "delete_rule",
      "delete_rulebook_version",
      "get_draft",
      "get_full_rulebook_markdown",
      "get_rulebook_components",
      "get_rulebook_structure",
      "list_rulebooks",
      "list_versions",
      "promote_draft",
      "read_rule_section",
      "save_draft",
      "search_rules",
      "update_rule",
      "upsert_component",
    ]);
  });
});
