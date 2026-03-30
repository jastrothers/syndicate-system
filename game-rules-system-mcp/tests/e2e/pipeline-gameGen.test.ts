/**
 * E2E: Full game-gen pipeline simulation
 *
 * Replays the complete sequence of MCP tool calls that the game-gen skill makes
 * across all 8 steps (init → mechanics → theme → components → rules → playtest
 * → critique → finalize), using realistic fixture payloads from the PokNursery
 * design sessions.
 *
 * Tests:
 *  - Design session accumulates steps correctly across sequential agent calls
 *  - Each step's output is readable by the next step via get_design_session
 *  - All expected artifacts (rulebook JSON, markdown, references) exist after finalize
 *  - Validators pass on the final state
 */
import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { readFileSync } from "node:fs";
import { setupTestServer } from "../integration/setup.js";
import { validateDesignSession, validateDesignSessionHasSteps } from "../validators/designSessionValidator.js";
import { validateRulebookHasSections } from "../validators/rulebookValidator.js";
import { validateArtifactIntegrity } from "../validators/artifactIntegrityValidator.js";

// Fixtures live in the source tree, not the build directory
const fixturesDir = path.join(process.cwd(), "tests", "fixtures", "pipeline");

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

const mechanicsSlate = loadFixture("mechanicsSlate.json");
const thematicBlueprint = loadFixture("thematicBlueprint.json");
const componentManifest = loadFixture("componentManifest.json");
const completeRulebook = loadFixture("completeRulebook.json");
const balanceReport = loadFixture("balanceReport.json");
const funFactorReport = loadFixture("funFactorReport.json");

const GAME_NAME = `pipeline-test-${Date.now()}`;
const GAME_SLUG = GAME_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const RULEBOOK_NAME = GAME_SLUG;

