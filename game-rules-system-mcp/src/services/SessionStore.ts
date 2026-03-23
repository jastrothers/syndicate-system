import * as fs from "fs/promises";
import * as path from "path";
import Database from "better-sqlite3";
import { PlaytestSession } from "../types/index.js";
import { SESSION_INDEX_DB, getSessionPath, DATA_DIR, SYSTEM_DIR } from "../config/paths.js";
import crypto from "crypto";
import * as StorageService from "./StorageService.js";

let db: Database.Database;

export async function ensureSessionsDirectory() {
  await StorageService.ensureDirectory(DATA_DIR);
  await StorageService.ensureDirectory(SYSTEM_DIR);
}

export async function initialize() {
  await ensureSessionsDirectory();

  try {
    db = new Database(SESSION_INDEX_DB);
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions_index (
        id TEXT PRIMARY KEY,
        rulebookName TEXT NOT NULL,
        rulebookVersion TEXT,
        filePath TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastUpdatedAt TEXT NOT NULL
      )
    `);

    await migrateLegacySessions();
  } catch (error) {
    console.error("Failed to initialize session database index:", error);
    process.exit(1);
  }
}

async function migrateLegacySessions() {
  // Legacy migration is now handled by the migrate-data scan or getSession fallback
}

function insertIntoIndex(session: PlaytestSession, filePath: string) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sessions_index (id, rulebookName, rulebookVersion, filePath, createdAt, lastUpdatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    session.sessionId,
    session.rulebookName,
    session.rulebookVersion || null,
    filePath,
    session.createdAt,
    session.lastUpdatedAt
  );
}

export async function createSession(rulebookName: string, rulebookVersion?: string): Promise<PlaytestSession> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const session: PlaytestSession = {
    sessionId,
    rulebookName,
    ...(rulebookVersion ? { rulebookVersion } : {}),
    state: {},
    ledger: [],
    createdAt: now,
    lastUpdatedAt: now,
  };
  
  await saveSession(sessionId, session);
  return session;
}

export async function getSession(sessionId: string): Promise<PlaytestSession> {
  // Query DB first
  let sessionFile: string;
  if (db) {
    const stmt = db.prepare("SELECT filePath FROM sessions_index WHERE id = ?");
    const row = stmt.get(sessionId) as { filePath: string } | undefined;
    sessionFile = row?.filePath || getSessionPath(sessionId); // fallback to flat path if not indexed
  } else {
    sessionFile = getSessionPath(sessionId);
  }
  
  try {
    return await StorageService.readJson<PlaytestSession>(sessionFile);
  } catch (error: unknown) {
    throw new Error(`Session ${sessionId} not found or invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveSession(sessionId: string, session: PlaytestSession): Promise<void> {
  const sessionFile = getSessionPath(sessionId, session.rulebookName, session.rulebookVersion);
  session.lastUpdatedAt = new Date().toISOString();

  await StorageService.saveJson(sessionFile, session);

  // Update index — if this fails, compensate by removing the file we just wrote
  if (db) {
    try {
      insertIntoIndex(session, sessionFile);
    } catch (indexError) {
      await fs.unlink(sessionFile).catch(() => {});
      throw new Error(
        `Session save failed: could not update index. ${indexError instanceof Error ? indexError.message : String(indexError)}`
      );
    }
  }
}

export async function listSessions(rulebookName?: string, rulebookVersion?: string): Promise<any[]> {
  if (!db) {
    return [];
  }
  
  let query = "SELECT id as sessionId, rulebookName, rulebookVersion, createdAt, lastUpdatedAt FROM sessions_index";
  const params: any[] = [];
  
  const conditions: string[] = [];
  if (rulebookName) {
    conditions.push("rulebookName = ?");
    params.push(rulebookName);
  }
  if (rulebookVersion !== undefined) {
    if (rulebookVersion === null || rulebookVersion === "") {
        conditions.push("rulebookVersion IS NULL");
    } else {
        conditions.push("rulebookVersion = ?");
        params.push(rulebookVersion);
    }
  }
  
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  
  query += " ORDER BY lastUpdatedAt DESC";
  
  return db.prepare(query).all(...params);
}

export function deleteSession(sessionId: string): string | null {
  if (!db) return null;
  const row = db.prepare("SELECT filePath FROM sessions_index WHERE id = ?").get(sessionId) as { filePath: string } | undefined;
  if (!row) return null;
  db.prepare("DELETE FROM sessions_index WHERE id = ?").run(sessionId);
  return row.filePath;
}

export function deleteSessionsByGame(gameName: string): string[] {
  if (!db) return [];
  const rows = db.prepare("SELECT filePath FROM sessions_index WHERE rulebookName = ?").all(gameName) as { filePath: string }[];
  db.prepare("DELETE FROM sessions_index WHERE rulebookName = ?").run(gameName);
  return rows.map(r => r.filePath);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
