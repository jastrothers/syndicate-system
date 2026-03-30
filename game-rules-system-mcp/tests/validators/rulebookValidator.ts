import type { Rulebook } from "../../src/types/index.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Sections expected after a full game-gen pipeline
const EXPECTED_SECTIONS = ["mechanics", "overview", "components", "setup", "turn-structure"];

export function validateRulebook(rulebook: Rulebook): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Metadata
  if (!rulebook.metadata) {
    errors.push("Missing metadata");
  } else {
    if (!rulebook.metadata.title) errors.push("metadata.title is empty or missing");
    if (!rulebook.metadata.version) errors.push("metadata.version is empty or missing");
    if (!rulebook.metadata.lastUpdated) errors.push("metadata.lastUpdated is empty or missing");
  }

  // Sections map
  if (!rulebook.sections || typeof rulebook.sections !== "object") {
    errors.push("Missing or invalid sections");
    return { valid: false, errors, warnings };
  }

  const sectionKeys = Object.keys(rulebook.sections);
  if (sectionKeys.length === 0) {
    errors.push("Rulebook has no sections");
    return { valid: false, errors, warnings };
  }

  // Check expected sections
  for (const key of EXPECTED_SECTIONS) {
    if (!rulebook.sections[key]) {
      warnings.push(`Expected section '${key}' not found`);
    }
  }

  // Each section must have title and non-empty content
  for (const [key, section] of Object.entries(rulebook.sections)) {
    if (!section.title) errors.push(`Section '${key}': missing title`);
    if (!section.content || section.content.trim().length === 0) {
      errors.push(`Section '${key}': content is empty`);
    }
  }

  // Components array (populated by ComponentDesigner and DetailsArchitect)
  if (rulebook.components !== undefined) {
    if (!Array.isArray(rulebook.components)) {
      errors.push("components must be an array");
    } else if (rulebook.components.length === 0) {
      warnings.push("components array is empty — expected at least one component after ComponentDesigner");
    } else {
      rulebook.components.forEach((c, i) => {
        if (!c.name) errors.push(`Component[${i}]: missing name`);
        if (!c.type) errors.push(`Component[${i}]: missing type`);
        if (typeof c.quantity !== "number" || c.quantity < 0) {
          errors.push(`Component[${i}]: quantity must be a non-negative number`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateRulebookHasSections(rulebook: Rulebook, requiredSections: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of requiredSections) {
    if (!rulebook.sections?.[key]) {
      errors.push(`Required section '${key}' not found in rulebook`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
