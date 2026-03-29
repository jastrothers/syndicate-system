import { z } from "zod";
import { searchRuleSections } from "../../services/RulebookSearch.js";
import { defineTool } from "../types.js";
import { jsonResponse } from "../response.js";

export const searchRulesTool = defineTool({
  name: "search_rules",
  description: "Full-text search across all rule section titles and content. Returns matching paths and 200-char snippets. Use this instead of loading the full rulebook when looking for a specific rule clause.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to search. Defaults to 'rulebook'."),
    query: z.string().describe("Keyword to search for (case-insensitive) in section titles and content."),
    rulebookVersion: z.string().optional().describe("Optional version tag to search a specific snapshot."),
    limit: z.number().int().min(1).max(100).optional().default(20).describe("Maximum number of matches to return. Defaults to 20."),
  }),
  handler: async (args) => {
    const result = await searchRuleSections(args.rulebookName, args.query, args.rulebookVersion, args.limit);
    return jsonResponse(result);
  },
});

export const rulebookSearchTools = [searchRulesTool];
