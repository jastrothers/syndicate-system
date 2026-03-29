import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getSessionDir, SESSION_INDEX_DB } from "../../../src/config/paths.js";
import { initialize, createSession, saveSession, closeDb } from "../../../src/services/SessionStore.js";
import { getSessionStats } from "../../../src/services/SessionStats.js";

const TEST_RULEBOOK = "stats-test-" + Date.now();

describe("SessionStats.getSessionStats", () => {
  let sessionId: string;

  before(async () => {
    // Initialize session DB (required for getSession to work via SQLite index)
    try { await fs.rm(SESSION_INDEX_DB, { force: true }); } catch {}
    await initialize();

    // Create a session with known state and ledger
    const session = await createSession(TEST_RULEBOOK);
    sessionId = session.sessionId;

    // Populate state and ledger manually then save
    session.state = { gold: 100, deck: ["a", "b", "c"], hand: ["x"] };
    session.ledger = [
      { timestamp: new Date().toISOString(), actionType: "update_game_state", actor: "System", data: {} },
      { timestamp: new Date().toISOString(), actionType: "draw_from_deck", actor: "Player 1", data: {} },
      { timestamp: new Date().toISOString(), actionType: "draw_from_deck", actor: "Player 1", data: {} },
      { timestamp: new Date().toISOString(), actionType: "shuffle_deck", actor: "Player 1", data: {} },
    ];

    await saveSession(sessionId, session);
  });

  after(async () => {
    closeDb();
    try {
      const dir = getSessionDir(TEST_RULEBOOK);
      await fs.rm(dir, { recursive: true, force: true });
    } catch {}
    try { await fs.rm(SESSION_INDEX_DB, { force: true }); } catch {}
  });

  it("returns correct stateKeys array", async () => {
    const stats = await getSessionStats(sessionId);
    assert.deepStrictEqual(stats.stateKeys.sort(), ["deck", "gold", "hand"]);
  });

  it("ledgerCount equals ledger array length", async () => {
    const stats = await getSessionStats(sessionId);
    assert.strictEqual(stats.ledgerCount, 4);
  });

  it("ledgerByType aggregates counts correctly", async () => {
    const stats = await getSessionStats(sessionId);
    assert.strictEqual(stats.ledgerByType["draw_from_deck"], 2);
    assert.strictEqual(stats.ledgerByType["update_game_state"], 1);
    assert.strictEqual(stats.ledgerByType["shuffle_deck"], 1);
  });

  it("returns session metadata fields", async () => {
    const stats = await getSessionStats(sessionId);
    assert.strictEqual(stats.sessionId, sessionId);
    assert.strictEqual(stats.rulebookName, TEST_RULEBOOK);
    assert.ok(typeof stats.createdAt === "string");
    assert.ok(typeof stats.lastUpdatedAt === "string");
  });
});
