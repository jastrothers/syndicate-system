/**
 * E2E: game-critique pipeline — iteration loop simulation
 *
 * Verifies the critique pipeline's iteration logic:
 *  - Pre-populate a game with steps 0-4 (DetailsArchitect complete)
 *  - Run balance + fun assessments (step 5/6)
 *  - When exit criteria are NOT met, simulate a targeted fix via update_rule
 *  - Re-run critique (second iteration)
 *  - Verify exit criteria are now met
 *  - Verify design session has the expected critique step progression
 *
 * Tests:
 *  - BalanceCritic and FunFactorJudge steps are logged independently
 *  - Critique iteration adds new steps (not overwrites) so history is preserved
 *  - Validator correctly identifies blocking vs passing verdicts
 *  - After fix + re-assess, session reflects the full iteration chain
 */
import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { readFileSync } from "node:fs";
import { setupTestServer } from "../integration/setup.js";
import {
  validateBalanceReport,
  validateFunReport,
  parseCritiqueScores,
  validateCritiqueExitCriteria,
} from "../validators/critiqueReportValidator.js";
import { validateDesignSession } from "../validators/designSessionValidator.js";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures", "pipeline");

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

const mechanicsSlate = loadFixture("mechanicsSlate.json");
const completeRulebook = loadFixture("completeRulebook.json");

const GAME_NAME = `critique-test-${Date.now()}`;
const GAME_SLUG = GAME_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const RULEBOOK_NAME = GAME_SLUG;

// A balance report that explicitly FAILS (has a FAIL verdict and HIGH issues)
const FAILING_BALANCE_OUTPUT = `
## BalanceCritic Report

### Dimension Scores
- Economy: 4/10
- Tempo: 5/10
- Interaction: 3/10
- Scalability: 4/10
- First-Player Advantage: 3/10

### Issues
FINDING 1A (HIGH — DOMINANT STRATEGY): First player gains 3 extra resources turn 1 with no mitigation.
FINDING 1B (HIGH — INFINITE LOOP): Player can draw-cycle indefinitely with Resource Token + Draw Card combo.
FINDING 2A (MEDIUM): Endgame scoring is opaque — players cannot estimate when to pivot.

### VERDICT: FAIL
OVERALL_SCORE: 4/10
HIGH_ISSUES: 2
MEDIUM_ISSUES: 1
LOW_ISSUES: 0
BLOCKING: YES
`;

// A fun report that is borderline (score = 6, below 7 threshold)
const BORDERLINE_FUN_OUTPUT = `
## FunFactorJudge Report

### Dimension Scores
- Tension: 6/10
- Agency: 6/10
- Discovery: 5/10
- Social: 5/10
- Narrative: 7/10
- Replayability: 6/10

### VERDICT: FLAT
OVERALL_FUN: 6/10
BEST_PLAYER_COUNT: 3
STRONGEST_DIMENSION: Narrative
WEAKEST_DIMENSION: Discovery
ENGAGEMENT_CURVE: Flat
`;

// Fixed balance report (HIGH issues resolved)
const PASSING_BALANCE_OUTPUT = `
## BalanceCritic Report (Iteration 2)

### Dimension Scores
- Economy: 7/10
- Tempo: 7/10
- Interaction: 7/10
- Scalability: 7/10
- First-Player Advantage: 7/10

### Issues
FINDING 2A (MEDIUM): Endgame scoring still somewhat opaque but manageable.

### VERDICT: CONDITIONAL_PASS
OVERALL_SCORE: 7/10
HIGH_ISSUES: 0
MEDIUM_ISSUES: 1
LOW_ISSUES: 0
BLOCKING: NO
`;

// Improved fun report (score = 7.5, meets threshold)
const PASSING_FUN_OUTPUT = `
## FunFactorJudge Report (Iteration 2)

### Dimension Scores
- Tension: 8/10
- Agency: 7/10
- Discovery: 7/10
- Social: 7/10
- Narrative: 8/10
- Replayability: 7/10

### VERDICT: SOLID
OVERALL_FUN: 7.5/10
BEST_PLAYER_COUNT: 3-4
STRONGEST_DIMENSION: Tension
WEAKEST_DIMENSION: Agency
ENGAGEMENT_CURVE: Rising
`;

