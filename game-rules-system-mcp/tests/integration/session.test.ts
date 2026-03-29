import test from "node:test";
import assert from "node:assert";
import { setupTestServer } from "./setup.js";

test("Playtesting Session Integration Tests", async (t) => {
  const { client, cleanup } = await setupTestServer("session");
  t.after(cleanup);

  let currentSessionId: string;

  await t.test("Create Session", async () => {
    const result: any = await client.callTool({
      name: "create_session",
      arguments: { rulebookName: "heist" }
    });
    assert.strictEqual(result.isError, undefined);
    const sessionStr = (result.content[0] as any).text;
    const session = JSON.parse(sessionStr);
    assert.ok(session.sessionId, "Session must have an ID");
    assert.strictEqual(session.rulebookName, "heist");
    
    currentSessionId = session.sessionId;
  });

  await t.test("Update and Get Game State", async () => {
    const updateResult: any = await client.callTool({
      name: "update_game_state",
      arguments: {
        sessionId: currentSessionId,
        patch: { gold: 100, deck: ["card1", "card2", "card3", "card4"], hand: [] }
      }
    });
    assert.strictEqual(updateResult.isError, undefined);

    const getResult: any = await client.callTool({
      name: "get_game_state",
      arguments: { sessionId: currentSessionId }
    });
    assert.strictEqual(getResult.isError, undefined);
    const state = JSON.parse((getResult.content[0] as any).text);
    assert.strictEqual(state.gold, 100);
    assert.strictEqual(state.deck.length, 4);
    assert.strictEqual(state.hand.length, 0);
  });

  await t.test("Draw from deck, Shuffle, Move", async () => {
    await client.callTool({ name: "shuffle_deck", arguments: { sessionId: currentSessionId, deckId: "deck" } });
    await client.callTool({
      name: "draw_from_deck",
      arguments: { sessionId: currentSessionId, deckId: "deck", targetHandId: "hand", count: 2, actor: "Player 1" }
    });

    const stateBeforeMove: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: currentSessionId } });
    const stateData = JSON.parse((stateBeforeMove.content[0] as any).text);
    const drawnCard = stateData.hand[0]; 

    await client.callTool({
      name: "move_entity",
      arguments: { sessionId: currentSessionId, entityId: drawnCard, sourceId: "hand", targetId: "discard", actor: "Player 1" }
    });

    const finalStateReq: any = await client.callTool({ name: "get_game_state", arguments: { sessionId: currentSessionId } });
    const finalState = JSON.parse((finalStateReq.content[0] as any).text);
    
    assert.strictEqual(finalState.deck.length, 2, "Deck should have 2 cards left");
    assert.strictEqual(finalState.hand.length, 1, "Hand should have 1 card left");
    assert.strictEqual(finalState.discard.length, 1, "Discard should have 1 card");
  });

  await t.test("Roll Dice & Get Ledger", async () => {
    const diceResult: any = await client.callTool({
      name: "roll_dice",
      arguments: {
        notation: "2d6+2",
        sessionId: currentSessionId,
        actor: "Player 1"
      }
    });
    assert.strictEqual(diceResult.isError, undefined);
    const data = JSON.parse((diceResult.content[0] as any).text);
    assert.ok(data.total >= 4 && data.total <= 14, "2d6+2 total should be in range [4,14]");
    assert.strictEqual(data.modifier, 2);

    const ledgerResult: any = await client.callTool({
      name: "get_action_history",
      arguments: { sessionId: currentSessionId }
    });
    const ledgerData = JSON.parse((ledgerResult.content[0] as any).text);
    const ledger = ledgerData.items ?? ledgerData;

    const actions = ledger.map((l: any) => l.actionType);
    assert.ok(actions.includes("shuffle_deck"));
    assert.ok(actions.includes("draw_from_deck"));
    assert.ok(actions.includes("move_entity"));
    assert.ok(actions.includes("roll_dice"));
  });

  await t.test("Rule Validation", async () => {
    await client.callTool({
      name: "update_rule",
      arguments: { rulebookName: "heist", path: "actions.buy", title: "Buy Action", content: "Spend gold to buy items" }
    });
    
    const fs = await import("fs/promises");
    // @ts-ignore
    const paths = await import("../../src/config/paths.js");
    const rulebookPath = paths.getRulebookPath("heist");
    const rbData = JSON.parse(await fs.readFile(rulebookPath, "utf-8"));
    
    rbData.sections.actions.subsections.buy.constraints = {
      cost: { type: "max", value: 50 },
      item: "required"
    };
    await fs.writeFile(rulebookPath, JSON.stringify(rbData, null, 2));

    const validResult: any = await client.callTool({
      name: "validate_action",
      arguments: { sessionId: currentSessionId, rulePath: "actions.buy", actionData: { cost: 30, item: "Sword" } }
    });
    let validation = JSON.parse((validResult.content[0] as any).text);
    assert.strictEqual(validation.valid, true);

    const invalidResult: any = await client.callTool({
      name: "validate_action",
      arguments: { sessionId: currentSessionId, rulePath: "actions.buy", actionData: { cost: 100, item: "Shield" } }
    });
    validation = JSON.parse((invalidResult.content[0] as any).text);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors[0].includes("exceeds maximum"));
    
    const invalidReqResult: any = await client.callTool({
      name: "validate_action",
      arguments: { sessionId: currentSessionId, rulePath: "actions.buy", actionData: { cost: 20 } }
    });
    validation = JSON.parse((invalidReqResult.content[0] as any).text);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors[0].includes("is required"));
  });

  await t.test("Log playtest note", async () => {
    const result: any = await client.callTool({
      name: "log_playtest_note",
      arguments: {
        sessionId: currentSessionId,
        note: "Testing the playtest logging tool.",
        category: "Test",
      },
    });
    assert.strictEqual(result.isError, undefined);
    assert.ok((result.content[0] as any).text.includes("Successfully appended note"));
  });
});
