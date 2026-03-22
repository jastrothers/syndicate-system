import { z } from "zod";
import { createDesignSession, addDesignStep, getDesignSession, listDesignSessions } from "../../services/DesignStore.js";
export const createDesignSessionTool = {
    name: "create_design_session",
    description: "Initializes a new board game design session in the MCP.",
    schema: z.object({
        gameName: z.string().describe("The name of the game being designed."),
        theme: z.string().describe("The core theme or high-level concept."),
    }),
    handler: async (args) => {
        const session = await createDesignSession(args.gameName, args.theme);
        return {
            content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
        };
    },
};
export const addDesignStepTool = {
    name: "add_design_step",
    description: "Logs a step in the design process (e.g., MechanicsArchitect output).",
    schema: z.object({
        gameName: z.string().describe("The name of the game."),
        sessionId: z.string().describe("The design session ID."),
        stepNumber: z.number().describe("The step sequence number."),
        persona: z.string().describe("The persona performing the step (e.g., 'MechanicsArchitect')."),
        output: z.string().describe("The full output/data from the step."),
        summary: z.string().describe("A concise summary of the step's result."),
    }),
    handler: async (args) => {
        const session = await addDesignStep(args.gameName, args.sessionId, {
            stepNumber: args.stepNumber,
            persona: args.persona,
            output: args.output,
            summary: args.summary,
        });
        return {
            content: [{ type: "text", text: `Successfully logged step ${args.stepNumber} to design session: ${args.sessionId}` }],
        };
    },
};
export const getDesignSessionTool = {
    name: "get_design_session",
    description: "Retrieves the full history of a design session.",
    schema: z.object({
        gameName: z.string().describe("The name of the game."),
        sessionId: z.string().describe("The design session ID."),
    }),
    handler: async (args) => {
        const session = await getDesignSession(args.gameName, args.sessionId);
        return {
            content: [{ type: "text", text: JSON.stringify(session, null, 2) }],
        };
    },
};
export const listDesignSessionsTool = {
    name: "list_design_sessions",
    description: "Lists all design sessions for a specific game.",
    schema: z.object({
        gameName: z.string().describe("The name of the game."),
    }),
    handler: async (args) => {
        const sessions = await listDesignSessions(args.gameName);
        return {
            content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
        };
    },
};
export const designCoreTools = [
    createDesignSessionTool,
    addDesignStepTool,
    getDesignSessionTool,
    listDesignSessionsTool,
];
