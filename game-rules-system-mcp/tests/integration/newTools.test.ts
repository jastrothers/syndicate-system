import test from "node:test";
import assert from "node:assert";
import { setupTestServer } from "./setup.js";

test("New Tools Integration Tests", async (t) => {
  const { client, cleanup } = await setupTestServer("newtools");
  t.after(cleanup);

  const RULEBOOK = "newtools-test";

  // ── search_rules ──────────────────────────────────────────────────────────

  await t.test("search_rules - matches known content after update_rule", async () => {
    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: RULEBOOK,
        path: "combat.flanking",
        title: "Flanking Bonus",
        content: "When a unit attacks from the flank, it gains a flanking bonus of +2 to its attack roll.",
      },
    });

    const result: any = await client.callTool({
      name: "search_rules",
      arguments: { rulebookName: RULEBOOK, query: "flanking" },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.ok(Array.isArray(data.matches), "matches must be an array");
    assert.ok(data.matches.length >= 1, "Should find at least one match");
    const paths = data.matches.map((m: any) => m.path);
    assert.ok(paths.includes("combat.flanking"), "Should find combat.flanking");
    const match = data.matches.find((m: any) => m.path === "combat.flanking");
    assert.ok(typeof match.title === "string");
    assert.ok(typeof match.snippet === "string");
  });

  await t.test("search_rules - returns empty matches for unknown keyword", async () => {
    const result: any = await client.callTool({
      name: "search_rules",
      arguments: { rulebookName: RULEBOOK, query: "xyzzy_no_match_ever" },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.deepStrictEqual(data.matches, []);
  });

  // ── upsert_component ──────────────────────────────────────────────────────

  await t.test("upsert_component - adds a new component", async () => {
    const result: any = await client.callTool({
      name: "upsert_component",
      arguments: {
        rulebookName: RULEBOOK,
        component: { type: "card", name: "Test Card", quantity: 10 },
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.upserted, "Test Card");
    assert.ok(data.components.some((c: any) => c.name === "Test Card"));
  });

  await t.test("upsert_component - replaces existing component with same name", async () => {
    const result: any = await client.callTool({
      name: "upsert_component",
      arguments: {
        rulebookName: RULEBOOK,
        component: { type: "card", name: "Test Card", quantity: 99 },
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    const card = data.components.find((c: any) => c.name === "Test Card");
    assert.strictEqual(card.quantity, 99, "quantity should be updated to 99");
    assert.strictEqual(
      data.components.filter((c: any) => c.name === "Test Card").length,
      1,
      "No duplicate entries"
    );
  });

  await t.test("upsert_component - response includes compile_markdown hint", async () => {
    const result: any = await client.callTool({
      name: "upsert_component",
      arguments: {
        rulebookName: RULEBOOK,
        component: { type: "token", name: "Gold Token", quantity: 30 },
      },
    });
    assert.strictEqual(result.isError, undefined);
    const text = (result.content[0] as any).text;
    assert.ok(text.includes("compile_markdown_rulebook"), "Response must hint at compile_markdown_rulebook");
  });

  // ── get_rulebook_components ───────────────────────────────────────────────

  await t.test("get_rulebook_components - returns previously upserted components", async () => {
    const result: any = await client.callTool({
      name: "get_rulebook_components",
      arguments: { rulebookName: RULEBOOK },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.ok(Array.isArray(data.components));
    assert.ok(data.components.some((c: any) => c.name === "Test Card"));
    assert.ok(data.components.some((c: any) => c.name === "Gold Token"));
  });

  await t.test("get_rulebook_components - returns empty array for fresh rulebook", async () => {
    const freshRulebook = "newtools-empty-" + Date.now();
    // Create a section to ensure rulebook exists
    await client.callTool({
      name: "update_rule",
      arguments: { rulebookName: freshRulebook, path: "intro", title: "Introduction", content: "A fresh game." },
    });
    const result: any = await client.callTool({
      name: "get_rulebook_components",
      arguments: { rulebookName: freshRulebook },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.deepStrictEqual(data.components, []);
  });

  // ── delete_component ──────────────────────────────────────────────────────

  await t.test("delete_component - removes a component by name", async () => {
    // Ensure Gold Token exists
    await client.callTool({
      name: "upsert_component",
      arguments: {
        rulebookName: RULEBOOK,
        component: { type: "token", name: "Silver Token", quantity: 20 },
      },
    });

    const result: any = await client.callTool({
      name: "delete_component",
      arguments: { rulebookName: RULEBOOK, componentName: "Silver Token" },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.deleted, "Silver Token");
    assert.ok(!data.components.some((c: any) => c.name === "Silver Token"), "Should no longer be present");
  });

  await t.test("delete_component - response includes compile_markdown hint", async () => {
    // Add a component then delete it to check hint
    await client.callTool({
      name: "upsert_component",
      arguments: {
        rulebookName: RULEBOOK,
        component: { type: "tile", name: "Hint Tile", quantity: 1 },
      },
    });
    const result: any = await client.callTool({
      name: "delete_component",
      arguments: { rulebookName: RULEBOOK, componentName: "Hint Tile" },
    });
    assert.strictEqual(result.isError, undefined);
    const text = (result.content[0] as any).text;
    assert.ok(text.includes("compile_markdown_rulebook"), "Response must hint at compile_markdown_rulebook");
  });

  await t.test("delete_component - error on nonexistent component name", async () => {
    const result: any = await client.callTool({
      name: "delete_component",
      arguments: { rulebookName: RULEBOOK, componentName: "Does Not Exist" },
    });
    assert.strictEqual(result.isError, true, "Should return isError: true");
  });

  // ── get_session_stats ─────────────────────────────────────────────────────

  let testSessionId: string;

  await t.test("get_session_stats - returns correct metadata and counts", async () => {
    // Create session
    const createResult: any = await client.callTool({
      name: "create_session",
      arguments: { rulebookName: RULEBOOK },
    });
    assert.strictEqual(createResult.isError, undefined);
    const sessionData = JSON.parse((createResult.content[0] as any).text);
    testSessionId = sessionData.sessionId;

    // Add state
    await client.callTool({
      name: "update_game_state",
      arguments: { sessionId: testSessionId, patch: { gold: 50, hand: [] } },
    });

    // Add a ledger entry via roll_dice
    await client.callTool({
      name: "roll_dice",
      arguments: { notation: "1d6", sessionId: testSessionId, actor: "Tester" },
    });

    const statsResult: any = await client.callTool({
      name: "get_session_stats",
      arguments: { sessionId: testSessionId },
    });
    assert.strictEqual(statsResult.isError, undefined);
    const stats = JSON.parse((statsResult.content[0] as any).text);

    assert.strictEqual(stats.sessionId, testSessionId);
    assert.strictEqual(stats.rulebookName, RULEBOOK);
    assert.ok(Array.isArray(stats.stateKeys), "stateKeys must be an array");
    assert.ok(stats.stateKeys.includes("gold"), "stateKeys should contain 'gold'");
    assert.ok(stats.stateKeys.includes("hand"), "stateKeys should contain 'hand'");
    assert.ok(typeof stats.ledgerCount === "number" && stats.ledgerCount >= 1);
    assert.ok(typeof stats.ledgerByType === "object");
  });

  await t.test("get_session_stats - error on nonexistent sessionId", async () => {
    const result: any = await client.callTool({
      name: "get_session_stats",
      arguments: { sessionId: "nonexistent-session-id-abc123" },
    });
    assert.strictEqual(result.isError, true, "Should return isError: true for unknown session");
  });

  // ── update_designer_profile ───────────────────────────────────────────────

  await t.test("update_designer_profile - sets complexityTolerance", async () => {
    const result: any = await client.callTool({
      name: "update_designer_profile",
      arguments: { complexityTolerance: 4 },
    });
    assert.strictEqual(result.isError, undefined);
    const profile = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(profile.complexityTolerance, 4);
  });

  await t.test("update_designer_profile - appends thematic preference", async () => {
    // Set a baseline
    await client.callTool({
      name: "update_designer_profile",
      arguments: { thematicPreferences: ["fantasy"] },
    });
    const result: any = await client.callTool({
      name: "update_designer_profile",
      arguments: { addThematicPreference: "cyberpunk" },
    });
    assert.strictEqual(result.isError, undefined);
    const profile = JSON.parse((result.content[0] as any).text);
    assert.ok(profile.thematicPreferences.includes("fantasy"), "Should still have fantasy");
    assert.ok(profile.thematicPreferences.includes("cyberpunk"), "Should have appended cyberpunk");
  });

  await t.test("update_designer_profile - rejects complexityTolerance out of range", async () => {
    const result: any = await client.callTool({
      name: "update_designer_profile",
      arguments: { complexityTolerance: 6 },
    });
    assert.strictEqual(result.isError, true, "Should return isError: true for tolerance > 5");
  });
});
