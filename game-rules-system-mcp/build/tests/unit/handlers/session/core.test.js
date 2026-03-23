import { describe, it } from "node:test";
import test from "node:test";
import assert from "node:assert/strict";
import { createSessionTool, getGameStateTool, updateGameStateTool, logPlaytestNoteTool, listSessionsTool, } from "../../../../src/handlers/session/core.js";
import { initialize as initSessions, closeDb } from "../../../../src/services/SessionStore.js";
// ── create_session ────────────────────────────────────────────────────────────
describe("createSessionTool", () => {
    it("has the correct tool name", () => {
        assert.equal(createSessionTool.name, "create_session");
    });
    it("schema requires rulebookName", () => {
        const valid = createSessionTool.schema.safeParse({ rulebookName: "heist" });
        assert.ok(valid.success);
        const invalid = createSessionTool.schema.safeParse({});
        assert.ok(!invalid.success, "Missing rulebookName should fail");
    });
    it("schema accepts optional rulebookVersion", () => {
        const result = createSessionTool.schema.safeParse({
            rulebookName: "heist",
            rulebookVersion: "1.0.0",
        });
        assert.ok(result.success);
    });
});
// ── get_game_state ────────────────────────────────────────────────────────────
describe("getGameStateTool", () => {
    it("has the correct tool name", () => {
        assert.equal(getGameStateTool.name, "get_game_state");
    });
    it("schema requires sessionId", () => {
        const valid = getGameStateTool.schema.safeParse({ sessionId: "abc-123" });
        assert.ok(valid.success);
        const invalid = getGameStateTool.schema.safeParse({});
        assert.ok(!invalid.success, "Missing sessionId should fail");
    });
});
// ── update_game_state ─────────────────────────────────────────────────────────
describe("updateGameStateTool", () => {
    it("has the correct tool name", () => {
        assert.equal(updateGameStateTool.name, "update_game_state");
    });
    it("schema requires sessionId and a patch object", () => {
        const valid = updateGameStateTool.schema.safeParse({
            sessionId: "s1",
            patch: { player1_hp: 10 },
        });
        assert.ok(valid.success);
    });
});
// ── log_playtest_note ─────────────────────────────────────────────────────────
describe("logPlaytestNoteTool", () => {
    it("has the correct tool name", () => {
        assert.equal(logPlaytestNoteTool.name, "log_playtest_note");
    });
    it("schema requires note and sessionId", () => {
        const valid = logPlaytestNoteTool.schema.safeParse({ sessionId: "s1", note: "Guards are too slow." });
        assert.ok(valid.success);
        const invalid = logPlaytestNoteTool.schema.safeParse({ note: "Missing session" });
        assert.ok(!invalid.success);
    });
    it("schema defaults category to 'General'", () => {
        const result = logPlaytestNoteTool.schema.safeParse({ sessionId: "s1", note: "Test note." });
        assert.ok(result.success);
        assert.equal(result.data.category, "General");
    });
});
// ── list_sessions ────────────────────────────────────────────────────────────
describe("listSessionsTool", () => {
    it("has the correct tool name", () => {
        assert.equal(listSessionsTool.name, "list_sessions");
    });
    it("schema accepts empty object (no filters)", () => {
        const result = listSessionsTool.schema.safeParse({});
        assert.ok(result.success);
    });
    it("schema accepts optional rulebookName filter", () => {
        const result = listSessionsTool.schema.safeParse({ rulebookName: "heist" });
        assert.ok(result.success);
    });
    it("schema accepts optional rulebookName and rulebookVersion filters", () => {
        const result = listSessionsTool.schema.safeParse({
            rulebookName: "heist",
            rulebookVersion: "1.0.0",
        });
        assert.ok(result.success);
    });
});
// ── Functional handler tests ────────────────────────────────────────────────
test("session/core functional handler tests", async (t) => {
    let sessionId;
    t.before(async () => {
        await initSessions();
    });
    t.after(() => {
        closeDb();
    });
    await t.test("createSessionTool.handler: creates a session and returns metadata", async () => {
        const result = await createSessionTool.handler({
            rulebookName: "handler-test-game",
        });
        const data = JSON.parse(result.content[0].text);
        assert.ok(data.sessionId, "Should return a sessionId");
        assert.strictEqual(data.rulebookName, "handler-test-game");
        assert.ok(data.createdAt);
        sessionId = data.sessionId;
    });
    await t.test("updateGameStateTool.handler: applies patch and returns updated keys", async () => {
        const result = await updateGameStateTool.handler({
            sessionId,
            patch: { hp: 20, gold: 100 },
        });
        const data = JSON.parse(result.content[0].text);
        assert.deepStrictEqual(data.updatedKeys.sort(), ["gold", "hp"]);
        assert.ok(data.stateSnapshot.hp);
        assert.ok(data.stateSnapshot.gold);
    });
    await t.test("getGameStateTool.handler: returns full state", async () => {
        const result = await getGameStateTool.handler({
            sessionId,
        });
        const state = JSON.parse(result.content[0].text);
        assert.strictEqual(state.hp, 20);
        assert.strictEqual(state.gold, 100);
    });
    await t.test("getGameStateTool.handler: returns filtered fields", async () => {
        const result = await getGameStateTool.handler({
            sessionId,
            fields: ["hp"],
        });
        const state = JSON.parse(result.content[0].text);
        assert.strictEqual(state.hp, 20);
        assert.strictEqual(state.gold, undefined, "Should not include gold");
    });
    await t.test("getGameStateTool.handler: keysOnly returns types", async () => {
        const result = await getGameStateTool.handler({
            sessionId,
            keysOnly: true,
        });
        const data = JSON.parse(result.content[0].text);
        assert.strictEqual(data.keys.hp, "number");
        assert.strictEqual(data.keys.gold, "number");
    });
    await t.test("listSessionsTool.handler: lists sessions with pagination", async () => {
        const result = await listSessionsTool.handler({
            rulebookName: "handler-test-game",
        });
        const data = JSON.parse(result.content[0].text);
        assert.ok(data.total >= 1);
        assert.ok(data.items.length >= 1);
        const found = data.items.find((s) => s.sessionId === sessionId);
        assert.ok(found, "Should find the created session in the list");
    });
});
