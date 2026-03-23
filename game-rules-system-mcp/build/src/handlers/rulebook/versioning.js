import { z } from "zod";
import * as fs from "fs/promises";
import { getRulebook, listRulebooks, listVersions, createVersion, invalidateVersionsCache } from "../../services/RulebookStore.js";
import { getRulebookPath, getRulebookMdPath } from "../../config/paths.js";
import { jsonResponse } from "../response.js";
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
        return jsonResponse({ rulebooks: result });
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
        return jsonResponse({ rulebookName: args.rulebookName, latest, versions });
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
        return jsonResponse({ message: `Successfully created version '${versionInfo.versionTag}' for rulebook '${args.rulebookName}'.`, version: versionInfo });
    },
};
export const deleteRulebookVersionTool = {
    name: "delete_rulebook_version",
    description: "Permanently deletes a versioned rulebook snapshot (e.g. v1.0.0). Cannot delete the 'latest' working copy.",
    schema: z.object({
        rulebookName: z.string().describe("The name of the rulebook."),
        versionTag: z.string().describe("The version tag to delete (e.g. '1.0.0'). Cannot be 'latest'."),
    }),
    handler: async (args) => {
        if (args.versionTag.toLowerCase() === "latest") {
            throw new Error("Cannot delete the 'latest' working copy. Use delete_game to remove all game data.");
        }
        const jsonPath = getRulebookPath(args.rulebookName, { versionTag: args.versionTag });
        const mdPath = getRulebookMdPath(args.rulebookName, args.versionTag);
        let deletedFiles = [];
        try {
            await fs.unlink(jsonPath);
            deletedFiles.push(jsonPath);
        }
        catch (err) {
            if (err.code === "ENOENT") {
                throw new Error(`Version '${args.versionTag}' of rulebook '${args.rulebookName}' not found.`);
            }
            throw err;
        }
        try {
            await fs.unlink(mdPath);
            deletedFiles.push(mdPath);
        }
        catch (err) {
            if (err.code !== "ENOENT")
                throw err;
        }
        invalidateVersionsCache(args.rulebookName);
        return jsonResponse({
            status: "success",
            message: `Version '${args.versionTag}' of rulebook '${args.rulebookName}' has been permanently deleted.`,
            deletedFiles,
        });
    },
};
export const rulebookVersioningTools = [
    listRulebooksTool,
    listVersionsTool,
    createVersionTool,
    deleteRulebookVersionTool,
];
