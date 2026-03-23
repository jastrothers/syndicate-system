import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDesignSessionTool,
  deleteDesignSessionTool,
  designCoreTools,
} from "../../../../src/handlers/design/core.js";

// ── Tool registration ─────────────────────────────────────────────────────────

describe("designCoreTools registration", () => {
  it("exports five tools", () => {
    assert.equal(designCoreTools.length, 5);
  });

  it("contains the expected tool names", () => {
    const names = designCoreTools.map((t) => t.name);
    assert.deepEqual(names.sort(), [
      "add_design_step",
      "create_design_session",
      "delete_design_session",
      "get_design_session",
      "list_design_sessions",
    ]);
  });
});

// ── create_design_session ─────────────────────────────────────────────────────

describe("createDesignSessionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(createDesignSessionTool.name, "create_design_session");
  });

  it("schema requires gameName and theme", () => {
    const valid = createDesignSessionTool.schema.safeParse({ gameName: "heist", theme: "noir" });
    assert.ok(valid.success);

    const missing = createDesignSessionTool.schema.safeParse({ gameName: "heist" });
    assert.ok(!missing.success, "Missing theme should fail");
  });
});

// ── delete_design_session ─────────────────────────────────────────────────────

describe("deleteDesignSessionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(deleteDesignSessionTool.name, "delete_design_session");
  });

  it("has a handler function", () => {
    assert.equal(typeof deleteDesignSessionTool.handler, "function");
  });

  it("schema requires gameName, sessionId, and confirm: true", () => {
    const valid = deleteDesignSessionTool.schema.safeParse({
      gameName: "heist",
      sessionId: "abc-123",
      confirm: true,
    });
    assert.ok(valid.success);

    const missingConfirm = deleteDesignSessionTool.schema.safeParse({
      gameName: "heist",
      sessionId: "abc-123",
    });
    assert.ok(!missingConfirm.success, "Missing confirm should fail");
  });

  it("schema rejects missing gameName", () => {
    const result = deleteDesignSessionTool.schema.safeParse({ sessionId: "abc-123" });
    assert.ok(!result.success, "Missing gameName should fail");
  });

  it("schema rejects missing sessionId", () => {
    const result = deleteDesignSessionTool.schema.safeParse({ gameName: "heist" });
    assert.ok(!result.success, "Missing sessionId should fail");
  });
});
