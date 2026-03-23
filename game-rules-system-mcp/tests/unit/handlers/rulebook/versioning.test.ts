import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listRulebooksTool,
  listVersionsTool,
  createVersionTool,
  deleteRulebookVersionTool,
} from "../../../../src/handlers/rulebook/versioning.js";

// ── list_rulebooks ────────────────────────────────────────────────────────────

describe("listRulebooksTool", () => {
  it("has the correct tool name", () => {
    assert.equal(listRulebooksTool.name, "list_rulebooks");
  });

  it("schema accepts empty input", () => {
    const result = listRulebooksTool.schema.safeParse({});
    assert.ok(result.success);
  });
});

// ── list_versions ─────────────────────────────────────────────────────────────

describe("listVersionsTool", () => {
  it("has the correct tool name", () => {
    assert.equal(listVersionsTool.name, "list_versions");
  });

  it("schema requires rulebookName", () => {
    const valid = listVersionsTool.schema.safeParse({ rulebookName: "heist" });
    assert.ok(valid.success);

    const invalid = listVersionsTool.schema.safeParse({});
    assert.ok(!invalid.success, "Missing rulebookName should fail");
  });
});

// ── create_version ────────────────────────────────────────────────────────────

describe("createVersionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(createVersionTool.name, "create_version");
  });

  it("schema requires rulebookName and versionTag", () => {
    const valid = createVersionTool.schema.safeParse({
      rulebookName: "heist",
      versionTag: "1.0.0",
    });
    assert.ok(valid.success);

    const invalid = createVersionTool.schema.safeParse({ rulebookName: "heist" });
    assert.ok(!invalid.success, "Missing versionTag should fail");
  });

  it("schema accepts optional description", () => {
    const result = createVersionTool.schema.safeParse({
      rulebookName: "heist",
      versionTag: "1.0.0",
      description: "Playtest 3 freeze",
    });
    assert.ok(result.success);
  });
});

// ── delete_rulebook_version ────────────────────────────────────────────────────

describe("deleteRulebookVersionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(deleteRulebookVersionTool.name, "delete_rulebook_version");
  });

  it("schema requires gameName and versionTag", () => {
    const valid = deleteRulebookVersionTool.schema.safeParse({
      gameName: "heist",
      versionTag: "1.0.0",
    });
    assert.ok(valid.success);
  });

  it("schema rejects missing gameName", () => {
    const result = deleteRulebookVersionTool.schema.safeParse({ versionTag: "1.0.0" });
    assert.ok(!result.success, "Missing gameName should fail");
  });

  it("schema rejects missing versionTag", () => {
    const result = deleteRulebookVersionTool.schema.safeParse({ gameName: "heist" });
    assert.ok(!result.success, "Missing versionTag should fail");
  });
});
