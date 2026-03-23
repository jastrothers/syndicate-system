import { z } from "zod";
import * as fs from "fs/promises";
import * as ReferenceStore from "../../services/ReferenceStore.js";
import { getReferenceFilePath } from "../../config/paths.js";
import { ToolDefinition } from "../types.js";

export const saveReferenceTool: ToolDefinition = {
  name: "save_reference",
  description: "Saves a reusable game reference module (e.g. standard rule, character archetype, deck) as a Markdown file and indexes it.",
  schema: z.object({
    name: z.string().describe("The unique name of the reference."),
    game: z.string().optional().describe("Optional name of the game this reference belongs to."),
    version: z.string().optional().describe("Optional version of the game this reference is tied to."),
    type: z.string().optional().default("general").describe("The category/type of the reference (e.g., 'rule', 'template', 'deck')."),
    tags: z.array(z.string()).optional().default([]).describe("List of searchable tags."),
    content: z.string().describe("The content of the reference in Markdown or JSON string."),
  }),
  handler: async (args) => {
    await ReferenceStore.saveReference(args.name, args.game, args.version, args.type, args.tags, args.content);
    return {
      content: [{ type: "text", text: `Successfully saved reference: ${args.name}` }],
    };
  },
};

export const getReferenceTool: ToolDefinition = {
  name: "get_reference",
  description: "Retrieves the full content and metadata of a saved game reference.",
  schema: z.object({
    name: z.string().describe("The name of the reference to retrieve."),
    game: z.string().optional().describe("Optional game context."),
    version: z.string().optional().describe("Optional version context.")
  }),
  handler: async (args) => {
    const ref = await ReferenceStore.getReference(args.name, args.game, args.version);
    if (!ref) {
      throw new Error(`Reference '${args.name}' not found.`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(ref, null, 2) }],
    };
  },
};

export const listReferencesTool: ToolDefinition = {
  name: "list_references",
  description: "Queries the reference index by type and/or tags to find matching reusable modules.",
  schema: z.object({
    game: z.string().optional().describe("Filter by a specific game name."),
    version: z.string().optional().describe("Filter by a specific game version."),
    type: z.string().optional().describe("Filter by a specific reference type."),
    tags: z.array(z.string()).optional().describe("Filter by an array of necessary tags."),
  }),
  handler: async (args) => {
    const refs = await ReferenceStore.queryReferences(args.game, args.version, args.type, args.tags);
    return {
      content: [{ type: "text", text: JSON.stringify(refs, null, 2) }],
    };
  },
};

export const rebuildReferenceIndexTool: ToolDefinition = {
  name: "rebuild_reference_index",
  description: "Forces a scan of the reference directory to rebuild the SQLite index. Useful if files were modified externally.",
  schema: z.object({}),
  handler: async () => {
    await ReferenceStore.rebuildIndex();
    return {
      content: [{ type: "text", text: "Successfully rebuilt the reference index from the file system." }],
    };
  },
};

export const deleteReferenceTool: ToolDefinition = {
  name: "delete_reference",
  description: "Deletes a reference. By default uses a tombstone (soft-delete, file kept but hidden). Pass hard: true to permanently delete the file and remove it from the index.",
  schema: z.object({
    name: z.string().describe("The name of the reference to delete."),
    game: z.string().describe("The game the reference belongs to."),
    version: z.string().optional().describe("The version of the reference (defaults to 'latest')."),
    hard: z.boolean().optional().default(false).describe("If true, permanently deletes the file and index entry. If false (default), tombstones the reference."),
  }),
  handler: async (args) => {
    if (!args.hard) {
      // Soft-delete: tombstone via saveReference
      const existing = await ReferenceStore.getReference(args.name, args.game, args.version);
      if (!existing) {
        throw new Error(`Reference '${args.name}' not found for game '${args.game}'.`);
      }
      await ReferenceStore.saveReference(args.name, args.game, args.version, existing.type, existing.tags, existing.content, true);
      return {
        content: [{ type: "text", text: `Reference '${args.name}' has been soft-deleted (tombstoned) for game '${args.game}'.` }],
      };
    }

    // Hard-delete: remove file and DB row
    const resolvedVersion = args.version || "latest";
    const filePath = getReferenceFilePath(args.name, args.game, resolvedVersion);

    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw new Error(`Reference file not found: ${filePath}`);
      }
      throw err;
    }

    // Remove from SQLite index
    await ReferenceStore.rebuildIndex();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "success",
          message: `Reference '${args.name}' has been permanently deleted for game '${args.game}' (version: ${resolvedVersion}).`,
          deletedFile: filePath,
        }, null, 2),
      }],
    };
  },
};

export const referenceTools = [
  saveReferenceTool,
  getReferenceTool,
  listReferencesTool,
  rebuildReferenceIndexTool,
  deleteReferenceTool,
];
