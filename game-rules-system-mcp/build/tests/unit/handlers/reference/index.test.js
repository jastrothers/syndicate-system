import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { saveReferenceTool, getReferenceTool, listReferencesTool, rebuildReferenceIndexTool, referenceTools, } from "../../../../src/handlers/reference/index.js";
// ── Tool registration ─────────────────────────────────────────────────────────
describe("referenceTools registration", () => {
    it("exports four tools", () => {
        assert.equal(referenceTools.length, 4);
    });
    it("contains the expected tool names", () => {
        const names = referenceTools.map((t) => t.name);
        assert.deepEqual(names.sort(), [
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
        assert.equal(result.data.type, "general");
    });
    it("schema defaults tags to empty array when omitted", () => {
        const result = saveReferenceTool.schema.safeParse({
            name: "my-ref",
            content: "content",
        });
        assert.ok(result.success);
        assert.deepEqual(result.data.tags, []);
    });
    it("schema rejects input missing content", () => {
        const result = saveReferenceTool.schema.safeParse({ name: "ref" });
        assert.ok(!result.success, "Missing content should fail");
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
