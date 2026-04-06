import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { getRulebookPath, getRulebookDir } from "../../../src/config/paths.js";

// Path to the real game-data directory (independent of TEST_DATA_DIR env var)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_GAME_DATA = path.resolve(__dirname, "../../../../..", "game-data");
import { ensureDataDirectory, getRulebook, saveRulebook, listRulebooks, listVersions, createVersion, saveDraft, promoteDraft, getDraft } from "../../../src/services/RulebookStore.js";
import { Rulebook } from "../../../src/types/index.js";

describe("RulebookStore Units", () => {
  const testRulebookName = "test-rulebook-" + Date.now();
  
  before(async () => {
    await ensureDataDirectory();
  });

  after(async () => {
    // Cleanup the test rulebook directory if it exists
    const dir = getRulebookDir(testRulebookName);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  });

  it("getRulebook should return a default empty rulebook when none exists", async () => {
    const rb = await getRulebook(testRulebookName);
    assert.strictEqual(rb.metadata.title, "Untitled Board Game");
    assert.strictEqual(rb.metadata.version, "0.1.0");
    assert.deepStrictEqual(rb.sections, {});
  });

  it("saveRulebook should persist rulebook to disk", async () => {
    const rb: Rulebook = {
      metadata: {
        title: "My Custom Game",
        version: "1.0.0",
        lastUpdated: new Date().toISOString()
      },
      sections: {
        "setup": {
          title: "Setup",
          content: "Prepare the board."
        }
      }
    };

    await saveRulebook(testRulebookName, rb);

    const savedRb = await getRulebook(testRulebookName);
    assert.strictEqual(savedRb.metadata.title, "My Custom Game");
    assert.strictEqual(savedRb.metadata.version, "1.0.0");
    assert.ok(savedRb.sections["setup"]);
    assert.strictEqual(savedRb.sections["setup"].title, "Setup");
    assert.strictEqual(savedRb.sections["setup"].content, "Prepare the board.");
  });

  it("createVersion should snapshot the current latest", async () => {
    const info = await createVersion(testRulebookName, "1.0.0", "Initial release");
    assert.strictEqual(info.versionTag, "1.0.0");
    assert.strictEqual(info.title, "My Custom Game");
    assert.strictEqual(info.description, "Initial release");
  });

  it("createVersion should reject duplicate tags", async () => {
    await assert.rejects(
      () => createVersion(testRulebookName, "1.0.0"),
      (err: Error) => err.message.includes("already exists")
    );
  });

  it("getRulebook with versionTag should return the snapshot", async () => {
    const rb = await getRulebook(testRulebookName, "1.0.0");
    assert.strictEqual(rb.metadata.title, "My Custom Game");
    assert.strictEqual(rb.metadata.versionTag, "1.0.0");
    assert.strictEqual(rb.metadata.description, "Initial release");
  });

  it("getRulebook with nonexistent versionTag should throw", async () => {
    await assert.rejects(
      () => getRulebook(testRulebookName, "99.0.0"),
      (err: Error) => err.message.includes("not found")
    );
  });

  it("listVersions should return all version snapshots", async () => {
    // Create a second version
    const rb = await getRulebook(testRulebookName);
    rb.sections["rules"] = { title: "Rules", content: "Play the game." };
    await saveRulebook(testRulebookName, rb);
    await createVersion(testRulebookName, "1.1.0", "Added rules");

    const versions = await listVersions(testRulebookName);
    assert.strictEqual(versions.length, 2);
    const tags = versions.map((v) => v.versionTag);
    assert.ok(tags.includes("1.0.0"));
    assert.ok(tags.includes("1.1.0"));
  });

  it("listRulebooks should include the test rulebook", async () => {
    const names = await listRulebooks();
    assert.ok(names.includes(testRulebookName));
  });

  it("getRulebook should throw for corrupted JSON on disk", async () => {
    const corruptedName = "corrupted-rb-" + Date.now();
    const dir = getRulebookDir(corruptedName);
    await fs.mkdir(dir, { recursive: true });
    const filePath = getRulebookPath(corruptedName);
    await fs.writeFile(filePath, "{ not valid json !!!", "utf-8");

    await assert.rejects(
      () => getRulebook(corruptedName),
      (err: Error) => err.message.includes("Failed to parse")
    );

    // Cleanup
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  });

  it("createVersion should reject empty version tag", async () => {
    await assert.rejects(
      () => createVersion(testRulebookName, "!!!"),
      (err: Error) => err.message.includes("Invalid version tag")
    );
  });

  it("createVersion should write _versions.json manifest", async () => {
    const manifestPath = getRulebookDir(testRulebookName) + "/_versions.json";
    let manifest: Record<string, any>;
    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    } catch {
      assert.fail("_versions.json should exist after createVersion");
      return;
    }
    assert.ok(manifest["1.0.0"], "Manifest should contain version 1.0.0");
    assert.ok(manifest["1.1.0"], "Manifest should contain version 1.1.0");
    assert.strictEqual(manifest["1.0.0"].title, "My Custom Game");
  });

  it("listVersions should work from manifest without reading individual version files", async () => {
    // Invalidate the in-memory cache so listVersions re-reads from disk
    const { invalidateVersionsCache } = await import("../../../src/services/RulebookStore.js");
    invalidateVersionsCache(testRulebookName);

    const versions = await listVersions(testRulebookName);
    assert.strictEqual(versions.length, 2);
    const tags = versions.map((v) => v.versionTag);
    assert.ok(tags.includes("1.0.0"));
    assert.ok(tags.includes("1.1.0"));
  });

  it("listVersions should fall back to file scan if _versions.json is missing", async () => {
    const manifestPath = getRulebookDir(testRulebookName) + "/_versions.json";
    const { invalidateVersionsCache } = await import("../../../src/services/RulebookStore.js");

    // Delete the manifest
    try { await fs.unlink(manifestPath); } catch {}
    invalidateVersionsCache(testRulebookName);

    // Should still work via fallback file scan
    const versions = await listVersions(testRulebookName);
    assert.strictEqual(versions.length, 2);

    // Should have backfilled the manifest
    const backfilled = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    assert.ok(backfilled["1.0.0"]);
    assert.ok(backfilled["1.1.0"]);
  });
});

