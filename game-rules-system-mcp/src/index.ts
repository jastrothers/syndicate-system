import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { cardTools, rulebookTools, sessionTools, referenceTools, gameTools, designTools, novaTools } from "./handlers/index.js";
import { ensureDataDirectory } from "./services/RulebookStore.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export function registerHandlers(server: Server) {
  const allTools = [
    ...cardTools,
    ...rulebookTools,
    ...sessionTools,
    ...referenceTools,
    ...gameTools,
    ...designTools,
    ...novaTools,
  ];

  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => ({
      tools: allTools.map((t) => ({ name: t.name, description: t.description, inputSchema: zodToJsonSchema(t.schema) as any })),
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: any) => {
      const tool = allTools.find((t) => t.name === request.params.name);
      if (!tool) {
        return {
          isError: true,
          content: [{ type: "text", text: `Tool not found: ${request.params.name}` }]
        };
      }
      try {
        const parsedArgs = (tool.schema as any).parse(request.params.arguments || {});
        return await tool.handler(parsedArgs);
      } catch (error: any) {
        const type =
          error?.name === "ZodError" ? "validation"
          : (error?.code === "ENOENT" || error?.code === "EACCES" || error?.code === "EBUSY") ? "io"
          : "logic";
        const message =
          error?.name === "ZodError"
            ? (error.errors ?? []).map((e: any) => `${e.path.join(".")}: ${e.message}`).join("; ")
            : (error?.message || String(error));
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ type, message }) }]
        };
      }
    }
  );
}
import * as ReferenceStore from "./services/ReferenceStore.js";
import * as SessionStore from "./services/SessionStore.js";

const server = new Server(
  {
    name: "boardgame-designer-mcp",
    version: "1.0.0",
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
