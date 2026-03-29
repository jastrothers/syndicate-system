import { z } from "zod";
import { getSessionStats } from "../../services/SessionStats.js";
import { defineTool } from "../types.js";
import { jsonResponse } from "../response.js";

export const getSessionStatsTool = defineTool({
  name: "get_session_stats",
  description: "Returns a condensed overview of a playtest session: metadata, state key names, and ledger entry counts by action type. Use this to orient to a session's state without loading the full state or ledger blobs.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
  }),
  handler: async (args) => {
    const stats = await getSessionStats(args.sessionId);
    return jsonResponse(stats);
  },
});

export const sessionStatsTools = [getSessionStatsTool];
