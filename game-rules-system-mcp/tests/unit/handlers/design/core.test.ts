import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDesignSessionTool,
  deleteDesignSessionTool,
  designCoreTools,
  validateGameName,
} from "../../../../src/handlers/design/core.js";

// ── Tool registration ─────────────────────────────────────────────────────────

describe("designCoreTools registration", () => {
  it("exports five tools", () => {
    assert.equal(designCoreTools.length, 5);
  });

  it("contains the expected tool names", () => {
    const names = designCoreTools.map((t) => t.name);
    assert.deepEqual(names.sort(), [
      "add_design_step",
      "create_design_session",
      "delete_design_session",
      "get_design_session",
      "list_design_sessions",
    ]);
  });
});

// ── create_design_session ─────────────────────────────────────────────────────

describe("createDesignSessionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(createDesignSessionTool.name, "create_design_session");
  });

  it("schema requires gameName, theme, and initialPrompt", () => {
    const valid = createDesignSessionTool.schema.safeParse({
      gameName: "heist",
      theme: "noir",
      initialPrompt: "Create a gritty detective game.",
    });
    assert.ok(valid.success);

    const missing = createDesignSessionTool.schema.safeParse({ gameName: "heist" });
    assert.ok(!missing.success, "Missing theme should fail");

    const noPrompt = createDesignSessionTool.schema.safeParse({ gameName: "heist", theme: "noir" });
    assert.ok(!noPrompt.success, "Missing initialPrompt should fail");
  });

  it("schema accepts prePickedMechanics as an optional string array", () => {
    const withMechanics = createDesignSessionTool.schema.safeParse({
      gameName: "heist",
      theme: "noir",
      initialPrompt: "Create a gritty detective game.",
      prePickedMechanics: ["hand_management", "deck_building"],
    });
    assert.ok(withMechanics.success, "Should accept prePickedMechanics array");
    assert.deepEqual(withMechanics.data?.prePickedMechanics, ["hand_management", "deck_building"]);
  });

  it("schema accepts call without prePickedMechanics (backward compat)", () => {
    const withoutMechanics = createDesignSessionTool.schema.safeParse({
      gameName: "heist",
      theme: "noir",
      initialPrompt: "Create a gritty detective game.",
    });
    assert.ok(withoutMechanics.success, "Should work without prePickedMechanics");
    assert.equal(withoutMechanics.data?.prePickedMechanics, undefined);
  });

  it("schema rejects prePickedMechanics if not array of strings", () => {
    const badType = createDesignSessionTool.schema.safeParse({
      gameName: "heist",
      theme: "noir",
      initialPrompt: "Create a gritty detective game.",
      prePickedMechanics: "hand_management,deck_building",
    });
    assert.ok(!badType.success, "Should reject string instead of array");
  });
});

// ── delete_design_session ─────────────────────────────────────────────────────

describe("deleteDesignSessionTool", () => {
  it("has the correct tool name", () => {
    assert.equal(deleteDesignSessionTool.name, "delete_design_session");
  });

  it("has a handler function", () => {
    assert.equal(typeof deleteDesignSessionTool.handler, "function");
  });

  it("schema requires gameName, sessionId, and confirm: true", () => {
    const valid = deleteDesignSessionTool.schema.safeParse({
      gameName: "heist",
      sessionId: "abc-123",
      confirm: true,
    });
    assert.ok(valid.success);

    const missingConfirm = deleteDesignSessionTool.schema.safeParse({
      gameName: "heist",
      sessionId: "abc-123",
    });
    assert.ok(!missingConfirm.success, "Missing confirm should fail");
  });

  it("schema rejects missing gameName", () => {
    const result = deleteDesignSessionTool.schema.safeParse({ sessionId: "abc-123" });
    assert.ok(!result.success, "Missing gameName should fail");
  });

  it("schema rejects missing sessionId", () => {
    const result = deleteDesignSessionTool.schema.safeParse({ gameName: "heist" });
    assert.ok(!result.success, "Missing sessionId should fail");
  });
});

// ── validateGameName (sanitization) ──────────────────────────────────────────

describe("validateGameName", () => {
  it("strips special characters and returns sanitized name", () => {
    assert.equal(validateGameName("PokéNursery: Blissful Beginnings"), "PokNurseryBlissfulBeginnings");
  });

  it("preserves already-safe names", () => {
    assert.equal(validateGameName("pokenursery-blissful-beginnings"), "pokenursery-blissful-beginnings");
  });

  it("preserves underscores and dashes", () => {
    assert.equal(validateGameName("my_game-v2"), "my_game-v2");
  });

  it("throws on empty result after sanitization", () => {
    assert.throws(() => validateGameName(":::"), /Invalid game name/);
  });

  it("strips spaces, colons, accented characters", () => {
    assert.equal(validateGameName("Café: Le Jeu!"), "CafLeJeu");
  });
});
