import * as fs from "fs/promises";
import * as path from "path";
import { Rulebook, VersionInfo } from "../types/index.js";
import {
  DATA_DIR,
  SYSTEM_DIR,
  getRulebookDir,
  getRulebookPath,
  getLegacyRulebookPath,
  sanitizeVersionTag,
} from "../config/paths.js";
import * as StorageService from "./StorageService.js";

type VersionsManifest = Record<string, VersionInfo>;

// In-memory cache: key is "name" for latest or "name@versionTag" for snapshots.
const rulebookCache = new Map<string, Rulebook>();
// Cache for version listings per rulebook name
const versionsCache = new Map<string, VersionInfo[]>();
// Tracks which rulebook names have already been migration-checked this process lifetime.
const migratedNames = new Set<string>();

function cacheKey(name: string, versionTag?: string): string {
  return versionTag ? `${name}@${versionTag}` : name;
}

function invalidateCache(name: string): void {
  for (const k of rulebookCache.keys()) {
    if (k === name || k.startsWith(`${name}@`)) rulebookCache.delete(k);
  }
  versionsCache.delete(name);
}

export function invalidateVersionsCache(name: string): void {
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
export async function migrateIfNeeded(name: string): Promise<void> {
  const legacyPath = getLegacyRulebookPath(name);
  const newDir = getRulebookDir(name);
  const latestPath = getRulebookPath(name); // newest default uses "latest"

  // Check if legacy file exists
  try {
    await fs.access(legacyPath);
  } catch {
    return; // No legacy file, nothing to migrate
  }

  // Check if already migrated
  try {
    await fs.access(latestPath);
    return; // Already has new-format file, skip
  } catch {
    // Not yet migrated — proceed
  }

  await StorageService.ensureDirectory(newDir);
  const data = JSON.parse(await fs.readFile(legacyPath, "utf-8"));
  await StorageService.saveJson(latestPath, data);
  await fs.unlink(legacyPath);
}

export async function getRulebook(name: string, versionTag?: string): Promise<Rulebook> {
  const key = cacheKey(name, versionTag);
  if (rulebookCache.has(key)) return rulebookCache.get(key)!;

  // Try auto-migration once per name per process lifetime (only for latest)
  if (!versionTag && !migratedNames.has(name)) {
    migratedNames.add(name);
    await migrateIfNeeded(name);
  }

  const rulebookFile = getRulebookPath(name, { versionTag });
  const defaultValue: Rulebook | undefined = versionTag ? undefined : {
    metadata: {
      title: "Untitled Board Game",
      version: "0.1.0",
      lastUpdated: new Date().toISOString(),
    },
    sections: {},
    components: [],
  };

  try {
    const rulebook = await StorageService.readJson<Rulebook>(rulebookFile, defaultValue);
    rulebookCache.set(key, rulebook);
    return rulebook;
  } catch (error: unknown) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Version '${versionTag}' not found for rulebook '${name}'.`);
    }
    throw new Error(`Failed to parse rulebook: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getDraft(name: string): Promise<Rulebook | null> {
  const filePath = getRulebookPath(name, { isDraft: true });
  try {
    return await StorageService.readJson<Rulebook>(filePath);
  } catch {
    return null;
  }
}

export async function saveDraft(name: string, rulebook: Rulebook): Promise<void> {
  const filePath = getRulebookPath(name, { isDraft: true });
  rulebook.metadata.lastUpdated = new Date().toISOString();
  await StorageService.saveJson(filePath, rulebook);
  // Drafts don't affect the versioned cache, but invalidate latest since draft and latest share a name context
  invalidateCache(name);
}

export async function promoteDraft(name: string): Promise<void> {
  const draftPath = getRulebookPath(name, { isDraft: true });
  const latestPath = getRulebookPath(name);

  try {
    const draft = await StorageService.readJson<Rulebook>(draftPath);
    await StorageService.saveJson(latestPath, draft);
    await fs.unlink(draftPath);
    invalidateCache(name);
  } catch (error) {
    throw new Error(`Failed to promote draft for '${name}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveRulebook(name: string, rulebook: Rulebook): Promise<void> {
  const rulebookFile = getRulebookPath(name); // Always saves to latest
  rulebook.metadata.lastUpdated = new Date().toISOString();

  await StorageService.saveJson(rulebookFile, rulebook);
  invalidateCache(name);
}

/**
 * Lists all rulebook names (game IDs) by scanning game directories.
 */
export async function listRulebooks(): Promise<string[]> {
  try {
    const games = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const results: string[] = [];
    
    for (const game of games) {
      if (game.isDirectory()) {
        const rbDir = getRulebookDir(game.name);
        try {
          await fs.access(rbDir);
          results.push(game.name);
        } catch {
          // No rulebooks folder in this game dir, skip
        }
      }
    }
    return results;
  } catch (error: unknown) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function getManifestPath(name: string): string {
  return path.join(getRulebookDir(name), "_versions.json");
}

async function readManifest(name: string): Promise<VersionsManifest | null> {
  try {
    const data = await fs.readFile(getManifestPath(name), "utf-8");
    return JSON.parse(data) as VersionsManifest;
  } catch {
    return null;
  }
}

async function writeManifest(name: string, manifest: VersionsManifest): Promise<void> {
  await fs.writeFile(getManifestPath(name), JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Lists all version snapshots for a given rulebook.
 * Reads from _versions.json manifest when available, falls back to file scan.
 */
export async function listVersions(name: string): Promise<VersionInfo[]> {
  if (versionsCache.has(name)) return versionsCache.get(name)!;

  // Try manifest first (fast path: avoids parsing full rulebook JSONs)
  const manifest = await readManifest(name);
  if (manifest && Object.keys(manifest).length > 0) {
    const versions = Object.values(manifest);
    versions.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    versionsCache.set(name, versions);
    return versions;
  }

  // Fallback: scan individual version files
  const dir = getRulebookDir(name);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch (error: unknown) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const versions: VersionInfo[] = [];
  const backfillManifest: VersionsManifest = {};
  for (const file of files) {
    if (!file.endsWith(".json") || file === "latest.json" || file === "_versions.json") continue;

    const tag = file.replace(/^v/, "").replace(/\.json$/, "");
    try {
      const data = await fs.readFile(
        getRulebookPath(name, { versionTag: tag }),
        "utf-8"
      );
      const rb = JSON.parse(data) as Rulebook;
      const info: VersionInfo = {
        versionTag: tag,
        title: rb.metadata.title,
        version: rb.metadata.version,
        lastUpdated: rb.metadata.lastUpdated,
        description: rb.metadata.description,
      };
      versions.push(info);
      backfillManifest[tag] = info;
    } catch {
      // Skip unparseable files
    }
  }

  // Backfill manifest for future fast reads
  if (Object.keys(backfillManifest).length > 0) {
    await writeManifest(name, backfillManifest).catch(() => {});
  }

  versions.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  versionsCache.set(name, versions);
  return versions;
}

/**
 * Creates a named version snapshot by copying the current latest.json
 * to v{tag}.json and stamping the metadata.
 */
export async function createVersion(
  name: string,
  versionTag: string,
  description?: string
): Promise<VersionInfo> {
  const safeTag = sanitizeVersionTag(versionTag);
  if (!safeTag) {
    throw new Error("Invalid version tag. Use alphanumeric characters, dots, dashes, and underscores.");
  }

  const snapshotPath = getRulebookPath(name, { versionTag: safeTag });

  // Check if this version already exists
  try {
    await fs.access(snapshotPath);
    throw new Error(`Version '${safeTag}' already exists for rulebook '${name}'.`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("already exists")) throw error;
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

  const versionInfo: VersionInfo = {
    versionTag: safeTag,
    title: rulebook.metadata.title,
    version: rulebook.metadata.version,
    lastUpdated: rulebook.metadata.lastUpdated,
    description: rulebook.metadata.description,
  };

  // Update versions manifest
  const manifest = await readManifest(name) || {};
  manifest[safeTag] = versionInfo;
  await writeManifest(name, manifest);

  return versionInfo;
}

/**
 * Removes a version tag from the _versions.json manifest.
 * Called after deleting a version snapshot file.
 */
export async function removeVersionFromManifest(name: string, versionTag: string): Promise<void> {
  const manifest = await readManifest(name);
  if (manifest && manifest[versionTag]) {
    delete manifest[versionTag];
    await writeManifest(name, manifest);
  }
}
