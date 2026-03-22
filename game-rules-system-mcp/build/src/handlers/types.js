// Helper to convert ToolDefinition into MCP SDK Tool
import { zodToJsonSchema } from "zod-to-json-schema";
export function toMcpTool(def) {
    const jsonSchema = zodToJsonSchema(def.schema);
    if (!jsonSchema.type) {
        jsonSchema.type = "object";
    }
    return {
        name: def.name,
        description: def.description,
        inputSchema: jsonSchema,
    };
}
