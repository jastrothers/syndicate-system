import { getRulebook } from "./RulebookStore.js";
import { RuleSection } from "../types/index.js";

export interface RuleMatch {
  path: string;
  title: string;
  snippet: string;
}

export interface SearchResult {
  matches: RuleMatch[];
}

function flattenSections(
  sections: Record<string, RuleSection>,
  prefix = ""
): Array<{ path: string; title: string; content?: string }> {
  const result: Array<{ path: string; title: string; content?: string }> = [];
  for (const [key, section] of Object.entries(sections)) {
    const path = prefix ? `${prefix}.${key}` : key;
    result.push({ path, title: section.title, content: section.content });
    if (section.subsections && Object.keys(section.subsections).length > 0) {
      result.push(...flattenSections(section.subsections, path));
    }
  }
  return result;
}

/**
 * Full-text search across all rule section titles and content.
 * Returns matching paths, titles, and 200-char content snippets.
 */
export async function searchRuleSections(
  rulebookName: string,
  query: string,
  rulebookVersion?: string,
  limit = 20
): Promise<SearchResult> {
  const rulebook = await getRulebook(rulebookName, rulebookVersion);
  const allSections = flattenSections(rulebook.sections);
  const lowerQuery = query.toLowerCase();

  const matches: RuleMatch[] = [];
  for (const section of allSections) {
    if (matches.length >= limit) break;

    const titleMatch = section.title.toLowerCase().includes(lowerQuery);
    const contentMatch = section.content?.toLowerCase().includes(lowerQuery) ?? false;

    if (titleMatch || contentMatch) {
      const raw = section.content ?? "";
      const snippet = raw.length > 200 ? raw.slice(0, 197) + "..." : raw;
      matches.push({ path: section.path, title: section.title, snippet });
    }
  }

  return { matches };
}
