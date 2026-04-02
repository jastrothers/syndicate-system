/**
 * E2E: Pre-Pick Mechanics pipeline flow
 *
 * Tests the --mechanics pre-pick feature end-to-end:
 *  - create_design_session accepts and persists prePickedMechanics
 *  - get_design_session returns prePickedMechanics in its response
 *  - prePickedMechanics survives the full pipeline (Steps 0-7)
 *  - MechanicsArchitect step output includes [PRE-PICKED] annotations
 *  - Session validator passes on the final state
 *
 * Does NOT test the Claude agent behaviour — only the MCP data layer.
 * Agent behaviour (anchoring, annotation) is validated by the fixture content.
 */
import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { readFileSync } from "node:fs";
import { setupTestServer } from "../integration/setup.js";
import { validateDesignSession, validateDesignSessionHasSteps } from "../validators/designSessionValidator.js";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures", "pipeline");

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

const mechanicsSlatePrePicked = loadFixture("mechanicsSlatePrePicked.json");
const thematicBlueprint = loadFixture("thematicBlueprint.json");
const componentManifest = loadFixture("componentManifest.json");
const completeRulebook = loadFixture("completeRulebook.json");

const PRE_PICKED = ["hand_management", "deck_building"];
const GAME_NAME = `prepick-test-${Date.now()}`;
const RULEBOOK_NAME = GAME_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");

test("E2E: Pre-Pick Mechanics pipeline flow", async (t) => {
  const { client, cleanup } = await setupTestServer("pipeline-prepick");
  t.after(cleanup);

  let sessionId: string;

  // ─── Step 0: Init with prePickedMechanics ──────────────────────────────────
  await t.test("Step 0: create_design_session stores prePickedMechanics", async () => {
    const result: any = await client.callTool({
      name: "create_design_session",
      arguments: {
        gameName: GAME_NAME,
        theme: "Cyberpunk heist crews pulling jobs in a neon-lit megacity.",
        initialPrompt: `/game-gen "Cyberpunk heist" --mechanics "hand_management,deck_building"`,
        prePickedMechanics: PRE_PICKED,
      },
    });
    const session = JSON.parse(result.content[0].text);
    assert.ok(session.sessionId, "Session should have an ID");
    assert.strictEqual(session.gameName, GAME_NAME);
    assert.deepStrictEqual(session.prePickedMechanics, PRE_PICKED, "Session should store prePickedMechanics");
    sessionId = session.sessionId;

    await client.callTool({
      name: "save_draft",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        rulebook: {
          metadata: { title: GAME_NAME, version: "0.1.0-draft", lastUpdated: new Date().toISOString() },
          sections: {},
        },
      },
    });
  });

  // ─── Verify get_design_session returns prePickedMechanics ──────────────────
  await t.test("get_design_session returns prePickedMechanics in response", async () => {
    const result: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: false },
    });
    const data = JSON.parse(result.content[0].text);
    assert.deepStrictEqual(data.prePickedMechanics, PRE_PICKED, "get_design_session should include prePickedMechanics");
    assert.strictEqual(data.totalSteps, 0, "No steps yet");
  });

  // ─── Step 1: MechanicsArchitect with [PRE-PICKED] output ───────────────────
  await t.test("Step 1: MechanicsArchitect step includes [PRE-PICKED] annotations", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: mechanicsSlatePrePicked.stepNumber,
        persona: mechanicsSlatePrePicked.persona,
        output: mechanicsSlatePrePicked.output,
        summary: mechanicsSlatePrePicked.summary,
        trace: mechanicsSlatePrePicked.trace,
      },
    });

    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        path: "mechanics",
        title: "Core Mechanics",
        content: mechanicsSlatePrePicked.output,
        isDraft: true,
      },
    });

    // Verify the step output is persisted and contains [PRE-PICKED] annotations
    const sessionResult: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: true },
    });
    const session = JSON.parse(sessionResult.content[0].text);
    assert.strictEqual(session.totalSteps, 1);
    assert.ok(
      session.steps[0].output.includes("[PRE-PICKED]"),
      "MechanicsArchitect output should contain [PRE-PICKED] annotation"
    );
    // Verify pre-picked mechanism IDs appear in the output
    for (const mechId of PRE_PICKED) {
      assert.ok(
        session.steps[0].output.includes(mechId),
        `Output should include pre-picked mechanism ID: ${mechId}`
      );
    }
    // Verify trace captures prePickedCount
    assert.strictEqual(
      session.steps[0].trace?.data?.prePickedCount,
      PRE_PICKED.length,
      "Trace should record prePickedCount"
    );
    // Verify prePickedMechanics is still on the session
    assert.deepStrictEqual(session.prePickedMechanics, PRE_PICKED, "prePickedMechanics should persist after Step 1");
  });

  // ─── Steps 2-4: Continue pipeline with fixture data ────────────────────────
  await t.test("Steps 2-4: pipeline continues normally after pre-pick mechanics", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: thematicBlueprint.stepNumber,
        persona: thematicBlueprint.persona,
        output: thematicBlueprint.output,
        summary: thematicBlueprint.summary,
        trace: thematicBlueprint.trace,
      },
    });

    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: componentManifest.stepNumber,
        persona: componentManifest.persona,
        output: componentManifest.output,
        summary: componentManifest.summary,
        trace: componentManifest.trace,
      },
    });

    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: completeRulebook.stepNumber,
        persona: completeRulebook.persona,
        output: completeRulebook.output,
        summary: completeRulebook.summary,
        trace: completeRulebook.trace,
      },
    });

    const sessionResult: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: false },
    });
    const session = JSON.parse(sessionResult.content[0].text);
    assert.strictEqual(session.totalSteps, 4, "All 4 steps should be logged");
    // prePickedMechanics must survive the full pipeline
    assert.deepStrictEqual(session.prePickedMechanics, PRE_PICKED, "prePickedMechanics should survive full pipeline");
  });

  // ─── Final validation ───────────────────────────────────────────────────────
  await t.test("Final: session passes design validators", async () => {
    const sessionResult: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: true },
    });
    const session = JSON.parse(sessionResult.content[0].text);

    const sessionValidation = validateDesignSession(session);
    assert.ok(sessionValidation.valid, `Design session should be valid: ${sessionValidation.errors?.join(", ")}`);

    const stepsValidation = validateDesignSessionHasSteps(session, [
      "MechanicsArchitect",
      "ThemeWeaver",
      "ComponentDesigner",
      "DetailsArchitect",
    ]);
    assert.ok(stepsValidation.valid, `All expected personas should be present: ${stepsValidation.errors?.join(", ")}`);

    // Confirm the pre-pick data is present and intact on the final session
    assert.deepStrictEqual(
      session.prePickedMechanics,
      PRE_PICKED,
      "prePickedMechanics should be intact on finalized session"
    );
  });
});
