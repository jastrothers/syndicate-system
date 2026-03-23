import { sessionCoreTools } from "./core.js";
import { sessionEntitiesTools } from "./entities.js";
import { sessionHistoryTools } from "./history.js";
import { macroTools } from "./macro.js";
import { diceTools } from "./dice.js";
import { deleteSessionTool } from "./delete.js";
export const sessionTools = [
    ...sessionCoreTools,
    ...sessionEntitiesTools,
    ...sessionHistoryTools,
    ...macroTools,
    ...diceTools,
    deleteSessionTool,
];
