import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { getPlaytestLogPath } from "../../config/paths.js";
import { ensureSessionsDirectory, createSession, getSession, saveSession, listSessions } from "../../services/SessionStore.js";
import { jsonResponse, textResponse } from "../response.js";
export const createSessionTool = {
    name: "create_session",
    description: "Initializes an empty playtest session linked to a specific rulebook.",
    schema: z.object({
        rulebookName: z.string().describe("The name of the rulebook for this session."),
        rulebookVersion: z.string().optional().describe("Optional version tag to pin this session to a specific rulebook snapshot."),
    }),
    handler: async (args) => {
        await ensureSessionsDirectory();
        const session = await createSession(args.rulebookName, args.rulebookVersion);
        return jsonResponse({
            sessionId: session.sessionId,
            rulebookName: session.rulebookName,
            rulebookVersion: session.rulebookVersion,
            createdAt: session.createdAt,
        }, "Next: setup_game_from_manifest or update_game_state to initialize");
    },
};
export const getGameStateTool = {
    name: "get_game_state",
    description: "Returns the current JSON state of the playtest session. Use keysOnly=true to inspect state structure without reading values. Use fields to fetch specific keys.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        fields: z.array(z.string()).optional().describe("If provided, returns only these top-level state keys. Omit to get full state."),
        keysOnly: z.boolean().optional().default(false).describe("If true, returns only key names with types/sizes instead of values."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const state = session.state;
        if (args.keysOnly) {
            const summary = Object.fromEntries(Object.keys(state).map(k => [k, Array.isArray(state[k])
                    ? `[${state[k].length} items]`
                    : typeof state[k]]));
            return jsonResponse({ keys: summary });
        }
        if (args.fields) {
            const filtered = Object.fromEntries(args.fields.filter((f) => f in state).map((f) => [f, state[f]]));
            return jsonResponse(filtered);
        }
        return jsonResponse(state);
    },
};
export const updateGameStateTool = {
    name: "update_game_state",
    description: "Applies a shallow merge to the game state (Object.assign semantics — top-level keys are overwritten, not deep-merged). Returns updated key names and state overview (not full state). Call get_game_state for current values.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        patch: z.record(z.string(), z.unknown()).describe("A JSON object representing the state updates to apply via shallow merge."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        session.state = { ...session.state, ...args.patch };
        await saveSession(args.sessionId, session);
        const stateSnapshot = Object.fromEntries(Object.keys(session.state).map(k => [k, Array.isArray(session.state[k])
                ? `[${session.state[k].length} items]`
                : typeof session.state[k]]));
        return jsonResponse({ updatedKeys: Object.keys(args.patch), stateSnapshot });
    },
};
export const logPlaytestNoteTool = {
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
        await fs.mkdir(path.dirname(logFile), { recursive: true });
        await fs.appendFile(logFile, logEntry, "utf-8");
        return textResponse("Successfully appended note to playtest logs.");
    },
};
export const listSessionsTool = {
    name: "list_sessions",
    description: "Lists playtest sessions, optionally filtered by rulebook name and version. Returns session metadata without full state. Supports pagination.",
    schema: z.object({
        rulebookName: z.string().optional().describe("Filter sessions by rulebook name."),
        rulebookVersion: z.string().optional().describe("Filter sessions by rulebook version."),
        limit: z.number().int().positive().optional().describe("Maximum number of sessions to return."),
        offset: z.number().int().nonnegative().optional().default(0).describe("Number of sessions to skip. Default: 0."),
    }),
    handler: async (args) => {
        const allSessions = await listSessions(args.rulebookName, args.rulebookVersion);
        const total = allSessions.length;
        const offset = args.offset ?? 0;
        const items = args.limit !== undefined
            ? allSessions.slice(offset, offset + args.limit)
            : allSessions.slice(offset);
        return jsonResponse({ total, offset, count: items.length, items });
    },
};
export const sessionCoreTools = [
    createSessionTool,
    getGameStateTool,
    updateGameStateTool,
    logPlaytestNoteTool,
    listSessionsTool,
];
