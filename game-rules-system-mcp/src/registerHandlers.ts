import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { cardTools, rulebookTools, sessionTools, referenceTools, gameTools, designTools, novaTools } from "./handlers/index.js";
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

  // Pre-compute tool listing once (avoids zodToJsonSchema on every ListTools request)
  const toolListing = allTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema) as any,
  }));

  // Map for O(1) tool dispatch (replaces linear .find() scan)
  const toolMap = new Map(allTools.map((t) => [t.name, t]));

  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => ({ tools: toolListing })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: any) => {
      const tool = toolMap.get(request.params.name);
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
