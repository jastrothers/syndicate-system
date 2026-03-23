import Database from "better-sqlite3";
import { SESSION_INDEX_DB, getSessionPath, DATA_DIR } from "../config/paths.js";
import crypto from "crypto";
import * as StorageService from "./StorageService.js";
let db;
export async function ensureSessionsDirectory() {
    await StorageService.ensureDirectory(DATA_DIR);
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
    }
    catch (error) {
        console.error("Failed to initialize session database index:", error);
        process.exit(1);
    }
}
async function migrateLegacySessions() {
    // Legacy migration is now handled by the migrate-data scan or getSession fallback
}
function insertIntoIndex(session, filePath) {
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO sessions_index (id, rulebookName, rulebookVersion, filePath, createdAt, lastUpdatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    stmt.run(session.sessionId, session.rulebookName, session.rulebookVersion || null, filePath, session.createdAt, session.lastUpdatedAt);
}
export async function createSession(rulebookName, rulebookVersion) {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const session = {
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
export async function getSession(sessionId) {
    // Query DB first
    let sessionFile;
    if (db) {
        const stmt = db.prepare("SELECT filePath FROM sessions_index WHERE id = ?");
        const row = stmt.get(sessionId);
        sessionFile = row?.filePath || getSessionPath(sessionId); // fallback to flat path if not indexed
    }
    else {
        sessionFile = getSessionPath(sessionId);
    }
    try {
        return await StorageService.readJson(sessionFile);
    }
    catch (error) {
        throw new Error(`Session ${sessionId} not found or invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export async function saveSession(sessionId, session) {
    const sessionFile = getSessionPath(sessionId, session.rulebookName, session.rulebookVersion);
    session.lastUpdatedAt = new Date().toISOString();
    await StorageService.saveJson(sessionFile, session);
    // Update index
    if (db) {
        insertIntoIndex(session, sessionFile);
    }
}
export async function listSessions(rulebookName, rulebookVersion) {
    if (!db) {
        return [];
    }
    let query = "SELECT id as sessionId, rulebookName, rulebookVersion, createdAt, lastUpdatedAt FROM sessions_index";
    const params = [];
    const conditions = [];
    if (rulebookName) {
        conditions.push("rulebookName = ?");
        params.push(rulebookName);
    }
    if (rulebookVersion !== undefined) {
        if (rulebookVersion === null || rulebookVersion === "") {
            conditions.push("rulebookVersion IS NULL");
        }
        else {
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
export function deleteSession(sessionId) {
    if (!db)
        return null;
    const row = db.prepare("SELECT filePath FROM sessions_index WHERE id = ?").get(sessionId);
    if (!row)
        return null;
    db.prepare("DELETE FROM sessions_index WHERE id = ?").run(sessionId);
    return row.filePath;
}
export function deleteSessionsByGame(gameName) {
    if (!db)
        return [];
    const rows = db.prepare("SELECT filePath FROM sessions_index WHERE rulebookName = ?").all(gameName);
    db.prepare("DELETE FROM sessions_index WHERE rulebookName = ?").run(gameName);
    return rows.map(r => r.filePath);
}
export function closeDb() {
    if (db) {
        db.close();
    }
}
