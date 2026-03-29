import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getRulebookDir } from "../../../src/config/paths.js";
import { saveRulebook } from "../../../src/services/RulebookStore.js";
import { getComponents, upsertComponent, deleteComponent } from "../../../src/services/ComponentStore.js";
import { Rulebook, Component } from "../../../src/types/index.js";

const TEST_GAME = "component-test-" + Date.now();

const INITIAL_RULEBOOK: Rulebook = {
  metadata: { title: "Component Test Game", version: "1.0.0", lastUpdated: new Date().toISOString() },
  sections: {},
  components: [
    { type: "card", name: "Market Card", quantity: 60, description: "Standard market card" },
    { type: "token", name: "Gold Token", quantity: 30 },
  ],
};

describe("ComponentStore", () => {
  before(async () => {
    await fs.mkdir(getRulebookDir(TEST_GAME), { recursive: true });
    await saveRulebook(TEST_GAME, INITIAL_RULEBOOK);
  });

  after(async () => {
    try { await fs.rm(getRulebookDir(TEST_GAME), { recursive: true, force: true }); } catch {}
  });

  it("getComponents returns existing components array", async () => {
    const result = await getComponents(TEST_GAME);
    assert.strictEqual(result.components.length, 2);
    assert.ok(result.components.some(c => c.name === "Market Card"));
    assert.ok(result.components.some(c => c.name === "Gold Token"));
  });

  it("upsertComponent adds a new component when name not found", async () => {
    const newComp: Component = { type: "die", name: "Action Die", quantity: 4 };
    const result = await upsertComponent(TEST_GAME, newComp);
    assert.strictEqual(result.upserted, "Action Die");
    assert.ok(result.components.some(c => c.name === "Action Die"));
    assert.strictEqual(result.components.length, 3);
  });

  it("upsertComponent replaces existing component with same name", async () => {
    const updated: Component = { type: "card", name: "Market Card", quantity: 80, description: "Updated market card" };
    const result = await upsertComponent(TEST_GAME, updated);
    assert.strictEqual(result.upserted, "Market Card");
    const mc = result.components.find(c => c.name === "Market Card")!;
    assert.strictEqual(mc.quantity, 80);
    assert.strictEqual(mc.description, "Updated market card");
    // No duplicates
    assert.strictEqual(result.components.filter(c => c.name === "Market Card").length, 1);
  });

  it("deleteComponent removes a component by name", async () => {
    const result = await deleteComponent(TEST_GAME, "Gold Token");
    assert.strictEqual(result.deleted, "Gold Token");
    assert.ok(!result.components.some(c => c.name === "Gold Token"));
  });

  it("deleteComponent throws if component name not found", async () => {
    await assert.rejects(
      () => deleteComponent(TEST_GAME, "Nonexistent Component"),
      /not found/i
    );
  });

  it("getComponents returns empty array for rulebook with no components field", async () => {
    const emptyGame = "empty-comp-" + Date.now();
    try {
      await fs.mkdir(getRulebookDir(emptyGame), { recursive: true });
      const rb: Rulebook = {
        metadata: { title: "Empty", version: "1.0.0", lastUpdated: new Date().toISOString() },
        sections: {},
      };
      await saveRulebook(emptyGame, rb);
      const result = await getComponents(emptyGame);
      assert.deepStrictEqual(result.components, []);
    } finally {
      try { await fs.rm(getRulebookDir(emptyGame), { recursive: true, force: true }); } catch {}
    }
  });
});
