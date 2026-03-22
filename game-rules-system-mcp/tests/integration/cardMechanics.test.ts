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

    // Clean it up
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

  await t.test("draw_with_reshuffle macro (normal)", async () => {
    // Setup macro reference for test
    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "test_draw_with_reshuffle",
        content: `
          const { deckId, recycleSourceId, targetHandId, count, actor } = inputs;
          
          if (!Array.isArray(state[deckId])) state[deckId] = [];
          if (!Array.isArray(state[recycleSourceId])) state[recycleSourceId] = [];
          if (!Array.isArray(state[targetHandId])) state[targetHandId] = [];
          
          let drawn = [];
          let reshuffled = false;
          
          for (let i = 0; i < count; i++) {
            if (state[deckId].length === 0) {
              if (state[recycleSourceId].length === 0) break;
              state[deckId].push(...state[recycleSourceId].splice(0));
              // basic shuffle simulation for macro
              state[deckId].sort(() => Math.random() - 0.5);
              reshuffled = true;
            }
            drawn.push(state[deckId].shift());
          }
          
          state[targetHandId].push(...drawn);
          
          ledger.push({
            timestamp: new Date().toISOString(),
            actionType: "draw_with_reshuffle_macro",
            actor: actor,
            data: { drawn: drawn.length, reshuffled }
          });
          
          return { drawn: drawn.length, reshuffled };
        `
      }
    });

    const result: any = await client.callTool({
      name: "execute_macro_action",
      arguments: {
        sessionId: cardSessionId,
        macroScriptReferenceName: "test_draw_with_reshuffle",
        inputs: {
          deckId: "deck",
          recycleSourceId: "discard",
          targetHandId: "hand",
          count: 2,
          actor: "Player 1",
        }
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.result.drawn, 2);
  });

  await t.test("draw_with_reshuffle macro (triggers reshuffle)", async () => {
    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const state = JSON.parse((stateRes.content[0] as any).text);
    const deckSize = state.deck.length;
    const discardSize = state.discard.length;

    if (deckSize < 10 && discardSize > 0) {
      const result: any = await client.callTool({
        name: "execute_macro_action",
        arguments: {
          sessionId: cardSessionId,
          macroScriptReferenceName: "test_draw_with_reshuffle",
          inputs: {
            deckId: "deck",
            recycleSourceId: "discard",
            targetHandId: "hand",
            count: deckSize + 1,
            actor: "Player 1",
          }
        },
      });
      assert.strictEqual(result.isError, undefined);
      const data = JSON.parse((result.content[0] as any).text);
      assert.strictEqual(data.result.reshuffled, true);
    }
  });

  await t.test("refill_market macro", async () => {
    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "test_refill_market",
        content: `
          const { supplyDeckId, marketId, marketSize } = inputs;
          if (!Array.isArray(state[supplyDeckId])) state[supplyDeckId] = [];
          if (!Array.isArray(state[marketId])) state[marketId] = [];
          
          const slotsToFill = marketSize - state[marketId].length;
          const toAdd = state[supplyDeckId].splice(0, Math.max(0, slotsToFill));
          state[marketId].push(...toAdd);
          return { added: toAdd.length };
        `
      }
    });

    const result: any = await client.callTool({
      name: "execute_macro_action",
      arguments: {
        sessionId: cardSessionId,
        macroScriptReferenceName: "test_refill_market",
        inputs: {
          supplyDeckId: "market_supply",
          marketId: "market_row",
          marketSize: 4,
        }
      },
    });
    assert.strictEqual(result.isError, undefined);

    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const state = JSON.parse((stateRes.content[0] as any).text);
    assert.strictEqual(state.market_row.length, 4);
  });

  await t.test("buy_card macro (success)", async () => {
    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "test_buy_card",
        content: `
          const { cardId, sourceId, targetId, costResourceId, costAmount } = inputs;
          
          if (state[costResourceId] < costAmount) {
             throw new Error("Insufficient resources");
          }
          
          const srcArray = state[sourceId];
          const idx = srcArray.findIndex(c => c.name === cardId || c.id === cardId);
          if (idx === -1) throw new Error("Card not found");
          
          const [boughtCard] = srcArray.splice(idx, 1);
          state[costResourceId] -= costAmount;
          state[targetId].push(boughtCard);
          
          return { success: true };
        `
      }
    });

    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const state = JSON.parse((stateRes.content[0] as any).text);
    const cardToBuy = state.market_row[0].name;
    const goldBefore = state.player1_gold;

    const result: any = await client.callTool({
      name: "execute_macro_action",
      arguments: {
        sessionId: cardSessionId,
        macroScriptReferenceName: "test_buy_card",
        inputs: {
          cardId: cardToBuy,
          sourceId: "market_row",
          targetId: "discard",
          costResourceId: "player1_gold",
          costAmount: 3,
        }
      },
    });
    assert.strictEqual(result.isError, undefined);

    const afterRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const afterState = JSON.parse((afterRes.content[0] as any).text);
    assert.strictEqual(afterState.player1_gold, goldBefore - 3);
    assert.strictEqual(afterState.market_row.length, 3); // 4 - 1
  });

  await t.test("buy_card macro (insufficient resources)", async () => {
    const result: any = await client.callTool({
      name: "execute_macro_action",
      arguments: {
        sessionId: cardSessionId,
        macroScriptReferenceName: "test_buy_card",
        inputs: {
          cardId: "Laboratory",
          sourceId: "market_row",
          targetId: "discard",
          costResourceId: "player1_gold",
          costAmount: 9999,
        }
      },
    });
    assert.strictEqual(result.isError, true);
    assert.ok((result.content[0] as any).text.includes("Insufficient resources"));
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
    assert.ok((result.content[0] as any).text.includes("10 cards"));

    const stateRes: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: cardSessionId },
    });
    const state = JSON.parse((stateRes.content[0] as any).text);
    assert.strictEqual(state.starter_deck.length, 10);
    assert.strictEqual(state.starter_deck[0].name, "Copper");
    assert.strictEqual(state.starter_deck[7].name, "Estate");
  });

  await t.test("validate_deck_construction macro (valid)", async () => {
    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "test_validate_deck",
        content: `
          const { deckId, minSize } = inputs;
          const deck = state[deckId];
          if (deck.length < minSize) return { valid: false, errors: ["too small"] };
          
          const maxCopies = 7;
          const counts = {};
          deck.forEach(c => counts[c.name] = (counts[c.name] || 0) + 1);
          const errors = [];
          for (const name in counts) {
             if (counts[name] > maxCopies) errors.push(name + " has too many copies");
          }
          if (errors.length > 0) return { valid: false, errors };
          return { valid: true, errors: [] };
        `
      }
    });

    const result: any = await client.callTool({
      name: "execute_macro_action",
      arguments: {
        sessionId: cardSessionId,
        macroScriptReferenceName: "test_validate_deck",
        inputs: {
          deckId: "starter_deck",
          minSize: 10
        }
      },
    });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.result.valid, true);
  });

  await t.test("validate_deck_construction macro (too small)", async () => {
    const result: any = await client.callTool({
      name: "execute_macro_action",
      arguments: {
        sessionId: cardSessionId,
        macroScriptReferenceName: "test_validate_deck",
        inputs: {
          deckId: "starter_deck",
          minSize: 40
        }
      },
    });
    const data = JSON.parse((result.content[0] as any).text);
    assert.strictEqual(data.result.valid, false);
    assert.ok(data.result.errors[0].includes("too small"));
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
    const ledger = JSON.parse((ledgerRes.content[0] as any).text);
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
