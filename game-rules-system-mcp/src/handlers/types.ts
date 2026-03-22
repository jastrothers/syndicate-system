import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export interface ToolDefinition<T extends z.ZodTypeAny = any> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>) => Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
  }>;
}

// Helper to convert ToolDefinition into MCP SDK Tool
import { zodToJsonSchema } from "zod-to-json-schema";

export function toMcpTool(def: ToolDefinition): Tool {
  const jsonSchema = zodToJsonSchema(def.schema) as any;
  if (!jsonSchema.type) {
    jsonSchema.type = "object";
  }
  return {
    name: def.name,
    description: def.description,
    inputSchema: jsonSchema,
  };
}
