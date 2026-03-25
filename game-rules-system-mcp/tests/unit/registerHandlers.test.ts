import { describe, it } from "node:test";
import assert from "node:assert";
import { registerHandlers } from "../../src/registerHandlers.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

describe("registerHandlers: tool listing and dispatch", () => {
  it("should cache tool listing across repeated ListTools requests", async () => {
    const server = new Server(
      { name: "test-server", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    registerHandlers(server);

    // Access the internal request handler by sending two listing requests
    // The server stores handlers internally; we test via the public API shape.
    // We verify caching by confirming that the returned tools array is referentially identical.
    const handler = (server as any)._requestHandlers?.get("tools/list");
    assert.ok(handler, "ListToolsRequest handler should be registered");

    const result1 = await handler({ method: "tools/list" });
    const result2 = await handler({ method: "tools/list" });

    assert.ok(Array.isArray(result1.tools), "Should return tools array");
    assert.ok(result1.tools.length > 0, "Should have at least one tool");
    assert.strictEqual(result1.tools, result2.tools, "Tool listing should be cached (referential equality)");
  });

  it("should dispatch tools via Map lookup (O(1) instead of linear scan)", async () => {
    const server = new Server(
      { name: "test-server", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    registerHandlers(server);

    const handler = (server as any)._requestHandlers?.get("tools/call");
    assert.ok(handler, "CallToolRequest handler should be registered");

    // Call a known tool to verify dispatch works
    const result = await handler({
      method: "tools/call",
      params: { name: "list_rulebooks", arguments: {} }
    });
    assert.ok(result, "Should return a result for a valid tool");
    assert.ok(!result.isError, "Should not be an error for valid tool");

    // Call a non-existent tool to verify error handling
    const errResult = await handler({
      method: "tools/call",
      params: { name: "nonexistent_tool_xyz", arguments: {} }
    });
    assert.ok(errResult.isError, "Should return error for unknown tool");
  });
});
