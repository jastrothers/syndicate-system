import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  saveReferenceTool,
  getReferenceTool,
  listReferencesTool,
  rebuildReferenceIndexTool,
  deleteReferenceTool,
  referenceTools,
} from "../../../../src/handlers/reference/index.js";

// ── Tool registration ─────────────────────────────────────────────────────────

describe("referenceTools registration", () => {
  it("exports five tools", () => {
    assert.equal(referenceTools.length, 5);
  });

  it("contains the expected tool names", () => {
    const names = referenceTools.map((t) => t.name);
    assert.deepEqual(names.sort(), [
      "delete_reference",
      "get_reference",
      "list_references",
      "rebuild_reference_index",
      "save_reference",
    ]);
  });
});

// ── save_reference ────────────────────────────────────────────────────────────

describe("saveReferenceTool", () => {
  it("has the correct tool name", () => {
    assert.equal(saveReferenceTool.name, "save_reference");
  });

  it("schema requires name and content", () => {
    const result = saveReferenceTool.schema.safeParse({
      name: "standard-heist-rules",
      content: "## Rules\n...",
    });
    assert.ok(result.success);
  });

  it("schema defaults type to 'general' when omitted", () => {
    const result = saveReferenceTool.schema.safeParse({
      name: "my-ref",
      content: "content",
    });
    assert.ok(result.success);
    assert.equal((result as any).data.type, "general");
  });

  it("schema defaults tags to empty array when omitted", () => {
    const result = saveReferenceTool.schema.safeParse({
      name: "my-ref",
      content: "content",
    });
    assert.ok(result.success);
    assert.deepEqual((result as any).data.tags, []);
  });

  it("schema accepts missing content (optional for batch mode)", () => {
    const result = saveReferenceTool.schema.safeParse({ name: "ref" });
    assert.ok(result.success, "Content is optional to support batch mode");
  });
});

// ── get_reference ─────────────────────────────────────────────────────────────

describe("getReferenceTool", () => {
  it("has the correct tool name", () => {
    assert.equal(getReferenceTool.name, "get_reference");
  });

  it("schema requires a name string", () => {
    const valid = getReferenceTool.schema.safeParse({ name: "standard-rules" });
    assert.ok(valid.success);

    const invalid = getReferenceTool.schema.safeParse({});
    assert.ok(!invalid.success, "Missing name should fail");
  });
});

// ── list_references ───────────────────────────────────────────────────────────

describe("listReferencesTool", () => {
  it("has the correct tool name", () => {
    assert.equal(listReferencesTool.name, "list_references");
  });

  it("schema accepts an empty filter object", () => {
    const result = listReferencesTool.schema.safeParse({});
    assert.ok(result.success);
  });

  it("schema accepts type and tags filters", () => {
    const result = listReferencesTool.schema.safeParse({
      type: "deck",
      tags: ["heist", "starter"],
    });
    assert.ok(result.success);
  });
});

// ── rebuild_reference_index ───────────────────────────────────────────────────

describe("rebuildReferenceIndexTool", () => {
  it("has the correct tool name", () => {
    assert.equal(rebuildReferenceIndexTool.name, "rebuild_reference_index");
  });

  it("schema accepts empty input", () => {
    const result = rebuildReferenceIndexTool.schema.safeParse({});
    assert.ok(result.success);
  });
});

// ── delete_reference ──────────────────────────────────────────────────────────

describe("deleteReferenceTool", () => {
  it("has the correct tool name", () => {
    assert.equal(deleteReferenceTool.name, "delete_reference");
  });

  it("schema requires name and game", () => {
    const valid = deleteReferenceTool.schema.safeParse({ name: "my-ref", game: "heist" });
    assert.ok(valid.success);
  });

  it("schema rejects missing name", () => {
    const result = deleteReferenceTool.schema.safeParse({ game: "heist" });
    assert.ok(!result.success, "Missing name should fail");
  });

  it("schema rejects missing game", () => {
    const result = deleteReferenceTool.schema.safeParse({ name: "my-ref" });
    assert.ok(!result.success, "Missing game should fail");
  });

  it("schema defaults hard to false", () => {
    const result = deleteReferenceTool.schema.safeParse({ name: "my-ref", game: "heist" });
    assert.ok(result.success);
    assert.equal((result as any).data.hard, false);
  });

  it("schema accepts hard: true", () => {
    const result = deleteReferenceTool.schema.safeParse({ name: "my-ref", game: "heist", hard: true });
    assert.ok(result.success);
    assert.equal((result as any).data.hard, true);
  });
});
