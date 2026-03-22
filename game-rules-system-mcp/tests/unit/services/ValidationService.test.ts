import test from "node:test";
import assert from "node:assert";
import { validateConstraint } from "../../../src/services/ValidationService.js";
import { PlaytestSession } from "../../../src/types/index.js";

test("ValidationService: validateConstraint", async (t) => {
  const dummySession: PlaytestSession = {
    sessionId: "abc",
    rulebookName: "test",
    state: { health: 10 },
    ledger: [],
    createdAt: "",
    lastUpdatedAt: ""
  };

  await t.test("Returns valid when no constraints provided", () => {
    const result = validateConstraint({
      session: dummySession,
      actionData: { cost: 5 },
      constraints: undefined as any
    });
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  await t.test("Validates 'required' constraint correctly", () => {
    const constraints = { item: "required", amount: "required" };
    
    // Missing amount
    const invalidResult = validateConstraint({
      session: dummySession,
      actionData: { item: "Sword" },
      constraints
    });
    assert.strictEqual(invalidResult.valid, false);
    assert.strictEqual(invalidResult.errors[0], "amount is required.");
    
    // Valid
    const validResult = validateConstraint({
      session: dummySession,
      actionData: { item: "Sword", amount: 1 },
      constraints
    });
    assert.strictEqual(validResult.valid, true);
  });

  await t.test("Validates 'max' object constraint correctly", () => {
    const constraints = { cost: { type: "max", value: 50 } };
    
    const invalidResult = validateConstraint({
      session: dummySession,
      actionData: { cost: 100 },
      constraints
    });
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.errors[0].includes("exceeds maximum of 50"));
  });

  await t.test("Validates 'state_max' object constraint correctly", () => {
    const constraints = { damage: { type: "state_max", stateKey: "health" } };
    
    const invalidResult = validateConstraint({
      session: dummySession,
      actionData: { damage: 15 },
      constraints
    });
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.errors[0].includes("exceeds state limit of 10 from health"));
    
    const validResult = validateConstraint({
      session: dummySession,
      actionData: { damage: 5 },
      constraints
    });
    assert.strictEqual(validResult.valid, true);
  });
});