test("E2E: Full game-gen pipeline simulation", async (t) => {
  const { client, cleanup, TEST_DATA_DIR } = await setupTestServer("pipeline-gamegen");
  t.after(cleanup);

  let sessionId: string;

  // ─── Step 0: Init ────────────────────────────────────────────────────────────
  await t.test("Step 0: create design session and save draft rulebook", async () => {
    const sessionResult: any = await client.callTool({
      name: "create_design_session",
      arguments: { gameName: GAME_NAME, theme: "A tactical card game about rival clockwork menageries competing at the Grand Exhibition.", initialPrompt: "Design a strategic card game about clockwork menageries." },
    });
    const session = JSON.parse(sessionResult.content[0].text);
    assert.ok(session.sessionId, "Session should have an ID");
    assert.strictEqual(session.gameName, GAME_NAME);
    sessionId = session.sessionId;

    const draftResult: any = await client.callTool({
      name: "save_draft",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        rulebook: {
          metadata: { title: GAME_NAME, version: "0.1.0-draft", lastUpdated: new Date().toISOString() },
          sections: {},
        },
      },
    });
    assert.ok(draftResult.content[0].text.includes("Successfully") || draftResult.content[0].text.includes("saved"), "Draft should be saved");
  });

  // ─── Step 1: MechanicsArchitect ──────────────────────────────────────────────
  await t.test("Step 1: MechanicsArchitect writes mechanism slate", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 1,
        persona: "MechanicsArchitect",
        output: mechanicsSlate.output,
        summary: mechanicsSlate.summary,
        trace: mechanicsSlate.trace,
      },
    });

    // Save mechanism references (simulates agent saving each mechanism)
    for (const refName of ["mechanism-worker-placement", "mechanism-tableau-building", "mechanism-deck-construction"]) {
      await client.callTool({
        name: "save_reference",
        arguments: {
          name: refName,
          game: GAME_NAME,
          type: "mechanism",
          tags: ["mechanism", "core-loop"],
          content: `# ${refName}\nComplexity: 3\nSynergizes with: tableau building`,
        },
      });
    }

    // Write mechanics section to draft
    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        path: "mechanics",
        title: "Core Mechanisms",
        content: mechanicsSlate.output,
        isDraft: true,
      },
    });

    await client.callTool({
      name: "record_decision",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepId: 1,
        decision: "accept",
        rationale: "Mechanism slate provides good mid-weight complexity with strong thematic fit.",
        impactedMechanisms: ["worker-placement", "tableau-building"],
      },
    });
  });

  // ─── Step 1→2 handoff: verify get_design_session reads step 1 ────────────────
  await t.test("Step 2 pre-flight: get_design_session returns Step 1 output", async () => {
    const result: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: true },
    });
    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.totalSteps, 1);
    assert.strictEqual(data.steps[0].persona, "MechanicsArchitect");
    assert.ok(data.steps[0].output.length > 0, "Step 1 output must be readable by next agent");
  });

  // ─── Step 2: ThemeWeaver ─────────────────────────────────────────────────────
  await t.test("Step 2: ThemeWeaver writes thematic blueprint", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 2,
        persona: "ThemeWeaver",
        output: thematicBlueprint.output,
        summary: thematicBlueprint.summary,
        trace: thematicBlueprint.trace,
      },
    });

    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        path: "overview",
        title: "Game Overview",
        content: thematicBlueprint.output,
        isDraft: true,
      },
    });

    await client.callTool({
      name: "record_decision",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepId: 2,
        decision: "accept",
        rationale: "Thematic blueprint maps all mechanisms cleanly and provides a rich glossary.",
        impactedMechanisms: ["worker-placement"],
      },
    });
  });

  // ─── Step 3: ComponentDesigner ───────────────────────────────────────────────
  await t.test("Step 3: ComponentDesigner writes component manifest", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 3,
        persona: "ComponentDesigner",
        output: componentManifest.output,
        summary: componentManifest.summary,
        trace: componentManifest.trace,
      },
    });

    // Upsert core components
    for (const [name, type, qty] of [
      ["Player Board", "board", 4],
      ["Action Card", "card", 60],
      ["Resource Token", "token", 40],
    ] as const) {
      await client.callTool({
        name: "upsert_component",
        arguments: {
          rulebookName: RULEBOOK_NAME,
          component: { name, type, quantity: qty, description: `Core ${type} component` },
        },
      });
    }

    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        path: "components",
        title: "Component List",
        content: componentManifest.output,
        isDraft: true,
      },
    });

    await client.callTool({
      name: "record_decision",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepId: 3,
        decision: "accept",
        rationale: "Component manifest is complete with exact quantities and player-count scaling.",
        impactedMechanisms: ["tableau-building"],
      },
    });
  });

  // ─── Step 3→4 handoff: verify full session is readable ───────────────────────
  await t.test("Step 4 pre-flight: session has 3 steps, all readable", async () => {
    const result: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: false },
    });
    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.totalSteps, 3);
    const personas = data.steps.map((s: any) => s.persona);
    assert.ok(personas.includes("MechanicsArchitect"), "MechanicsArchitect step present");
    assert.ok(personas.includes("ThemeWeaver"), "ThemeWeaver step present");
    assert.ok(personas.includes("ComponentDesigner"), "ComponentDesigner step present");
  });

  // ─── Step 4: DetailsArchitect ────────────────────────────────────────────────
  await t.test("Step 4: DetailsArchitect writes complete rulebook sections", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 4,
        persona: "DetailsArchitect",
        output: completeRulebook.output,
        summary: completeRulebook.summary,
        trace: completeRulebook.trace,
      },
    });

    // Write the key sections DetailsArchitect produces
    for (const [sectionPath, title] of [
      ["setup", "Setup Instructions"],
      ["turn-structure", "Turn Structure"],
      ["actions", "Action Catalog"],
      ["scoring", "Scoring & Endgame"],
      ["special-rules", "Special Rules"],
      ["edge-cases", "Edge Cases"],
      ["quick-reference", "Quick Reference"],
    ]) {
      await client.callTool({
        name: "update_rule",
        arguments: {
          rulebookName: RULEBOOK_NAME,
          path: sectionPath,
          title,
          content: completeRulebook.output,
          isDraft: true,
        },
      });
    }

    // Save setup manifest as reference
    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "setup_manifest",
        game: GAME_NAME,
        type: "setup",
        tags: ["setup", "manifest"],
        content: "# Setup Manifest\n- 1 Player Board per player\n- 5 Action Cards each\n- 10 Resource Tokens to bank",
      },
    });

    await client.callTool({
      name: "record_decision",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepId: 4,
        decision: "accept",
        rationale: "Rulebook is complete with all required sections and clear setup instructions.",
        impactedMechanisms: ["worker-placement", "tableau-building"],
      },
    });
  });

  // ─── Step 5: Playtest simulation ─────────────────────────────────────────────
  await t.test("Step 5: Playtest simulation (2-turn sequence)", async () => {
    const playtestResult: any = await client.callTool({
      name: "create_session",
      arguments: { rulebookName: RULEBOOK_NAME },
    });
    const playtestData = JSON.parse(playtestResult.content[0].text);
    const playtestSessionId = playtestData.sessionId;
    assert.ok(playtestSessionId, "Playtest session should be created");

    await client.callTool({
      name: "update_game_state",
      arguments: {
        sessionId: playtestSessionId,
        patch: {
          round: 1,
          players: [
            { id: "p1", resources: 5, tableau: [] },
            { id: "p2", resources: 5, tableau: [] },
          ],
        },
      },
    });

    await client.callTool({
      name: "record_action",
      arguments: {
        sessionId: playtestSessionId,
        actionType: "place_worker",
        actor: "p1",
        data: { space: "Forge", cost: 2 },
      },
    });

    await client.callTool({
      name: "log_playtest_note",
      arguments: {
        sessionId: playtestSessionId,
        note: "Worker placement felt tight. Players competed for the Forge on turn 1.",
        category: "balance",
      },
    });

    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 5,
        persona: "Orchestrator",
        output: "Playtest simulation complete. 2 turns simulated. Key observation: Worker placement competition on Forge is high. Resource economy is tight but fair.",
        summary: "2-turn playtest simulation. Forge contention noted. Economy balanced.",
        trace: {
          observation: "Both players targeted the Forge action space on turn 1 in all simulated variations.",
          data: { turnsSimulated: 2, playerCount: 2, keyContention: "Forge" },
          mechanism: "Worker placement scarcity creates meaningful early decisions.",
          impact: "Forge may need a secondary worker slot or higher resource yield to prevent first-player advantage.",
        },
      },
    });
  });

  // ─── Step 6: Critique ────────────────────────────────────────────────────────
  await t.test("Step 6a: BalanceCritic assessment", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 5,  // BalanceCritic uses stepNumber 5 in parallel with FunFactor
        persona: "BalanceCritic",
        output: balanceReport.output,
        summary: balanceReport.summary,
        trace: balanceReport.trace,
      },
    });
  });

  await t.test("Step 6b: FunFactorJudge assessment", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 6,
        persona: "FunFactorJudge",
        output: funFactorReport.output,
        summary: funFactorReport.summary,
        trace: funFactorReport.trace,
      },
    });
  });

  // ─── Step 7: Finalize ────────────────────────────────────────────────────────
  await t.test("Step 7: Finalize — promote draft, compile markdown, rebuild index", async () => {
    const promoteResult: any = await client.callTool({
      name: "promote_draft",
      arguments: { rulebookName: RULEBOOK_NAME },
    });
    assert.ok(promoteResult.content[0].text.includes("promoted") || promoteResult.content[0].text.includes("success"), "Draft should be promoted");

    const compileResult: any = await client.callTool({
      name: "compile_markdown_rulebook",
      arguments: { rulebookName: RULEBOOK_NAME },
    });
    assert.ok(compileResult.content[0].text.length > 0, "Markdown should be compiled");

    await client.callTool({
      name: "rebuild_reference_index",
      arguments: {},
    });

    await client.callTool({
      name: "save_reference",
      arguments: {
        name: "game-brief",
        game: GAME_NAME,
        type: "game-brief",
        tags: ["brief", "summary"],
        content: `# ${GAME_NAME}\nA tactical card game. 2-4 players. 45-60 min.`,
      },
    });
  });

  // ─── Final validators ────────────────────────────────────────────────────────
  await t.test("Final: design session validator passes", async () => {
    const result: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: true },
    });
    const data = JSON.parse(result.content[0].text);

    // Build a DesignSession-shaped object from the response
    const session = {
      sessionId: data.sessionId,
      gameName: data.gameName,
      theme: data.theme,
      steps: data.steps,
      status: data.status,
      createdAt: data.createdAt,
      lastUpdatedAt: data.lastUpdatedAt,
    } as any;

    const sessionResult = validateDesignSession(session);
    assert.ok(sessionResult.valid, `Design session validator errors: ${sessionResult.errors.join(", ")}`);

    const personaResult = validateDesignSessionHasSteps(session, [
      "MechanicsArchitect", "ThemeWeaver", "ComponentDesigner", "DetailsArchitect", "FunFactorJudge",
    ]);
    assert.ok(personaResult.valid, `Missing personas: ${personaResult.errors.join(", ")}`);
  });

  await t.test("Final: rulebook validator passes", async () => {
    // get_rulebook_structure returns { metadata, structure: Record<sectionKey, { title, subsections? }> }
    const result: any = await client.callTool({
      name: "get_rulebook_structure",
      arguments: { rulebookName: RULEBOOK_NAME },
    });
    const { structure } = JSON.parse(result.content[0].text);
    assert.ok(structure && typeof structure === "object", "Rulebook structure.structure should be a non-null object");
    assert.ok(Object.keys(structure).length > 0, "Rulebook should have at least one section after full pipeline");

    // Build a minimal Rulebook-shaped object for the validator
    const requiredSections = ["mechanics", "overview", "components", "setup", "turn-structure"];
    const fakebook = { sections: structure } as any;
    const sectionResult = validateRulebookHasSections(fakebook, requiredSections);
    assert.ok(sectionResult.valid, `Missing sections: ${sectionResult.errors.join(", ")}`);
  });

  await t.test("Final: artifact integrity check passes", async () => {
    const integrityResult = await validateArtifactIntegrity(TEST_DATA_DIR, GAME_SLUG);
    assert.ok(
      integrityResult.valid,
      `Artifact integrity errors:\n  ${integrityResult.errors.join("\n  ")}`
    );
  });

  await t.test("Final: references are queryable", async () => {
    const result: any = await client.callTool({
      name: "list_references",
      arguments: { game: GAME_NAME, type: "mechanism" },
    });
    const data = JSON.parse(result.content[0].text);
    assert.ok(data.count >= 3, `Expected at least 3 mechanism references, got ${data.count}`);
  });
});
