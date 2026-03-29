import { rulebookCoreTools } from "./core.js";
import { rulebookMarkdownTools } from "./markdown.js";
import { rulebookVersioningTools } from "./versioning.js";
import { rulebookSearchTools } from "./search.js";
import { componentTools } from "./components.js";

export const rulebookTools = [
  ...rulebookCoreTools,
  ...rulebookMarkdownTools,
  ...rulebookVersioningTools,
  ...rulebookSearchTools,
  ...componentTools,
];
