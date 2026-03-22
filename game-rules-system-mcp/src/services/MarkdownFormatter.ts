import { RuleSection } from "../types/index.js";

/**
 * A recursive map of section keys to their title and optional nested subsections.
 * Used as the return type of extractStructure.
 */
export type StructureMap = Record<string, StructureEntry>;
type StructureEntry = { title: string; subsections?: StructureMap };

export function extractStructure(sections: Record<string, RuleSection>): StructureMap {
  const structure: StructureMap = {};
  for (const [key, section] of Object.entries(sections)) {
    structure[key] = {
      title: section.title,
    };
    if (section.subsections && Object.keys(section.subsections).length > 0) {
      structure[key].subsections = extractStructure(section.subsections);
    }
  }
  return structure;
}

export function generateMarkdown(sections: Record<string, RuleSection>, level: number = 1): string {
  let md = "";
  const headingPrefix = "#".repeat(Math.min(level, 6));

  for (const [, section] of Object.entries(sections)) {
    md += `${headingPrefix} ${section.title}\n\n`;
    
    if (section.content) {
      md += `${section.content}\n\n`;
    }
    
    if (section.examples && section.examples.length > 0) {
      md += `**Examples:**\n`;
      for (const ex of section.examples) {
        md += `- ${ex}\n`;
      }
      md += `\n`;
    }
    
    if (section.subsections && Object.keys(section.subsections).length > 0) {
      md += generateMarkdown(section.subsections, level + 1);
    }
  }
  return md;
}
