import test from "node:test";
import assert from "node:assert";
import { parseAndRoll } from "../../../src/services/DiceService.js";

test("DiceService: parseAndRoll", async (t) => {
  await t.test("Valid standard notation (2d6)", () => {
    const result = parseAndRoll("2d6");
    assert.strictEqual(result.rolls.length, 2);
    assert.strictEqual(result.modifier, 0);
    assert.ok(result.total >= 2 && result.total <= 12);
    result.rolls.forEach(r => assert.ok(r >= 1 && r <= 6));
  });

  await t.test("Valid notation with modifier (1d20+5)", () => {
    const result = parseAndRoll("1d20+5");
    assert.strictEqual(result.rolls.length, 1);
    assert.strictEqual(result.modifier, 5);
    assert.ok(result.total >= 6 && result.total <= 25);
  });

  await t.test("Throws on invalid notation", () => {
    assert.throws(() => parseAndRoll("invalid"), /Invalid dice notation/);
    assert.throws(() => parseAndRoll("2d"), /Invalid dice notation/);
  });
});
