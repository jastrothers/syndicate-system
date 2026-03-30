/**
 * Test utilities for building mock data and assertion helpers
 */

import assert from "node:assert";
import {
  Rulebook,
  PlaytestSession,
  DesignSession,
  DesignStep,
  ActionLog,
  Component,
  DesignerProfile,
} from "../../src/types/index.js";

// ─── Mock Data Builders ──────────────────────────────────────────────────────

export function createMockCard(overrides?: Record<string, any>) {
  return {
    id: "card-001",
    name: "Test Card",
    type: "Treasure",
    cost: 3,
    value: 5,
    ...overrides,
  };
}

export function createTestRulebook(
  name: string,
  overrides?: Partial<Rulebook>
): Rulebook {
  return {
    metadata: {
      title: name,
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      versionTag: "v1.0.0",
      description: `Test rulebook: ${name}`,
    },
    sections: {
      overview: {
        title: "Overview",
        content: "Game overview section",
        subsections: {},
      },
      rules: {
        title: "Basic Rules",
        content: "Core rules for the game",
        subsections: {
          setup: {
            title: "Setup",
            content: "How to set up the game",
          },
          gameplay: {
            title: "Gameplay",
            content: "How to play",
          },
        },
      },
    },
    components: [
      {
        type: "Card",
        name: "Player Cards",
        quantity: 50,
        description: "Cards used by players",
      },
    ],
    ...overrides,
  };
}

export function createTestSession(
  gameId: string,
  overrides?: Partial<PlaytestSession>
): PlaytestSession {
  return {
    sessionId: `session-${Date.now()}`,
    rulebookName: gameId,
    rulebookVersion: "1.0.0",
    state: {
      currentPhase: "setup",
      activePlayer: "player-1",
      turnNumber: 1,
    },
    ledger: [],
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestDesignSession(
  gameName: string,
  overrides?: Partial<DesignSession>
): DesignSession {
  return {
    sessionId: `design-${Date.now()}`,
    gameName,
    theme: "Test Theme",
    initialPrompt: "Design a test game",
    steps: [],
    status: "active",
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createDesignStep(
  stepNumber: number,
  persona: string,
  overrides?: Partial<DesignStep>
): DesignStep {
  return {
    stepNumber,
    persona,
    output: `Step ${stepNumber} output from ${persona}`,
    summary: `Summary of step ${stepNumber}`,
    timestamp: new Date().toISOString(),
    trace: {
      observation: "Observed behavior",
      data: { metric: 42 },
      mechanism: "Test mechanism",
      impact: "Positive impact",
    },
    ...overrides,
  };
}

export function createActionLog(
  actionType: string,
  overrides?: Partial<ActionLog>
): ActionLog {
  return {
    timestamp: new Date().toISOString(),
    actionType,
    actor: "test-actor",
    data: {},
    ...overrides,
  };
}

export function createDesignerProfile(
  overrides?: Partial<DesignerProfile>
): DesignerProfile {
  return {
    affinities: {
      "deck-churn": 0.5,
      "tension-scaling": 0.3,
      "wound-mechanics": 0.2,
    },
    complexityTolerance: 3,
    thematicPreferences: ["strategic", "asymmetric"],
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockComponent(
  overrides?: Partial<Component>
): Component {
  return {
    type: "Token",
    name: "Score Token",
    quantity: 30,
    description: "Used to track player scores",
    ...overrides,
  };
}

// ─── Assertion Helpers ───────────────────────────────────────────────────────

/**
 * Assert that a rulebook has valid structure
 */
export function assertRulebookStructure(
  rb: unknown,
  context: string = "Rulebook"
): asserts rb is Rulebook {
  assert.ok(rb, `${context} must exist`);
  assert.ok(typeof rb === "object", `${context} must be an object`);
  const rb_ = rb as any;
  assert.ok(rb_.metadata, `${context} must have metadata`);
  assert.ok(rb_.metadata.title, `${context} metadata must have a title`);
  assert.ok(rb_.metadata.version, `${context} metadata must have a version`);
  assert.ok(rb_.sections, `${context} must have sections`);
  assert.ok(typeof rb_.sections === "object", `${context}.sections must be an object`);
}

/**
 * Assert that a session has valid state
 */
export function assertSessionValid(
  session: unknown,
  context: string = "Session"
): asserts session is PlaytestSession {
  assert.ok(session, `${context} must exist`);
  assert.ok(typeof session === "object", `${context} must be an object`);
  const s = session as any;
  assert.ok(s.sessionId, `${context} must have a sessionId`);
  assert.ok(s.rulebookName, `${context} must have a rulebookName`);
  assert.ok(s.state, `${context} must have state`);
  assert.ok(Array.isArray(s.ledger), `${context}.ledger must be an array`);
}

/**
 * Assert that a deck has integrity (no duplicates, valid indices)
 */
export function assertDeckIntegrity(
  deck: unknown[],
  context: string = "Deck"
): void {
  assert.ok(Array.isArray(deck), `${context} must be an array`);
  assert.ok(deck.length >= 0, `${context} length must be non-negative`);

  // Check for null/undefined entries in the middle
  const nullIndex = deck.findIndex((card) => card === null || card === undefined);
  assert.strictEqual(
    nullIndex,
    -1,
    `${context} contains null/undefined at index ${nullIndex}`
  );
}

/**
 * Deep equality with helpful diff on failure
 */
export function assertDeepEqual(
  actual: any,
  expected: any,
  message: string = ""
): void {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch (e) {
    const msg = message
      ? `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
      : undefined;
    throw new assert.AssertionError({
      message: msg,
      actual,
      expected,
      operator: "deepStrictEqual",
    });
  }
}

/**
 * Assert that a design session has at least N steps
 */
export function assertDesignSessionSteps(
  session: DesignSession,
  minSteps: number,
  context: string = "DesignSession"
): void {
  assert.ok(
    Array.isArray(session.steps),
    `${context}.steps must be an array`
  );
  assert.ok(
    session.steps.length >= minSteps,
    `${context} must have at least ${minSteps} steps (found ${session.steps.length})`
  );
}

/**
 * Assert no duplicate UUIDs in an array of objects with id field
 */
export function assertNoDuplicateIds(
  items: any[],
  idField: string = "id",
  context: string = "Items"
): void {
  const ids = items.map((item) => item[idField]);
  const unique = new Set(ids);
  assert.strictEqual(
    ids.length,
    unique.size,
    `${context} has duplicate ${idField} values`
  );
}

/**
 * Assert that an object conforms to a schema (basic shape check)
 */
export function assertShapeMatches(
  obj: any,
  expectedShape: Record<string, string>,
  context: string = "Object"
): void {
  for (const [key, type] of Object.entries(expectedShape)) {
    assert.ok(
      key in obj,
      `${context} missing required field: ${key}`
    );
    assert.strictEqual(
      typeof obj[key],
      type,
      `${context}.${key} must be ${type}, got ${typeof obj[key]}`
    );
  }
}

/**
 * Timeout assertion utility
 */
export async function assertCompletesBefore(
  fn: () => Promise<void>,
  maxMs: number,
  message: string = ""
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          message || `Operation did not complete within ${maxMs}ms`
        )
      );
    }, maxMs);

    fn().then(() => {
      clearTimeout(timer);
      resolve();
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
