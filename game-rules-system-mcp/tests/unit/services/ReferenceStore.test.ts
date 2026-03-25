import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

// Point ReferenceStore at a temp directory for isolation
const tmpDir = path.join(os.tmpdir(), `ref-test-${Date.now()}`);
process.env.TEST_DATA_DIR = tmpDir;

// Must be imported AFTER env var is set (paths.ts reads env at module load)
const { initialize, saveReference, getReference, queryReferences, rebuildIndex, deleteReferencesByGame, closeDb } =
  await import("../../../src/services/ReferenceStore.js");

describe("ReferenceStore Units", () => {
  before(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
    await initialize();
  });

  after(async () => {
    closeDb();
    await fs.rm(tmpDir, { recursive: true, force: true });
    delete process.env.TEST_DATA_DIR;
  });

  it("saveReference should write a file and index it", async () => {
    await saveReference("FireballSpell", "TestGame", undefined, "spell", ["offensive", "magic"], "Deals 3d6 fire damage.");

    const ref = await getReference("FireballSpell");
    assert.ok(ref !== null, "getReference should return a result");
    assert.strictEqual(ref!.name, "FireballSpell");
    assert.strictEqual(ref!.type, "spell");
    assert.ok(ref!.tags.includes("offensive"));
    assert.ok(ref!.tags.includes("magic"));
    assert.ok(ref!.content.includes("Deals 3d6 fire damage."));
  });

  it("saveReference should update an existing reference (upsert)", async () => {
    await saveReference("FireballSpell", "TestGame", undefined, "spell", ["offensive"], "Updated: 4d6 fire damage.");
    const ref = await getReference("FireballSpell");
    assert.ok(ref!.content.includes("Updated: 4d6 fire damage."));
    assert.strictEqual(ref!.tags.length, 1);
  });

  it("getReference should return null for an unknown reference", async () => {
    const ref = await getReference("NonExistentReference");
    assert.strictEqual(ref, null);
  });

  it("queryReferences should filter by type", async () => {
    await saveReference("IceShield", "TestGame", undefined, "spell", ["defensive"], "Reduces ice damage.");
    await saveReference("SteelSword", "TestGame", undefined, "equipment", ["melee"], "A sturdy sword.");

    const spells = await queryReferences(undefined, undefined, "spell");
    assert.ok(spells.length >= 2, "Should find at least the 2 spells");
    assert.ok(spells.every((r) => r.type === "spell"));

    const equipment = await queryReferences(undefined, undefined, "equipment");
    assert.ok(equipment.length >= 1);
    assert.ok(equipment.every((r) => r.type === "equipment"));
  });

  it("queryReferences should filter by tags", async () => {
    const offensive = await queryReferences(undefined, undefined, undefined, ["offensive"]);
    assert.ok(offensive.length >= 1);
    assert.ok(offensive.every((r) => r.tags.includes("offensive")));
  });

  it("queryReferences with no args should return all references", async () => {
    const all = await queryReferences();
    assert.ok(all.length >= 3, "Should return all saved references");
  });

  it("deleteReferencesByGame should hard-delete all files and remove from index", async () => {
    await saveReference("DeleteSword", "DeleteGame", undefined, "equipment", ["melee"], "A sword.");
    await saveReference("DeleteShield", "DeleteGame", undefined, "equipment", ["defense"], "A shield.");

    const before = await queryReferences("DeleteGame");
    assert.ok(before.length >= 2, "Should have references before deletion");

    await deleteReferencesByGame("DeleteGame");

    const after = await queryReferences("DeleteGame");
    assert.strictEqual(after.length, 0, "No references should remain after deletion");

    // Files should be gone — getReference returns null
    const sword = await getReference("DeleteSword", "DeleteGame");
    assert.strictEqual(sword, null);
  });

  it("deleteReferencesByGame should handle a game with no references without throwing", async () => {
    await deleteReferencesByGame("totally-unknown-game-xyz");
    // No error = pass
  });

  it("rebuildIndex should re-scan and restore entries from disk", async () => {
    // Rebuild from disk — all saved files should be picked up again
    await rebuildIndex();

    const all = await queryReferences();
    assert.ok(all.length >= 3);
  });

  it("getReference fallback: exact game+version > game+latest > general+latest", async () => {
    // Set up 3 tiers of the same reference
    await saveReference("FallbackRef", "general", "latest", "rule", [], "General latest content.");
    await saveReference("FallbackRef", "FallbackGame", "latest", "rule", [], "Game latest content.");
    await saveReference("FallbackRef", "FallbackGame", "v2", "rule", [], "Game v2 content.");

    // Exact match should win
    const exact = await getReference("FallbackRef", "FallbackGame", "v2");
    assert.ok(exact !== null);
    assert.ok(exact!.content.includes("Game v2 content."));

    // Missing exact version should fall back to game+latest
    const gameLatest = await getReference("FallbackRef", "FallbackGame", "v99");
    assert.ok(gameLatest !== null);
    assert.ok(gameLatest!.content.includes("Game latest content."));

    // Different game should fall back to general+latest
    const generalFallback = await getReference("FallbackRef", "OtherGame");
    assert.ok(generalFallback !== null);
    assert.ok(generalFallback!.content.includes("General latest content."));
  });

  it("getReference should respect deleted tombstone at each priority level", async () => {
    await saveReference("TombstoneRef", "TombGame", "latest", "rule", [], "Alive content.", true);

    const ref = await getReference("TombstoneRef", "TombGame");
    assert.strictEqual(ref, null, "Deleted (tombstoned) reference should return null");
  });

  it("getReference without game: exact version > latest", async () => {
    await saveReference("NoGameRef", "SomeGame", "latest", "rule", [], "Latest content.");
    await saveReference("NoGameRef", "SomeGame", "v5", "rule", [], "V5 content.");

    const v5 = await getReference("NoGameRef", undefined, "v5");
    assert.ok(v5 !== null);
    assert.ok(v5!.content.includes("V5 content."));

    const latest = await getReference("NoGameRef");
    assert.ok(latest !== null);
    assert.ok(latest!.content.includes("Latest content."));
  });

  it("saveReferenceBatch should save multiple references atomically", async () => {
    const { saveReferenceBatch } = await import("../../../src/services/ReferenceStore.js");

    await saveReferenceBatch([
      { name: "BatchRef1", game: "BatchGame", version: "latest", type: "rule", tags: ["batch"], content: "Batch content 1." },
      { name: "BatchRef2", game: "BatchGame", version: "latest", type: "spell", tags: ["batch", "magic"], content: "Batch content 2." },
      { name: "BatchRef3", game: "BatchGame", version: "latest", type: "equipment", tags: ["batch"], content: "Batch content 3." },
    ]);

    const ref1 = await getReference("BatchRef1", "BatchGame");
    assert.ok(ref1 !== null, "BatchRef1 should be saved");
    assert.ok(ref1!.content.includes("Batch content 1."));

    const ref2 = await getReference("BatchRef2", "BatchGame");
    assert.ok(ref2 !== null, "BatchRef2 should be saved");
    assert.strictEqual(ref2!.type, "spell");

    const ref3 = await getReference("BatchRef3", "BatchGame");
    assert.ok(ref3 !== null, "BatchRef3 should be saved");

    const all = await queryReferences("BatchGame", undefined, undefined, ["batch"]);
    assert.ok(all.length >= 3, "All batch refs should be queryable by tag");
  });

  it("initialize called twice should preserve existing data (conditional rebuild)", async () => {
    // Save a reference, then re-initialize. Data should persist because
    // the schema version hasn't changed, so no rebuild occurs.
    await saveReference("PersistTest", "TestGame", undefined, "spell", ["test"], "Should survive re-init.");

    // Re-initialize (should be a no-op if schema is current)
    await initialize();

    const ref = await getReference("PersistTest", "TestGame");
    assert.ok(ref !== null, "Reference should persist across initialize() calls");
    assert.strictEqual(ref!.name, "PersistTest");
    assert.ok(ref!.content.includes("Should survive re-init."));
  });
});
