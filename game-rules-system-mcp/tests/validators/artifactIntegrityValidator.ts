import fs from "node:fs/promises";
import path from "node:path";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifies that all expected artifacts exist and are well-formed after a
 * completed game-gen pipeline run.
 *
 * @param gameDataDir  Root of the game-data directory (e.g. process.env.TEST_DATA_DIR)
 * @param gameSlug     Sanitized game slug (e.g. "clockwork-menagerie")
 */
export async function validateArtifactIntegrity(
  gameDataDir: string,
  gameSlug: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const gameDir = path.join(gameDataDir, gameSlug);

  async function checkFile(relPath: string, label: string): Promise<string | null> {
    const full = path.join(gameDir, relPath);
    try {
      const stat = await fs.stat(full);
      if (stat.size === 0) errors.push(`${label}: file exists but is empty (${relPath})`);
      return full;
    } catch {
      errors.push(`${label}: file not found (${relPath})`);
      return null;
    }
  }

  async function checkDir(relPath: string, label: string): Promise<boolean> {
    const full = path.join(gameDir, relPath);
    try {
      await fs.stat(full);
      return true;
    } catch {
      errors.push(`${label}: directory not found (${relPath})`);
      return false;
    }
  }

  // Rulebook artifacts
  const latestJsonPath = await checkFile("rulebooks/latest.json", "Rulebook JSON");
  const latestMdPath = await checkFile("rulebooks/latest.md", "Rulebook Markdown");

  // Validate JSON structure
  if (latestJsonPath) {
    try {
      const raw = await fs.readFile(latestJsonPath, "utf8");
      const rulebook = JSON.parse(raw);
      if (!rulebook.metadata) errors.push("Rulebook JSON: missing metadata object");
      if (!rulebook.sections || Object.keys(rulebook.sections).length === 0) {
        errors.push("Rulebook JSON: sections map is empty");
      }
    } catch (e: any) {
      errors.push(`Rulebook JSON: failed to parse — ${e.message}`);
    }
  }

  // Validate markdown is non-trivial
  if (latestMdPath) {
    try {
      const md = await fs.readFile(latestMdPath, "utf8");
      if (md.trim().length < 100) {
        warnings.push("Rulebook Markdown: content is suspiciously short (< 100 chars)");
      }
    } catch {}
  }

  // Design session
  const designDir = await checkDir("design", "Design session directory");
  if (designDir) {
    try {
      const files = await fs.readdir(path.join(gameDir, "design"));
      const sessions = files.filter(f => f.endsWith(".json"));
      if (sessions.length === 0) {
        errors.push("Design session directory exists but contains no session JSON files");
      } else {
        // Validate at least one session has steps
        let foundSteps = false;
        for (const sessionFile of sessions) {
          try {
            const raw = await fs.readFile(path.join(gameDir, "design", sessionFile), "utf8");
            const session = JSON.parse(raw);
            if (Array.isArray(session.steps) && session.steps.length > 0) {
              foundSteps = true;
              break;
            }
          } catch {}
        }
        if (!foundSteps) {
          errors.push("No design session found with any steps — pipeline may not have run");
        }
      }
    } catch (e: any) {
      errors.push(`Design session directory: failed to read — ${e.message}`);
    }
  }

  // Reference directory
  const refDir = await checkDir("reference/latest", "Reference directory");
  if (refDir) {
    try {
      const files = await fs.readdir(path.join(gameDir, "reference", "latest"));
      const refs = files.filter(f => f.endsWith(".md"));
      if (refs.length === 0) {
        errors.push("Reference directory exists but contains no reference .md files");
      } else if (refs.length < 3) {
        warnings.push(`Only ${refs.length} reference file(s) found — expected at least 3 after a full pipeline`);
      }
    } catch (e: any) {
      errors.push(`Reference directory: failed to read — ${e.message}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
