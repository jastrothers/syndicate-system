import { z } from "zod";
import { getRulebook, listRulebooks, listVersions, createVersion } from "../../services/RulebookStore.js";
export const listRulebooksTool = {
    name: "list_rulebooks",
    description: "Returns a list of all existing rulebooks in the data directory, including their available versions.",
    schema: z.object({}),
    handler: async () => {
        const names = await listRulebooks();
        const result = {};
        for (const name of names) {
            const versions = await listVersions(name);
            let latestInfo = null;
            try {
                const rb = await getRulebook(name);
                latestInfo = { title: rb.metadata.title, version: rb.metadata.version, lastUpdated: rb.metadata.lastUpdated };
            }
            catch { /* no latest */ }
            result[name] = { latest: latestInfo, versions: versions.map((v) => v.versionTag) };
        }
        return {
            content: [{ type: "text", text: JSON.stringify({ rulebooks: result }, null, 2) }],
        };
    },
};
export const listVersionsTool = {
    name: "list_versions",
    description: "Lists all version snapshots for a specific rulebook, with metadata for each version.",
    schema: z.object({
        rulebookName: z.string().describe("The name of the rulebook to list versions for."),
    }),
    handler: async (args) => {
        const versions = await listVersions(args.rulebookName);
        // Also include info about the current working copy (latest)
        let latest = null;
        try {
            const rb = await getRulebook(args.rulebookName);
            latest = { title: rb.metadata.title, version: rb.metadata.version, lastUpdated: rb.metadata.lastUpdated };
        }
        catch { /* no latest */ }
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ rulebookName: args.rulebookName, latest, versions }, null, 2),
                }],
        };
    },
};
export const createVersionTool = {
    name: "create_version",
    description: "Snapshots the current working rulebook as a named version. The working copy (latest) is preserved and can continue to be edited.",
    schema: z.object({
        rulebookName: z.string().describe("The name of the rulebook to snapshot."),
        versionTag: z.string().describe("The version tag for this snapshot (e.g., '1.0.0', 'playtest-3', 'alpha')."),
        description: z.string().optional().describe("Optional description of what this version represents."),
    }),
    handler: async (args) => {
        const versionInfo = await createVersion(args.rulebookName, args.versionTag, args.description);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ message: `Successfully created version '${versionInfo.versionTag}' for rulebook '${args.rulebookName}'.`, version: versionInfo }, null, 2),
                }],
        };
    },
};
export const rulebookVersioningTools = [
    listRulebooksTool,
    listVersionsTool,
    createVersionTool,
];
