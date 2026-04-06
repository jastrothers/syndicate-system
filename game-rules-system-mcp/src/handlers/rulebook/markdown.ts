import { z } from "zod";
import * as fs from "fs/promises";
import { getRulebookMdPath } from "../../config/paths.js";
import { getRulebook } from "../../services/RulebookStore.js";
import { generateMarkdown } from "../../services/MarkdownFormatter.js";
import { ToolDefinition } from "../types.js";
import { textResponse } from "../response.js";
import { RuleSection } from "../../types/index.js";

export const compileMarkdownTool: ToolDefinition = {
  name: "compile_markdown_rulebook",
  description: "Compiles the entire JSON rulebook into Markdown. By default writes the file to disk and returns a success message. Pass returnOnly: true to receive the Markdown text without writing a file. Pass section (dot-notation path) to return only that section's Markdown.",
  schema: z.object({
    rulebookName: z.string().optional().default("rulebook").describe("The name of the rulebook to compile. Defaults to 'rulebook'."),
    rulebookVersion: z.string().optional().describe("Optional version tag to compile a specific snapshot."),
    returnOnly: z.boolean().optional().default(false).describe("If true, returns the Markdown text without writing it to disk. Default: false."),
    section: z.string().optional().describe("Dot-notation path to a specific section (e.g. 'combat.resolution'). If provided with returnOnly, returns only that section's Markdown."),
  }),
  handler: async (args) => {
    const rulebook = await getRulebook(args.rulebookName, args.rulebookVersion);

    if (args.section) {
      const parts = args.section.split(".");
      let current: any = rulebook.sections;
      for (const part of parts) {
        if (!current || !current[part]) {
          const availableKeys = current ? Object.keys(current) : [];
          throw new Error(
            `Section path '${args.section}' not found at segment '${part}'. Available keys: [${availableKeys.join(", ")}]`
          );
        }
        current = part === parts[parts.length - 1] ? current[part] : current[part].subsections;
      }
      const sectionObj = current as RuleSection;
      const sectionSections: Record<string, RuleSection> = { [parts[parts.length - 1]]: sectionObj };
      const md = generateMarkdown(sectionSections, 2);
      return textResponse(md);
    }

    const title = rulebook.metadata?.title || (rulebook as any).name || args.rulebookName || "Untitled";
    const version = rulebook.metadata?.version || "0.1.0";
    const lastUpdated = rulebook.metadata?.lastUpdated || new Date().toISOString();
    let md = `# ${title}\n\n`;
    md += `*Version: ${version}*\n`;
    md += `*Last Updated: ${new Date(lastUpdated).toLocaleString()}*\n\n`;
    md += `---\n\n`;
    // Filter out internal "metadata" section from visible output
    const visibleSections = Object.fromEntries(
      Object.entries(rulebook.sections).filter(([key]) => key !== "metadata")
    );
    md += generateMarkdown(visibleSections, 2);

    if (args.returnOnly) {
      return textResponse(md);
    }

    const mdFile = getRulebookMdPath(args.rulebookName, args.rulebookVersion);
    await fs.writeFile(mdFile, md, "utf-8");
    return textResponse(`Successfully compiled Markdown rulebook to ${mdFile}`);
  },
};

export const rulebookMarkdownTools = [
  compileMarkdownTool,
];
