/**
 * cardHandlers.deck.ts
 * Phase 1 — Core Deck Primitives: query (peek/search/count).
 */
import { z } from "zod";
import { getSession } from "../../services/SessionStore.js";
import {
  peekCards,
  searchArray,
  validateFilterClause,
  matchesFilter,
  FilterClause,
} from "../../services/DeckService.js";
import { defineTool, ToolDefinition } from "../types.js";
import { jsonResponse } from "../response.js";

export const filterSchema = z.object({
  key: z.string().describe("The property name on card objects to filter by."),
  op: z.enum(["eq", "ne", "gt", "lt", "gte", "lte", "contains"]).describe("Comparison operator."),
  value: z.union([z.string(), z.number(), z.boolean()]).describe("The value to compare against."),
});

export const queryZoneTool = defineTool({
  name: "query_zone",
  description:
    "Read-only inspection of a state array. action='peek' looks at top/bottom N cards without moving them; action='search' returns cards matching a filter with their indices; action='count' returns the number of items, optionally filtered.",
  schema: z.object({
    sessionId: z.string().describe("The ID of the playtest session."),
    zoneId: z.string().describe("State property key of the array to inspect."),
    action: z.enum(["peek", "search", "count"]).describe("The inspection operation to perform."),
    // peek params
    count: z.number().int().positive().optional().describe("(peek) How many cards to peek at."),
    from: z.enum(["top", "bottom"]).optional().default("top").describe("(peek) Which end to peek from. Default: top."),
    // search/count params
    filter: filterSchema.optional().describe("(search/count) Filter criteria: { key, op, value }."),
  }),
  handler: async (args) => {
    const session = await getSession(args.sessionId);
    const zone = session.state[args.zoneId];
    if (!Array.isArray(zone)) {
      throw new Error(`State key '${args.zoneId}' is not an array.`);
    }

    if (args.action === "peek") {
      if (!args.count) throw new Error("action='peek' requires a count.");
      const peeked = peekCards(zone, args.count, args.from ?? "top");
      return jsonResponse(peeked);
    }

    if (args.action === "search") {
      if (!args.filter) throw new Error("action='search' requires a filter.");
      validateFilterClause(args.filter as FilterClause);
      const results = searchArray(zone, args.filter as FilterClause);
      return jsonResponse({ matches: results.length, results });
    }

    // count
    let count: number;
    if (args.filter) {
      validateFilterClause(args.filter as FilterClause);
      count = zone.filter((item) => matchesFilter(item, args.filter as FilterClause)).length;
    } else {
      count = zone.length;
    }
    return jsonResponse({ zoneId: args.zoneId, count, filtered: !!args.filter });
  },
});

export const deckTools: ToolDefinition[] = [
  queryZoneTool,
];
