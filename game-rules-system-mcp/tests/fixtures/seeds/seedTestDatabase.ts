/**
 * Test database seeding utilities
 *
 * Usage:
 *   const { cleanup } = await seedGameData(testDataDir);
 *   t.after(() => cleanup());
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createTestRulebook, createTestSession, createTestDesignSession } from "../../helpers/testUtils.js";

export interface SeededData {
  rulebookPath: string;
  sessionPath: string;
  designSessionPath: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a minimal test rulebook file in the test data directory
 */
async function seedMinimalRulebook(
  testDataDir: string,
  gameId: string
): Promise<string> {
  const rulebooksDir = path.join(testDataDir, gameId, "rulebooks");
  await fs.mkdir(rulebooksDir, { recursive: true });

  const rulebook = createTestRulebook(`Test Game: ${gameId}`);
  const rulebookPath = path.join(rulebooksDir, "latest.json");

  await fs.writeFile(rulebookPath, JSON.stringify(rulebook, null, 2), "utf-8");
  return rulebookPath;
}

/**
 * Create a test session with initial state
 */
async function seedSession(
  testDataDir: string,
  gameId: string,
  sessionState?: Record<string, any>
): Promise<string> {
  const sessionsDir = path.join(testDataDir, gameId, "sessions");
  await fs.mkdir(sessionsDir, { recursive: true });

  const session = createTestSession(gameId, { state: sessionState || {} });
  const sessionPath = path.join(sessionsDir, `${session.sessionId}.json`);

  await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), "utf-8");
  return sessionPath;
}

/**
 * Create a design session with initial steps
 */
async function seedDesignSession(
  testDataDir: string,
  gameId: string
): Promise<string> {
  const designDir = path.join(testDataDir, gameId, "design");
  await fs.mkdir(designDir, { recursive: true });

  const designSession = createTestDesignSession(gameId);
  const designPath = path.join(designDir, `${designSession.sessionId}.json`);

  await fs.writeFile(designPath, JSON.stringify(designSession, null, 2), "utf-8");
  return designPath;
}

/**
 * Seed all test data for a game
 *
 * @example
 * const { rulebookPath, cleanup } = await seedGameData(tmpDir, "test-game");
 * t.after(() => cleanup());
 */
export async function seedGameData(
  testDataDir: string,
  gameId: string,
  options?: {
    includeSession?: boolean;
    includeDesign?: boolean;
    sessionState?: Record<string, any>;
  }
): Promise<SeededData> {
  const gameDir = path.join(testDataDir, gameId);
  await fs.mkdir(gameDir, { recursive: true });

  const rulebookPath = await seedMinimalRulebook(testDataDir, gameId);

  let sessionPath = "";
  if (options?.includeSession) {
    sessionPath = await seedSession(testDataDir, gameId, options.sessionState);
  }

  let designSessionPath = "";
  if (options?.includeDesign) {
    designSessionPath = await seedDesignSession(testDataDir, gameId);
  }

  return {
    rulebookPath,
    sessionPath,
    designSessionPath,
    cleanup: async () => {
      try {
        await fs.rm(gameDir, { recursive: true, force: true });
      } catch (e) {
        console.error(`Failed to clean up seeded data in ${gameDir}:`, e);
      }
    },
  };
}

/**
 * Seed reference data (Markdown files with YAML frontmatter)
 */
export async function seedReference(
  testDataDir: string,
  gameId: string,
  references: Array<{
    filename: string;
    title: string;
    content: string;
    tags?: string[];
  }>
): Promise<string> {
  const refDir = path.join(testDataDir, gameId, "reference", "latest");
  await fs.mkdir(refDir, { recursive: true });

  for (const ref of references) {
    const yaml = `---
title: "${ref.title}"
tags: [${ref.tags?.map((t) => `"${t}"`).join(", ") || ""}]
---

${ref.content}`;

    const refPath = path.join(refDir, ref.filename);
    await fs.writeFile(refPath, yaml, "utf-8");
  }

  return refDir;
}
