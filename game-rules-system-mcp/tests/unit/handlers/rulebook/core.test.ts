import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareRulebooksTool,
  getRulebookStructureTool,
  readRuleSectionTool,
  updateRuleTool,
  deleteRuleTool,
} from "../../../../src/handlers/rulebook/core.js";

// ── compare_rulebooks ─────────────────────────────────────────────────────────

describe("compareRulebooksTool", () => {
  it("has the correct tool name", () => {
    assert.equal(compareRulebooksTool.name, "compare_rulebooks");
  });

  it("schema requires baseRulebook and targetRulebook", () => {
    const valid = compareRulebooksTool.schema.safeParse({
      baseRulebook: "heist",
      targetRulebook: "heist-v2",
    });
    assert.ok(valid.success);
  });

  it("schema accepts optional version tags", () => {
    const result = compareRulebooksTool.schema.safeParse({
      baseRulebook: "heist",
      baseVersion: "1.0.0",
      targetRulebook: "heist",
      targetVersion: "2.0.0",
    });
    assert.ok(result.success);
  });
});

// ── get_rulebook_structure ────────────────────────────────────────────────────

describe("getRulebookStructureTool", () => {
  it("has the correct tool name", () => {
    assert.equal(getRulebookStructureTool.name, "get_rulebook_structure");
  });

  it("schema defaults rulebookName to 'rulebook'", () => {
    const result = getRulebookStructureTool.schema.safeParse({});
    assert.ok(result.success);
    assert.equal((result as any).data.rulebookName, "rulebook");
  });
});

// ── read_rule_section ─────────────────────────────────────────────────────────

describe("readRuleSectionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(readRuleSectionTool.name, "read_rule_section");
  });

  it("schema requires a dot-notation path", () => {
    const valid = readRuleSectionTool.schema.safeParse({ path: "combat.resolution" });
    assert.ok(valid.success);

    const invalid = readRuleSectionTool.schema.safeParse({});
    assert.ok(!invalid.success, "Missing path should fail");
  });
});

// ── update_rule ───────────────────────────────────────────────────────────────

describe("updateRuleTool", () => {
  it("has the correct tool name", () => {
    assert.equal(updateRuleTool.name, "update_rule");
  });

  it("schema requires path and title", () => {
    const valid = updateRuleTool.schema.safeParse({
      path: "setup.board",
      title: "Board Setup",
      content: "Place the board in the middle of the table.",
    });
    assert.ok(valid.success);

    const invalid = updateRuleTool.schema.safeParse({ path: "setup.board" });
    assert.ok(!invalid.success, "Missing title should fail");
  });
});

// ── delete_rule ───────────────────────────────────────────────────────────────

describe("deleteRuleTool", () => {
  it("has the correct tool name", () => {
    assert.equal(deleteRuleTool.name, "delete_rule");
  });

  it("schema requires path", () => {
    const valid = deleteRuleTool.schema.safeParse({ path: "combat.resolution" });
    assert.ok(valid.success);

    const invalid = deleteRuleTool.schema.safeParse({});
    assert.ok(!invalid.success, "Missing path should fail");
  });
});