test("E2E: game-critique iteration loop simulation", async (t) => {
  const { client, cleanup } = await setupTestServer("pipeline-critique");
  t.after(cleanup);

  let sessionId: string;

  // ─── Pre-populate: steps 0-4 (game already designed) ─────────────────────────
  await t.test("Pre-populate: init and complete design through DetailsArchitect", async () => {
    const sessionResult: any = await client.callTool({
      name: "create_design_session",
      arguments: { gameName: GAME_NAME, theme: "A bidding game about auctioning rare deep-sea creatures.", initialPrompt: "Design a bidding game with deep-sea creature auctions and marine ecosystem theming." },
    });
    const session = JSON.parse(sessionResult.content[0].text);
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

    // Add all design steps 1-4
    for (const [stepNumber, persona, output, summary] of [
      [1, "MechanicsArchitect", mechanicsSlate.output, mechanicsSlate.summary],
      [4, "DetailsArchitect", completeRulebook.output, completeRulebook.summary],
    ] as [number, string, string, string][]) {
      await client.callTool({
        name: "add_design_step",
        arguments: { gameName: GAME_NAME, sessionId, stepNumber, persona, output, summary },
      });
    }

    // Populate rulebook sections
    for (const [sectionPath, title] of [
      ["mechanics", "Mechanics"], ["setup", "Setup"], ["turn-structure", "Turn Structure"],
      ["components", "Components"], ["overview", "Overview"],
    ]) {
      await client.callTool({
        name: "update_rule",
        arguments: { rulebookName: RULEBOOK_NAME, path: sectionPath, title, content: completeRulebook.output, isDraft: true },
      });
    }

    // Promote and compile so critique can read latest.md
    await client.callTool({ name: "promote_draft", arguments: { rulebookName: RULEBOOK_NAME } });
    await client.callTool({ name: "compile_markdown_rulebook", arguments: { rulebookName: RULEBOOK_NAME } });
  });

  // ─── Iteration 1: Critique — fails exit criteria ──────────────────────────────
  await t.test("Iteration 1: BalanceCritic finds HIGH issues (FAIL)", async () => {
    const balValidation = validateBalanceReport(FAILING_BALANCE_OUTPUT);
    assert.ok(balValidation.valid, `Balance report validator: ${balValidation.errors.join(", ")}`);

    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 5,
        persona: "BalanceCritic",
        output: FAILING_BALANCE_OUTPUT,
        summary: "FAIL — 2 HIGH issues: first-player advantage and infinite draw-cycle loop.",
      },
    });
  });

  await t.test("Iteration 1: FunFactorJudge scores below threshold (6/10)", async () => {
    const funValidation = validateFunReport(BORDERLINE_FUN_OUTPUT);
    assert.ok(funValidation.valid, `Fun report validator: ${funValidation.errors.join(", ")}`);

    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 6,
        persona: "FunFactorJudge",
        output: BORDERLINE_FUN_OUTPUT,
        summary: "FLAT — fun score 6/10, below 7 threshold. Discovery and Social weak.",
      },
    });
  });

  await t.test("Iteration 1: exit criteria correctly fail", async () => {
    const scores = parseCritiqueScores(FAILING_BALANCE_OUTPUT, BORDERLINE_FUN_OUTPUT);
    assert.strictEqual(scores.funScore, 6, "Fun score should be parsed as 6");
    assert.ok(/FAIL/i.test(scores.balanceVerdict ?? ""), `Balance verdict should be FAIL, got: ${scores.balanceVerdict}`);

    const exitResult = validateCritiqueExitCriteria(scores);
    assert.ok(!exitResult.valid, "Exit criteria should NOT be met after iteration 1");
    assert.ok(exitResult.errors.length >= 1, "Should have at least 1 blocking error");
  });

  // ─── Fix dispatch: apply targeted fixes ──────────────────────────────────────
  await t.test("Fix dispatch: apply targeted fixes to high-severity issues", async () => {
    // Fix 1: Add first-player mitigation to setup rules
    const currentSetup: any = await client.callTool({
      name: "read_rule_section",
      arguments: { rulebookName: RULEBOOK_NAME, path: "setup" },
    });
    assert.ok(currentSetup.content[0].text, "Setup section must be readable for fix dispatch");

    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        path: "setup",
        title: "Setup Instructions",
        content: completeRulebook.output + "\n\n**First-Player Mitigation:** The last player in turn order receives +2 bonus resources at game start.",
      },
    });

    // Fix 2: Add hand limit to prevent draw-cycle
    await client.callTool({
      name: "update_rule",
      arguments: {
        rulebookName: RULEBOOK_NAME,
        path: "special-rules",
        title: "Special Rules",
        content: "**Hand Limit:** A player may hold no more than 7 cards at end of turn. Discard excess to the common pool.\n\nThis prevents degenerate draw-cycle strategies with Resource Tokens.",
      },
    });

    // Re-compile after fixes
    await client.callTool({ name: "compile_markdown_rulebook", arguments: { rulebookName: RULEBOOK_NAME } });
  });

  // ─── Iteration 2: Re-assess — passes exit criteria ────────────────────────────
  await t.test("Iteration 2: BalanceCritic re-assessment passes (CONDITIONAL_PASS)", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 5,  // same stepNumber — critique re-runs use the same number
        persona: "BalanceCritic",
        output: PASSING_BALANCE_OUTPUT,
        summary: "CONDITIONAL_PASS — HIGH issues resolved. 1 MEDIUM remaining. Score 7/10.",
      },
    });
  });

  await t.test("Iteration 2: FunFactorJudge re-assessment passes (7.5/10)", async () => {
    await client.callTool({
      name: "add_design_step",
      arguments: {
        gameName: GAME_NAME,
        sessionId,
        stepNumber: 6,
        persona: "FunFactorJudge",
        output: PASSING_FUN_OUTPUT,
        summary: "SOLID — fun score 7.5/10, exceeds threshold. Tension and Narrative strongest.",
      },
    });
  });

  await t.test("Iteration 2: exit criteria now pass", async () => {
    const scores = parseCritiqueScores(PASSING_BALANCE_OUTPUT, PASSING_FUN_OUTPUT);
    assert.strictEqual(scores.funScore, 7.5, "Fun score should be parsed as 7.5");
    assert.ok(/CONDITIONAL_PASS/i.test(scores.balanceVerdict ?? ""), `Balance verdict should be CONDITIONAL_PASS, got: ${scores.balanceVerdict}`);

    const exitResult = validateCritiqueExitCriteria(scores);
    assert.ok(exitResult.valid, `Exit criteria should be met after iteration 2. Errors: ${exitResult.errors.join(", ")}`);
  });

  // ─── Final: session history reflects full iteration chain ────────────────────
  await t.test("Final: design session preserves full critique iteration history", async () => {
    const result: any = await client.callTool({
      name: "get_design_session",
      arguments: { gameName: GAME_NAME, sessionId, includeFull: true },
    });
    const data = JSON.parse(result.content[0].text);

    // Steps: 1 (Mechanics) + 1 (Details) + 2 (iter1 Balance+Fun) + 2 (iter2 Balance+Fun) = 6
    assert.ok(data.totalSteps >= 6, `Expected ≥6 steps in session history, got ${data.totalSteps}`);

    // Both BalanceCritic and FunFactorJudge appear at least twice (iteration 1 + iteration 2)
    const balanceSteps = data.steps.filter((s: any) => s.persona === "BalanceCritic");
    const funSteps = data.steps.filter((s: any) => s.persona === "FunFactorJudge");
    assert.ok(balanceSteps.length >= 2, `Expected ≥2 BalanceCritic steps (iterations), got ${balanceSteps.length}`);
    assert.ok(funSteps.length >= 2, `Expected ≥2 FunFactorJudge steps (iterations), got ${funSteps.length}`);

    // Validate session structure
    const session = {
      sessionId: data.sessionId,
      gameName: data.gameName,
      theme: data.theme,
      steps: data.steps,
      status: data.status,
      createdAt: data.createdAt,
      lastUpdatedAt: data.lastUpdatedAt,
    } as any;

    const sessionValidation = validateDesignSession(session);
    assert.ok(sessionValidation.valid, `Session validation errors: ${sessionValidation.errors.join(", ")}`);
  });
});
