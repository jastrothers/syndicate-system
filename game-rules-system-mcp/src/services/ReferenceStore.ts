import * as fs from "fs/promises";
import Database from "better-sqlite3";
import matter from "gray-matter";
import * as path from "path";
import { DATA_DIR, SYSTEM_DIR, REFERENCE_INDEX_DB, getReferenceFilePath } from "../config/paths.js";

let db: Database.Database;

export async function initialize() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(SYSTEM_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create data directory:", error);
    process.exit(1);
  }

  try {
    db = new Database(REFERENCE_INDEX_DB);
    db.exec(`DROP TABLE IF EXISTS references_index`);
    // Create new schema supporting multiple versioned instances of the same ID
    db.exec(`
      CREATE TABLE IF NOT EXISTS references_index (
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        game TEXT NOT NULL,
        version TEXT NOT NULL,
        type TEXT,
        tags TEXT,
        filePath TEXT NOT NULL,
        lastUpdated TEXT,
        deleted INTEGER DEFAULT 0,
        UNIQUE(id, game, version)
      )
    `);

    await rebuildIndex();
  } catch (error) {
    console.error("Failed to initialize reference database index:", error);
    process.exit(1);
  }
}

export async function saveReference(name: string, game: string | undefined, version: string | undefined, type: string, tags: string[], content: string, deleted: boolean = false): Promise<void> {
  const resolvedGame = game || "general";
  const resolvedVersion = version || "latest";
  const filePath = getReferenceFilePath(name, resolvedGame, resolvedVersion);
  const now = new Date().toISOString();
  
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  
  // Format with gray-matter frontmatter
  const metadata: any = { title: name, type, tags, lastUpdated: now };
  if (game !== undefined) metadata.game = resolvedGame;
  if (version !== undefined) metadata.version = resolvedVersion;
  if (deleted) metadata.deleted = true;
  
  const fileContent = matter.stringify(content, metadata);
  await fs.writeFile(filePath, fileContent, "utf-8");

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO references_index (id, name, game, version, type, tags, filePath, lastUpdated, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(name, name, resolvedGame, resolvedVersion, type, JSON.stringify(tags), filePath, now, deleted ? 1 : 0);
}

export async function getReference(name: string, game?: string, version?: string): Promise<{ name: string, game?: string, version?: string, type: string, tags: string[], content: string } | null> {
  let row: { filePath: string, deleted: number } | undefined;
  
  if (game) {
    const resolvedVersion = version || "latest";
    // Try exact match first
    let stmt = db.prepare("SELECT filePath, deleted FROM references_index WHERE (name = ? OR id = ?) AND game = ? AND version = ?");
    row = stmt.get(name, name, game, resolvedVersion) as { filePath: string, deleted: number } | undefined;

    // Fallback to 'latest' matching the game if exact version isn't found
    if (!row && resolvedVersion !== "latest") {
      stmt = db.prepare("SELECT filePath, deleted FROM references_index WHERE (name = ? OR id = ?) AND game = ? AND version = 'latest'");
      row = stmt.get(name, name, game) as { filePath: string, deleted: number } | undefined;
    }
    
    // Global Fallback: 'general/latest'
    if (!row && game !== "general") {
       stmt = db.prepare("SELECT filePath, deleted FROM references_index WHERE (name = ? OR id = ?) AND game = 'general' AND version = 'latest'");
       row = stmt.get(name, name) as { filePath: string, deleted: number } | undefined;
    }
  } else {
    // No game specified. Search globally for the best match.
    const resolvedVersion = version || "latest";
    
    // 1. Try to find the exact version requested across any game
    let stmt = db.prepare("SELECT filePath, deleted FROM references_index WHERE (name = ? OR id = ?) AND version = ? LIMIT 1");
    row = stmt.get(name, name, resolvedVersion) as { filePath: string, deleted: number } | undefined;
    
    // 2. Fallback to latest across any game
    if (!row && resolvedVersion !== "latest") {
      stmt = db.prepare("SELECT filePath, deleted FROM references_index WHERE (name = ? OR id = ?) AND version = 'latest' LIMIT 1");
      row = stmt.get(name, name) as { filePath: string, deleted: number } | undefined;
    }
  }

  // If we found a file but it's marked as deleted, respect the tombstone
  if (!row || row.deleted === 1) {
    return null;
  }

  try {
    const fileData = await fs.readFile(row.filePath, "utf-8");
    const parsed = matter(fileData);
    return {
      name: parsed.data.title || name,
      game: parsed.data.game,
      version: parsed.data.version,
      type: parsed.data.type || "general",
      tags: parsed.data.tags || [],
      content: parsed.content.trim()
    };
  } catch (error: unknown) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      db.prepare("DELETE FROM references_index WHERE filePath = ?").run(row.filePath);
      throw new Error(`The reference '${name}' could not be found via file path ${row.filePath}. It was likely deleted outside the application. It has now been removed from the index.`);
    }
    throw error;
  }
}

