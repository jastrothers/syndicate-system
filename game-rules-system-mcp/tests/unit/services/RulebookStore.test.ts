import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getRulebookPath, getRulebookDir } from "../../../src/config/paths.js";
import { ensureDataDirectory, getRulebook, saveRulebook, listRulebooks, listVersions, createVersion, migrateIfNeeded } from "../../../src/services/RulebookStore.js";
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
});
