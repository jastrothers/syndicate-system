import { z } from "zod";
import * as fs from "fs/promises";
import * as SessionStore from "../../services/SessionStore.js";
import { ToolDefinition } from "../types.js";
import { jsonResponse } from "../response.js";

export const deleteSessionTool: ToolDefinition = {
  name: "delete_playtest_session",
  description: "Permanently deletes a playtest session file and removes it from the session index.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the session to delete."),
    confirm: z.literal(true).describe("Must be explicitly set to true to confirm permanent deletion."),
  }),
  handler: async (args) => {
    const filePath = SessionStore.deleteSession(args.sessionId);
    if (!filePath) {
      throw new Error(`Session '${args.sessionId}' not found in index.`);
    }

    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
      // File already gone — index entry was stale, still a success
    }

    return jsonResponse({
      status: "success",
      message: `Session '${args.sessionId}' has been permanently deleted.`,
      deletedFile: filePath,
    });
  },
};
