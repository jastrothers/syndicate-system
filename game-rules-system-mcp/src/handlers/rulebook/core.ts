import { z } from "zod";
import { getRulebook, saveRulebook, getDraft, saveDraft, promoteDraft } from "../../services/RulebookStore.js";
import { extractStructure } from "../../services/MarkdownFormatter.js";
import { RuleSection } from "../../types/index.js";
import { defineTool, ToolDefinition } from "../types.js";
import { jsonResponse, textResponse } from "../response.js";


export const getRulebookStructureTool = defineTool({
  name: "get_rulebook_structure",
  description: "Returns the high-level outline and hierarchy of the rulebook without full text.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to read from. Defaults to 'rulebook'."),
    rulebookVersion: z.string().optional().describe("Optional version tag to read a specific snapshot instead of the current working copy."),
  }),
  handler: async (args) => {
    const rulebook = await getRulebook(args.rulebookName, args.rulebookVersion);
    const structure = extractStructure(rulebook.sections);
    return jsonResponse({ metadata: rulebook.metadata, structure });
  },
});

export const readRuleSectionTool = defineTool({
  name: "read_rule_section",
  description: "Returns the complete data for a specific rule section using a dot-notation path (e.g., 'combat.resolution').",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to read from. Defaults to 'rulebook'."),
    rulebookVersion: z.string().optional().describe("Optional version tag to read a specific snapshot instead of the current working copy."),
    path: z.string().describe("Dot-notation path to the section (e.g., 'setup.board')"),
  }),
  handler: async (args) => {
    const rulebook = await getRulebook(args.rulebookName, args.rulebookVersion);
    const parts = args.path.split(".");
    let current: Record<string, RuleSection> | RuleSection = rulebook.sections;

    for (const part of parts) {
      const asMap = current as Record<string, RuleSection>;
      if (!asMap || !asMap[part]) {
        const availableKeys = asMap ? Object.keys(asMap) : [];
        throw new Error(
          `Section path '${args.path}' not found at segment '${part}'. Available keys at this level: [${availableKeys.join(", ")}]`
        );
      }
      current = part === parts[parts.length - 1] ? asMap[part] : (asMap[part].subsections as Record<string, RuleSection>);
    }

    return jsonResponse(current);
  },
});

function applyRuleUpdate(sections: Record<string, RuleSection>, update: { path: string; title: string; content?: string; examples?: string[] }) {
  const parts = update.path.split(".");
  let currentMap = sections;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!currentMap[part]) {
      currentMap[part] = { title: part, subsections: {} };
    }
    if (!currentMap[part].subsections) {
      currentMap[part].subsections = {};
    }
    currentMap = currentMap[part].subsections as Record<string, RuleSection>;
  }

  const target = parts[parts.length - 1];
  const existing = currentMap[target] || {};

  currentMap[target] = {
    ...existing,
    title: update.title,
    ...(update.content !== undefined ? { content: update.content } : {}),
    ...(update.examples !== undefined ? { examples: update.examples } : {}),
  };
}

export const updateRuleTool = defineTool({
  name: "update_rule",
  description: "Adds or modifies rule sections. Creates intermediate sections if they don't exist. Supports batch mode via updates array to apply multiple changes in one save.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to update. Defaults to 'rulebook'."),
    path: z.string().optional().describe("Dot-notation path to update (e.g., 'combat.resolution'). Required unless using batch updates."),
    title: z.string().optional().describe("Title of the section. Required unless using batch updates."),
    content: z.string().optional().describe("Main rule text"),
    examples: z.array(z.string()).optional().describe("List of example strings"),
    isDraft: z.boolean().optional().default(false).describe("Whether to update the draft rulebook instead of the latest."),
    updates: z.array(z.object({
      path: z.string(),
      title: z.string(),
      content: z.string().optional(),
      examples: z.array(z.string()).optional(),
    })).optional().describe("Batch mode: provide multiple rule updates applied in one save. When provided, path/title are ignored."),
  }),
  handler: async (args) => {
    const rulebook = args.isDraft
      ? (await getDraft(args.rulebookName) || await getRulebook(args.rulebookName))
      : await getRulebook(args.rulebookName);

    if (args.updates && args.updates.length > 0) {
      for (const update of args.updates) {
        applyRuleUpdate(rulebook.sections, update);
      }
    } else if (args.path && args.title) {
      applyRuleUpdate(rulebook.sections, { path: args.path, title: args.title, content: args.content, examples: args.examples });
    } else {
      throw new Error("Either provide path+title for a single update, or an updates array for batch mode.");
    }

    if (args.isDraft) {
      await saveDraft(args.rulebookName, rulebook);
    } else {
      await saveRulebook(args.rulebookName, rulebook);
    }

    const updatedPaths = args.updates
      ? args.updates.map((u) => u.path)
      : [args.path];
    return jsonResponse(
      { updatedPaths, rulebookName: args.rulebookName, isDraft: args.isDraft },
      "Next: compile_markdown_rulebook to sync the markdown file"
    );
  },
});

export const manageDraftTool = defineTool({
  name: "manage_draft",
  description: "Manages the draft lifecycle for a rulebook. action='get' returns the current draft (or latest if none); action='save' saves a complete rulebook object as a draft without touching latest; action='promote' promotes the draft to latest.",
  schema: z.object({
    action: z.enum(["get", "save", "promote"]).describe("The draft operation to perform."),
    rulebookName: z.string().describe("The name of the rulebook."),
    rulebook: z.any().optional().describe("Required for action='save': the complete rulebook object to save as draft."),
  }),
  handler: async (args) => {
    if (args.action === "get") {
      const draft = await getDraft(args.rulebookName);
      const rulebook = draft || await getRulebook(args.rulebookName);
      return jsonResponse(rulebook);
    }
    if (args.action === "save") {
      if (!args.rulebook) throw new Error("action='save' requires a rulebook object.");
      await saveDraft(args.rulebookName, args.rulebook);
      return textResponse(`Successfully saved draft for rulebook: ${args.rulebookName}`);
    }
    // promote
    await promoteDraft(args.rulebookName);
    return textResponse(`Successfully promoted draft to latest for rulebook: ${args.rulebookName}`);
  },
});

export const deleteRuleTool = defineTool({
  name: "delete_rule",
  description: "Removes a specific rule section and all its nested subsections.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to delete from. Defaults to 'rulebook'."),
    path: z.string().describe("Dot-notation path to delete (e.g., 'combat.resolution')"),
  }),
  handler: async (args) => {
    const rulebook = await getRulebook(args.rulebookName);
    const parts = args.path.split(".");
    let currentMap = rulebook.sections;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!currentMap[part] || !currentMap[part].subsections) {
        throw new Error(`Path '${args.path}' does not exist.`);
      }
      currentMap = currentMap[part].subsections as Record<string, RuleSection>;
    }

    const target = parts[parts.length - 1];
    if (!currentMap[target]) {
      throw new Error(`Section '${target}' not found.`);
    }

    delete currentMap[target];
    await saveRulebook(args.rulebookName, rulebook);

    return textResponse(`Successfully deleted rule section: ${args.path} from rulebook: ${args.rulebookName}`);
  },
});

export const rulebookCoreTools: ToolDefinition[] = [
  getRulebookStructureTool,
  readRuleSectionTool,
  updateRuleTool,
  deleteRuleTool,
  manageDraftTool,
];
