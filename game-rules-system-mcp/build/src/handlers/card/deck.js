/**
 * cardHandlers.deck.ts
 * Phase 1 — Core Deck Primitives: peek, search, draw-with-reshuffle, insert.
 */
import { z } from "zod";
import { getSession, saveSession } from "../../services/SessionStore.js";
import { peekCards, searchArray, insertIntoArray, validateFilterClause, } from "../../services/DeckService.js";
export const peekAtDeckTool = {
    name: "peek_at_deck",
    description: "Look at top or bottom N cards of a deck array without moving them. Returns the peeked cards. Useful for scry, reveal, and information-gathering mechanics.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        deckId: z.string().describe("State property key of the deck array."),
        count: z.number().int().positive().describe("How many cards to peek at."),
        from: z
            .enum(["top", "bottom"])
            .optional()
            .default("top")
            .describe("Which end of the deck to peek from. Default: top."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const deck = session.state[args.deckId];
        if (!Array.isArray(deck)) {
            throw new Error(`State key '${args.deckId}' is not an array.`);
        }
        const peeked = peekCards(deck, args.count, args.from);
        session.ledger.push({
            timestamp: new Date().toISOString(),
            actionType: "peek_at_deck",
            actor: "System",
            data: {
                deckId: args.deckId,
                count: args.count,
                from: args.from,
                cardsReturned: peeked.length,
            },
        });
        await saveSession(args.sessionId, session);
        return {
            content: [{ type: "text", text: JSON.stringify(peeked, null, 2) }],
        };
    },
};
export const filterSchema = z.object({
    key: z.string().describe("The property name on card objects to filter by."),
    op: z.enum(["eq", "ne", "gt", "lt", "gte", "lte", "contains"]).describe("Comparison operator."),
    value: z.union([z.string(), z.number(), z.boolean()]).describe("The value to compare against."),
});
export const searchZoneTool = {
    name: "search_zone",
    description: "Query a state array for cards matching a filter. Returns matching items and their indices without moving any cards. Useful for tutoring, targeted selection, and information.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        zoneId: z.string().describe("State property key of the array to search."),
        filter: filterSchema.describe("Filter criteria: { key, op, value }."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const zone = session.state[args.zoneId];
        if (!Array.isArray(zone)) {
            throw new Error(`State key '${args.zoneId}' is not an array.`);
        }
        validateFilterClause(args.filter);
        const results = searchArray(zone, args.filter);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ matches: results.length, results }, null, 2),
                },
            ],
        };
    },
};
export const insertIntoDeckTool = {
    name: "insert_into_deck",
    description: 'Place cards at a specific position in a deck array. Supports "top", "bottom", or a numeric index. Useful for scry resolution, return-to-deck effects, and setup.',
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        deckId: z.string().describe("State key of the target deck array."),
        cards: z.array(z.record(z.unknown())).describe("Card objects or strings to insert."),
        position: z
            .union([z.enum(["top", "bottom"]), z.number().int().min(0)])
            .describe('Where to insert: "top", "bottom", or a numeric index.'),
        actor: z.string().describe("The player performing the action."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        if (!Array.isArray(session.state[args.deckId]))
            session.state[args.deckId] = [];
        insertIntoArray(session.state[args.deckId], args.cards, args.position);
        session.ledger.push({
            timestamp: new Date().toISOString(),
            actionType: "insert_into_deck",
            actor: args.actor,
            data: {
                deckId: args.deckId,
                count: args.cards.length,
                position: args.position,
            },
        });
        await saveSession(args.sessionId, session);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ inserted: args.cards.length, deckSize: session.state[args.deckId].length, deckId: args.deckId, position: args.position }, null, 2),
                },
            ],
        };
    },
};
export const deckTools = [
    peekAtDeckTool,
    searchZoneTool,
    insertIntoDeckTool,
];