export async function queryReferences(game?: string, version?: string, type?: string, tags?: string[]): Promise<any[]> {
  const resolvedVersion = version || "latest";

  // Push filters into SQL WHERE clause for efficiency
  const conditions: string[] = [];
  const params: any[] = [];

  if (game) {
    conditions.push("(game = ? OR game = 'general')");
    params.push(game);
  }

  conditions.push("(version = ? OR version = 'latest')");
  params.push(resolvedVersion);

  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT id, name, game, version, type, tags, lastUpdated, deleted FROM references_index${whereClause}`;

  const results = db.prepare(query).all(...params) as any[];

  // Layer merging using the new Fallback Strategy
  const resolvedMap = new Map<string, any>();

  for (const r of results) {
     const current = resolvedMap.get(r.id);
     
     // Only consider records that match the target game (or all games if game is undefined)
     // AND are either the exact version requested, or 'latest'
     const matchesGame = !game || r.game === game || r.game === 'general';
     const matchesVersion = r.version === resolvedVersion || r.version === 'latest';
     
     if (!matchesGame || !matchesVersion) continue;

     // Evaluate priorities:
     // 1. targetGame / exact-version (Highest - beats everything)
     // 2. targetGame / latest        (Medium  - beats general)
     // 3. general / latest           (Lowest  - base default)
     let shouldKeep = false;
     
     if (!current) {
        shouldKeep = true;
     } else {
        const rTarget = (game && r.game === game) || (!game && r.game !== 'general');
        const cTarget = (game && current.game === game) || (!game && current.game !== 'general');

        const isNewerExact = rTarget && r.version === resolvedVersion;
        const isCurrentGeneral = current.game === 'general';
        const isNewerGameLatest = rTarget && r.version === 'latest' && current.version !== resolvedVersion;
        
        if (isNewerExact) {
            shouldKeep = true;
        } else if (isNewerGameLatest && isCurrentGeneral) {
            shouldKeep = true;
        } else if (!game && r.game === current.game) {
            // When querying all games, we need to compare versions within the same game
            if (r.version === resolvedVersion && current.version !== resolvedVersion) {
                shouldKeep = true;
            }
        }
     }

     if (shouldKeep) {
       // Also ensure we key by `game:id` so we don't overwrite references from different games when querying all
       const keyMap = game ? r.id : `${r.game}:${r.id}`;
       resolvedMap.set(keyMap, r);
     }
  }

  // Filter out any entries overridden by tombstones, then apply remaining filters
  let finalResults = Array.from(resolvedMap.values())
    .filter(r => r.deleted === 0)
    .map(r => ({ ...r, tags: JSON.parse(r.tags || "[]") }));

  if (tags && tags.length > 0) {
    finalResults = finalResults.filter(r => tags.every(tag => r.tags.includes(tag)));
  }

  return finalResults;
}

export async function deleteReferencesByGame(gameName: string): Promise<void> {
  if (!db) return;
  const rows = db.prepare("SELECT filePath FROM references_index WHERE game = ?").all(gameName) as { filePath: string }[];
  for (const row of rows) {
    try {
      await fs.unlink(row.filePath);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }
  db.prepare("DELETE FROM references_index WHERE game = ?").run(gameName);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
      const list = await fs.readdir(dir, { withFileTypes: true });
      for (const dirent of list) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            results.push(...await walkDir(fullPath));
        } else if (fullPath.endsWith(".md")) {
            results.push(fullPath);
        }
      }
  } catch (err) {
      // Ignored if root dir doesn't exist yet
  }
  return results;
}

export async function rebuildIndex(): Promise<void> {
  const mdFiles = await walkDir(DATA_DIR);
  const parsedData = [];

  for (const filePath of mdFiles) {
    try {
      const file = path.basename(filePath);
      const relativePath = path.relative(DATA_DIR, filePath);
      const parts = relativePath.split(path.sep); // game / reference / version / file.md
      
      // Skip files that are not in a 'reference' folder
      if (!parts.includes("reference")) continue;

      const fileData = await fs.readFile(filePath, "utf-8");
      const parsed = matter(fileData);
      
      const defaultName = file.replace(/\.md$/, "");
      
      // Infer from structure: [game]/reference/[version]/[id].md
      let derivedGame = "general";
      let derivedVersion = "latest";
      
      const refIndex = parts.indexOf("reference");
      if (refIndex > 0) {
        derivedGame = parts[refIndex - 1];
      }
      if (parts.length > refIndex + 1) {
        derivedVersion = parts[refIndex + 1];
      }

      parsedData.push({
        id: defaultName,
        name: parsed.data.title || defaultName,
        game: parsed.data.game || derivedGame,
        version: parsed.data.version || derivedVersion,
        type: parsed.data.type || "general",
        tags: JSON.stringify(parsed.data.tags || []),
        filePath,
        lastUpdated: parsed.data.lastUpdated || new Date().toISOString(),
        deleted: parsed.data.deleted ? 1 : 0
      });
    } catch (error) {
       console.error(`Failed to parse reference file ${filePath}:`, error);
    }
  }

  db.exec("DELETE FROM references_index");
  
  const insertStmt = db.prepare(`
    INSERT INTO references_index (id, name, game, version, type, tags, filePath, lastUpdated, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((data: any[]) => {
    for (const item of data) {
      insertStmt.run(item.id, item.name, item.game, item.version, item.type, item.tags, item.filePath, item.lastUpdated, item.deleted);
    }
  });

  insertMany(parsedData);
}
