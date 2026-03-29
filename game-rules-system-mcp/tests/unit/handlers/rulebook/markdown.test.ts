import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs/promises";
import {
  compileMarkdownTool,
  getFullRulebookMarkdownTool,
} from "../../../../src/handlers/rulebook/markdown.js";
import { getRulebookDir, getRulebookPath, getRulebookMdPath } from "../../../../src/config/paths.js";

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

// ── compile_markdown_rulebook handler output ──────────────────────────────────

describe("compileMarkdownTool handler - header generation", () => {
  it("produces '# undefined' header when JSON stores name at root (non-conformant schema)", async () => {
    const brokenName = "broken-md-" + Date.now();
    await fs.mkdir(getRulebookDir(brokenName), { recursive: true });
    await fs.writeFile(getRulebookPath(brokenName), JSON.stringify({
      name: "PokéNursery: Blissful Beginnings",
      version: "0.1.0-draft",
      metadata: { lastUpdated: new Date().toISOString() },
      sections: {}
    }), "utf-8");
    try {
      await compileMarkdownTool.handler({ rulebookName: brokenName });
      const md = await fs.readFile(getRulebookMdPath(brokenName), "utf-8");
      assert.ok(md.startsWith("# undefined\n"), `Expected '# undefined' header, got: ${md.slice(0, 80)}`);
    } finally {
      await fs.rm(getRulebookDir(brokenName), { recursive: true, force: true }).catch(() => {});
    }
  });

  it("produces correct title header when JSON uses conformant metadata.title schema", async () => {
    const conformantName = "conformant-md-" + Date.now();
    await fs.mkdir(getRulebookDir(conformantName), { recursive: true });
    await fs.writeFile(getRulebookPath(conformantName), JSON.stringify({
      metadata: {
        title: "PokéNursery: Blissful Beginnings",
        version: "0.1.0-draft",
        lastUpdated: new Date().toISOString()
      },
      sections: {}
    }), "utf-8");
    try {
      await compileMarkdownTool.handler({ rulebookName: conformantName });
      const md = await fs.readFile(getRulebookMdPath(conformantName), "utf-8");
      assert.ok(
        md.startsWith("# PokéNursery: Blissful Beginnings\n"),
        `Expected correct title header, got: ${md.slice(0, 80)}`
      );
    } finally {
      await fs.rm(getRulebookDir(conformantName), { recursive: true, force: true }).catch(() => {});
    }
  });
});
