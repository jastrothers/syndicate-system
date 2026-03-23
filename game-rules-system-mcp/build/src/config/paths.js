import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// build/src/config/ -> ../../.. -> game-rules-system-mcp/ -> .. -> syndicate-system/
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_DATA_DIR = path.join(REPO_ROOT, "game-data");
export const DATA_DIR = process.env.GAME_DATA_DIR || process.env.TEST_DATA_DIR || DEFAULT_DATA_DIR;
export const SYSTEM_DIR = path.join(DATA_DIR, "_system");
export const SESSION_INDEX_DB = path.join(SYSTEM_DIR, "session_index.db");
export const REFERENCE_INDEX_DB = path.join(SYSTEM_DIR, "reference_index.db");
export function sanitizeFileName(name) {
    // Allow only alphanumeric, dashes, and underscores
    return name.replace(/[^a-zA-Z0-9_-]/g, "");
}
/**
 * Returns the root directory for a specific game's data.
 * e.g. game-data/heist/
 */
export function getGameDir(gameName) {
    const safeName = sanitizeFileName(gameName) || "_general";
    return path.join(DATA_DIR, safeName);
}
/**
 * Returns the directory for a specific game's rulebook versions.
 * e.g. game-data/heist/rulebooks/
 */
export function getRulebookDir(name) {
    const safeName = sanitizeFileName(name);
    if (!safeName) {
        return path.join(DATA_DIR, "rulebook");
    }
    const gameDir = getGameDir(name);
    return path.join(gameDir, "rulebooks");
}
/**
 * Returns the path for a specific version of a rulebook.
 * Defaults to "latest" which is the current working copy.
 * e.g. game-data/heist/rulebooks/latest.json
 */
export function getRulebookPath(name, options) {
    const dir = getRulebookDir(name);
    if (options?.isDraft) {
        return path.join(dir, "draft.json");
    }
    const fileName = options?.versionTag ? `v${sanitizeVersionTag(options.versionTag)}` : "latest";
    const filePath = path.join(dir, `${fileName}.json`);
    return filePath;
}
/**
 * Legacy flat path — used for migration detection only.
 */
export function getLegacyRulebookPath(name) {
    const safeName = sanitizeFileName(name) || "rulebook";
    return path.join(DATA_DIR, `${safeName}.json`);
}
export function getRulebookMdPath(name, versionTag) {
    const dir = getRulebookDir(name);
    const fileName = versionTag ? `v${sanitizeVersionTag(versionTag)}` : "latest";
    return path.join(dir, `${fileName}.md`);
}
export function getPlaytestLogPath(name) {
    return path.join(getGameDir(name), "logs", "playtest_logs.md");
}
/**
 * Returns the directory for a specific game's sessions.
 * e.g. game-data/heist/sessions/latest/
 */
export function getSessionDir(rulebookName, rulebookVersion) {
    const gameDir = getGameDir(rulebookName);
    const versionDir = rulebookVersion ? sanitizeVersionTag(rulebookVersion) : "latest";
    return path.join(gameDir, "sessions", versionDir);
}
export function getSessionPath(sessionId, rulebookName, rulebookVersion) {
    if (rulebookName) {
        const dir = getSessionDir(rulebookName, rulebookVersion);
        return path.join(dir, `${sessionId}.json`);
    }
    // Generic fallback if rulebook is unknown (should be rare in new structure)
    return path.join(DATA_DIR, "_unknown", "sessions", "latest", `${sessionId}.json`);
}
/**
 * Returns the directory for a specific game's design sessions.
 */
export function getDesignSessionDir(gameName) {
    const gameDir = getGameDir(gameName);
    return path.join(gameDir, "design");
}
/**
 * Returns the path for a specific design session.
 */
export function getDesignSessionPath(gameName, sessionId) {
    const dir = getDesignSessionDir(gameName);
    return path.join(dir, `${sessionId}.json`);
}
export function getReferenceFilePath(name, game, version) {
    const safeName = sanitizeFileName(name) || "unnamed";
    const gameDir = getGameDir(game || "general");
    const versionDir = version ? sanitizeVersionTag(version) : "latest";
    return path.join(gameDir, "reference", versionDir, `${safeName}.md`);
}
export function sanitizeVersionTag(tag) {
    // Allow alphanumeric, dashes, dots, and underscores for version tags
    return tag.replace(/[^a-zA-Z0-9._-]/g, "");
}
/**
 * Returns the path for the global designer profile.
 */
export function getDesignerProfilePath() {
    return path.join(SYSTEM_DIR, "designer_profile.json");
}
/**
 * Returns the path for a game's decision log.
 */
export function getDecisionLogPath(gameName) {
    return path.join(getGameDir(gameName), "logs", "decision_log.json");
}
