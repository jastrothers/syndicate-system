import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getDesignerProfilePath, getDecisionLogPath, getGameDir } from "../../../src/config/paths.js";
import { processDecision } from "../../../src/services/NovaService.js";
import { getProfile } from "../../../src/services/ProfileService.js";

describe("NovaService Units", () => {
  const testGame = "nova-test-game-" + Date.now();
  const testSessionId = "test-session-id";
  const profilePath = getDesignerProfilePath();

  before(async () => {
    // Ensure game dir exists for decision log
    const gameDir = getGameDir(testGame);
    await fs.mkdir(gameDir, { recursive: true });
    // Clear profile
    try { await fs.unlink(profilePath); } catch {}
  });

  after(async () => {
    const gameDir = getGameDir(testGame);
    try { await fs.rm(gameDir, { recursive: true, force: true }); } catch {}
    try { await fs.unlink(profilePath); } catch {}
  });

  it("processDecision records entry in decision log", async () => {
    await processDecision(testGame, testSessionId, 1, "accept", "Loved this mechanic", ["deckbuilding"]);
    const logPath = getDecisionLogPath(testGame);
    const raw = await fs.readFile(logPath, "utf-8");
    const log = JSON.parse(raw);
    assert.strictEqual(log.decisions.length, 1);
    assert.strictEqual(log.decisions[0].decision, "accept");
    assert.strictEqual(log.decisions[0].stepId, 1);
    assert.deepStrictEqual(log.decisions[0].impactedMechanisms, ["deckbuilding"]);
  });

  it("processDecision updates profile positively on accept", async () => {
    try { await fs.unlink(profilePath); } catch {}
    await processDecision(testGame, testSessionId, 2, "accept", "Great", ["deckbuilding"]);
    const profile = await getProfile();
    assert.ok((profile.affinities["deckbuilding"] ?? 0) > 0, "Accept should increase affinity");
  });

  it("processDecision updates profile negatively on reject", async () => {
    try { await fs.unlink(profilePath); } catch {}
    await processDecision(testGame, testSessionId, 3, "reject", "Disliked", ["roll-and-move"]);
    const profile = await getProfile();
    assert.ok((profile.affinities["roll-and-move"] ?? 0) < 0, "Reject should decrease affinity");
  });

  it("processDecision does not update profile on defer", async () => {
    try { await fs.unlink(profilePath); } catch {}
    await processDecision(testGame, testSessionId, 4, "defer", "Not sure", ["auction"]);
    const profile = await getProfile();
    // Profile should still be the default (empty affinities) since defer doesn't update
    assert.strictEqual(profile.affinities["auction"], undefined);
  });

});
