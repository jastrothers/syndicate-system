import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compileMarkdownTool,
  getFullRulebookMarkdownTool,
} from "../../../../src/handlers/rulebook/markdown.js";

// ── compile_markdown_rulebook ─────────────────────────────────────────────────

describe("compileMarkdownTool", () => {
  it("has the correct tool name", () => {
    assert.equal(compileMarkdownTool.name, "compile_markdown_rulebook");
  });

  it("schema defaults rulebookName to 'rulebook'", () => {
    const result = compileMarkdownTool.schema.safeParse({});
    assert.ok(result.success);
    assert.equal((result as any).data.rulebookName, "rulebook");
  });
});

// ── get_full_rulebook_markdown ────────────────────────────────────────────────

describe("getFullRulebookMarkdownTool", () => {
  it("has the correct tool name", () => {
    assert.equal(getFullRulebookMarkdownTool.name, "get_full_rulebook_markdown");
  });

  it("schema defaults rulebookName to 'rulebook'", () => {
    const result = getFullRulebookMarkdownTool.schema.safeParse({});
    assert.ok(result.success);
    assert.equal((result as any).data.rulebookName, "rulebook");
  });
});
