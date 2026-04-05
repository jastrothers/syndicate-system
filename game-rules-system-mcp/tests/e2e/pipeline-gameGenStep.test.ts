/**
 * E2E: game-gen-step resumability simulation
 *
 * Verifies the core contract of game-gen-step: all state persists via MCP
 * tool calls so the pipeline can be paused and resumed in a new client session.
 *
 * Tests:
 *  - Steps 0-2 are written by client session A
 *  - After client A disconnects, a fresh client B on the same data directory
 *    can read all 2 steps via get_design_session
 *  - Client B can continue from step 3 and complete the pipeline
 *  - The final design session contains all expected steps from both sessions
 */
import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import { setupTestServer } from "../integration/setup.js";
import { validateDesignSession, validateDesignSessionHasSteps } from "../validators/designSessionValidator.js";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures", "pipeline");

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

const mechanicsSlate = loadFixture("mechanicsSlate.json");
const thematicBlueprint = loadFixture("thematicBlueprint.json");
const componentManifest = loadFixture("componentManifest.json");
const completeRulebook = loadFixture("completeRulebook.json");

const GAME_NAME = `resume-test-${Date.now()}`;
const GAME_SLUG = GAME_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const RULEBOOK_NAME = GAME_SLUG;

test("E2E: game-gen-step resumability across client sessions", async (t) => {
  // Shared data directory — persists across both client sessions
  const sharedDir = path.join(os.tmpdir(), `test-resume-${Date.now()}`);
  let sessionId: string;

  t.after(async () => {
    await fs.rm(sharedDir, { recursive: true, force: true }).catch(() => {});
  });

  // ─── Session A: Steps 0-2 ────────────────────────────────────────────────────
  await t.test("Session A: run steps 0-2 (init → mechanics → theme)", async () => {
    const { client: clientA, cleanup: cleanupA } = await setupTestServer(
      "resume-a",
      { dataDir: sharedDir, keepDataOnClose: true }
    );

    try {
      // Step 0: Init
      const sessionResult: any = await clientA.callTool({
        name: "create_design_session",
        arguments: { gameName: GAME_NAME, theme: "Rival sky-pirates racing to loot the floating ruins of an ancient empire.", initialPrompt: "Design a competitive sky-pirate game with resource racing and aerial combat." },
      });
      const session = JSON.parse(sessionResult.content[0].text);
      sessionId = session.sessionId;
      assert.ok(sessionId, "Session should be created");

      await clientA.callTool({
        name: "manage_draft",
        arguments: {
          action: "save",
          rulebookName: RULEBOOK_NAME,
          rulebook: {
            metadata: { title: GAME_NAME, version: "0.1.0-draft", lastUpdated: new Date().toISOString() },
            sections: {},
          },
        },
      });

      // Step 1: MechanicsArchitect
      await clientA.callTool({
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

      await clientA.callTool({
        name: "update_rule",
        arguments: { rulebookName: RULEBOOK_NAME, path: "mechanics", title: "Core Mechanisms", content: mechanicsSlate.output, isDraft: true },
      });

      // Step 2: ThemeWeaver
      await clientA.callTool({
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

      await clientA.callTool({
        name: "update_rule",
        arguments: { rulebookName: RULEBOOK_NAME, path: "overview", title: "Game Overview", content: thematicBlueprint.output, isDraft: true },
      });

      // Verify session has 2 steps before disconnecting
      const check: any = await clientA.callTool({
        name: "get_design_session",
        arguments: { gameName: GAME_NAME, sessionId, includeFull: false },
      });
      const checkData = JSON.parse(check.content[0].text);
      assert.strictEqual(checkData.totalSteps, 2, "Session should have 2 steps before pause");
    } finally {
      // Disconnect transport — keepDataOnClose: true means data directory survives
      await cleanupA();
    }
  });

  // ─── Session B: Resume from step 3 ──────────────────────────────────────────
  await t.test("Session B: reconnect to same data dir, verify state persisted", async () => {
    const { client: clientB, cleanup: cleanupB } = await setupTestServer(
      "resume-b",
      { dataDir: sharedDir, keepDataOnClose: false }  // session B owns cleanup
    );

    try {
      // Critical assertion: prior steps must survive the client disconnect
      const resumeResult: any = await clientB.callTool({
        name: "get_design_session",
        arguments: { gameName: GAME_NAME, sessionId, includeFull: false },
      });
      const resumeData = JSON.parse(resumeResult.content[0].text);
      assert.strictEqual(resumeData.totalSteps, 2, "Steps 1-2 should persist across session boundary");
      assert.ok(
        resumeData.steps.some((s: any) => s.persona === "MechanicsArchitect"),
        "MechanicsArchitect step must be readable in new session"
      );
      assert.ok(
        resumeData.steps.some((s: any) => s.persona === "ThemeWeaver"),
        "ThemeWeaver step must be readable in new session"
      );

      // Session should still be listed as active
      const listResult: any = await clientB.callTool({
        name: "list_design_sessions",
        arguments: { gameName: GAME_NAME },
      });
      const sessions = JSON.parse(listResult.content[0].text);
      assert.ok(Array.isArray(sessions) && sessions.some((s: any) => s.sessionId === sessionId), "Session must still appear in list");

      // Continue: Step 3 ComponentDesigner
      await clientB.callTool({
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

      await clientB.callTool({
        name: "update_rule",
        arguments: { rulebookName: RULEBOOK_NAME, path: "components", title: "Component List", content: componentManifest.output, isDraft: true },
      });

      // Continue: Step 4 DetailsArchitect
      await clientB.callTool({
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

      for (const [sectionPath, title] of [
        ["setup", "Setup"], ["turn-structure", "Turn Structure"],
      ]) {
        await clientB.callTool({
          name: "update_rule",
          arguments: { rulebookName: RULEBOOK_NAME, path: sectionPath, title, content: completeRulebook.output, isDraft: true },
        });
      }

      // Finalize
      await clientB.callTool({ name: "manage_draft", arguments: { action: "promote", rulebookName: RULEBOOK_NAME } });
      await clientB.callTool({ name: "compile_markdown_rulebook", arguments: { rulebookName: RULEBOOK_NAME } });

      // Final assertion: session now has all 4 steps from both client sessions
      const finalResult: any = await clientB.callTool({
        name: "get_design_session",
        arguments: { gameName: GAME_NAME, sessionId, includeFull: true },
      });
      const finalData = JSON.parse(finalResult.content[0].text);
      assert.strictEqual(finalData.totalSteps, 4, "Final session should have 4 steps accumulated across both client sessions");

      const session = {
        sessionId: finalData.sessionId,
        gameName: finalData.gameName,
        theme: finalData.theme,
        steps: finalData.steps,
        status: finalData.status,
        createdAt: finalData.createdAt,
        lastUpdatedAt: finalData.lastUpdatedAt,
      } as any;

      const sessionValidation = validateDesignSession(session);
      assert.ok(sessionValidation.valid, `Session validation errors: ${sessionValidation.errors.join(", ")}`);

      const personaValidation = validateDesignSessionHasSteps(session, [
        "MechanicsArchitect", "ThemeWeaver", "ComponentDesigner", "DetailsArchitect",
      ]);
      assert.ok(personaValidation.valid, `Missing personas: ${personaValidation.errors.join(", ")}`);
    } finally {
      await cleanupB();
    }
  });
});
