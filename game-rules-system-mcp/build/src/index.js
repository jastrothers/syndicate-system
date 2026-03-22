import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { cardTools, rulebookTools, sessionTools, referenceTools, gameTools, designTools } from "./handlers/index.js";
import { ensureDataDirectory } from "./services/RulebookStore.js";
import { zodToJsonSchema } from "zod-to-json-schema";
export function registerHandlers(server) {
    const allTools = [
        ...cardTools,
        ...rulebookTools,
        ...sessionTools,
        ...referenceTools,
        ...gameTools,
        ...designTools,
    ];
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: allTools.map((t) => ({ name: t.name, description: t.description, inputSchema: zodToJsonSchema(t.schema) })),
    }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const tool = allTools.find((t) => t.name === request.params.name);
        if (!tool) {
            return {
                isError: true,
                content: [{ type: "text", text: `Tool not found: ${request.params.name}` }]
            };
        }
        try {
            const parsedArgs = tool.schema.parse(request.params.arguments || {});
            return await tool.handler(parsedArgs);
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: String(error?.stack || error?.message || error) }]
            };
        }
    });
}
import * as ReferenceStore from "./services/ReferenceStore.js";
import * as SessionStore from "./services/SessionStore.js";
const server = new Server({
    name: "boardgame-designer-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
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
