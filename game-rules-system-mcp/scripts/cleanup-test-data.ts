/**
 * Deletes all test games from game-data/ that match the _test_ naming convention.
 *
 * Run after interactive MCP testing to clean up data created during development:
 *   npm run cleanup:test
 *
 * Convention: all test games must be named with a _test_ prefix so this script
 * can identify and remove them without touching real game data.
 */

import * as fs from "fs/promises";
import { DATA_DIR, getGameDir, sanitizeFileName } from "../src/config/paths.js";
import * as ReferenceStore from "../src/services/ReferenceStore.js";
import * as SessionStore from "../src/services/SessionStore.js";

const TEST_PREFIX = "_test_";

async function cleanupTestData(): Promise<void> {
  let entries: string[];
  try {
    const dirents = await fs.readdir(DATA_DIR, { withFileTypes: true });
    entries = dirents
      .filter((d) => d.isDirectory() && d.name.startsWith(TEST_PREFIX))
      .map((d) => d.name);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log("game-data/ does not exist — nothing to clean.");
      return;
    }
    throw err;
  }

  if (entries.length === 0) {
    console.log(`No test games found (prefix: '${TEST_PREFIX}').`);
    return;
  }

  await SessionStore.initialize();

  let deleted = 0;
  for (const name of entries) {
    const safeName = sanitizeFileName(name);
    const gameDir = getGameDir(name);

    try {
      // Clean SQLite indexes
      await ReferenceStore.deleteReferencesByGame(safeName);
      const sessionPaths = SessionStore.deleteSessionsByGame(name);

      // Delete orphaned session files outside the game dir (legacy edge case)
      for (const sessionPath of sessionPaths) {
        if (!sessionPath.startsWith(gameDir)) {
          await fs.unlink(sessionPath).catch(() => {});
        }
      }

      // Remove the game directory tree
      await fs.rm(gameDir, { recursive: true, force: true });
      console.log(`  deleted: ${name}`);
      deleted++;
    } catch (err) {
      console.error(`  failed to delete '${name}':`, err);
    }
  }

  SessionStore.closeDb();
  console.log(`\nDone. ${deleted}/${entries.length} test game(s) deleted.`);
}

cleanupTestData().catch((err) => {
  console.error("cleanup-test-data failed:", err);
  process.exit(1);
});
