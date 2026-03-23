import { z } from "zod";
import * as fs from "fs/promises";
import { getRulebookMdPath } from "../../config/paths.js";
import { getRulebook } from "../../services/RulebookStore.js";
import { generateMarkdown } from "../../services/MarkdownFormatter.js";
import { textResponse } from "../response.js";
export const compileMarkdownTool = {
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
        return textResponse(`Successfully compiled Markdown rulebook to ${mdFile}`);
    },
};
export const getFullRulebookMarkdownTool = {
    name: "get_full_rulebook_markdown",
    description: "Returns the compiled rulebook in markdown text format. Can return 5K+ tokens for a full rulebook. Use section parameter for a specific section, or read_rule_section for structured JSON.",
    schema: z.object({
        rulebookName: z.string().optional().default("rulebook").describe("The rulebook name. Defaults to 'rulebook'."),
        rulebookVersion: z.string().optional().describe("Optional version tag to read a specific snapshot."),
        section: z.string().optional().describe("Dot-notation path to a specific section. If provided, returns only that section's markdown instead of the full rulebook."),
    }),
    handler: async (args) => {
        const rulebook = await getRulebook(args.rulebookName, args.rulebookVersion);
        if (args.section) {
            const parts = args.section.split(".");
            let current = rulebook.sections;
            for (const part of parts) {
                if (!current || !current[part]) {
                    const availableKeys = current ? Object.keys(current) : [];
                    throw new Error(`Section path '${args.section}' not found at segment '${part}'. Available keys: [${availableKeys.join(", ")}]`);
                }
                current = part === parts[parts.length - 1] ? current[part] : current[part].subsections;
            }
            const sectionObj = current;
            const sectionSections = { [parts[parts.length - 1]]: sectionObj };
            const md = generateMarkdown(sectionSections, 2);
            return textResponse(md);
        }
        let md = `# ${rulebook.metadata.title}\n\n`;
        md += `*Version: ${rulebook.metadata.version}*\n`;
        md += `*Last Updated: ${new Date(rulebook.metadata.lastUpdated).toLocaleString()}*\n\n`;
        md += `---\n\n`;
        md += generateMarkdown(rulebook.sections, 2);
        return textResponse(md);
    },
};
export const rulebookMarkdownTools = [
    compileMarkdownTool,
    getFullRulebookMarkdownTool,
];
