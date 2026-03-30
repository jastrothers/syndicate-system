import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

export interface SetupOptions {
  /** Reuse an existing data directory instead of creating a fresh one. */
  dataDir?: string;
  /** If true, cleanup() will close the transport but NOT delete the data directory. */
  keepDataOnClose?: boolean;
}

export async function setupTestServer(testId: string, options: SetupOptions = {}) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const serverPath = path.join(__dirname, "..", "..", "src", "index.js");
  const TEST_DATA_DIR = options.dataDir ?? path.join(os.tmpdir(), `test-mcp-int-${testId}-${Date.now()}`);
  process.env.TEST_DATA_DIR = TEST_DATA_DIR;

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: { ...process.env, TEST_DATA_DIR }
  });

  const client = new Client(
    { name: `test-client-${testId}`, version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  const cleanup = async () => {
    await transport.close();
    if (!options.keepDataOnClose) {
      try {
        const fs = await import("fs/promises");
        await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
      } catch (e) {
        console.error(`Cleanup failed for ${testId}:`, e);
      }
    }
  };

  return { client, cleanup, TEST_DATA_DIR };
}
