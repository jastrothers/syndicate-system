/**
 * Snapshot and regression testing utilities
 *
 * Usage:
 *   // First run to create snapshot
 *   await captureSnapshot(output, "my-test");
 *
 *   // Subsequent runs to compare
 *   assertSnapshotMatches(output, "my-test");
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import assert from "node:assert";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = path.join(__dirname, "..", "fixtures", "snapshots");

/**
 * Capture a snapshot (overwrites if exists)
 */
export async function captureSnapshot(data: any, testName: string): Promise<void> {
  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${testName}.json`);
  await fs.writeFile(
    snapshotPath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

/**
 * Assert data matches snapshot
 */
export async function assertSnapshotMatches(
  data: any,
  testName: string
): Promise<void> {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${testName}.json`);

  try {
    const snapshotContent = await fs.readFile(snapshotPath, "utf-8");
    const snapshot = JSON.parse(snapshotContent);
    assert.deepStrictEqual(
      data,
      snapshot,
      `Snapshot mismatch for ${testName}`
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Snapshot not found for ${testName}. Run with SNAPSHOT_UPDATE=1 to capture.`
      );
    }
    throw e;
  }
}

/**
 * Update snapshots if SNAPSHOT_UPDATE=1
 */
export async function updateSnapshotIfNeeded(
  data: any,
  testName: string
): Promise<void> {
  if (process.env.SNAPSHOT_UPDATE === "1") {
    await captureSnapshot(data, testName);
  } else {
    await assertSnapshotMatches(data, testName);
  }
}
