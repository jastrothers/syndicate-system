import { z } from "zod";
import { getSession, saveSession } from "../../services/SessionStore.js";
import { validateConstraint } from "../../services/ValidationService.js";
import { getRulebook } from "../../services/RulebookStore.js";
export const recordActionTool = {
    name: "record_action",
    description: "Logs a programmatic mechanical outcome to the session's action ledger.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        actionType: z.string().describe("The name/type of the action being performed."),
        actor: z.string().describe("The player or entity performing the action."),
        data: z.record(z.string(), z.unknown()).describe("Any mechanical payload data associated with the action."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        session.ledger.push({
            timestamp: new Date().toISOString(),
            actionType: args.actionType,
            actor: args.actor,
            data: args.data,
        });
        await saveSession(args.sessionId, session);
        return {
            content: [{ type: "text", text: `Action recorded successfully.` }],
        };
    },
};
export const getActionHistoryTool = {
    name: "get_action_history",
    description: "Retrieves the historical sequence of actions recorded in a session's ledger. Use limit and offset to page through long histories.",
    schema: z.object({
        sessionId: z.string().describe("The ID of the playtest session."),
        limit: z.number().int().positive().optional().describe("Maximum number of entries to return."),
        offset: z.number().int().nonnegative().optional().default(0).describe("Number of entries to skip before returning results. Default: 0."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const total = session.ledger.length;
        const offset = args.offset ?? 0;
        const items = args.limit !== undefined
            ? session.ledger.slice(offset, offset + args.limit)
            : session.ledger.slice(offset);
        return {
            content: [{ type: "text", text: JSON.stringify({ total, offset, count: items.length, items }, null, 2) }],
        };
    },
};
export const validateActionTool = {
    name: "validate_action",
    description: "Takes an action and compares it against constraint schemas defined inside the rulebook's rules.",
    schema: z.object({
        sessionId: z.string().describe("Session context."),
        actionData: z.record(z.string(), z.unknown()).describe("The action to validate."),
        rulePath: z.string().describe("The dot-notation path to the specific rule containing constraints."),
    }),
    handler: async (args) => {
        const session = await getSession(args.sessionId);
        const rulebook = await getRulebook(session.rulebookName, session.rulebookVersion);
        const parts = args.rulePath.split(".");
        let current = rulebook.sections;
        for (const part of parts) {
            if (!current || !current[part]) {
                throw new Error(`Section path '${args.rulePath}' not found.`);
            }
            current = part === parts[parts.length - 1] ? current[part] : current[part].subsections;
        }
        const result = validateConstraint({
            session,
            actionData: args.actionData,
            constraints: current.constraints,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    },
};
export const sessionHistoryTools = [
    recordActionTool,
    getActionHistoryTool,
    validateActionTool,
];
