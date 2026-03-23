import * as ProfileService from "./ProfileService.js";
import * as StorageService from "./StorageService.js";
import { getDecisionLogPath } from "../config/paths.js";
/**
 * NovaService orchestrates the interaction between the designer and specialist agents.
 * It encapsulates the Learn-Trace-Explain-Reason-Track loop.
 */
export async function processDecision(gameName, sessionId, stepId, decision, rationale, impactedMechanisms) {
    const logPath = getDecisionLogPath(gameName);
    let log;
    try {
        log = await StorageService.readJson(logPath);
    }
    catch {
        log = { gameName, sessionId, decisions: [] };
    }
    const entry = {
        stepId,
        decision,
        rationale,
        impactedMechanisms,
        timestamp: new Date().toISOString()
    };
    log.decisions.push(entry);
    await StorageService.saveJson(logPath, log);
    // Update Profile (Learn cycle)
    if (decision === "accept") {
        await ProfileService.updateAffinities(impactedMechanisms, 0.1);
    }
    else if (decision === "reject") {
        await ProfileService.updateAffinities(impactedMechanisms, -0.2); // Reject has higher weight
    }
}
export function synthesizeNovaResponse(step, profile) {
    const trace = step.trace;
    let designerContext;
    if (profile && Object.keys(profile.affinities).length > 0) {
        designerContext = {
            liked: Object.entries(profile.affinities)
                .filter(([, w]) => w >= 0.3)
                .sort(([, a], [, b]) => b - a)
                .map(([m]) => m),
            disliked: Object.entries(profile.affinities)
                .filter(([, w]) => w <= -0.3)
                .sort(([, a], [, b]) => a - b)
                .map(([m]) => m),
        };
    }
    return {
        conclusion: step.summary,
        reasoning: trace ?
            `**Observation:** ${trace.observation}\n**Data:** ${JSON.stringify(trace.data)}\n**Mechanism:** ${trace.mechanism}\n**Impact:** ${trace.impact}` :
            step.output,
        options: [
            {
                level: "Values",
                label: "Pivoting Strategy",
                description: "Change the core intent or design goal if this mechanism feels fundamentally wrong.",
                action: "REDEFINE_GOAL"
            },
            {
                level: "Structure",
                label: "Mechanical Alternate",
                description: "Swap this mechanism for a different one that achieves same goal but with different trade-offs.",
                action: "SWAP_MECHANISM"
            },
            {
                level: "Tuning",
                label: "Parameter Adjustment",
                description: "Keep the mechanism but tweak the numbers to resolve the specific issue.",
                action: "ADJUST_PARAMS"
            }
        ],
        ...(designerContext ? { designerContext } : {}),
    };
}
