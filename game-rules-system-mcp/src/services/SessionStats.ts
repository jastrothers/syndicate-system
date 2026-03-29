import { getSession } from "./SessionStore.js";
import { SessionStats } from "../types/index.js";

export async function getSessionStats(sessionId: string): Promise<SessionStats> {
  const session = await getSession(sessionId);

  const stateKeys = Object.keys(session.state);

  const ledgerByType: Record<string, number> = {};
  for (const entry of session.ledger) {
    ledgerByType[entry.actionType] = (ledgerByType[entry.actionType] ?? 0) + 1;
  }

  return {
    sessionId: session.sessionId,
    rulebookName: session.rulebookName,
    rulebookVersion: session.rulebookVersion,
    createdAt: session.createdAt,
    lastUpdatedAt: session.lastUpdatedAt,
    stateKeys,
    ledgerCount: session.ledger.length,
    ledgerByType,
  };
}
