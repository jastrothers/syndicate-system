import { z } from "zod";
import * as fs from "fs/promises";
import * as ReferenceStore from "../../services/ReferenceStore.js";
import * as SessionStore from "../../services/SessionStore.js";
import { getGameDir, sanitizeFileName } from "../../config/paths.js";
export const deleteGameTool = {
    name: "delete_game",
    description: "Permanently deletes all data for a game: its directory tree, all sessions, and all references. Requires confirm: true to execute. This is irreversible.",
    schema: z.object({
        gameName: z.string().describe("The name of the game to delete."),
        confirm: z.boolean().describe("Must be true to confirm the destructive operation."),
    }),
    handler: async (args) => {
        if (!args.confirm) {
            throw new Error(`Deletion aborted: 'confirm' must be true to delete game '${args.gameName}'.`);
        }
        const safeName = sanitizeFileName(args.gameName);
        if (!safeName) {
            throw new Error(`Invalid game name: '${args.gameName}'.`);
        }
        const gameDir = getGameDir(args.gameName);
        // Verify the game directory exists
        try {
            await fs.access(gameDir);
        }
        catch {
            throw new Error(`Game '${args.gameName}' not found at path: ${gameDir}`);
        }
        // 1. Clean up SQLite indexes before deleting files
        await ReferenceStore.deleteReferencesByGame(safeName);
        const sessionPaths = SessionStore.deleteSessionsByGame(args.gameName);
        // 2. Delete any session files that weren't under the game dir (edge case: legacy paths)
        for (const sessionPath of sessionPaths) {
            if (!sessionPath.startsWith(gameDir)) {
                try {
                    await fs.unlink(sessionPath);
                }
                catch (err) {
                    if (err.code !== "ENOENT")
                        throw err;
                }
            }
        }
        // 3. Delete the entire game directory tree
        await fs.rm(gameDir, { recursive: true, force: true });
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        status: "success",
                        message: `Game '${args.gameName}' and all associated data have been permanently deleted.`,
                        deletedDirectory: gameDir,
                        sessionsRemovedFromIndex: sessionPaths.length,
                    }, null, 2),
                }],
        };
    },
};
