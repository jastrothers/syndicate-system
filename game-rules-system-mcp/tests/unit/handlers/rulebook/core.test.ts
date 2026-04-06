import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs/promises";
import {
  getRulebookStructureTool,
  readRuleSectionTool,
  updateRuleTool,
  deleteRuleTool,
  manageDraftTool,
} from "../../../../src/handlers/rulebook/core.js";
import { getRulebookDir, getRulebookPath } from "../../../../src/config/paths.js";

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

// ── update_rule content normalization ────────────────────────────────────────

describe("updateRuleTool - content normalization", () => {
  const testName = "normalize-test-" + Date.now();

  after(async () => {
    await fs.rm(getRulebookDir(testName), { recursive: true, force: true }).catch(() => {});
  });

  it("normalizes escaped \\n to actual newlines in content", async () => {
    await updateRuleTool.handler({ rulebookName: testName, isDraft: false, path: "test", title: "Test", content: "Line 1\\nLine 2" });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(testName), "utf-8"));
    assert.equal(raw.sections.test.content, "Line 1\nLine 2");
  });

  it("normalizes double-escaped newlines to actual double newlines", async () => {
    await updateRuleTool.handler({ rulebookName: testName, isDraft: false, path: "test2", title: "Test2", content: "Para 1\\n\\nPara 2" });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(testName), "utf-8"));
    assert.equal(raw.sections.test2.content, "Para 1\n\nPara 2");
  });

  it("preserves actual newlines (already real)", async () => {
    await updateRuleTool.handler({ rulebookName: testName, isDraft: false, path: "test3", title: "Test3", content: "Line 1\nLine 2" });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(testName), "utf-8"));
    assert.equal(raw.sections.test3.content, "Line 1\nLine 2");
  });

  it("normalizes escaped \\n in examples", async () => {
    await updateRuleTool.handler({ rulebookName: testName, isDraft: false, path: "test4", title: "Test4", examples: ["Ex 1\\nEx 2", "Ex 3\\nEx 4"] });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(testName), "utf-8"));
    assert.deepEqual(raw.sections.test4.examples, ["Ex 1\nEx 2", "Ex 3\nEx 4"]);
  });
});

// ── manage_draft metadata validation ─────────────────────────────────────────

describe("manageDraftTool - save metadata validation", () => {
  const testName = "draft-meta-test-" + Date.now();

  after(async () => {
    await fs.rm(getRulebookDir(testName), { recursive: true, force: true }).catch(() => {});
  });

  it("fills missing metadata.title from top-level name field", async () => {
    await manageDraftTool.handler({
      action: "save",
      rulebookName: testName,
      rulebook: { name: "My Game", metadata: { lastUpdated: new Date().toISOString() }, sections: {} },
    });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(testName, { isDraft: true }), "utf-8"));
    assert.equal(raw.metadata.title, "My Game");
  });

  it("defaults metadata.version to 0.1.0 when missing", async () => {
    const name2 = testName + "-v";
    await manageDraftTool.handler({
      action: "save",
      rulebookName: name2,
      rulebook: { metadata: { title: "Test", lastUpdated: new Date().toISOString() }, sections: {} },
    });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(name2, { isDraft: true }), "utf-8"));
    assert.equal(raw.metadata.version, "0.1.0");
    // Cleanup
    await fs.rm(getRulebookDir(name2), { recursive: true, force: true }).catch(() => {});
  });

  it("preserves valid metadata when already present", async () => {
    const name3 = testName + "-ok";
    await manageDraftTool.handler({
      action: "save",
      rulebookName: name3,
      rulebook: { metadata: { title: "Complete Game", version: "2.0.0", lastUpdated: "2026-01-01T00:00:00Z" }, sections: {} },
    });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(name3, { isDraft: true }), "utf-8"));
    assert.equal(raw.metadata.title, "Complete Game");
    assert.equal(raw.metadata.version, "2.0.0");
    // Cleanup
    await fs.rm(getRulebookDir(name3), { recursive: true, force: true }).catch(() => {});
  });

  it("creates metadata object when entirely missing", async () => {
    const name4 = testName + "-nometa";
    await manageDraftTool.handler({
      action: "save",
      rulebookName: name4,
      rulebook: { sections: {} },
    });
    const raw = JSON.parse(await fs.readFile(getRulebookPath(name4, { isDraft: true }), "utf-8"));
    assert.ok(raw.metadata, "metadata should be created");
    assert.equal(raw.metadata.title, name4); // falls back to rulebookName
    assert.equal(raw.metadata.version, "0.1.0");
    // Cleanup
    await fs.rm(getRulebookDir(name4), { recursive: true, force: true }).catch(() => {});
  });
});
