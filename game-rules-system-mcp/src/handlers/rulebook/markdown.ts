import { z } from "zod";
import * as fs from "fs/promises";
import { getRulebookMdPath } from "../../config/paths.js";
import { getRulebook } from "../../services/RulebookStore.js";
import { generateMarkdown } from "../../services/MarkdownFormatter.js";
import { ToolDefinition } from "../types.js";

export const compileMarkdownTool: ToolDefinition = {
  name: "compile_markdown_rulebook",
  description: "Compiles the entire JSON rulebook into a clean, readable Markdown file.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to compile. Defaults to 'rulebook'."),
    rulebookVersion: z.string().optional().describe("Optional version tag to compile a specific snapshot."),
  }),
  handler: async (args) => {
    const rulebook = await getRulebook(args.rulebookName, args.rulebookVersion);
    let md = `# ${rulebook.metadata.title}\n\n`;
    md += `*Version: ${rulebook.metadata.version}*\n`;
    md += `*Last Updated: ${new Date(rulebook.metadata.lastUpdated).toLocaleString()}*\n\n`;
    md += `---\n\n`;
    md += generateMarkdown(rulebook.sections, 2);

    const mdFile = getRulebookMdPath(args.rulebookName, args.rulebookVersion);
    await fs.writeFile(mdFile, md, "utf-8");
    return {
      content: [{ type: "text", text: `Successfully compiled Markdown rulebook to ${mdFile}` }],
    };
  },
};

export const getFullRulebookMarkdownTool: ToolDefinition = {
  name: "get_full_rulebook_markdown",
  description: "Returns the entirety of the compiled official rulebook in markdown text format.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The rulebook name. Defaults to 'rulebook'."),
    rulebookVersion: z.string().optional().describe("Optional version tag to read a specific snapshot."),
  }),
  handler: async (args) => {
    const rulebook = await getRulebook(args.rulebookName, args.rulebookVersion);
    let md = `# ${rulebook.metadata.title}\n\n`;
    md += `*Version: ${rulebook.metadata.version}*\n`;
    md += `*Last Updated: ${new Date(rulebook.metadata.lastUpdated).toLocaleString()}*\n\n`;
    md += `---\n\n`;
    md += generateMarkdown(rulebook.sections, 2);

    return {
      content: [{ type: "text", text: md }],
    };
  },
};

export const rulebookMarkdownTools = [
  compileMarkdownTool,
  getFullRulebookMarkdownTool,
];
