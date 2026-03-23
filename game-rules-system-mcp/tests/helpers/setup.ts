import * as os from "os";
import * as path from "path";
import { rmSync } from "fs";
import * as fs from "fs/promises";

/**
 * Global isolation setup — executed when this module is loaded via:
 *   node --import ./build/tests/helpers/setup.js --test ...
 *
 * Sets TEST_DATA_DIR before any test file (and therefore any service module)
 * is loaded, so DATA_DIR in paths.ts resolves to a temp directory instead of
 * the real game-data/. The temp directory is removed synchronously on exit.
 *
 * The guard prevents double-setup when the module is also imported by
 * integration/e2e tests that set their own TEST_DATA_DIR first.
 */
if (!process.env.TEST_DATA_DIR) {
  const dir = path.join(os.tmpdir(), `game-rules-test-${Date.now()}`);
  process.env.TEST_DATA_DIR = dir;
  process.on("exit", () => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });
}

/**
 * Creates an isolated temporary data directory and sets TEST_DATA_DIR.
 *
 * Use this in integration/e2e tests that spawn a fresh server process — the
 * env var is inherited by the child so DATA_DIR resolves correctly there.
 *
 * @example
 * let cleanup: () => Promise<void>;
 * t.before(() => { ({ cleanup } = createTestDataDir()); });
 * t.after(() => cleanup());
 */
export function createTestDataDir(prefix: string = "test-mcp"): {
  dir: string;
  cleanup: () => Promise<void>;
} {
  const dir = path.join(
    os.tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  process.env.TEST_DATA_DIR = dir;

  const cleanup = async () => {
    delete process.env.TEST_DATA_DIR;
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  return { dir, cleanup };
}
