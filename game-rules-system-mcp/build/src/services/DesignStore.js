import * as fs from "fs/promises";
import * as path from "path";
import { getDesignSessionPath, getDesignSessionDir } from "../config/paths.js";
import * as StorageService from "./StorageService.js";
import crypto from "crypto";
export async function createDesignSession(gameName, theme) {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const session = {
        sessionId,
        gameName,
        theme,
        steps: [],
        status: "active",
        createdAt: now,
        lastUpdatedAt: now,
    };
    await saveDesignSession(session);
    return session;
}
export async function getDesignSession(gameName, sessionId) {
    const filePath = getDesignSessionPath(gameName, sessionId);
    try {
        return await StorageService.readJson(filePath);
    }
    catch (error) {
        throw new Error(`Design session ${sessionId} not found for game ${gameName}`);
    }
}
export async function saveDesignSession(session) {
    const filePath = getDesignSessionPath(session.gameName, session.sessionId);
    session.lastUpdatedAt = new Date().toISOString();
    await StorageService.saveJson(filePath, session);
}
export async function addDesignStep(gameName, sessionId, step) {
    const session = await getDesignSession(gameName, sessionId);
    const newStep = {
        ...step,
        timestamp: new Date().toISOString()
    };
    session.steps.push(newStep);
    await saveDesignSession(session);
    return session;
}
export async function listDesignSessions(gameName) {
    const dir = getDesignSessionDir(gameName);
    try {
        const files = await fs.readdir(dir);
        const sessions = [];
        for (const file of files) {
            if (file.endsWith(".json")) {
                const session = await StorageService.readJson(path.join(dir, file));
                sessions.push(session);
            }
        }
        return sessions;
    }
    catch {
        return [];
    }
}
