import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ensureDataDirectory } from "./services/RulebookStore.js";
import { registerHandlers } from "./registerHandlers.js";
import * as ReferenceStore from "./services/ReferenceStore.js";
import * as SessionStore from "./services/SessionStore.js";

export { registerHandlers } from "./registerHandlers.js";

const server = new Server(
  {
    name: "boardgame-designer-mcp",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerHandlers(server);

async function main() {
  await ensureDataDirectory();
  await ReferenceStore.initialize();
  await SessionStore.initialize();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Boardgame Designer MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
