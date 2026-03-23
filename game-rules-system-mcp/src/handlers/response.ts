/**
 * Shared response utilities for MCP tool handlers.
 * Compact JSON (no pretty-print) to minimize token consumption by AI consumers.
 */

export type McpResponse = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

export function jsonResponse(data: unknown, hint?: string): McpResponse {
  const payload = hint && typeof data === "object" && data !== null
    ? { ...(data as Record<string, unknown>), _hint: hint }
    : data;
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

export function textResponse(msg: string): McpResponse {
  return { content: [{ type: "text", text: msg }] };
}
