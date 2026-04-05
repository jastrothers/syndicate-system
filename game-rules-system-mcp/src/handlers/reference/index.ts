import { z } from "zod";
import * as fs from "fs/promises";
import * as ReferenceStore from "../../services/ReferenceStore.js";
import { getReferenceFilePath, sanitizeFileName } from "../../config/paths.js";
import { ToolDefinition } from "../types.js";
import { jsonResponse, textResponse } from "../response.js";
import { paginate } from "../pagination.js";

export const saveReferenceTool: ToolDefinition = {
  name: "save_reference",
  description: "Saves reusable game reference modules as Markdown files and indexes them. Supports batch mode via batch array to save multiple references in one call.",
  schema: z.object({
    name: z.string().optional().describe("The unique name of the reference. Required unless using batch mode."),
    game: z.string().optional().describe("Optional name of the game this reference belongs to."),
    version: z.string().optional().describe("Optional version of the game this reference is tied to."),
    type: z.string().optional().default("general").describe("The category/type of the reference (e.g., 'rule', 'template', 'deck')."),
    tags: z.array(z.string()).optional().default([]).describe("List of searchable tags."),
    content: z.string().optional().describe("The content of the reference in Markdown or JSON string. Required unless using batch mode."),
    batch: z.array(z.object({
      name: z.string(),
      game: z.string().optional(),
      version: z.string().optional(),
      type: z.string().optional().default("general"),
      tags: z.array(z.string()).optional().default([]),
      content: z.string(),
    })).optional().describe("Batch mode: save multiple references in one call."),
  }),
  handler: async (args) => {
    if (args.batch && args.batch.length > 0) {
      const items: ReferenceStore.BatchReferenceItem[] = args.batch.map((ref: { name: string; game?: string; version?: string; type: string; tags: string[]; content: string }) => ({
        name: ref.name,
        game: ref.game || args.game,
        version: ref.version || args.version,
        type: ref.type,
        tags: ref.tags,
        content: ref.content,
      }));
      await ReferenceStore.saveReferenceBatch(items);
      const names = items.map((i: ReferenceStore.BatchReferenceItem) => i.name);
      return jsonResponse({ saved: names.length, names });
    }

    if (!args.name || !args.content) {
      throw new Error("Either provide name+content for a single save, or a batch array.");
    }
    if (!sanitizeFileName(args.name)) {
      throw new Error(`Invalid reference name: '${args.name}'.`);
    }
    await ReferenceStore.saveReference(args.name, args.game, args.version, args.type, args.tags, args.content);
    return textResponse(`Successfully saved reference: ${args.name}`);
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
      const hint = args.game ? ` for game '${args.game}'` : "";
      const versionHint = args.version ? ` version '${args.version}'` : "";
      throw new Error(
        `Reference '${args.name}' not found${hint}${versionHint}. Try list_references to see available references, or check game/version filters.`
      );
    }
    return jsonResponse(ref);
  },
};

export const listReferencesTool: ToolDefinition = {
  name: "list_references",
  description: "Queries the reference index by type and/or tags. Returns metadata only (no content). Use get_reference for full content. Supports pagination.",
  schema: z.object({
    game: z.string().optional().describe("Filter by a specific game name."),
    version: z.string().optional().describe("Filter by a specific game version."),
    type: z.string().optional().describe("Filter by a specific reference type."),
    tags: z.array(z.string()).optional().describe("Filter by an array of necessary tags."),
    limit: z.number().int().positive().optional().describe("Maximum number of results to return."),
    offset: z.number().int().nonnegative().optional().default(0).describe("Number of results to skip. Default: 0."),
  }),
  handler: async (args) => {
    const allRefs = await ReferenceStore.queryReferences(args.game, args.version, args.type, args.tags);
    return jsonResponse(paginate(allRefs, args.offset, args.limit));
  },
};

export const rebuildReferenceIndexTool: ToolDefinition = {
  name: "rebuild_reference_index",
  description: "Forces a scan of the reference directory to rebuild the SQLite index. Useful if files were modified externally.",
  schema: z.object({}),
  handler: async () => {
    await ReferenceStore.rebuildIndex();
    return textResponse("Successfully rebuilt the reference index from the file system.");
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
      return textResponse(`Reference '${args.name}' has been soft-deleted (tombstoned) for game '${args.game}'.`);
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

    return jsonResponse({
      status: "success",
      message: `Reference '${args.name}' has been permanently deleted for game '${args.game}' (version: ${resolvedVersion}).`,
      deletedFile: filePath,
    });
  },
};

export const referenceTools = [
  saveReferenceTool,
  getReferenceTool,
  listReferencesTool,
  rebuildReferenceIndexTool,
  deleteReferenceTool,
];
