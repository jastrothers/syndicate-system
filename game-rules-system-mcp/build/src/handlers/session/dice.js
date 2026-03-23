import { z } from "zod";
import { parseAndRoll } from "../../services/DiceService.js";
import { getSession, saveSession } from "../../services/SessionStore.js";
import { jsonResponse } from "../response.js";
export const rollDiceTool = {
    name: "roll_dice",
    description: "Rolls dice using standard notation (e.g. '2d6', '1d20+5'). Supports deterministic rolls via an optional seed. When a sessionId is provided, the roll is logged to the session ledger.",
    schema: z.object({
        notation: z
            .string()
            .describe("Dice notation in XdY or XdY+Z format (e.g. '2d6', '1d20+5')."),
        seed: z
            .number()
            .int()
            .optional()
            .describe("Optional integer seed for deterministic/reproducible rolls."),
        sessionId: z
            .string()
            .optional()
            .describe("Optional session ID. If provided, the roll is logged to the session ledger."),
        actor: z
            .string()
            .optional()
            .default("System")
            .describe("The player or system performing the roll. Used in ledger entry."),
    }),
    handler: async (args) => {
        const result = parseAndRoll(args.notation, args.seed);
        if (args.sessionId) {
            const session = await getSession(args.sessionId);
            session.ledger.push({
                timestamp: new Date().toISOString(),
                actionType: "roll_dice",
                actor: args.actor,
                data: { notation: args.notation, seed: args.seed, ...result },
            });
            await saveSession(args.sessionId, session);
        }
        return jsonResponse(result);
    },
};
export const diceTools = [rollDiceTool];