describe("RulebookStore - schema conformance", () => {
  it("getRulebook returns undefined metadata.title/version for non-conformant JSON (name at root)", async () => {
    // Documents the pre-fix PokéNursery schema bug: name/version at root instead of metadata
    const brokenName = "broken-schema-" + Date.now();
    const dir = getRulebookDir(brokenName);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(getRulebookPath(brokenName), JSON.stringify({
      name: "PokéNursery: Blissful Beginnings",
      version: "0.1.0-draft",
      metadata: { lastUpdated: new Date().toISOString() },
      sections: {}
    }), "utf-8");
    try {
      const loaded = await getRulebook(brokenName);
      assert.strictEqual(loaded.metadata.title, undefined);
      assert.strictEqual(loaded.metadata.version, undefined);
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("getRulebook reads metadata.title and metadata.version correctly from conformant JSON", async () => {
    const conformantName = "conformant-schema-" + Date.now();
    const dir = getRulebookDir(conformantName);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(getRulebookPath(conformantName), JSON.stringify({
      metadata: {
        title: "PokéNursery: Blissful Beginnings",
        version: "0.1.0-draft",
        lastUpdated: new Date().toISOString()
      },
      sections: {}
    }), "utf-8");
    try {
      const loaded = await getRulebook(conformantName);
      assert.strictEqual(loaded.metadata.title, "PokéNursery: Blissful Beginnings");
      assert.strictEqual(loaded.metadata.version, "0.1.0-draft");
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe("RulebookStore - promoteDraft version stamping", () => {
  const draftTestName = "draft-promote-" + Date.now();

  after(async () => {
    await fs.rm(getRulebookDir(draftTestName), { recursive: true, force: true }).catch(() => {});
  });

  it("sets version to 'latest' when draft version is 'draft'", async () => {
    const rb: Rulebook = {
      metadata: { title: "Draft Game", version: "draft", lastUpdated: new Date().toISOString() },
      sections: { setup: { title: "Setup", content: "Do the setup." } },
    };
    await saveDraft(draftTestName, rb);
    await promoteDraft(draftTestName);
    const promoted = await getRulebook(draftTestName);
    assert.strictEqual(promoted.metadata.version, "latest");
  });

  it("preserves non-draft version on promote", async () => {
    const name2 = draftTestName + "-v2";
    const rb: Rulebook = {
      metadata: { title: "Versioned Game", version: "1.0.0", lastUpdated: new Date().toISOString() },
      sections: {},
    };
    await saveDraft(name2, rb);
    await promoteDraft(name2);
    const promoted = await getRulebook(name2);
    assert.strictEqual(promoted.metadata.version, "1.0.0");
    // Cleanup
    await fs.rm(getRulebookDir(name2), { recursive: true, force: true }).catch(() => {});
  });

  it("updates lastUpdated timestamp on promote", async () => {
    const name3 = draftTestName + "-ts";
    const oldDate = "2020-01-01T00:00:00.000Z";
    const rb: Rulebook = {
      metadata: { title: "Timestamp Game", version: "1.0.0", lastUpdated: oldDate },
      sections: {},
    };
    await saveDraft(name3, rb);
    await promoteDraft(name3);
    const promoted = await getRulebook(name3);
    assert.notStrictEqual(promoted.metadata.lastUpdated, oldDate, "lastUpdated should be refreshed on promote");
    // Cleanup
    await fs.rm(getRulebookDir(name3), { recursive: true, force: true }).catch(() => {});
  });

  it("removes draft file after promoting", async () => {
    const name4 = draftTestName + "-rm";
    const rb: Rulebook = {
      metadata: { title: "Remove Draft", version: "1.0.0", lastUpdated: new Date().toISOString() },
      sections: {},
    };
    await saveDraft(name4, rb);
    await promoteDraft(name4);
    const draft = await getDraft(name4);
    assert.strictEqual(draft, null, "Draft should be removed after promoting");
    // Cleanup
    await fs.rm(getRulebookDir(name4), { recursive: true, force: true }).catch(() => {});
  });
});

describe("PokNursery-BlissfulBeginnings data integrity", () => {
  it("latest.json stores title and version inside metadata (not at root)", async () => {
    const filePath = path.join(REAL_GAME_DATA, "PokNursery-BlissfulBeginnings", "rulebooks", "latest.json");
    const raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
    assert.ok(raw.metadata?.title, "metadata.title must be present and non-empty");
    assert.ok(raw.metadata?.version, "metadata.version must be present and non-empty");
    assert.equal(raw.name, undefined, "name must NOT be at root level");
    assert.equal(raw.version, undefined, "version must NOT be at root level");
  });

  it("all design session JSON files use consistent gameName", async () => {
    const designDir = path.join(REAL_GAME_DATA, "PokNursery-BlissfulBeginnings", "design");
    const files = (await fs.readdir(designDir)).filter((f: string) => f.endsWith(".json"));
    for (const file of files) {
      const raw = JSON.parse(await fs.readFile(path.join(designDir, file), "utf-8"));
      assert.strictEqual(
        raw.gameName,
        "PokéNursery: Blissful Beginnings",
        `${file}: expected gameName "PokéNursery: Blissful Beginnings", got "${raw.gameName}"`
      );
    }
  });
});
