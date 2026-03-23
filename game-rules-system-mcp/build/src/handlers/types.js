/**
 * Helper to define a tool with full type inference on handler args.
 * Eliminates the need for `(args: any)` annotations.
 */
export function defineTool(def) {
    return def;
}
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
