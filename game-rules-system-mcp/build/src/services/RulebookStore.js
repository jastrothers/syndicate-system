import * as fs from "fs/promises";
import { DATA_DIR, getRulebookDir, getRulebookPath, getLegacyRulebookPath, sanitizeVersionTag, } from "../config/paths.js";
import * as StorageService from "./StorageService.js";
export async function ensureDataDirectory() {
    await StorageService.ensureDirectory(DATA_DIR);
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
    const data = await fs.readFile(legacyPath, "utf-8");
    await fs.writeFile(latestPath, data, "utf-8");
    await fs.unlink(legacyPath);
}
export async function getRulebook(name, versionTag) {
    // Try auto-migration first (only for latest/unversioned access)
    if (!versionTag) {
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
        return await StorageService.readJson(rulebookFile, defaultValue);
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
}
export async function promoteDraft(name) {
    const draftPath = getRulebookPath(name, { isDraft: true });
    const latestPath = getRulebookPath(name);
    try {
        const draftContent = await fs.readFile(draftPath, "utf-8");
        await fs.writeFile(latestPath, draftContent, "utf-8");
        await fs.unlink(draftPath);
    }
    catch (error) {
        throw new Error(`Failed to promote draft for '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
}
export async function saveRulebook(name, rulebook) {
    const rulebookFile = getRulebookPath(name); // Always saves to latest
    rulebook.metadata.lastUpdated = new Date().toISOString();
    await StorageService.saveJson(rulebookFile, rulebook);
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
    // Write snapshot
    await fs.writeFile(snapshotPath, JSON.stringify(rulebook, null, 2), "utf-8");
    return {
        versionTag: safeTag,
        title: rulebook.metadata.title,
        version: rulebook.metadata.version,
        lastUpdated: rulebook.metadata.lastUpdated,
        description: rulebook.metadata.description,
    };
}
