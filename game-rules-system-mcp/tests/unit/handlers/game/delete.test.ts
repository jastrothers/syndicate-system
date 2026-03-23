import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deleteGameTool } from "../../../../src/handlers/game/delete.js";

describe("deleteGameTool", () => {
  it("has the correct tool name", () => {
    assert.equal(deleteGameTool.name, "delete_game");
  });

  it("has a handler function", () => {
    assert.equal(typeof deleteGameTool.handler, "function");
  });

  it("schema accepts valid input with confirm: true", () => {
    const result = deleteGameTool.schema.safeParse({ gameName: "test-game", confirm: true });
    assert.ok(result.success);
  });

  it("schema accepts valid input with confirm: false", () => {
    // Schema-level parsing should succeed; the handler rejects false at runtime
    const result = deleteGameTool.schema.safeParse({ gameName: "test-game", confirm: false });
    assert.ok(result.success);
  });

  it("schema rejects missing gameName", () => {
    const result = deleteGameTool.schema.safeParse({ confirm: true });
    assert.ok(!result.success, "Missing gameName should fail");
  });

  it("schema rejects missing confirm", () => {
    const result = deleteGameTool.schema.safeParse({ gameName: "test-game" });
    assert.ok(!result.success, "Missing confirm should fail");
  });

  it("schema rejects confirm as a non-boolean", () => {
    const result = deleteGameTool.schema.safeParse({ gameName: "test-game", confirm: "yes" });
    assert.ok(!result.success, "confirm must be a boolean");
  });
});
