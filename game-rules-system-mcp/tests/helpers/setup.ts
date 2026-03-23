import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";

/**
 * Creates an isolated temporary data directory for a test file and sets
 * TEST_DATA_DIR so all path resolution in the MCP services points there.
 *
 * Call in before() and invoke the returned cleanup in after().
 *
 * @example
 * const { cleanup } = createTestDataDir();
 * before(() => { /* already set *\/ });
 * after(cleanup);
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
