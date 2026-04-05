import test from "node:test";
import assert from "node:assert";
import { queryZoneTool } from "../../../../src/handlers/card/deck.js";
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

  await t.test("queryZoneTool (peek): peeks top cards without mutation", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { peekDeck: [{ id: "c1", name: "A" }, { id: "c2", name: "B" }, { id: "c3", name: "C" }] },
    } as any);

    const result = await queryZoneTool.handler({
      sessionId,
      zoneId: "peekDeck",
      action: "peek",
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

  await t.test("queryZoneTool (peek): peeks bottom cards", async () => {
    const result = await queryZoneTool.handler({
      sessionId,
      zoneId: "peekDeck",
      action: "peek",
      count: 1,
      from: "bottom",
    } as any);

    const cards = JSON.parse(result.content[0].text);
    assert.strictEqual(cards.length, 1);
    assert.strictEqual(cards[0].id, "c3");
  });

  await t.test("queryZoneTool (peek): throws for non-array state key", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { notAnArray: "hello" },
    } as any);

    await assert.rejects(
      () => queryZoneTool.handler({
        sessionId,
        zoneId: "notAnArray",
        action: "peek",
        count: 1,
      } as any),
      (err: Error) => err.message.includes("not an array")
    );
  });

  await t.test("queryZoneTool (search): finds matching cards", async () => {
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

    const result = await queryZoneTool.handler({
      sessionId,
      zoneId: "searchZone",
      action: "search",
      filter: { key: "type", op: "eq", value: "spell" },
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.matches, 2);
    assert.ok(data.results.every((r: any) => r.item.type === "spell"));
  });

  await t.test("queryZoneTool (search): returns empty for no matches", async () => {
    const result = await queryZoneTool.handler({
      sessionId,
      zoneId: "searchZone",
      action: "search",
      filter: { key: "type", op: "eq", value: "armor" },
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.matches, 0);
  });

  await t.test("queryZoneTool (count): counts total items", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { countZone: [{ type: "a" }, { type: "b" }, { type: "a" }] },
    } as any);

    const result = await queryZoneTool.handler({
      sessionId,
      zoneId: "countZone",
      action: "count",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.count, 3);
    assert.strictEqual(data.filtered, false);
  });

  await t.test("queryZoneTool (count): counts filtered items", async () => {
    const result = await queryZoneTool.handler({
      sessionId,
      zoneId: "countZone",
      action: "count",
      filter: { key: "type", op: "eq", value: "a" },
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.count, 2);
    assert.strictEqual(data.filtered, true);
  });

  await t.test("queryZoneTool (count): throws for non-array zone", async () => {
    await updateGameStateTool.handler({
      sessionId,
      patch: { notArray: 42 },
    } as any);

    await assert.rejects(
      () => queryZoneTool.handler({
        sessionId,
        zoneId: "notArray",
        action: "count",
      } as any),
      (err: Error) => err.message.includes("not an array")
    );
  });

});
