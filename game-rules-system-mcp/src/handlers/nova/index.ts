import { z } from "zod";
import * as NovaService from "../../services/NovaService.js";
import * as ProfileService from "../../services/ProfileService.js";
import { sanitizeFileName } from "../../config/paths.js";
import { jsonResponse, textResponse } from "../response.js";
import { defineTool } from "../types.js";

export const novaTools = [
  defineTool({
    name: "record_decision",
    description: "Records a designer's decision (accept/reject/defer) on a design step to fuel the learning loop.",
    schema: z.object({
      gameName: z.string(),
      sessionId: z.string(),
      stepId: z.number(),
      decision: z.enum(["accept", "reject", "defer"]),
      rationale: z.string(),
      impactedMechanisms: z.array(z.string()).describe("List of mechanism IDs targeted by this decision.")
    }),
    handler: async (args) => {
      const gameName = sanitizeFileName(args.gameName) || args.gameName;
      await NovaService.processDecision(
        gameName,
        args.sessionId,
        args.stepId,
        args.decision,
        args.rationale,
        args.impactedMechanisms
      );
      return textResponse(`Decision '${args.decision}' recorded and profile updated.`);
    }
  }),
  defineTool({
    name: "get_designer_profile",
    description: "Retrieves the global designer taste profile including mechanism affinities, complexity tolerance, and thematic preferences.",
    schema: z.object({}),
    handler: async () => {
      const profile = await ProfileService.getProfile();
      return jsonResponse(profile);
    }
  }),
  defineTool({
    name: "update_designer_profile",
    description: "Directly updates editorial profile fields: complexity tolerance (1-5 scale) and thematic preferences. Use this to record explicit designer preferences separate from the affinity learning loop.",
    schema: z.object({
      complexityTolerance: z.number().min(1).max(5).optional().describe("Complexity tolerance on a 1-5 scale."),
      thematicPreferences: z.array(z.string()).optional().describe("Replace the entire thematic preferences array."),
      addThematicPreference: z.string().optional().describe("Append a single thematic preference without replacing the array."),
    }),
    handler: async (args) => {
      const profile = await ProfileService.updateProfileFields({
        complexityTolerance: args.complexityTolerance,
        thematicPreferences: args.thematicPreferences,
        addThematicPreference: args.addThematicPreference,
      });
      return jsonResponse(profile);
    }
  }),
];
