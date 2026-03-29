import { DecisionLog, DecisionEntry } from "../types/index.js";
import * as ProfileService from "./ProfileService.js";
import * as StorageService from "./StorageService.js";
import { getDecisionLogPath } from "../config/paths.js";

/**
 * NovaService orchestrates the interaction between the designer and specialist agents.
 * It encapsulates the Learn-Trace-Explain-Reason-Track loop.
 */

export async function processDecision(
  gameName: string, 
  sessionId: string, 
  stepId: number, 
  decision: "accept" | "reject" | "defer",
  rationale: string,
  impactedMechanisms: string[]
): Promise<void> {
  const logPath = getDecisionLogPath(gameName);
  let log: DecisionLog;
  
  try {
    log = await StorageService.readJson<DecisionLog>(logPath);
  } catch {
    log = { gameName, sessionId, decisions: [] };
  }
  
  const entry: DecisionEntry = {
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
  } else if (decision === "reject") {
    await ProfileService.updateAffinities(impactedMechanisms, -0.2); // Reject has higher weight
  }
}

