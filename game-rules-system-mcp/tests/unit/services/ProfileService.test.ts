import { describe, it, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getDesignerProfilePath } from "../../../src/config/paths.js";
import { getProfile, saveProfile, updateAffinities, updateComplexityTolerance } from "../../../src/services/ProfileService.js";
import { DesignerProfile } from "../../../src/types/index.js";

describe("ProfileService Units", () => {
  const profilePath = getDesignerProfilePath();

  after(async () => {
    try {
      await fs.unlink(profilePath);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  });

  it("getProfile returns DEFAULT_PROFILE when no file exists", async () => {
    try { await fs.unlink(profilePath); } catch {}
    const profile = await getProfile();
    assert.deepStrictEqual(profile.affinities, {});
    assert.strictEqual(profile.complexityTolerance, 3);
    assert.deepStrictEqual(profile.thematicPreferences, []);
  });

  it("saveProfile persists and can be read back", async () => {
    const profile: DesignerProfile = {
      affinities: { "deckbuilding": 0.5 },
      complexityTolerance: 4,
      thematicPreferences: ["fantasy"],
      lastUpdated: new Date().toISOString(),
    };
    await saveProfile(profile);
    const loaded = await getProfile();
    assert.strictEqual(loaded.affinities["deckbuilding"], 0.5);
    assert.strictEqual(loaded.complexityTolerance, 4);
  });

  it("updateAffinities increases weight on accept", async () => {
    try { await fs.unlink(profilePath); } catch {}
    await updateAffinities(["deckbuilding"], 0.1);
    const profile = await getProfile();
    assert.ok(profile.affinities["deckbuilding"] > 0, "deckbuilding affinity should be positive");
  });

  it("updateAffinities decreases weight on reject", async () => {
    try { await fs.unlink(profilePath); } catch {}
    await updateAffinities(["auction"], -0.2);
    const profile = await getProfile();
    assert.ok(profile.affinities["auction"] < 0, "auction affinity should be negative");
  });

  it("updateAffinities clamps values to [-1, 1]", async () => {
    try { await fs.unlink(profilePath); } catch {}
    // Apply large positive delta multiple times
    for (let i = 0; i < 20; i++) {
      await updateAffinities(["worker-placement"], 0.2);
    }
    const profile = await getProfile();
    assert.ok(profile.affinities["worker-placement"] <= 1, "Affinity should not exceed 1");

    // Apply large negative delta multiple times
    for (let i = 0; i < 20; i++) {
      await updateAffinities(["roll-and-move"], -0.2);
    }
    const profile2 = await getProfile();
    assert.ok(profile2.affinities["roll-and-move"] >= -1, "Affinity should not go below -1");
  });

  it("updateAffinities decays non-targeted mechanisms", async () => {
    try { await fs.unlink(profilePath); } catch {}
    // Set an initial affinity for mech-A
    await saveProfile({
      affinities: { "mech-a": 0.5, "mech-b": 0.0 },
      complexityTolerance: 3,
      thematicPreferences: [],
      lastUpdated: new Date().toISOString(),
    });
    // Update mech-b only; mech-a should decay
    await updateAffinities(["mech-b"], 0.1);
    const profile = await getProfile();
    assert.ok(profile.affinities["mech-a"] < 0.5, "Non-targeted mechanism should decay");
    assert.ok(profile.affinities["mech-a"] > 0, "Decay should be small (0.99x), not zero");
  });

  it("updateComplexityTolerance clamps to [1, 5]", async () => {
    await updateComplexityTolerance(10);
    let profile = await getProfile();
    assert.strictEqual(profile.complexityTolerance, 5);

    await updateComplexityTolerance(0);
    profile = await getProfile();
    assert.strictEqual(profile.complexityTolerance, 1);

    await updateComplexityTolerance(3);
    profile = await getProfile();
    assert.strictEqual(profile.complexityTolerance, 3);
  });
});
