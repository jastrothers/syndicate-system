import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getDesignSessionDir, getGameDir } from "../../../src/config/paths.js";
import {
  createDesignSession,
  getDesignSession,
  addDesignStep,
  listDesignSessions,
  saveDesignSession,
} from "../../../src/services/DesignStore.js";

describe("DesignStore Units", () => {
  const testGame = "design-store-test-" + Date.now();

  before(async () => {
    const dir = getDesignSessionDir(testGame);
    await fs.mkdir(dir, { recursive: true });
  });

  after(async () => {
    const gameDir = getGameDir(testGame);
    try { await fs.rm(gameDir, { recursive: true, force: true }); } catch {}
  });

  it("createDesignSession creates a new session with a UUID and correct shape", async () => {
    const session = await createDesignSession(testGame, "Cyberpunk Heist");
    assert.ok(session.sessionId, "Should have a sessionId");
    assert.strictEqual(session.gameName, testGame);
    assert.strictEqual(session.theme, "Cyberpunk Heist");
    assert.deepStrictEqual(session.steps, []);
    assert.strictEqual(session.status, "active");
    assert.ok(session.createdAt);
    assert.ok(session.lastUpdatedAt);
  });

  it("getDesignSession retrieves a session by gameName + sessionId", async () => {
    const created = await createDesignSession(testGame, "Space Exploration");
    const retrieved = await getDesignSession(testGame, created.sessionId);
    assert.strictEqual(retrieved.sessionId, created.sessionId);
    assert.strictEqual(retrieved.theme, "Space Exploration");
  });

  it("getDesignSession throws for non-existent session", async () => {
    await assert.rejects(
      () => getDesignSession(testGame, "non-existent-uuid"),
      /Design session non-existent-uuid not found/
    );
  });

  it("addDesignStep appends step with timestamp", async () => {
    const session = await createDesignSession(testGame, "Fantasy Theme");
    const updated = await addDesignStep(testGame, session.sessionId, {
      stepNumber: 1,
      persona: "MechanicsArchitect",
      output: "Full mechanics output",
      summary: "Core loop designed",
    });
    assert.strictEqual(updated.steps.length, 1);
    assert.strictEqual(updated.steps[0].stepNumber, 1);
    assert.strictEqual(updated.steps[0].persona, "MechanicsArchitect");
    assert.ok(updated.steps[0].timestamp, "Step should have a timestamp");
  });

  it("addDesignStep appends multiple steps in order", async () => {
    const session = await createDesignSession(testGame, "Multi-Step Game");
    await addDesignStep(testGame, session.sessionId, { stepNumber: 1, persona: "A", output: "o1", summary: "s1" });
    await addDesignStep(testGame, session.sessionId, { stepNumber: 2, persona: "B", output: "o2", summary: "s2" });
    const final = await getDesignSession(testGame, session.sessionId);
    assert.strictEqual(final.steps.length, 2);
    assert.strictEqual(final.steps[0].persona, "A");
    assert.strictEqual(final.steps[1].persona, "B");
  });

  it("listDesignSessions returns all sessions for a game", async () => {
    const gameName = testGame + "-list-test";
    const dir = getDesignSessionDir(gameName);
    await fs.mkdir(dir, { recursive: true });
    try {
      await createDesignSession(gameName, "Theme A");
      await createDesignSession(gameName, "Theme B");
      const sessions = await listDesignSessions(gameName);
      assert.strictEqual(sessions.length, 2);
    } finally {
      const gameDir = getGameDir(gameName);
      await fs.rm(gameDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("listDesignSessions returns empty array for non-existent game", async () => {
    const sessions = await listDesignSessions("no-such-game-" + Date.now());
    assert.deepStrictEqual(sessions, []);
  });

  it("saveDesignSession updates lastUpdatedAt timestamp", async () => {
    const session = await createDesignSession(testGame, "Timestamp Test");
    const original = session.lastUpdatedAt;
    // Small delay to ensure timestamp differs
    await new Promise(r => setTimeout(r, 10));
    session.theme = "Updated Theme";
    await saveDesignSession(session);
    const reloaded = await getDesignSession(testGame, session.sessionId);
    assert.ok(reloaded.lastUpdatedAt >= original, "lastUpdatedAt should be updated");
  });
});
