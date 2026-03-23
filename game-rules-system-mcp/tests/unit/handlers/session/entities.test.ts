import test from "node:test";
import assert from "node:assert";
import { drawFromDeckTool, shuffleDeckTool, moveEntityTool } from "../../../../src/handlers/session/entities.js";
import { initialize as initSessions, createSession, closeDb } from "../../../../src/services/SessionStore.js";

test("session/entities handler tests", async (t) => {
  let sessionId: string;

  t.before(async () => {
    await initSessions();
    const session = await createSession("entities-test-game");
    sessionId = session.sessionId;
  });

  t.after(async () => {
    closeDb();
  });

  await t.test("drawFromDeckTool: draws cards from deck to hand", async () => {
    // Set up state: a deck with known cards
    const { updateGameStateTool } = await import("../../../../src/handlers/session/core.js");
    await updateGameStateTool.handler({
      sessionId,
      patch: { testDeck: ["A", "B", "C", "D", "E"], testHand: [] },
    } as any);

    const result = await drawFromDeckTool.handler({
      sessionId,
      deckId: "testDeck",
      targetHandId: "testHand",
      count: 2,
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.drawn.length, 2);
    assert.deepStrictEqual(data.drawn, ["A", "B"]);
    assert.strictEqual(data.deckRemaining, 3);
    assert.strictEqual(data.handSize, 2);
  });

  await t.test("drawFromDeckTool: handles drawing more than available", async () => {
    const { updateGameStateTool } = await import("../../../../src/handlers/session/core.js");
    await updateGameStateTool.handler({
      sessionId,
      patch: { smallDeck: ["X"], emptyHand: [] },
    } as any);

    const result = await drawFromDeckTool.handler({
      sessionId,
      deckId: "smallDeck",
      targetHandId: "emptyHand",
      count: 5,
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.drawn.length, 1);
    assert.strictEqual(data.deckRemaining, 0);
  });

  await t.test("shuffleDeckTool: shuffles deck and preserves elements", async () => {
    const { updateGameStateTool, getGameStateTool } = await import("../../../../src/handlers/session/core.js");
    const cards = Array.from({ length: 20 }, (_, i) => `card-${i}`);
    await updateGameStateTool.handler({
      sessionId,
      patch: { shuffleTestDeck: [...cards] },
    } as any);

    await shuffleDeckTool.handler({
      sessionId,
      deckId: "shuffleTestDeck",
    } as any);

    const stateResult = await getGameStateTool.handler({
      sessionId,
      fields: ["shuffleTestDeck"],
    } as any);
    const state = JSON.parse(stateResult.content[0].text);
    assert.strictEqual(state.shuffleTestDeck.length, 20);
    assert.deepStrictEqual([...state.shuffleTestDeck].sort(), cards.sort());
  });

  await t.test("moveEntityTool: moves entity by id", async () => {
    const { updateGameStateTool } = await import("../../../../src/handlers/session/core.js");
    await updateGameStateTool.handler({
      sessionId,
      patch: {
        moveSource: [{ id: "a1", name: "Alpha" }, { id: "b2", name: "Beta" }],
        moveTarget: [],
      },
    } as any);

    const result = await moveEntityTool.handler({
      sessionId,
      entityId: "a1",
      sourceId: "moveSource",
      targetId: "moveTarget",
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.movedItem.id, "a1");
    assert.strictEqual(data.sourceRemaining, 1);
    assert.strictEqual(data.targetSize, 1);
  });

  await t.test("moveEntityTool: moves entity by name", async () => {
    const { updateGameStateTool } = await import("../../../../src/handlers/session/core.js");
    await updateGameStateTool.handler({
      sessionId,
      patch: {
        nameSource: [{ id: "x1", name: "Guard" }, { id: "x2", name: "Thief" }],
        nameTarget: [],
      },
    } as any);

    const result = await moveEntityTool.handler({
      sessionId,
      entityId: "Thief",
      sourceId: "nameSource",
      targetId: "nameTarget",
      actor: "Tester",
    } as any);

    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.movedItem.name, "Thief");
  });

  await t.test("moveEntityTool: throws when entity not found", async () => {
    const { updateGameStateTool } = await import("../../../../src/handlers/session/core.js");
    await updateGameStateTool.handler({
      sessionId,
      patch: { srcZone: ["A", "B"], tgtZone: [] },
    } as any);

    await assert.rejects(
      () => moveEntityTool.handler({
        sessionId,
        entityId: "missing",
        sourceId: "srcZone",
        targetId: "tgtZone",
        actor: "Tester",
      } as any),
      (err: Error) => err.message.includes("not found")
    );
  });

  await t.test("moveEntityTool: throws when source is empty", async () => {
    const { updateGameStateTool } = await import("../../../../src/handlers/session/core.js");
    await updateGameStateTool.handler({
      sessionId,
      patch: { emptySource: [], emptyTarget: [] },
    } as any);

    await assert.rejects(
      () => moveEntityTool.handler({
        sessionId,
        entityId: "anything",
        sourceId: "emptySource",
        targetId: "emptyTarget",
        actor: "Tester",
      } as any),
      (err: Error) => err.message.includes("empty")
    );
  });
});
