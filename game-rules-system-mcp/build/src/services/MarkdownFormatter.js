export function extractStructure(sections) {
    const structure = {};
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
export function generateMarkdown(sections, level = 1) {
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
