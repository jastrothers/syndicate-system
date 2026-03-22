/**
 * cardHandlers.deckBuilding.ts
 * Phase 3 — Deck Construction & Setup: create from template, validate construction.
 * Phase 4 — Quality of Life: count zone, reveal cards.
 */
import { z } from "zod";
import { getSession, saveSession } from "../../services/SessionStore.js";
import { shuffleArray, matchesFilter } from "../../services/DeckService.js";
import { filterSchema } from "./deck.js";
import * as crypto from "crypto";
export const createDeckFromTemplateTool = {
    name: "create_deck_from_template",
    description: "Generate a populated deck array in game state from a list of card definitions with quantities. Useful for setting up starter decks, markets, and supply piles at the start of a game.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        deckId: z
            .string()
            .describe("State key to write the generated deck array to."),
        cards: z
            .array(z.object({
            card: z
                .record(z.unknown())
                .describe("The card object or template."),
            count: z
                .number()
                .int()
                .positive()
                .describe("How many copies to include."),
        }))
            .describe("List of card templates with quantities."),
        shuffle: z
            .boolean()
            .optional()
            .default(true)
            .describe("Whether to shuffle the deck after creation. Default: true."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const deck = [];
        for (const entry of args.cards) {
            for (let i = 0; i < entry.count; i++) {
                deck.push(typeof entry.card === "object" && entry.card !== null
                    ? { id: crypto.randomUUID(), ...entry.card }
                    : entry.card);
            }
        }
        if (args.shuffle) {
            shuffleArray(deck);
        }
        session.state[args.deckId] = deck;
        session.ledger.push({
            timestamp: new Date().toISOString(),
            actionType: "create_deck_from_template",
            actor: "System",
            data: {
                deckId: args.deckId,
                totalCards: deck.length,
                uniqueCards: args.cards.length,
                shuffled: args.shuffle,
            },
        });
        await saveSession(args.sessionId, session);
        return {
            content: [
                {
                    type: "text",
                    text: `Created deck '${args.deckId}' with ${deck.length} cards (${args.cards.length} unique types).${args.shuffle ? " Deck shuffled." : ""}`,
                },
            ],
        };
    },
};
export const countZoneTool = {
    name: "count_zone",
    description: "Return the count of items in a state array, optionally filtered by criteria. Useful for checking pile sizes, hand counts, and conditional checks.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        zoneId: z.string().describe("State key of the array to count."),
        filter: filterSchema
            .optional()
            .describe("Optional filter to count only matching items."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const zone = session.state[args.zoneId];
        if (!Array.isArray(zone)) {
            throw new Error(`State key '${args.zoneId}' is not an array.`);
        }
        let count;
        if (args.filter) {
            count = zone.filter((item) => matchesFilter(item, args.filter)).length;
        }
        else {
            count = zone.length;
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ zoneId: args.zoneId, count, filtered: !!args.filter }, null, 2),
                },
            ],
        };
    },
};
export const revealCardsTool = {
    name: "reveal_cards",
    description: "Expose specific cards from any zone to the ledger without moving them. Creates a timestamped reveal entry in the action history for auditability.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        zoneId: z
            .string()
            .describe("State key of the zone containing the cards."),
        cardIds: z
            .array(z.string())
            .optional()
            .describe("Specific card ids/names to reveal. If omitted, reveals all cards in the zone."),
        actor: z.string().describe("The player revealing cards."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const zone = session.state[args.zoneId];
        if (!Array.isArray(zone)) {
            throw new Error(`State key '${args.zoneId}' is not an array.`);
        }
        let revealedCards;
        if (args.cardIds && args.cardIds.length > 0) {
            const idSet = new Set(args.cardIds);
            revealedCards = zone.filter((item) => idSet.has(item) ||
                (item && typeof item === "object" && (idSet.has(item.id) ||
                    idSet.has(item.name))));
        }
        else {
            revealedCards = [...zone];
        }
        session.ledger.push({
            timestamp: new Date().toISOString(),
            actionType: "reveal_cards",
            actor: args.actor,
            data: {
                zoneId: args.zoneId,
                revealedCount: revealedCards.length,
                cards: revealedCards,
            },
        });
        await saveSession(args.sessionId, session);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ revealed: revealedCards.length, cards: revealedCards }, null, 2),
                },
            ],
        };
    },
};
import { getReference } from "../../services/ReferenceStore.js";
export const createDeckFromReferenceTool = {
    name: "create_deck_from_reference",
    description: "Generate a populated deck array in game state by fetching a saved reference containing card templates. This backend parses the JSON array and avoids LLM context bloat.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        deckId: z.string().describe("State key to write the generated deck array to."),
        referenceName: z.string().describe("The name of the deck reference to fetch."),
        game: z.string().optional().describe("Optional game context constraint."),
        version: z.string().optional().describe("Optional version context constraint."),
        shuffle: z.boolean().optional().default(true).describe("Whether to shuffle the deck after creation. Default: true."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const ref = await getReference(args.referenceName, args.game, args.version);
        if (!ref) {
            throw new Error(`Reference '${args.referenceName}' not found.`);
        }
        let cards;
        try {
            cards = JSON.parse(ref.content);
            if (!Array.isArray(cards)) {
                throw new Error("Reference content is not a JSON array.");
            }
        }
        catch (e) {
            throw new Error(`Failed to parse reference '${args.referenceName}' content as JSON card array.`);
        }
        const deck = [];
        for (const entry of cards) {
            const count = entry.count || 1;
            for (let i = 0; i < count; i++) {
                deck.push(typeof entry.card === "object" && entry.card !== null
                    ? { id: crypto.randomUUID(), ...entry.card }
                    : entry.card);
            }
        }
        if (args.shuffle) {
            shuffleArray(deck);
        }
        session.state[args.deckId] = deck;
        session.ledger.push({
            timestamp: new Date().toISOString(),
            actionType: "create_deck_from_reference",
            actor: "System",
            data: {
                deckId: args.deckId,
                referenceName: args.referenceName,
                totalCards: deck.length,
                uniqueCards: cards.length,
                shuffled: args.shuffle,
            },
        });
        await saveSession(args.sessionId, session);
        return {
            content: [
                {
                    type: "text",
                    text: `Created deck '${args.deckId}' from reference '${args.referenceName}' with ${deck.length} cards (${cards.length} unique types).${args.shuffle ? " Deck shuffled." : ""}`,
                },
            ],
        };
    },
};
export const deckBuildingTools = [
    createDeckFromTemplateTool,
    createDeckFromReferenceTool,
    countZoneTool,
    revealCardsTool,
];
