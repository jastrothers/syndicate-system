import type { DesignSession } from "../../src/types/index.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDesignSession(session: DesignSession): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required top-level fields
  if (!session.sessionId) errors.push("Missing sessionId");
  if (!session.gameName) errors.push("Missing gameName");
  if (!session.theme) errors.push("Missing theme");
  if (!Array.isArray(session.steps)) {
    errors.push("Missing or invalid steps array");
    return { valid: false, errors, warnings };
  }
  if (!["active", "completed", "archived"].includes(session.status)) {
    errors.push(`Invalid status: '${session.status}'`);
  }
  if (!session.createdAt) errors.push("Missing createdAt");
  if (!session.lastUpdatedAt) errors.push("Missing lastUpdatedAt");

  // Validate each step
  const seenStepNumbers = new Set<number>();
  for (let i = 0; i < session.steps.length; i++) {
    const step = session.steps[i];
    const prefix = `Step[${i}]`;

    if (typeof step.stepNumber !== "number") {
      errors.push(`${prefix}: stepNumber must be a number`);
    } else {
      if (seenStepNumbers.has(step.stepNumber)) {
        warnings.push(`${prefix}: duplicate stepNumber ${step.stepNumber}`);
      }
      seenStepNumbers.add(step.stepNumber);
    }

    if (!step.persona || typeof step.persona !== "string") {
      errors.push(`${prefix}: missing or invalid persona`);
    }

    if (!step.output || typeof step.output !== "string" || step.output.trim().length === 0) {
      errors.push(`${prefix}: output is empty or missing`);
    }

    if (!step.summary || typeof step.summary !== "string" || step.summary.trim().length === 0) {
      errors.push(`${prefix}: summary is empty or missing`);
    }

    if (!step.timestamp) {
      warnings.push(`${prefix}: missing timestamp`);
    }

    // Trace block: if present, all four fields must be populated
    if (step.trace !== undefined) {
      const t = step.trace;
      if (!t.observation || t.observation.trim().length === 0) errors.push(`${prefix}: trace.observation is empty`);
      if (!t.mechanism || t.mechanism.trim().length === 0) errors.push(`${prefix}: trace.mechanism is empty`);
      if (!t.impact || t.impact.trim().length === 0) errors.push(`${prefix}: trace.impact is empty`);
    }
  }

  // Steps should be in ascending order (allow equal for re-run phases)
  for (let i = 1; i < session.steps.length; i++) {
    if (session.steps[i].stepNumber < session.steps[i - 1].stepNumber) {
      warnings.push(`Steps are not in ascending order at index ${i} (${session.steps[i - 1].stepNumber} → ${session.steps[i].stepNumber})`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateDesignSessionHasSteps(session: DesignSession, expectedPersonas: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const foundPersonas = new Set(session.steps.map(s => s.persona));
  for (const persona of expectedPersonas) {
    if (!foundPersonas.has(persona)) {
      errors.push(`Missing expected step from persona: ${persona}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
