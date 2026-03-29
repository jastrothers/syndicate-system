import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRulebookStructureTool,
  readRuleSectionTool,
  updateRuleTool,
  deleteRuleTool,
} from "../../../../src/handlers/rulebook/core.js";

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

  it("schema accepts path and title for single update", () => {
    const valid = updateRuleTool.schema.safeParse({
      path: "setup.board",
      title: "Board Setup",
      content: "Place the board in the middle of the table.",
    });
    assert.ok(valid.success);
  });

  it("schema accepts path without title (optional for batch mode)", () => {
    const result = updateRuleTool.schema.safeParse({ path: "setup.board" });
    assert.ok(result.success, "Title is optional to support batch mode");
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
