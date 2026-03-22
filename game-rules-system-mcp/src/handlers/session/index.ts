import { sessionCoreTools } from "./core.js";
import { sessionEntitiesTools } from "./entities.js";
import { sessionHistoryTools } from "./history.js";
import { macroTools } from "./macro.js";

export const sessionTools = [
  ...sessionCoreTools,
  ...sessionEntitiesTools,
  ...sessionHistoryTools,
  ...macroTools,
];
