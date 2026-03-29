import { z } from "zod";
import { getComponents, upsertComponent, deleteComponent } from "../../services/ComponentStore.js";
import { defineTool } from "../types.js";
import { jsonResponse } from "../response.js";

const ComponentSchema = z.object({
  type: z.string().describe("Component type (e.g. 'card', 'token', 'die', 'board', 'tile')."),
  name: z.string().describe("Unique component name within this rulebook."),
  quantity: z.number().int().min(1).describe("Number of this component in the game."),
  description: z.string().optional().describe("Optional description of the component."),
  attributes: z.record(z.string(), z.unknown()).optional().describe("Optional key-value attributes."),
});

export const getRulebookComponentsTool = defineTool({
  name: "get_rulebook_components",
  description: "Returns the component inventory for a rulebook (cards, tokens, dice, boards, etc.).",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The rulebook to read components from. Defaults to 'rulebook'."),
    rulebookVersion: z.string().optional().describe("Optional version tag."),
  }),
  handler: async (args) => {
    const result = await getComponents(args.rulebookName, args.rulebookVersion);
    return jsonResponse(result);
  },
});

export const upsertComponentTool = defineTool({
  name: "upsert_component",
  description: "Adds a new component or replaces an existing one (matched by name) in the rulebook's component inventory.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The rulebook to update. Defaults to 'rulebook'."),
    component: ComponentSchema,
  }),
  handler: async (args) => {
    const result = await upsertComponent(args.rulebookName, args.component as any);
    return jsonResponse(result, "Next: compile_markdown_rulebook to sync the markdown file");
  },
});

export const deleteComponentTool = defineTool({
  name: "delete_component",
  description: "Removes a component by name from the rulebook's component inventory.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The rulebook to update. Defaults to 'rulebook'."),
    componentName: z.string().describe("The exact name of the component to delete."),
  }),
  handler: async (args) => {
    const result = await deleteComponent(args.rulebookName, args.componentName);
    return jsonResponse(result);
  },
});

export const componentTools = [getRulebookComponentsTool, upsertComponentTool, deleteComponentTool];
