import test from "node:test";
import assert from "node:assert";
import { createDeckFromTemplateTool, countZoneTool, revealCardsTool } from "../../../../src/handlers/card/deckBuilding.js";
import { initialize as initSessions, createSession, closeDb } from "../../../../src/services/SessionStore.js";
import { updateGameStateTool, getGameStateTool } from "../../../../src/handlers/session/core.js";

test("card/deckBuilding handler tests", async (t) => {
  let sessionId: string;

  t.before(async () => {
    await initSessions();
    const session = await createSession("deck-building-test-game");
    sessionId = session.sessionId;
  });

  t.after(() => {
    closeDb();
  });

  await t.test("createDeckFromTemplateTool: creates deck with correct card count", async () => {
    const result = await createDeckFromTemplateTool.handler({
      sessionId,
      deckId: "market",
      cards: [
        { card: { name: "Gold", value: 3 }, count: 4 },
        { card: { name: "Silver", value: 1 }, count: 6 },
      ],
      shuffle: false,
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.totalCards, 10);
    assert.strictEqual(data.uniqueTypes, 2);
    assert.strictEqual(data.shuffled, false);

    // Verify state
    const state = JSON.parse((await getGameStateTool.handler({ sessionId, fields: ["market"] } as any)).content[0].text);
    assert.strictEqual(state.market.length, 10);
    // First 4 should be Gold (unshuffled)
    assert.strictEqual(state.market[0].name, "Gold");
    assert.strictEqual(state.market[4].name, "Silver");
  });

  await t.test("createDeckFromTemplateTool: assigns unique ids to object cards", async () => {
    await createDeckFromTemplateTool.handler({
      sessionId,
      deckId: "idDeck",
      cards: [{ card: { name: "Token" }, count: 3 }],
      shuffle: false,
    } as any);

    const state = JSON.parse((await getGameStateTool.handler({ sessionId, fields: ["idDeck"] } as any)).content[0].text);
    const ids = state.idDeck.map((c: any) => c.id);
    assert.strictEqual(ids.length, 3);
    // All ids should be unique
    assert.strictEqual(new Set(ids).size, 3, "All generated ids should be unique");
    // All ids should be present (non-null/undefined)
    assert.ok(ids.every((id: string) => typeof id === "string" && id.length > 0));
  });

  await t.test("countZoneTool: counts total items", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { countZone: [{ type: "a" }, { type: "b" }, { type: "a" }] },
    } as any);

    const result = await countZoneTool.handler({
      sessionId,
      zoneId: "countZone",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.count, 3);
    assert.strictEqual(data.filtered, false);
  });

  await t.test("countZoneTool: counts filtered items", async () => {
    const result = await countZoneTool.handler({
      sessionId,
      zoneId: "countZone",
      filter: { key: "type", op: "eq", value: "a" },
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.count, 2);
    assert.strictEqual(data.filtered, true);
  });

  await t.test("countZoneTool: throws for non-array zone", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { notArray: 42 },
    } as any);

    await assert.rejects(
      () => countZoneTool.handler({
        sessionId,
        zoneId: "notArray",
      } as any),
      (err: Error) => err.message.includes("not an array")
    );
  });

  await t.test("revealCardsTool: reveals specific cards by id", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: {
        revealZone: [
          { id: "r1", name: "Hidden Gem" },
          { id: "r2", name: "Trap" },
          { id: "r3", name: "Treasure" },
        ],
      },
    } as any);

    const result = await revealCardsTool.handler({
      sessionId,
      zoneId: "revealZone",
      cardIds: ["r1", "r3"],
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.revealed, 2);
    const names = data.cards.map((c: any) => c.name);
    assert.ok(names.includes("Hidden Gem"));
    assert.ok(names.includes("Treasure"));
    assert.ok(!names.includes("Trap"));
  });

  await t.test("revealCardsTool: reveals all cards when no cardIds provided", async () => {
    const result = await revealCardsTool.handler({
      sessionId,
      zoneId: "revealZone",
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.revealed, 3);
  });

  await t.test("revealCardsTool: reveals by name", async () => {
    const result = await revealCardsTool.handler({
      sessionId,
      zoneId: "revealZone",
      cardIds: ["Trap"],
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.revealed, 1);
    assert.strictEqual(data.cards[0].name, "Trap");
  });
});
