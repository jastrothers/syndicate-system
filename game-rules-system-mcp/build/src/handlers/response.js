/**
 * Shared response utilities for MCP tool handlers.
 * Compact JSON (no pretty-print) to minimize token consumption by AI consumers.
 */
export function jsonResponse(data, hint) {
    const payload = hint && typeof data === "object" && data !== null
        ? { ...data, _hint: hint }
        : data;
    return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}
export function textResponse(msg) {
    return { content: [{ type: "text", text: msg }] };
}
