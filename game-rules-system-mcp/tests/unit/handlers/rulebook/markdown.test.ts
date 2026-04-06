import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs/promises";
import {
  compileMarkdownTool,
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

  it("schema accepts returnOnly flag", () => {
    const result = compileMarkdownTool.schema.safeParse({ returnOnly: true });
    assert.ok(result.success);
    assert.equal((result as any).data.returnOnly, true);
  });

  it("schema defaults returnOnly to false", () => {
    const result = compileMarkdownTool.schema.safeParse({});
    assert.ok(result.success);
    assert.equal((result as any).data.returnOnly, false);
  });

  it("schema accepts section param", () => {
    const result = compileMarkdownTool.schema.safeParse({ section: "combat.resolution" });
    assert.ok(result.success);
    assert.equal((result as any).data.section, "combat.resolution");
  });
});

// ── compile_markdown_rulebook handler output ──────────────────────────────────

describe("compileMarkdownTool handler - file write mode", () => {
  it("falls back to root name when metadata.title is missing (no longer produces # undefined)", async () => {
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
      assert.ok(!md.startsWith("# undefined"), `Should NOT produce '# undefined', got: ${md.slice(0, 80)}`);
      assert.ok(md.startsWith("# PokéNursery: Blissful Beginnings"), `Should fall back to root name, got: ${md.slice(0, 80)}`);
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

describe("compileMarkdownTool handler - returnOnly mode", () => {
  it("returns markdown text when returnOnly is true", async () => {
    const name = "return-only-md-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      metadata: { title: "Test Game", version: "1.0", lastUpdated: new Date().toISOString() },
      sections: {}
    }), "utf-8");
    try {
      const result = await compileMarkdownTool.handler({ rulebookName: name, returnOnly: true });
      const text = result.content[0].text;
      assert.ok(text.startsWith("# Test Game"), `Expected markdown text, got: ${text.slice(0, 80)}`);
      // Should NOT write a file
      await assert.rejects(
        () => fs.readFile(getRulebookMdPath(name), "utf-8"),
        (err: any) => err.code === "ENOENT"
      );
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });

  it("returns only the named section when section param is provided", async () => {
    const name = "section-md-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      metadata: { title: "Test Game", version: "1.0", lastUpdated: new Date().toISOString() },
      sections: {
        combat: { title: "Combat", content: "Combat rules here.", subsections: {
          resolution: { title: "Resolution", content: "Resolve combat.", subsections: {} }
        }}
      }
    }), "utf-8");
    try {
      const result = await compileMarkdownTool.handler({ rulebookName: name, returnOnly: true, section: "combat" });
      const text = result.content[0].text;
      assert.ok(text.includes("Combat"), `Expected section content, got: ${text.slice(0, 200)}`);
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });

  it("throws for invalid section path", async () => {
    const name = "bad-section-md-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      metadata: { title: "Test Game", version: "1.0", lastUpdated: new Date().toISOString() },
      sections: {}
    }), "utf-8");
    try {
      await assert.rejects(
        () => compileMarkdownTool.handler({ rulebookName: name, returnOnly: true, section: "nonexistent" }),
        (err: Error) => err.message.includes("not found")
      );
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });
});

// ── compile_markdown_rulebook - metadata fallback ────────────────────────────

describe("compileMarkdownTool handler - metadata fallback", () => {
  it("uses fallback title when metadata.title is undefined (no # undefined)", async () => {
    const name = "fallback-title-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      name: "PokéNursery: Blissful Beginnings",
      metadata: { lastUpdated: new Date().toISOString() },
      sections: {}
    }), "utf-8");
    try {
      const result = await compileMarkdownTool.handler({ rulebookName: name, returnOnly: true });
      const md = result.content[0].text;
      assert.ok(!md.includes("# undefined"), `Should not contain '# undefined', got: ${md.slice(0, 100)}`);
      assert.ok(md.startsWith("# PokéNursery: Blissful Beginnings"), `Should fall back to root name, got: ${md.slice(0, 100)}`);
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });

  it("uses fallback version when metadata.version is undefined (no Version: undefined)", async () => {
    const name = "fallback-version-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      metadata: { title: "Test Game", lastUpdated: new Date().toISOString() },
      sections: {}
    }), "utf-8");
    try {
      const result = await compileMarkdownTool.handler({ rulebookName: name, returnOnly: true });
      const md = result.content[0].text;
      assert.ok(!md.includes("Version: undefined"), `Should not contain 'Version: undefined', got: ${md.slice(0, 200)}`);
      assert.ok(md.includes("Version: 0.1.0"), `Should fall back to 0.1.0, got: ${md.slice(0, 200)}`);
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });

  it("falls back to rulebookName when both metadata.title and root name are missing", async () => {
    const name = "fallback-rbname-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      metadata: { lastUpdated: new Date().toISOString() },
      sections: {}
    }), "utf-8");
    try {
      const result = await compileMarkdownTool.handler({ rulebookName: name, returnOnly: true });
      const md = result.content[0].text;
      assert.ok(!md.includes("# undefined"), "Should not contain '# undefined'");
      assert.ok(md.startsWith(`# ${name}`), `Should fall back to rulebookName, got: ${md.slice(0, 100)}`);
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });
});

// ── compile_markdown_rulebook - metadata section filtering ──────────────────

describe("compileMarkdownTool handler - metadata section filtering", () => {
  it("filters out metadata section from compiled markdown", async () => {
    const name = "meta-filter-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      metadata: { title: "Test Game", version: "1.0", lastUpdated: new Date().toISOString() },
      sections: {
        metadata: { title: "Metadata", content: "Internal metadata section.", subsections: {
          thematicBrief: { title: "Thematic Brief", content: "Theme stuff." }
        }},
        setup: { title: "Setup", content: "Setup the game." }
      }
    }), "utf-8");
    try {
      const result = await compileMarkdownTool.handler({ rulebookName: name, returnOnly: true });
      const md = result.content[0].text;
      assert.ok(!md.includes("## Metadata"), `Should not render metadata section heading, got: ${md}`);
      assert.ok(!md.includes("Thematic Brief"), `Should not render metadata subsections, got: ${md}`);
      assert.ok(md.includes("## Setup"), `Should still render non-metadata sections, got: ${md}`);
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });

  it("renders all non-metadata sections normally", async () => {
    const name = "meta-filter2-" + Date.now();
    await fs.mkdir(getRulebookDir(name), { recursive: true });
    await fs.writeFile(getRulebookPath(name), JSON.stringify({
      metadata: { title: "Test Game", version: "1.0", lastUpdated: new Date().toISOString() },
      sections: {
        setup: { title: "Setup", content: "Setup the game." },
        rules: { title: "Rules", content: "Play the game." }
      }
    }), "utf-8");
    try {
      const result = await compileMarkdownTool.handler({ rulebookName: name, returnOnly: true });
      const md = result.content[0].text;
      assert.ok(md.includes("## Setup"), "Should render setup section");
      assert.ok(md.includes("## Rules"), "Should render rules section");
    } finally {
      await fs.rm(getRulebookDir(name), { recursive: true, force: true }).catch(() => {});
    }
  });
});
