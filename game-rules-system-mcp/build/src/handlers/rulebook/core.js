import { z } from "zod";
import { getRulebook, saveRulebook, getDraft, saveDraft, promoteDraft } from "../../services/RulebookStore.js";
import { extractStructure } from "../../services/MarkdownFormatter.js";
/**
 * Flattens a sections tree into a map of dot-notation path → {title, content}.
 */
function flattenSections(sections, prefix = "") {
    const result = {};
    for (const [key, section] of Object.entries(sections)) {
        const path = prefix ? `${prefix}.${key}` : key;
        result[path] = { title: section.title, content: section.content };
        if (section.subsections && Object.keys(section.subsections).length > 0) {
            Object.assign(result, flattenSections(section.subsections, path));
        }
    }
    return result;
}
export const compareRulebooksTool = {
    name: "compare_rulebooks",
    description: "Compares two rulebooks and returns the differences in their structures and content. Can compare different games or different versions of the same game.",
    schema: z.object({
        baseRulebook: z.string().describe("The name of the base rulebook to compare from"),
        baseVersion: z.string().optional().describe("Optional version tag of the base rulebook. Defaults to the current working copy."),
        targetRulebook: z.string().describe("The name of the target rulebook to compare against"),
        targetVersion: z.string().optional().describe("Optional version tag of the target rulebook. Defaults to the current working copy."),
    }),
    handler: async (args) => {
        const base = await getRulebook(args.baseRulebook, args.baseVersion);
        const target = await getRulebook(args.targetRulebook, args.targetVersion);
        const baseSections = flattenSections(base.sections);
        const targetSections = flattenSections(target.sections);
        const allPaths = new Set([...Object.keys(baseSections), ...Object.keys(targetSections)]);
        const added = [];
        const removed = [];
        const modified = [];
        const unchanged = [];
        for (const p of allPaths) {
            const inBase = p in baseSections;
            const inTarget = p in targetSections;
            if (!inBase) {
                added.push(p);
            }
            else if (!inTarget) {
                removed.push(p);
            }
            else {
                const b = baseSections[p];
                const t = targetSections[p];
                if (b.title !== t.title || b.content !== t.content) {
                    modified.push({ path: p, baseTitle: b.title, targetTitle: t.title, contentChanged: b.content !== t.content });
                }
                else {
                    unchanged.push(p);
                }
            }
        }
        const comparison = {
            baseRulebook: {
                name: args.baseRulebook,
                version: base.metadata.version,
                versionTag: args.baseVersion || "latest",
                lastUpdated: base.metadata.lastUpdated,
            },
            targetRulebook: {
                name: args.targetRulebook,
                version: target.metadata.version,
                versionTag: args.targetVersion || "latest",
                lastUpdated: target.metadata.lastUpdated,
            },
            summary: {
                totalSections: allPaths.size,
                added: added.length,
                removed: removed.length,
                modified: modified.length,
                unchanged: unchanged.length,
            },
            differences: { added, removed, modified },
        };
        return {
            content: [{ type: "text", text: JSON.stringify(comparison, null, 2) }],
        };
    },
};
export const getRulebookStructureTool = {
    name: "get_rulebook_structure",
    description: "Returns the high-level outline and hierarchy of the rulebook without full text.",
    schema: z.object({
        rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to read from. Defaults to 'rulebook'."),
        rulebookVersion: z.string().optional().describe("Optional version tag to read a specific snapshot instead of the current working copy."),
    }),
    handler: async (args) => {
        const rulebook = await getRulebook(args.rulebookName, args.rulebookVersion);
        const structure = extractStructure(rulebook.sections);
        return {
            content: [{ type: "text", text: JSON.stringify({ metadata: rulebook.metadata, structure }, null, 2) }],
        };
    },
};
export const readRuleSectionTool = {
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
        let current = rulebook.sections;
        for (const part of parts) {
            if (!current || !current[part]) {
                const availableKeys = current ? Object.keys(current) : [];
                throw new Error(`Section path '${args.path}' not found at segment '${part}'. Available keys at this level: [${availableKeys.join(", ")}]`);
            }
            current = part === parts[parts.length - 1] ? current[part] : current[part].subsections;
        }
        return {
            content: [{ type: "text", text: JSON.stringify(current, null, 2) }],
        };
    },
};
export const updateRuleTool = {
    name: "update_rule",
    description: "Adds or modifies a specific rule section. Creates intermediate sections if they don't exist.",
    schema: z.object({
        rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to update. Defaults to 'rulebook'."),
        path: z.string().describe("Dot-notation path to update (e.g., 'combat.resolution')"),
        title: z.string().describe("Title of the section"),
        content: z.string().optional().describe("Main rule text"),
        examples: z.array(z.string()).optional().describe("List of example strings"),
        isDraft: z.boolean().optional().default(false).describe("Whether to update the draft rulebook instead of the latest."),
    }),
    handler: async (args) => {
        const rulebook = args.isDraft
            ? (await getDraft(args.rulebookName) || await getRulebook(args.rulebookName))
            : await getRulebook(args.rulebookName);
        const parts = args.path.split(".");
        let currentMap = rulebook.sections;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!currentMap[part]) {
                currentMap[part] = { title: part, subsections: {} };
            }
            if (!currentMap[part].subsections) {
                currentMap[part].subsections = {};
            }
            currentMap = currentMap[part].subsections;
        }
        const target = parts[parts.length - 1];
        const existing = currentMap[target] || {};
        currentMap[target] = {
            ...existing,
            title: args.title,
            ...(args.content !== undefined ? { content: args.content } : {}),
            ...(args.examples !== undefined ? { examples: args.examples } : {}),
        };
        if (args.isDraft) {
            await saveDraft(args.rulebookName, rulebook);
        }
        else {
            await saveRulebook(args.rulebookName, rulebook);
        }
        return {
            content: [{ type: "text", text: `Successfully updated rule section: ${args.path} in rulebook: ${args.rulebookName}${args.isDraft ? " (DRAFT)" : ""}` }],
        };
    },
};
export const getDraftTool = {
    name: "get_draft",
    description: "Returns the current draft rulebook for a game. Returns latest if no draft exists.",
    schema: z.object({
        rulebookName: z.string().describe("The name of the rulebook to get the draft for."),
    }),
    handler: async (args) => {
        const draft = await getDraft(args.rulebookName);
        const rulebook = draft || await getRulebook(args.rulebookName);
        return {
            content: [{ type: "text", text: JSON.stringify(rulebook, null, 2) }],
        };
    },
};
export const saveDraftTool = {
    name: "save_draft",
    description: "Saves a rulebook as a draft without overwriting the latest version.",
    schema: z.object({
        rulebookName: z.string().describe("The name of the rulebook to save as a draft."),
        rulebook: z.any().describe("The complete rulebook object to save."),
    }),
    handler: async (args) => {
        await saveDraft(args.rulebookName, args.rulebook);
        return {
            content: [{ type: "text", text: `Successfully saved draft for rulebook: ${args.rulebookName}` }],
        };
    },
};
export const promoteDraftTool = {
    name: "promote_draft",
    description: "Promotes the current draft rulebook to the latest version, overwriting it.",
    schema: z.object({
        rulebookName: z.string().describe("The name of the rulebook to promote."),
    }),
    handler: async (args) => {
        await promoteDraft(args.rulebookName);
        return {
            content: [{ type: "text", text: `Successfully promoted draft to latest for rulebook: ${args.rulebookName}` }],
        };
    },
};
export const deleteRuleTool = {
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
            currentMap = currentMap[part].subsections;
        }
        const target = parts[parts.length - 1];
        if (!currentMap[target]) {
            throw new Error(`Section '${target}' not found.`);
        }
        delete currentMap[target];
        await saveRulebook(args.rulebookName, rulebook);
        return {
            content: [{ type: "text", text: `Successfully deleted rule section: ${args.path} from rulebook: ${args.rulebookName}` }],
        };
    },
};
export const rulebookCoreTools = [
    compareRulebooksTool,
    getRulebookStructureTool,
    readRuleSectionTool,
    updateRuleTool,
    deleteRuleTool,
    getDraftTool,
    saveDraftTool,
    promoteDraftTool,
];
