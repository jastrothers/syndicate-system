import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
export async function setupTestServer(testId) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const serverPath = path.join(__dirname, "..", "..", "src", "index.js");
    const TEST_DATA_DIR = path.join(os.tmpdir(), `test-mcp-int-${testId}-${Date.now()}`);
    process.env.TEST_DATA_DIR = TEST_DATA_DIR;
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: { ...process.env, TEST_DATA_DIR }
    });
    const client = new Client({ name: `test-client-${testId}`, version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    const cleanup = async () => {
        await transport.close();
        try {
            const fs = await import("fs/promises");
            await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
        }
        catch (e) {
            console.error(`Cleanup failed for ${testId}:`, e);
        }
    };
    return { client, cleanup, TEST_DATA_DIR };
}
