import { z } from "zod";
import * as NovaService from "../../services/NovaService.js";
import * as ProfileService from "../../services/ProfileService.js";
import * as DesignStore from "../../services/DesignStore.js";
import { jsonResponse, textResponse } from "../response.js";
export const novaTools = [
    {
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
            await NovaService.processDecision(args.gameName, args.sessionId, args.stepId, args.decision, args.rationale, args.impactedMechanisms);
            return textResponse(`Decision '${args.decision}' recorded and profile updated.`);
        }
    },
    {
        name: "get_designer_profile",
        description: "Retrieves the global designer taste profile.",
        schema: z.object({}),
        handler: async () => {
            const profile = await ProfileService.getProfile();
            return jsonResponse(profile);
        }
    },
    {
        name: "synthesize_nova_advice",
        description: "Synthesizes a specialist agent's output into the Nova Trace-Explain-Reason format.",
        schema: z.object({
            gameName: z.string(),
            sessionId: z.string(),
            stepId: z.number()
        }),
        handler: async (args) => {
            const session = await DesignStore.getDesignSession(args.gameName, args.sessionId);
            const step = session.steps.find(s => s.stepNumber === args.stepId);
            if (!step) {
                throw new Error(`Step ${args.stepId} not found in session.`);
            }
            const profile = await ProfileService.getProfile();
            const response = NovaService.synthesizeNovaResponse(step, profile);
            return jsonResponse(response);
        }
    }
];
