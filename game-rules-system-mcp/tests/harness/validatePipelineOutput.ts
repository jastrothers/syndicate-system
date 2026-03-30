#!/usr/bin/env node
/**
 * Post-run pipeline validation harness
 *
 * Validates the output of a real /game-gen or /game-gen-step pipeline run.
 * Runs all output contract validators and prints a structured PASS/FAIL report.
 *
 * Usage:
 *   npx tsx tests/harness/validatePipelineOutput.ts <gameSlug> [sessionId]
 *
 * Examples:
 *   npx tsx tests/harness/validatePipelineOutput.ts clockwork-menagerie
 *   npx tsx tests/harness/validatePipelineOutput.ts poke-nursery-blissful-beginnings 9eda498e-4d09-4392-a674-86ac3e5385ac
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDesignSession, validateDesignSessionHasSteps } from "../validators/designSessionValidator.js";
import { validateRulebook, validateRulebookHasSections } from "../validators/rulebookValidator.js";
import { validateBalanceReport, validateFunReport, parseCritiqueScores } from "../validators/critiqueReportValidator.js";
import { validateArtifactIntegrity } from "../validators/artifactIntegrityValidator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "..", "game-data");

// ─── CLI args ─────────────────────────────────────────────────────────────────
const [, , gameSlug, targetSessionId] = process.argv;

if (!gameSlug) {
  console.error("Usage: validatePipelineOutput.ts <gameSlug> [sessionId]");
  process.exit(1);
}

// ─── Report helpers ───────────────────────────────────────────────────────────
interface CheckResult {
  name: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const results: CheckResult[] = [];

function record(name: string, passed: boolean, errors: string[], warnings: string[]): void {
  results.push({ name, passed, errors, warnings });
  const icon = passed ? "✓" : "✗";
  const status = passed ? "PASS" : "FAIL";
  console.log(`  ${icon} [${status}] ${name}`);
  if (errors.length > 0) errors.forEach(e => console.log(`      ERROR: ${e}`));
  if (warnings.length > 0) warnings.forEach(w => console.log(`      WARN:  ${w}`));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const gameDir = path.join(DATA_DIR, gameSlug);

  console.log(`\nValidating pipeline output for: ${gameSlug}`);
  console.log(`Data directory: ${gameDir}`);
  console.log("─".repeat(60));

  // Check game directory exists
  try {
    await fs.stat(gameDir);
  } catch {
    console.error(`Game directory not found: ${gameDir}`);
    process.exit(1);
  }

  // ─── 1. Artifact Integrity ───────────────────────────────────────────────────
  console.log("\n[1] Artifact Integrity");
  const integrityResult = await validateArtifactIntegrity(DATA_DIR, gameSlug);
  record("All expected files exist and are non-empty", integrityResult.valid, integrityResult.errors, integrityResult.warnings);

  // ─── 2. Rulebook Structure ───────────────────────────────────────────────────
  console.log("\n[2] Rulebook Structure");
  const rulebookPath = path.join(gameDir, "rulebooks", "latest.json");
  try {
    const raw = await fs.readFile(rulebookPath, "utf8");
    const rulebook = JSON.parse(raw);

    const structureResult = validateRulebook(rulebook);
    record("Rulebook metadata and sections valid", structureResult.valid, structureResult.errors, structureResult.warnings);

    const sectionsResult = validateRulebookHasSections(rulebook, ["mechanics", "overview", "components", "setup", "turn-structure"]);
    record("All pipeline sections present", sectionsResult.valid, sectionsResult.errors, sectionsResult.warnings);
  } catch (e: any) {
    record("Rulebook JSON readable and valid", false, [`Failed to read/parse rulebook: ${e.message}`], []);
  }

  // ─── 3. Design Session ───────────────────────────────────────────────────────
  console.log("\n[3] Design Session");
  const designDir = path.join(gameDir, "design");
  let sessionToValidate: any = null;

  try {
    const files = await fs.readdir(designDir);
    const sessionFiles = files.filter(f => f.endsWith(".json"));

    if (sessionFiles.length === 0) {
      record("Design session file exists", false, ["No design session JSON files found"], []);
    } else {
      // Find the target session or use the most recent one
      let chosenFile: string;
      if (targetSessionId) {
        chosenFile = sessionFiles.find(f => f.includes(targetSessionId)) ?? sessionFiles[sessionFiles.length - 1];
      } else {
        // Pick the session with the most steps
        let maxSteps = -1;
        chosenFile = sessionFiles[0];
        for (const f of sessionFiles) {
          try {
            const s = JSON.parse(await fs.readFile(path.join(designDir, f), "utf8"));
            if (s.steps?.length > maxSteps) { maxSteps = s.steps.length; chosenFile = f; }
          } catch {}
        }
      }

      const raw = await fs.readFile(path.join(designDir, chosenFile), "utf8");
      sessionToValidate = JSON.parse(raw);

      console.log(`  Using session: ${chosenFile} (${sessionToValidate.steps?.length ?? 0} steps)`);

      const sessionResult = validateDesignSession(sessionToValidate);
      record("Session structure valid (fields, ordering, traces)", sessionResult.valid, sessionResult.errors, sessionResult.warnings);

      const personaResult = validateDesignSessionHasSteps(sessionToValidate, [
        "MechanicsArchitect", "ThemeWeaver", "ComponentDesigner", "DetailsArchitect",
      ]);
      record("All pipeline agent steps present", personaResult.valid, personaResult.errors, personaResult.warnings);
    }
  } catch (e: any) {
    record("Design session directory readable", false, [`${e.message}`], []);
  }

  // ─── 4. Critique Report (if present) ─────────────────────────────────────────
  console.log("\n[4] Critique Report");
  if (sessionToValidate?.steps) {
    const balanceStep = [...sessionToValidate.steps].reverse().find((s: any) => s.persona === "BalanceCritic");
    const funStep = [...sessionToValidate.steps].reverse().find((s: any) => s.persona === "FunFactorJudge");

    if (balanceStep) {
      const balResult = validateBalanceReport(balanceStep.output);
      record("BalanceCritic report structurally complete", balResult.valid, balResult.errors, balResult.warnings);
    } else {
      record("BalanceCritic step present", false, ["No BalanceCritic step found in session"], []);
    }

    if (funStep) {
      const funResult = validateFunReport(funStep.output);
      record("FunFactorJudge report structurally complete", funResult.valid, funResult.errors, funResult.warnings);
    } else {
      record("FunFactorJudge step present", false, ["No FunFactorJudge step found in session"], []);
    }

    if (balanceStep && funStep) {
      const scores = parseCritiqueScores(balanceStep.output, funStep.output);
      const scoreDetails: string[] = [];
      if (scores.funScore !== undefined) scoreDetails.push(`Fun: ${scores.funScore}/10`);
      if (scores.balanceScore !== undefined) scoreDetails.push(`Balance: ${scores.balanceScore}/10`);
      if (scores.balanceVerdict) scoreDetails.push(`Verdict: ${scores.balanceVerdict}`);
      console.log(`  ℹ Critique scores: ${scoreDetails.join(", ") || "could not parse"}`);
    }
  } else {
    record("Critique steps present in session", false, ["No session steps to check"], []);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const totalChecks = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = totalChecks - passed;
  const warnings = results.reduce((n, r) => n + r.warnings.length, 0);

  console.log("\n" + "─".repeat(60));
  console.log(`Summary: ${passed}/${totalChecks} checks passed  |  ${failed} failed  |  ${warnings} warning(s)`);

  if (failed === 0) {
    console.log("Result: PASS — pipeline output is valid.\n");
    process.exit(0);
  } else {
    console.log("Result: FAIL — see errors above.\n");
    process.exit(1);
  }
}

main().catch(e => {
  console.error("Validation harness crashed:", e);
  process.exit(1);
});
