import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "..", "..", "src", "index.js");
const TEST_DATA_DIR = path.join(os.tmpdir(), `test-mcp-e2e-${Date.now()}`);

// Mock raw text that an AI agent might transcribe from a PDF
const _RAW_RULES_TEXT = `
# TinyDungeon System

## Movement
Characters can move up to 30 feet per turn on a grid (6 squares). Difficult terrain costs double movement.

## Combat Actions
On a turn, a character can take ONE major action and ONE minor action.
- Major: Attack, Cast Spell, Dash (move another 30 ft)
- Minor: Draw weapon, Drink potion

## The Magic System
Spells cost Mana. You regain Mana by resting. 
- Fireball (3 Mana): Deals 2d6 damage in an area.
- Heal (2 Mana): Restores 1d8 health to target.
`;

test("E2E Simulated Agent: Rule Ingestion", async (t) => {
  // 1. Setup Client
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: { ...process.env, TEST_DATA_DIR }
  });

  const client = new Client({ name: "e2e-agent-simulator", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);

  t.after(async () => {
    await transport.close();
    // Cleanup reference directory
    try {
      const fs = await import("fs/promises");
      await fs.rm(TEST_DATA_DIR, { recursive: true, force: true }).catch(() => {});
    } catch (e) {}
  });

  // Simulated Agent Step 1: Break down the "Movement" section and save it
  await t.test("Agent parsing and saving Movement rules", async () => {
    const result: any = await client.callTool({
      name: "save_reference",
      arguments: {
        name: "movement_core",
        type: "rule",
        tags: ["movement", "grid"],
        content: "Characters can move up to 30 feet per turn on a grid (6 squares). Difficult terrain costs double movement."
      }
    });
    assert.ok((result.content[0] as any).text.includes("Successfully saved"), "Agent should be able to save movement rule");
  });

  // Simulated Agent Step 2: Break down the "Combat Actions" section
  await t.test("Agent parsing and saving Combat Action rules", async () => {
    const result: any = await client.callTool({
      name: "save_reference",
      arguments: {
        name: "combat_actions",
        type: "system",
        tags: ["combat", "actions"],
        content: "On a turn, a character can take ONE major action and ONE minor action.\n- Major: Attack, Cast Spell, Dash (move another 30 ft)\n- Minor: Draw weapon, Drink potion"
      }
    });
    assert.ok((result.content[0] as any).text.includes("Successfully saved"));
  });

  // Simulated Agent Step 3: Break down spells individually to make them modular
  await t.test("Agent isolating specific spells as templates", async () => {
    const spell1: any = await client.callTool({
      name: "save_reference",
      arguments: {
        name: "spell_fireball",
        type: "spell",
        tags: ["magic", "damage", "aoe"],
        content: "Cost: 3 Mana\nEffect: Deals 2d6 damage in an area."
      }
    });
    assert.ok((spell1.content[0] as any).text.includes("Successfully saved"));

    const spell2: any = await client.callTool({
      name: "save_reference",
      arguments: {
        name: "spell_heal",
        type: "spell",
        tags: ["magic", "healing"],
        content: "Cost: 2 Mana\nEffect: Restores 1d8 health to target."
      }
    });
    assert.ok((spell2.content[0] as any).text.includes("Successfully saved"));
  });

  // Verification Step: The agent has finished ingestion. Now the test suite queries the index.
  await t.test("Suite validates the ingested rules via complex reference DB querying", async () => {
    
    // Find all 'spell' references
    const spellQuery: any = await client.callTool({
      name: "list_references",
      arguments: { type: "spell" }
    });
    const spellsData = JSON.parse((spellQuery.content[0] as any).text);
    assert.strictEqual(spellsData.count, 2, "Agent should have saved exactly 2 spells");
    assert.ok(spellsData.items.some((s: any) => s.name === "spell_fireball"));

    // Find all references tagged 'combat'
    const combatQuery: any = await client.callTool({
      name: "list_references",
      arguments: { tags: ["combat"] }
    });
    const combatData = JSON.parse((combatQuery.content[0] as any).text);
    assert.strictEqual(combatData.count, 1, "Agent should have saved 1 module tagged combat");
    assert.strictEqual(combatData.items[0].name, "combat_actions");

    // Fetch the specific 'movement_core' and verify full markdown text
    const getMovement: any = await client.callTool({
      name: "get_reference",
      arguments: { name: "movement_core" }
    });
    const movementModule = JSON.parse((getMovement.content[0] as any).text);
    assert.strictEqual(movementModule.type, "rule");
    assert.ok(movementModule.content.includes("Difficult terrain costs double"));
  });
});
