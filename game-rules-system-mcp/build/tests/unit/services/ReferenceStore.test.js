import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
// Point ReferenceStore at a temp directory for isolation
const tmpDir = path.join(os.tmpdir(), `ref-test-${Date.now()}`);
process.env.TEST_DATA_DIR = tmpDir;
// Must be imported AFTER env var is set (paths.ts reads env at module load)
const { initialize, saveReference, getReference, queryReferences, rebuildIndex, closeDb } = await import("../../../src/services/ReferenceStore.js");
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
        assert.strictEqual(ref.name, "FireballSpell");
        assert.strictEqual(ref.type, "spell");
        assert.ok(ref.tags.includes("offensive"));
        assert.ok(ref.tags.includes("magic"));
        assert.ok(ref.content.includes("Deals 3d6 fire damage."));
    });
    it("saveReference should update an existing reference (upsert)", async () => {
        await saveReference("FireballSpell", "TestGame", undefined, "spell", ["offensive"], "Updated: 4d6 fire damage.");
        const ref = await getReference("FireballSpell");
        assert.ok(ref.content.includes("Updated: 4d6 fire damage."));
        assert.strictEqual(ref.tags.length, 1);
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
    it("rebuildIndex should re-scan and restore entries from disk", async () => {
        // Rebuild from disk — all saved files should be picked up again
        await rebuildIndex();
        const all = await queryReferences();
        assert.ok(all.length >= 3);
    });
});
