import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs/promises";
import { getRulebookDir } from "../../../src/config/paths.js";
import { saveRulebook } from "../../../src/services/RulebookStore.js";
import { searchRuleSections } from "../../../src/services/RulebookSearch.js";
import { Rulebook } from "../../../src/types/index.js";

const TEST_GAME = "search-test-" + Date.now();

const TEST_RULEBOOK: Rulebook = {
  metadata: { title: "Search Test Game", version: "1.0.0", lastUpdated: new Date().toISOString() },
  sections: {
    combat: {
      title: "Combat Rules",
      content: "Players engage in tactical battles using cards.",
      subsections: {
        resolution: {
          title: "Combat Resolution",
          content: "Compare attack and defense values to determine outcomes.",
        },
        retreat: {
          title: "Retreat",
          content: "A player may retreat by spending two action points.",
        },
      },
    },
    setup: {
      title: "Game Setup",
      content: "Place the board in the center of the table. Each player draws five cards.",
    },
    glossary: {
      title: "Glossary",
      content: "Definitions for all TACTICAL terms used in this game.",
    },
    longRules: {
      title: "Extended Rules",
      // Content intentionally >200 chars and contains "cards" to exercise truncation branch
      content: "These are the extended rules for drawing cards. " + "X".repeat(180) + " cards are drawn at the end of each turn.",
    },
  },
};

describe("RulebookSearch.searchRuleSections", () => {
  before(async () => {
    await fs.mkdir(getRulebookDir(TEST_GAME), { recursive: true });
    await saveRulebook(TEST_GAME, TEST_RULEBOOK);
  });

  after(async () => {
    try { await fs.rm(getRulebookDir(TEST_GAME), { recursive: true, force: true }); } catch {}
  });

  it("matches sections by title keyword (case-insensitive)", async () => {
    const results = await searchRuleSections(TEST_GAME, "combat");
    assert.ok(results.matches.length >= 2, "Should find 'Combat Rules' and 'Combat Resolution'");
    const paths = results.matches.map(m => m.path);
    assert.ok(paths.includes("combat"), "Should include root combat section");
    assert.ok(paths.includes("combat.resolution"), "Should include combat.resolution subsection");
  });

  it("matches sections by content keyword (case-insensitive)", async () => {
    const results = await searchRuleSections(TEST_GAME, "TACTICAL");
    assert.ok(results.matches.length >= 1, "Should match content in glossary");
    const paths = results.matches.map(m => m.path);
    assert.ok(paths.includes("glossary"), "Should find glossary via content keyword");
  });

  it("returns empty matches array when no section matches", async () => {
    const results = await searchRuleSections(TEST_GAME, "xyzzy_nonexistent_keyword");
    assert.deepStrictEqual(results.matches, []);
  });

  it("each match has path, title, and snippet fields", async () => {
    const results = await searchRuleSections(TEST_GAME, "setup");
    assert.ok(results.matches.length >= 1);
    const match = results.matches[0];
    assert.ok(typeof match.path === "string", "match.path must be string");
    assert.ok(typeof match.title === "string", "match.title must be string");
    assert.ok(typeof match.snippet === "string", "match.snippet must be string");
  });

  it("snippets are truncated to at most 200 characters and end with '...'", async () => {
    const results = await searchRuleSections(TEST_GAME, "cards");
    // longRules section has content >200 chars and matches "cards"
    const longMatch = results.matches.find(m => m.path === "longRules");
    assert.ok(longMatch, "Should find the longRules section");
    assert.strictEqual(longMatch!.snippet.length, 200, "Truncated snippet must be exactly 200 chars");
    assert.ok(longMatch!.snippet.endsWith("..."), "Truncated snippet must end with '...'");
    // All snippets must be at most 200 chars
    for (const match of results.matches) {
      assert.ok(match.snippet.length <= 200, `snippet too long: ${match.snippet.length} chars`);
    }
  });

  it("respects limit parameter", async () => {
    const results = await searchRuleSections(TEST_GAME, "a", undefined, 2);
    assert.ok(results.matches.length <= 2, "Should return at most 2 matches");
  });

  it("returns correct dot-notation paths for nested sections", async () => {
    const results = await searchRuleSections(TEST_GAME, "retreat");
    assert.ok(results.matches.length >= 1);
    assert.strictEqual(results.matches[0].path, "combat.retreat");
  });
});
