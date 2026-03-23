import { z } from "zod";
import * as fs from "fs/promises";
import { createDesignSession, addDesignStep, getDesignSession, listDesignSessions } from "../../services/DesignStore.js";
import { getDesignSessionPath, sanitizeFileName } from "../../config/paths.js";
import { defineTool } from "../types.js";
import { jsonResponse, textResponse } from "../response.js";

function validateGameName(gameName: string): string {
  const safe = sanitizeFileName(gameName);
  if (!safe) throw new Error(`Invalid game name: '${gameName}'.`);
  return safe;
}

export const createDesignSessionTool = defineTool({
  name: "create_design_session",
  description: "Initializes a new board game design session in the MCP.",
  schema: z.object({
    gameName: z.string().describe("The name of the game being designed."),
    theme: z.string().describe("The core theme or high-level concept."),
  }),
  handler: async (args) => {
    validateGameName(args.gameName);
    const session = await createDesignSession(args.gameName, args.theme);
    return jsonResponse(session);
  },
});

export const addDesignStepTool = defineTool({
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
    validateGameName(args.gameName);
    await addDesignStep(args.gameName, args.sessionId, {
      stepNumber: args.stepNumber,
      persona: args.persona,
      output: args.output,
      summary: args.summary,
    });
    return textResponse(`Successfully logged step ${args.stepNumber} to design session: ${args.sessionId}`);
  },
});

export const getDesignSessionTool = defineTool({
  name: "get_design_session",
  description: "Retrieves the history of a design session. By default returns only step summaries to conserve context. Set includeFull: true to include complete step output.",
  schema: z.object({
    gameName: z.string().describe("The name of the game."),
    sessionId: z.string().describe("The design session ID."),
    includeFull: z.boolean().optional().default(false).describe("If true, includes the full output for each step. Default: false (summaries only)."),
    limit: z.number().int().positive().optional().describe("Maximum number of steps to return."),
    offset: z.number().int().nonnegative().optional().default(0).describe("Number of steps to skip. Default: 0."),
  }),
  handler: async (args) => {
    validateGameName(args.gameName);
    const session = await getDesignSession(args.gameName, args.sessionId);
    const total = session.steps.length;
    const offset = args.offset ?? 0;
    const sliced = args.limit !== undefined
      ? session.steps.slice(offset, offset + args.limit)
      : session.steps.slice(offset);
    const steps = args.includeFull
      ? sliced
      : sliced.map(({ output: _output, ...rest }) => rest);
    return jsonResponse({
      sessionId: session.sessionId,
      gameName: session.gameName,
      theme: session.theme,
      status: session.status,
      createdAt: session.createdAt,
      lastUpdatedAt: session.lastUpdatedAt,
      totalSteps: total,
      offset,
      count: steps.length,
      steps,
    });
  },
});

export const listDesignSessionsTool = defineTool({
  name: "list_design_sessions",
  description: "Lists all design sessions for a specific game.",
  schema: z.object({
    gameName: z.string().describe("The name of the game."),
  }),
  handler: async (args) => {
    validateGameName(args.gameName);
    const sessions = await listDesignSessions(args.gameName);
    return jsonResponse(sessions);
  },
});

export const deleteDesignSessionTool = defineTool({
  name: "delete_design_session",
  description: "Permanently deletes a design session JSON file for a game.",
  schema: z.object({
    gameName: z.string().describe("The name of the game the design session belongs to."),
    sessionId: z.string().describe("The design session ID to delete."),
    confirm: z.literal(true).describe("Must be explicitly set to true to confirm permanent deletion."),
  }),
  handler: async (args) => {
    validateGameName(args.gameName);
    const filePath = getDesignSessionPath(args.gameName, args.sessionId);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new Error(`Design session '${args.sessionId}' not found for game '${args.gameName}'.`);
      }
      throw err;
    }
    return textResponse(`Design session '${args.sessionId}' for game '${args.gameName}' has been permanently deleted.`);
  },
});

export const designCoreTools = [
  createDesignSessionTool,
  addDesignStepTool,
  getDesignSessionTool,
  listDesignSessionsTool,
  deleteDesignSessionTool,
];
