import * as fs from "fs/promises";
import * as path from "path";
import { DesignSession, DesignStep } from "../types/index.js";
import { getDesignSessionPath, getDesignSessionDir } from "../config/paths.js";
import * as StorageService from "./StorageService.js";
import crypto from "crypto";

export async function createDesignSession(gameName: string, theme: string, initialPrompt?: string, prePickedMechanics?: string[]): Promise<DesignSession> {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const session: DesignSession = {
    sessionId,
    gameName,
    theme,
    steps: [],
    status: "active",
    createdAt: now,
    lastUpdatedAt: now,
    ...(initialPrompt !== undefined ? { initialPrompt } : {}),
    ...(prePickedMechanics?.length ? { prePickedMechanics } : {}),
  };

  await saveDesignSession(session);
  return session;
}

export async function getDesignSession(gameName: string, sessionId: string): Promise<DesignSession> {
  const filePath = getDesignSessionPath(gameName, sessionId);
  try {
    return await StorageService.readJson<DesignSession>(filePath);
  } catch (error) {
    throw new Error(`Design session ${sessionId} not found for game ${gameName}`);
  }
}

export async function saveDesignSession(session: DesignSession): Promise<void> {
  const filePath = getDesignSessionPath(session.gameName, session.sessionId);
  session.lastUpdatedAt = new Date().toISOString();
  await StorageService.saveJson(filePath, session);
}

export async function addDesignStep(gameName: string, sessionId: string, step: Omit<DesignStep, "timestamp">): Promise<DesignSession> {
  const session = await getDesignSession(gameName, sessionId);
  
  const newStep: DesignStep = {
    ...step,
    timestamp: new Date().toISOString()
  };
  
  session.steps.push(newStep);
  await saveDesignSession(session);
  return session;
}

export async function summarizePreferences(gameName: string, sessionId: string, summary: string): Promise<DesignSession> {
  const session = await getDesignSession(gameName, sessionId);
  session.preferencesSummarized = summary;
  await saveDesignSession(session);
  return session;
}

export async function listDesignSessions(gameName: string): Promise<DesignSession[]> {
  const dir = getDesignSessionDir(gameName);
  try {
    const files = await fs.readdir(dir);
    const sessions: DesignSession[] = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        const session = await StorageService.readJson<DesignSession>(path.join(dir, file));
        sessions.push(session);
      }
    }
    return sessions;
  } catch {
    return [];
  }
}
