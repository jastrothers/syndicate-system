import test from "node:test";
import assert from "node:assert";
import { setupTestServer } from "./setup.js";

test("Card Mechanics Integration Tests", async (t) => {
  const { client, cleanup } = await setupTestServer("cards");
  t.after(cleanup);

  let cardSessionId: string;

  await t.test("Create session for card tests", async () => {
    const result: any = await client.callTool({
      name: "create_session",
      arguments: { rulebookName: "heist" },
    });
    assert.strictEqual(result.isError, undefined);
    const session = JSON.parse((result.content[0] as any).text);
    cardSessionId = session.sessionId;

    // Set up initial state with typed card objects
    await client.callTool({
      name: "update_game_state",
      arguments: {
        sessionId: cardSessionId,
        patch: {
          deck: [
            { id: "c1", name: "Copper", type: "Treasure", cost: 0 },
            { id: "c2", name: "Silver", type: "Treasure", cost: 3 },
            { id: "c3", name: "Smithy", type: "Action", cost: 4 },
            { id: "c4", name: "Village", type: "Action", cost: 3 },
            { id: "c5", name: "Gold", type: "Treasure", cost: 6 },
          ],
          hand: [],
          discard: [],
          market_row: [],
          market_supply: [
            { id: "m1", name: "Laboratory", type: "Action", cost: 5 },
            { id: "m2", name: "Festival", type: "Action", cost: 5 },
            { id: "m3", name: "Merchant", type: "Action", cost: 3 },
            { id: "m4", name: "Chapel", type: "Action", cost: 2 },
            { id: "m5", name: "Witch", type: "Action", cost: 5 },
            { id: "m6", name: "Moat", type: "Action", cost: 2 },
          ],
          player1_gold: 10,
        },
      },
    });
  });

  await t.test("peek_at_deck (top)", async () => {
    const result: any = await client.callTool({
      name: "peek_at_deck",
      arguments: {
        sessionId: cardSessionId,
        deckId: "deck",
        count: 3,
        from: "top",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const peeked = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(peeked.length, 3);
    assert.strictEqual(peeked[0].id, "c1");

    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const state = JSON.parse((stateRes.content[0] as any).text);
    assert.strictEqual(state.deck.length, 5, "Deck should still have 5 cards");
  });

  await t.test("peek_at_deck (bottom)", async () => {
    const result: any = await client.callTool({
      name: "peek_at_deck",
      arguments: {
        sessionId: cardSessionId,
        deckId: "deck",
        count: 2,
        from: "bottom",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const peeked = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(peeked.length, 2);
    assert.strictEqual(peeked[1].id, "c5");
  });

  await t.test("search_zone", async () => {
    const result: any = await client.callTool({
      name: "search_zone",
      arguments: {
        sessionId: cardSessionId,
        zoneId: "deck",
        filter: { key: "type", op: "eq", value: "Treasure" },
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.matches, 3);
    const names = data.results.map((r: any) => r.item.name);
    assert.ok(names.includes("Copper"));
    assert.ok(names.includes("Silver"));
    assert.ok(names.includes("Gold"));
  });

  await t.test("insert_into_deck", async () => {
    const result: any = await client.callTool({
      name: "insert_into_deck",
      arguments: {
        sessionId: cardSessionId,
        deckId: "deck",
        cards: [{ id: "c6", name: "Province", type: "Victory", cost: 8 }],
        position: "top",
        actor: "Player 1",
      },
    });
    assert.strictEqual(result.isError, undefined);

    const peekRes: any = await client.callTool({
      name: "peek_at_deck",
      arguments: { sessionId: cardSessionId, deckId: "deck", count: 1 },
    });
    const top = JSON.parse((peekRes.content[0] as any).text);
    assert.strictEqual(top[0].name, "Province");

    // Remove Province from deck top
    await client.callTool({
      name: "draw_from_deck",
      arguments: {
        sessionId: cardSessionId,
        deckId: "deck",
        targetHandId: "discard",
        count: 1,
        actor: "System",
      },
    });
  });

  await t.test("Draw cards from deck using primitives", async () => {
    // Draw 2 cards from deck into hand
    const result: any = await client.callTool({
      name: "draw_from_deck",
      arguments: {
        sessionId: cardSessionId,
        deckId: "deck",
        targetHandId: "hand",
        count: 2,
        actor: "Player 1",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.drawn.length, 2);

    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const state = JSON.parse((stateRes.content[0] as any).text);
    assert.strictEqual(state.hand.length, 2);
    assert.strictEqual(state.deck.length, 3, "5 cards - 2 drawn = 3 remaining");
  });

  await t.test("Shuffle deck and draw with empty deck recovery", async () => {
    // Drain remaining deck into discard first
    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const stateBefore = JSON.parse((stateRes.content[0] as any).text);
    const deckRemaining = stateBefore.deck.length;

    if (deckRemaining > 0) {
      await client.callTool({
        name: "draw_from_deck",
        arguments: { sessionId: cardSessionId, deckId: "deck", targetHandId: "discard", count: deckRemaining, actor: "System" },
      });
    }

    // Simulate reshuffle: move hand + discard back into deck, then shuffle
    const state2: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: cardSessionId } });
    const s2 = JSON.parse((state2.content[0] as any).text);
    const recycled = [...s2.discard];

    await client.callTool({
      name: "update_game_state",
      arguments: { sessionId: cardSessionId, patch: { deck: recycled, discard: [] } },
    });
    await client.callTool({
      name: "shuffle_deck",
      arguments: { sessionId: cardSessionId, deckId: "deck" },
    });

    const afterShuffle: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: cardSessionId } });
    const stateAfter = JSON.parse((afterShuffle.content[0] as any).text);
    assert.ok(stateAfter.deck.length > 0, "Deck should have cards after reshuffle");
    assert.strictEqual(stateAfter.discard.length, 0, "Discard should be empty after reshuffle");
  });

  await t.test("Populate market row via move_entity", async () => {
    // Get current market_supply to know what's available
    const stateRes: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: cardSessionId } });
    const state = JSON.parse((stateRes.content[0] as any).text);
    const supplyCount = state.market_supply.length;

    // Move first 4 cards from supply to market_row
    const toMove = Math.min(4, supplyCount);
    for (let i = 0; i < toMove; i++) {
      const supply: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: cardSessionId } });
      const s = JSON.parse((supply.content[0] as any).text);
      const firstCard = s.market_supply[0];
      await client.callTool({
        name: "move_entity",
        arguments: { sessionId: cardSessionId, entityId: firstCard.id, sourceId: "market_supply", targetId: "market_row", actor: "System" },
      });
    }

    const finalState: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: cardSessionId } });
    const final = JSON.parse((finalState.content[0] as any).text);
    assert.strictEqual(final.market_row.length, toMove, `Market row should have ${toMove} cards`);
  });

  await t.test("Purchase card via primitives (success)", async () => {
    const stateRes: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: cardSessionId } });
    const state = JSON.parse((stateRes.content[0] as any).text);
    const cardToBuy = state.market_row[0];
    const goldBefore = state.player1_gold;
    const cost = 3;

    // Move card from market_row to discard (purchase)
    const moveResult: any = await client.callTool({
      name: "move_entity",
      arguments: { sessionId: cardSessionId, entityId: cardToBuy.id, sourceId: "market_row", targetId: "discard", actor: "Player 1" },
    });
    assert.strictEqual(moveResult.isError, undefined);

    // Deduct gold
    await client.callTool({
      name: "update_game_state",
      arguments: { sessionId: cardSessionId, patch: { player1_gold: goldBefore - cost } },
    });

    const afterRes: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: cardSessionId } });
    const afterState = JSON.parse((afterRes.content[0] as any).text);
    assert.strictEqual(afterState.player1_gold, goldBefore - cost);
    assert.ok(!afterState.market_row.some((c: any) => c.id === cardToBuy.id), "Purchased card should be gone from market");
  });

  await t.test("validate_action blocks rule violation", async () => {
    // Set up a constraint on buying (max cost = 5) and test validate_action
    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: "heist",
        path: "actions.buy",
        title: "Buy Action",
        content: "Spend gold to acquire a market card.",
      },
    });

    // Add constraints directly to the rulebook file (cache was cleared by update_rule above)
    const fs = await import("fs/promises");
    // @ts-ignore
    const paths = await import("../../src/config/paths.js");
    const rulebookPath = paths.getRulebookPath("heist");
    const rbData = JSON.parse(await fs.readFile(rulebookPath, "utf-8"));
    rbData.sections.actions.subsections.buy.constraints = {
      cost: { type: "max", value: 5 },
    };
    await fs.writeFile(rulebookPath, JSON.stringify(rbData, null, 2));

    const result: any = await client.callTool({
      name: "validate_action",
      arguments: {
        sessionId: cardSessionId,
        rulePath: "actions.buy",
        actionData: { cost: 999 },
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.valid, false, "Cost of 999 should violate max:5 constraint");
  });

  await t.test("create_deck_from_template", async () => {
    const result: any = await client.callTool({
      name: "create_deck_from_template",
      arguments: {
        sessionId: cardSessionId,
        deckId: "starter_deck",
        cards: [
          { card: { name: "Copper", type: "Treasure", cost: 0 }, count: 7 },
          { card: { name: "Estate", type: "Victory", cost: 2 }, count: 3 },
        ],
        shuffle: false,
      },
    });
    assert.strictEqual(result.isError, undefined);
    const deckResult = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(deckResult.totalCards, 10);

    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const state = JSON.parse((stateRes.content[0] as any).text);
    assert.strictEqual(state.starter_deck.length, 10);
    assert.strictEqual(state.starter_deck[0].name, "Copper");
    assert.strictEqual(state.starter_deck[7].name, "Estate");
  });

  await t.test("count_zone validates deck size constraint (valid)", async () => {
    const result: any = await client.callTool({
      name: "count_zone",
      arguments: { sessionId: cardSessionId, zoneId: "starter_deck" },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.ok(data.count >= 10, "starter_deck should have at least 10 cards (min deck size)");
  });

  await t.test("count_zone validates deck size constraint (filtered)", async () => {
    // Victory cards: 3 Estates
    const result: any = await client.callTool({
      name: "count_zone",
      arguments: {
        sessionId: cardSessionId,
        zoneId: "starter_deck",
        filter: { key: "type", op: "eq", value: "Victory" },
      },
    });
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.count, 3);
    assert.strictEqual(data.filtered, true);
  });

  await t.test("count_zone (total)", async () => {
    const result: any = await client.callTool({
      name: "count_zone",
      arguments: {
        sessionId: cardSessionId,
        zoneId: "starter_deck",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.count, 10);
    assert.strictEqual(data.filtered, false);
  });

  await t.test("count_zone (filtered)", async () => {
    const result: any = await client.callTool({
      name: "count_zone",
      arguments: {
        sessionId: cardSessionId,
        zoneId: "starter_deck",
        filter: { key: "type", op: "eq", value: "Victory" },
      },
    });
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.count, 3);
    assert.strictEqual(data.filtered, true);
  });

  await t.test("reveal_cards (specific)", async () => {
    const result: any = await client.callTool({
      name: "reveal_cards",
      arguments: {
        sessionId: cardSessionId,
        zoneId: "starter_deck",
        cardIds: ["Copper"],
        actor: "Player 1",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.ok(data.revealed > 0);

    const ledgerRes: any = await client.callTool({
      name: "get_action_history",
      arguments: { sessionId: cardSessionId },
    });
    const ledgerData = JSON.parse((ledgerRes.content[0] as any).text);
    const ledger = ledgerData.items ?? ledgerData;
    const revealActions = ledger.filter((a: any) => a.actionType === "reveal_cards");
    assert.ok(revealActions.length > 0);
  });

  await t.test("reveal_cards (all)", async () => {
    const result: any = await client.callTool({
      name: "reveal_cards",
      arguments: {
        sessionId: cardSessionId,
        zoneId: "starter_deck",
        actor: "Player 1",
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.revealed, 10);
  });
});
