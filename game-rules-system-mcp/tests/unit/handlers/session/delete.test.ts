import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deleteSessionTool } from "../../../../src/handlers/session/delete.js";

describe("deleteSessionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(deleteSessionTool.name, "delete_playtest_session");
  });

  it("has a handler function", () => {
    assert.equal(typeof deleteSessionTool.handler, "function");
  });

  it("schema accepts a valid sessionId", () => {
    const result = deleteSessionTool.schema.safeParse({ sessionId: "abc-123-def" });
    assert.ok(result.success);
  });

  it("schema rejects missing sessionId", () => {
    const result = deleteSessionTool.schema.safeParse({});
    assert.ok(!result.success, "Missing sessionId should fail");
  });

  it("schema rejects non-string sessionId", () => {
    const result = deleteSessionTool.schema.safeParse({ sessionId: 42 });
    assert.ok(!result.success, "Non-string sessionId should fail");
  });
});
