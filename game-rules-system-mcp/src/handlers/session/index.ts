import { sessionCoreTools } from "./core.js";
import { sessionEntitiesTools } from "./entities.js";
import { sessionHistoryTools } from "./history.js";
import { diceTools } from "./dice.js";
import { deleteSessionTool } from "./delete.js";
import { sessionStatsTools } from "./stats.js";

export const sessionTools = [
  ...sessionCoreTools,
  ...sessionEntitiesTools,
  ...sessionHistoryTools,
  ...diceTools,
  ...sessionStatsTools,
  deleteSessionTool,
];
