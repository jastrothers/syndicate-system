import test from "node:test";
import assert from "node:assert";
import { setupTestServer } from "./setup.js";

test("Cleanup Integration Tests", async (t) => {
  const { client, cleanup } = await setupTestServer("cleanup");
  t.after(cleanup);

  // ── delete_playtest_session ─────────────────────────────────────────────────

  await t.test("delete_playtest_session: removes session and clears it from index", async () => {
    const createResult: any = await client.callTool({
      name: "create_session",
      arguments: { rulebookName: "cleanup-game" },
    });
    assert.strictEqual(createResult.isError, undefined);
    const session = JSON.parse((createResult.content[0] as any).text);
    const sessionId = session.sessionId;

    const deleteResult: any = await client.callTool({
      name: "delete_playtest_session",
      arguments: { sessionId, confirm: true },
    });
    assert.strictEqual(deleteResult.isError, undefined);
    const deleteData = JSON.parse((deleteResult.content[0] as any).text);
    assert.strictEqual(deleteData.status, "success");

    // Accessing the session should now fail
    const getResult: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId },
    });
    assert.strictEqual(getResult.isError, true, "Deleted session should not be accessible");
  });

  await t.test("delete_playtest_session: errors for a non-existent session", async () => {
    const result: any = await client.callTool({
      name: "delete_playtest_session",
      arguments: { sessionId: "does-not-exist-xyz" },
    });
    assert.strictEqual(result.isError, true);
  });

  // ── delete_design_session ───────────────────────────────────────────────────

  await t.test("delete_design_session: removes session from game design directory", async () => {
    const createResult: any = await client.callTool({
      name: "create_design_session",
      arguments: { gameName: "cleanup-design-game", theme: "space pirates", initialPrompt: "Design a space pirate game." },
    });
    assert.strictEqual(createResult.isError, undefined);
    const session = JSON.parse((createResult.content[0] as any).text);
    const sessionId = session.sessionId;

    const deleteResult: any = await client.callTool({
      name: "delete_design_session",
      arguments: { gameName: "cleanup-design-game", sessionId, confirm: true },
    });
    assert.strictEqual(deleteResult.isError, undefined);

    // Verify it's gone from the list
    const listResult: any = await client.callTool({
      name: "list_design_sessions",
      arguments: { gameName: "cleanup-design-game" },
    });
    const sessions = JSON.parse((listResult.content[0] as any).text);
    const found = sessions.find((s: any) => s.sessionId === sessionId);
    assert.strictEqual(found, undefined, "Deleted session should not appear in list");
  });

  await t.test("delete_design_session: errors when session file does not exist", async () => {
    const result: any = await client.callTool({
      name: "delete_design_session",
      arguments: { gameName: "cleanup-design-game", sessionId: "non-existent-id" },
    });
    assert.strictEqual(result.isError, true);
  });

  // ── delete_reference ────────────────────────────────────────────────────────

  await t.test("delete_reference (soft): tombstones reference so it no longer appears in queries", async () => {
    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "soft-delete-ref",
        game: "ref-cleanup-game",
        type: "rule",
        tags: ["test"],
        content: "A rule to be soft-deleted.",
      },
    });

    const deleteResult: any = await client.callTool({
      name: "delete_reference",
      arguments: { name: "soft-delete-ref", game: "ref-cleanup-game" },
    });
    assert.strictEqual(deleteResult.isError, undefined);

    const listResult: any = await client.callTool({
      name: "list_references",
      arguments: { game: "ref-cleanup-game" },
    });
    const refsData = JSON.parse((listResult.content[0] as any).text);
    const found = refsData.items.find((r: any) => r.name === "soft-delete-ref");
    assert.strictEqual(found, undefined, "Soft-deleted reference should not appear in list");
  });

  await t.test("delete_reference (hard): permanently removes file and index entry", async () => {
    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "hard-delete-ref",
        game: "ref-cleanup-game",
        type: "rule",
        tags: ["test"],
        content: "A rule to be hard-deleted.",
      },
    });

    const deleteResult: any = await client.callTool({
      name: "delete_reference",
      arguments: { name: "hard-delete-ref", game: "ref-cleanup-game", hard: true },
    });
    assert.strictEqual(deleteResult.isError, undefined);
    const data = JSON.parse((deleteResult.content[0] as any).text);
    assert.strictEqual(data.status, "success");

    const listResult: any = await client.callTool({
      name: "list_references",
      arguments: { game: "ref-cleanup-game" },
    });
    const refsData = JSON.parse((listResult.content[0] as any).text);
    const found = refsData.items.find((r: any) => r.name === "hard-delete-ref");
    assert.strictEqual(found, undefined, "Hard-deleted reference should not appear in list");
  });

  await t.test("delete_reference: errors when reference does not exist", async () => {
    const result: any = await client.callTool({
      name: "delete_reference",
      arguments: { name: "ref-that-does-not-exist", game: "ref-cleanup-game" },
    });
    assert.strictEqual(result.isError, true);
  });

  // ── delete_rulebook_version ─────────────────────────────────────────────────

  await t.test("delete_rulebook_version: removes a versioned snapshot from the rulebook", async () => {
    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: "version-cleanup-game",
        path: "intro",
        title: "Introduction",
        content: "Welcome.",
      },
    });
    await client.callTool({
      name: "create_version",
      arguments: { rulebookName: "version-cleanup-game", versionTag: "0.1.0" },
    });

    const listBefore: any = await client.callTool({
      name: "list_versions",
      arguments: { rulebookName: "version-cleanup-game" },
    });
    const beforeData = JSON.parse((listBefore.content[0] as any).text);
    assert.ok(beforeData.versions.some((v: any) => v.versionTag === "0.1.0"), "Version should exist before deletion");

    const deleteResult: any = await client.callTool({
      name: "delete_rulebook_version",
      arguments: { rulebookName: "version-cleanup-game", versionTag: "0.1.0" },
    });
    assert.strictEqual(deleteResult.isError, undefined);
    const data = JSON.parse((deleteResult.content[0] as any).text);
    assert.strictEqual(data.status, "success");

    const listAfter: any = await client.callTool({
      name: "list_versions",
      arguments: { rulebookName: "version-cleanup-game" },
    });
    const afterData = JSON.parse((listAfter.content[0] as any).text);
    assert.ok(!afterData.versions.some((v: any) => v.versionTag === "0.1.0"), "Version should be gone after deletion");
  });

  await t.test("delete_rulebook_version: rejects 'latest' as a version tag", async () => {
    const result: any = await client.callTool({
      name: "delete_rulebook_version",
      arguments: { rulebookName: "version-cleanup-game", versionTag: "latest" },
    });
    assert.strictEqual(result.isError, true);
    assert.ok((result.content[0] as any).text.includes("latest"), "Error should mention 'latest'");
  });

  await t.test("delete_rulebook_version: errors when version snapshot does not exist", async () => {
    const result: any = await client.callTool({
      name: "delete_rulebook_version",
      arguments: { rulebookName: "version-cleanup-game", versionTag: "99.99.99" },
    });
    assert.strictEqual(result.isError, true);
  });

  // ── delete_game ─────────────────────────────────────────────────────────────

  await t.test("delete_game: aborts when confirm is false", async () => {
    const result: any = await client.callTool({
      name: "delete_game",
      arguments: { gameName: "some-game", confirm: false },
    });
    assert.strictEqual(result.isError, true);
    assert.ok((result.content[0] as any).text.includes("confirm"), "Error should mention confirm");
  });

  await t.test("delete_game: errors when game directory does not exist", async () => {
    const result: any = await client.callTool({
      name: "delete_game",
      arguments: { gameName: "totally-nonexistent-game-xyzzy", confirm: true },
    });
    assert.strictEqual(result.isError, true);
  });

  await t.test("delete_game: wipes game directory, sessions, and references", async () => {
    const gameName = "delete-me-game";

    // Build up game data
    await client.callTool({
      name: "update_rule",
      arguments: { rulebookName: gameName, path: "intro", title: "Intro", content: "Hello." },
    });
    const sessionResult: any = await client.callTool({
      name: "create_session",
      arguments: { rulebookName: gameName },
    });
    const sessionId = JSON.parse((sessionResult.content[0] as any).text).sessionId;
    await client.callTool({
      name: "save_reference",
      arguments: { name: "game-ref", game: gameName, type: "rule", tags: [], content: "content" },
    });

    // Delete the entire game
    const deleteResult: any = await client.callTool({
      name: "delete_game",
      arguments: { gameName, confirm: true },
    });
    assert.strictEqual(deleteResult.isError, undefined);
    const data = JSON.parse((deleteResult.content[0] as any).text);
    assert.strictEqual(data.status, "success");

    // Session should be inaccessible
    const sessionCheck: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId },
    });
    assert.strictEqual(sessionCheck.isError, true, "Session should be gone after delete_game");

    // References should be gone from index
    const refList: any = await client.callTool({
      name: "list_references",
      arguments: { game: gameName },
    });
    const refsData = JSON.parse((refList.content[0] as any).text);
    assert.strictEqual(refsData.count, 0, "References should be cleared after delete_game");

    // Rulebook should be gone from the listing
    const rbList: any = await client.callTool({
      name: "list_rulebooks",
      arguments: {},
    });
    const rbData = JSON.parse((rbList.content[0] as any).text);
    assert.ok(!rbData.rulebooks[gameName], "Game should not appear in rulebook list after delete_game");
  });
});
