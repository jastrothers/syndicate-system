import * as fs from "fs/promises";
import { DATA_DIR, SYSTEM_DIR, getRulebookDir, getRulebookPath, getLegacyRulebookPath, sanitizeVersionTag, } from "../config/paths.js";
import * as StorageService from "./StorageService.js";
// In-memory cache: key is "name" for latest or "name@versionTag" for snapshots.
const rulebookCache = new Map();
// Cache for version listings per rulebook name
const versionsCache = new Map();
// Tracks which rulebook names have already been migration-checked this process lifetime.
const migratedNames = new Set();
function cacheKey(name, versionTag) {
    return versionTag ? `${name}@${versionTag}` : name;
}
function invalidateCache(name) {
    for (const k of rulebookCache.keys()) {
        if (k === name || k.startsWith(`${name}@`))
            rulebookCache.delete(k);
    }
    versionsCache.delete(name);
}
export function invalidateVersionsCache(name) {
    versionsCache.delete(name);
}
export async function ensureDataDirectory() {
    await StorageService.ensureDirectory(DATA_DIR);
    await StorageService.ensureDirectory(SYSTEM_DIR);
}
/**
 * Auto-migrates a legacy flat file (e.g. game-data/heist.json)
 * into the new directory structure (game-data/rulebooks/heist/latest.json).
 * Only runs if a flat file exists AND no directory version exists yet.
 */
export async function migrateIfNeeded(name) {
    const legacyPath = getLegacyRulebookPath(name);
    const newDir = getRulebookDir(name);
    const latestPath = getRulebookPath(name); // newest default uses "latest"
    // Check if legacy file exists
    try {
        await fs.access(legacyPath);
    }
    catch {
        return; // No legacy file, nothing to migrate
    }
    // Check if already migrated
    try {
        await fs.access(latestPath);
        return; // Already has new-format file, skip
    }
    catch {
        // Not yet migrated — proceed
    }
    await StorageService.ensureDirectory(newDir);
    const data = JSON.parse(await fs.readFile(legacyPath, "utf-8"));
    await StorageService.saveJson(latestPath, data);
    await fs.unlink(legacyPath);
}
export async function getRulebook(name, versionTag) {
    const key = cacheKey(name, versionTag);
    if (rulebookCache.has(key))
        return rulebookCache.get(key);
    // Try auto-migration once per name per process lifetime (only for latest)
    if (!versionTag && !migratedNames.has(name)) {
        migratedNames.add(name);
        await migrateIfNeeded(name);
    }
    const rulebookFile = getRulebookPath(name, { versionTag });
    const defaultValue = versionTag ? undefined : {
        metadata: {
            title: "Untitled Board Game",
            version: "0.1.0",
            lastUpdated: new Date().toISOString(),
        },
        sections: {},
        components: [],
    };
    try {
        const rulebook = await StorageService.readJson(rulebookFile, defaultValue);
        rulebookCache.set(key, rulebook);
        return rulebook;
    }
    catch (error) {
        if (error instanceof Error && error.code === "ENOENT") {
            throw new Error(`Version '${versionTag}' not found for rulebook '${name}'.`);
        }
        throw new Error(`Failed to parse rulebook: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export async function getDraft(name) {
    const filePath = getRulebookPath(name, { isDraft: true });
    try {
        return await StorageService.readJson(filePath);
    }
    catch {
        return null;
    }
}
export async function saveDraft(name, rulebook) {
    const filePath = getRulebookPath(name, { isDraft: true });
    rulebook.metadata.lastUpdated = new Date().toISOString();
    await StorageService.saveJson(filePath, rulebook);
    // Drafts don't affect the versioned cache, but invalidate latest since draft and latest share a name context
    invalidateCache(name);
}
export async function promoteDraft(name) {
    const draftPath = getRulebookPath(name, { isDraft: true });
    const latestPath = getRulebookPath(name);
    try {
        const draft = await StorageService.readJson(draftPath);
        await StorageService.saveJson(latestPath, draft);
        await fs.unlink(draftPath);
        invalidateCache(name);
    }
    catch (error) {
        throw new Error(`Failed to promote draft for '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
}
export async function saveRulebook(name, rulebook) {
    const rulebookFile = getRulebookPath(name); // Always saves to latest
    rulebook.metadata.lastUpdated = new Date().toISOString();
    await StorageService.saveJson(rulebookFile, rulebook);
    invalidateCache(name);
}
/**
 * Lists all rulebook names (game IDs) by scanning game directories.
 */
export async function listRulebooks() {
    try {
        const games = await fs.readdir(DATA_DIR, { withFileTypes: true });
        const results = [];
        for (const game of games) {
            if (game.isDirectory()) {
                const rbDir = getRulebookDir(game.name);
                try {
                    await fs.access(rbDir);
                    results.push(game.name);
                }
                catch {
                    // No rulebooks folder in this game dir, skip
                }
            }
        }
        return results;
    }
    catch (error) {
        if (error instanceof Error && error.code === "ENOENT")
            return [];
        throw error;
    }
}
/**
 * Lists all version snapshots for a given rulebook.
 * Returns version info for each snapshot (excludes "latest" from the list).
 */
export async function listVersions(name) {
    if (versionsCache.has(name))
        return versionsCache.get(name);
    const dir = getRulebookDir(name);
    let files;
    try {
        files = await fs.readdir(dir);
    }
    catch (error) {
        if (error instanceof Error && error.code === "ENOENT")
            return [];
        throw error;
    }
    const versions = [];
    for (const file of files) {
        if (!file.endsWith(".json") || file === "latest.json")
            continue;
        // Strip "v" prefix and ".json" suffix to get the tag
        const tag = file.replace(/^v/, "").replace(/\.json$/, "");
        try {
            const data = await fs.readFile(getRulebookPath(name, { versionTag: tag }), "utf-8");
            const rb = JSON.parse(data);
            versions.push({
                versionTag: tag,
                title: rb.metadata.title,
                version: rb.metadata.version,
                lastUpdated: rb.metadata.lastUpdated,
                description: rb.metadata.description,
            });
        }
        catch {
            // Skip unparseable files
        }
    }
    // Sort by lastUpdated descending
    versions.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    versionsCache.set(name, versions);
    return versions;
}
/**
 * Creates a named version snapshot by copying the current latest.json
 * to v{tag}.json and stamping the metadata.
 */
export async function createVersion(name, versionTag, description) {
    const safeTag = sanitizeVersionTag(versionTag);
    if (!safeTag) {
        throw new Error("Invalid version tag. Use alphanumeric characters, dots, dashes, and underscores.");
    }
    const snapshotPath = getRulebookPath(name, { versionTag: safeTag });
    // Check if this version already exists
    try {
        await fs.access(snapshotPath);
        throw new Error(`Version '${safeTag}' already exists for rulebook '${name}'.`);
    }
    catch (error) {
        if (error instanceof Error && error.message?.includes("already exists"))
            throw error;
        // ENOENT is expected — version doesn't exist yet
    }
    // Read current latest
    const rulebook = await getRulebook(name);
    // Stamp version metadata
    rulebook.metadata.versionTag = safeTag;
    if (description) {
        rulebook.metadata.description = description;
    }
    rulebook.metadata.lastUpdated = new Date().toISOString();
    // Write snapshot (locked via StorageService)
    await StorageService.saveJson(snapshotPath, rulebook);
    return {
        versionTag: safeTag,
        title: rulebook.metadata.title,
        version: rulebook.metadata.version,
        lastUpdated: rulebook.metadata.lastUpdated,
        description: rulebook.metadata.description,
    };
}
