import test from "node:test";
import assert from "node:assert";
import { peekAtDeckTool, searchZoneTool, insertIntoDeckTool } from "../../../../src/handlers/card/deck.js";
import { initialize as initSessions, createSession, closeDb } from "../../../../src/services/SessionStore.js";
import { updateGameStateTool } from "../../../../src/handlers/session/core.js";

test("card/deck handler tests", async (t) => {
  let sessionId: string;

  t.before(async () => {
    await initSessions();
    const session = await createSession("card-deck-test-game");
    sessionId = session.sessionId;
  });

  t.after(() => {
    closeDb();
  });

  await t.test("peekAtDeckTool: peeks top cards without mutation", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { peekDeck: [{ id: "c1", name: "A" }, { id: "c2", name: "B" }, { id: "c3", name: "C" }] },
    } as any);

    const result = await peekAtDeckTool.handler({
      sessionId,
      deckId: "peekDeck",
      count: 2,
      from: "top",
    } as any);

    const cards = JSON.parse(result.content[0].text);
    assert.strictEqual(cards.length, 2);
    assert.strictEqual(cards[0].id, "c1");
    assert.strictEqual(cards[1].id, "c2");

    // Verify deck wasn't mutated
    const { getGameStateTool } = await import("../../../../src/handlers/session/core.js");
    const state = JSON.parse((await getGameStateTool.handler({ sessionId, fields: ["peekDeck"] } as any)).content[0].text);
    assert.strictEqual(state.peekDeck.length, 3, "Deck should still have 3 cards after peek");
  });

  await t.test("peekAtDeckTool: peeks bottom cards", async () => {
    const result = await peekAtDeckTool.handler({
      sessionId,
      deckId: "peekDeck",
      count: 1,
      from: "bottom",
    } as any);

    const cards = JSON.parse(result.content[0].text);
    assert.strictEqual(cards.length, 1);
    assert.strictEqual(cards[0].id, "c3");
  });

  await t.test("peekAtDeckTool: throws for non-array state key", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { notAnArray: "hello" },
    } as any);

    await assert.rejects(
      () => peekAtDeckTool.handler({
        sessionId,
        deckId: "notAnArray",
        count: 1,
        from: "top",
      } as any),
      (err: Error) => err.message.includes("not an array")
    );
  });

  await t.test("searchZoneTool: finds matching cards", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: {
        searchZone: [
          { id: "s1", type: "spell", cost: 3 },
          { id: "s2", type: "weapon", cost: 5 },
          { id: "s3", type: "spell", cost: 1 },
        ],
      },
    } as any);

    const result = await searchZoneTool.handler({
      sessionId,
      zoneId: "searchZone",
      filter: { key: "type", op: "eq", value: "spell" },
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.matches, 2);
    assert.ok(data.results.every((r: any) => r.item.type === "spell"));
  });

  await t.test("searchZoneTool: returns empty for no matches", async () => {
    const result = await searchZoneTool.handler({
      sessionId,
      zoneId: "searchZone",
      filter: { key: "type", op: "eq", value: "armor" },
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.matches, 0);
  });

  await t.test("insertIntoDeckTool: inserts at top", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { insertDeck: [{ id: "existing" }] },
    } as any);

    const result = await insertIntoDeckTool.handler({
      sessionId,
      deckId: "insertDeck",
      cards: [{ id: "new-top" }],
      position: "top",
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.inserted, 1);
    assert.strictEqual(data.deckSize, 2);

    // Verify order
    const { getGameStateTool } = await import("../../../../src/handlers/session/core.js");
    const state = JSON.parse((await getGameStateTool.handler({ sessionId, fields: ["insertDeck"] } as any)).content[0].text);
    assert.strictEqual(state.insertDeck[0].id, "new-top");
    assert.strictEqual(state.insertDeck[1].id, "existing");
  });

  await t.test("insertIntoDeckTool: inserts at bottom", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { bottomDeck: [{ id: "first" }] },
    } as any);

    await insertIntoDeckTool.handler({
      sessionId,
      deckId: "bottomDeck",
      cards: [{ id: "last" }],
      position: "bottom",
      actor: "Tester",
    } as any);

    const { getGameStateTool } = await import("../../../../src/handlers/session/core.js");
    const state = JSON.parse((await getGameStateTool.handler({ sessionId, fields: ["bottomDeck"] } as any)).content[0].text);
    assert.strictEqual(state.bottomDeck[0].id, "first");
    assert.strictEqual(state.bottomDeck[1].id, "last");
  });
});
