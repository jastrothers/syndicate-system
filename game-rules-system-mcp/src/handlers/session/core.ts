import { z } from "zod";
import * as fs from "fs/promises";
import { getPlaytestLogPath } from "../../config/paths.js";
import { ensureSessionsDirectory, createSession, getSession, saveSession } from "../../services/SessionStore.js";
import { ToolDefinition } from "../types.js";

export const createSessionTool: ToolDefinition = {
  name: "create_session",
  description: "Initializes an empty playtest session linked to a specific rulebook.",
  schema: z.object({
    rulebookName: z.string().describe("The name of the rulebook for this session."),
    rulebookVersion: z.string().optional().describe("Optional version tag to pin this session to a specific rulebook snapshot."),
  }),
  handler: async (args) => {
    await ensureSessionsDirectory();
    const session = await createSession(args.rulebookName, args.rulebookVersion);
    return {
      content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
    };
  },
};

export const getGameStateTool: ToolDefinition = {
  name: "get_game_state",
  description: "Returns the current JSON state of the playtest session.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);
    return {
      content: [{ type: "text", text: JSON.stringify(session.state, null, 2) }],
    };
  },
};

export const updateGameStateTool: ToolDefinition = {
  name: "update_game_state",
  description: "Applies a JSON patch to the game state.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
    patch: z.record(z.string(), z.unknown()).describe("A JSON object representing the state updates to apply via shallow merge."),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);
    session.state = { ...session.state, ...args.patch };
    await saveSession(args.sessionId, session);
    return {
      content: [{ type: "text", text: `Game state updated successfully.` }],
    };
  },
};

export const logPlaytestNoteTool: ToolDefinition = {
  name: "log_playtest_note",
  description: "Appends a playtest observation, balance issue, or player question to the playtest logs.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session to derive the rulebook from."),
    note: z.string().describe("The playtest observation or note to record."),
    category: z.string().optional().default("General").describe("Optional category (e.g., 'Balance', 'Clarity', 'Bug')"),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);
    const timestamp = new Date().toISOString();
    const logEntry = `### [${timestamp}] [${args.category}]\n${args.note}\n\n`;
    const logFile = getPlaytestLogPath(session.rulebookName);
    
    // Fix ENOENT issue by ensuring path exists
    const path = await import("path");
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    
    await fs.appendFile(logFile, logEntry, "utf-8");
    return {
      content: [{ type: "text", text: `Successfully appended note to playtest logs.` }],
    };
  },
};

export const sessionCoreTools = [
  createSessionTool,
  getGameStateTool,
  updateGameStateTool,
  logPlaytestNoteTool,
];
