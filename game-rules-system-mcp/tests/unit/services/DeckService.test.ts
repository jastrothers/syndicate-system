import test from "node:test";
import assert from "node:assert";
import {
  peekCards,
  searchArray,
  insertIntoArray,
  drawWithReshuffle,
  matchesFilter,
  shuffleArray,
  validateFilterClause,
  expandCardTemplates,
} from "../../../src/services/DeckService.js";

test("DeckService", async (t) => {
  // ==================== matchesFilter ====================

  await t.test("matchesFilter: eq operator", () => {
    assert.strictEqual(matchesFilter({ type: "Treasure" }, { key: "type", op: "eq", value: "Treasure" }), true);
    assert.strictEqual(matchesFilter({ type: "Action" }, { key: "type", op: "eq", value: "Treasure" }), false);
  });

  await t.test("matchesFilter: ne operator", () => {
    assert.strictEqual(matchesFilter({ type: "Action" }, { key: "type", op: "ne", value: "Treasure" }), true);
    assert.strictEqual(matchesFilter({ type: "Treasure" }, { key: "type", op: "ne", value: "Treasure" }), false);
  });

  await t.test("matchesFilter: numeric comparisons", () => {
    const card = { name: "Knight", cost: 5 };
    assert.strictEqual(matchesFilter(card, { key: "cost", op: "gt", value: 3 }), true);
    assert.strictEqual(matchesFilter(card, { key: "cost", op: "gt", value: 5 }), false);
    assert.strictEqual(matchesFilter(card, { key: "cost", op: "gte", value: 5 }), true);
    assert.strictEqual(matchesFilter(card, { key: "cost", op: "lt", value: 10 }), true);
    assert.strictEqual(matchesFilter(card, { key: "cost", op: "lt", value: 5 }), false);
    assert.strictEqual(matchesFilter(card, { key: "cost", op: "lte", value: 5 }), true);
  });

  await t.test("matchesFilter: contains with string", () => {
    assert.strictEqual(matchesFilter({ name: "Fire Knight" }, { key: "name", op: "contains", value: "Knight" }), true);
    assert.strictEqual(matchesFilter({ name: "Ice Mage" }, { key: "name", op: "contains", value: "Knight" }), false);
  });

  await t.test("matchesFilter: contains with array", () => {
    assert.strictEqual(matchesFilter({ tags: ["combat", "melee"] }, { key: "tags", op: "contains", value: "combat" }), true);
    assert.strictEqual(matchesFilter({ tags: ["magic"] }, { key: "tags", op: "contains", value: "combat" }), false);
  });

  await t.test("matchesFilter: null/primitive items return false", () => {
    assert.strictEqual(matchesFilter(null, { key: "x", op: "eq", value: 1 }), false);
    assert.strictEqual(matchesFilter("string", { key: "x", op: "eq", value: 1 }), false);
    assert.strictEqual(matchesFilter(42, { key: "x", op: "eq", value: 1 }), false);
  });

  // ==================== peekCards ====================

  await t.test("peekCards: peek top N", () => {
    const deck = ["A", "B", "C", "D", "E"];
    const result = peekCards(deck, 3, "top");
    assert.deepStrictEqual(result, ["A", "B", "C"]);
    assert.strictEqual(deck.length, 5, "Deck should be unchanged");
  });

  await t.test("peekCards: peek bottom N", () => {
    const deck = ["A", "B", "C", "D", "E"];
    const result = peekCards(deck, 2, "bottom");
    assert.deepStrictEqual(result, ["D", "E"]);
    assert.strictEqual(deck.length, 5, "Deck should be unchanged");
  });

  await t.test("peekCards: count exceeds length", () => {
    const deck = ["A", "B"];
    const result = peekCards(deck, 10, "top");
    assert.deepStrictEqual(result, ["A", "B"]);
    assert.strictEqual(deck.length, 2);
  });

  await t.test("peekCards: empty deck", () => {
    const result = peekCards([], 5, "top");
    assert.deepStrictEqual(result, []);
  });

  await t.test("peekCards: default is top", () => {
    const deck = ["X", "Y", "Z"];
    assert.deepStrictEqual(peekCards(deck, 1), ["X"]);
  });

  // ==================== searchArray ====================

  await t.test("searchArray: eq filter", () => {
    const arr = [
      { name: "Copper", type: "Treasure" },
      { name: "Smithy", type: "Action" },
      { name: "Gold", type: "Treasure" },
    ];
    const results = searchArray(arr, { key: "type", op: "eq", value: "Treasure" });
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].index, 0);
    assert.strictEqual(results[0].item.name, "Copper");
    assert.strictEqual(results[1].index, 2);
    assert.strictEqual(results[1].item.name, "Gold");
  });

  await t.test("searchArray: gt filter", () => {
    const arr = [
      { name: "Copper", cost: 0 },
      { name: "Silver", cost: 3 },
      { name: "Gold", cost: 6 },
    ];
    const results = searchArray(arr, { key: "cost", op: "gt", value: 2 });
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].item.name, "Silver");
    assert.strictEqual(results[1].item.name, "Gold");
  });

  await t.test("searchArray: no matches", () => {
    const arr = [{ type: "Action" }, { type: "Action" }];
    const results = searchArray(arr, { key: "type", op: "eq", value: "Treasure" });
    assert.strictEqual(results.length, 0);
  });

  // ==================== insertIntoArray ====================

  await t.test("insertIntoArray: top", () => {
    const arr = ["B", "C"];
    insertIntoArray(arr, ["A"], "top");
    assert.deepStrictEqual(arr, ["A", "B", "C"]);
  });

  await t.test("insertIntoArray: bottom", () => {
    const arr = ["A", "B"];
    insertIntoArray(arr, ["C"], "bottom");
    assert.deepStrictEqual(arr, ["A", "B", "C"]);
  });

  await t.test("insertIntoArray: numeric index", () => {
    const arr = ["A", "C", "D"];
    insertIntoArray(arr, ["B"], 1);
    assert.deepStrictEqual(arr, ["A", "B", "C", "D"]);
  });

  await t.test("insertIntoArray: multiple items at top", () => {
    const arr = ["C"];
    insertIntoArray(arr, ["A", "B"], "top");
    assert.deepStrictEqual(arr, ["A", "B", "C"]);
  });

  await t.test("insertIntoArray: index beyond length appends", () => {
    const arr = ["A"];
    insertIntoArray(arr, ["B"], 100);
    assert.deepStrictEqual(arr, ["A", "B"]);
  });

  // ==================== shuffleArray ====================

  await t.test("shuffleArray: preserves all elements", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = [...arr];
    shuffleArray(arr);
    assert.strictEqual(arr.length, original.length);
    assert.deepStrictEqual(arr.sort(), original.sort());
  });

  await t.test("shuffleArray: single element", () => {
    const arr = [42];
    shuffleArray(arr);
    assert.deepStrictEqual(arr, [42]);
  });

  // ==================== drawWithReshuffle ====================

  await t.test("drawWithReshuffle: normal draw (no reshuffle needed)", () => {
    const deck = ["A", "B", "C", "D"];
    const discard: string[] = [];
    const { drawn, reshuffled } = drawWithReshuffle(deck, discard, 2);
    assert.strictEqual(drawn.length, 2);
    assert.strictEqual(reshuffled, false);
    assert.strictEqual(deck.length, 2);
  });

  await t.test("drawWithReshuffle: triggers reshuffle", () => {
    const deck = ["A"];
    const discard = ["B", "C", "D"];
    const { drawn, reshuffled } = drawWithReshuffle(deck, discard, 3);
    assert.strictEqual(drawn.length, 3);
    assert.strictEqual(reshuffled, true);
    assert.strictEqual(discard.length, 0, "Discard should be empty after reshuffle");
    // First card drawn should be "A" (from original deck)
    assert.strictEqual(drawn[0], "A");
  });

  await t.test("drawWithReshuffle: both empty stops early", () => {
    const deck: string[] = [];
    const discard: string[] = [];
    const { drawn, reshuffled } = drawWithReshuffle(deck, discard, 5);
    assert.strictEqual(drawn.length, 0);
    assert.strictEqual(reshuffled, false);
  });

  await t.test("drawWithReshuffle: partial draw when insufficient cards", () => {
    const deck = ["A"];
    const discard = ["B"];
    const { drawn, reshuffled } = drawWithReshuffle(deck, discard, 5);
    assert.strictEqual(drawn.length, 2);
    assert.strictEqual(reshuffled, true);
  });

  await t.test("drawWithReshuffle: deck empty, discard has enough", () => {
    const deck: string[] = [];
    const discard = ["X", "Y", "Z"];
    const { drawn, reshuffled } = drawWithReshuffle(deck, discard, 2);
    assert.strictEqual(drawn.length, 2);
    assert.strictEqual(reshuffled, true);
    assert.strictEqual(discard.length, 0);
    assert.strictEqual(deck.length, 1, "One card should remain in deck after drawing 2 of 3");
  });

  // ==================== validateFilterClause ====================

  await t.test("validateFilterClause: passes for eq with string value", () => {
    assert.doesNotThrow(() => validateFilterClause({ key: "name", op: "eq", value: "Copper" }));
  });

  await t.test("validateFilterClause: passes for gt with numeric value", () => {
    assert.doesNotThrow(() => validateFilterClause({ key: "cost", op: "gt", value: 3 }));
  });

  await t.test("validateFilterClause: throws for gt with string value", () => {
    assert.throws(
      () => validateFilterClause({ key: "cost", op: "gt", value: "three" }),
      /requires a numeric value/
    );
  });

  await t.test("validateFilterClause: throws for lte with boolean value", () => {
    assert.throws(
      () => validateFilterClause({ key: "hp", op: "lte", value: true }),
      /requires a numeric value/
    );
  });

  // ==================== expandCardTemplates ====================

  await t.test("expandCardTemplates: expands cards with counts", () => {
    const deck = expandCardTemplates([
      { card: { name: "Copper" }, count: 3 },
      { card: { name: "Silver" }, count: 2 },
    ]);
    assert.strictEqual(deck.length, 5);
    assert.strictEqual((deck[0] as any).name, "Copper");
    assert.strictEqual((deck[3] as any).name, "Silver");
  });

  await t.test("expandCardTemplates: assigns unique ids to object cards", () => {
    const deck = expandCardTemplates([
      { card: { name: "Copper" }, count: 2 },
    ]);
    assert.notStrictEqual((deck[0] as any).id, (deck[1] as any).id);
  });

  await t.test("expandCardTemplates: handles scalar cards", () => {
    const deck = expandCardTemplates([
      { card: "token" as any, count: 3 },
    ]);
    assert.strictEqual(deck.length, 3);
    assert.strictEqual(deck[0], "token");
  });
});
