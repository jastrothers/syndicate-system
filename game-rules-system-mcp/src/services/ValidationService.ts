import { PlaytestSession } from "../types/index.js";

export interface ValidationContext {
  session: PlaytestSession;
  actionData: Record<string, any>;
  constraints: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateConstraint(context: ValidationContext): ValidationResult {
  const { session, actionData, constraints } = context;
  const errors: string[] = [];

  if (!constraints) {
    return { valid: true, errors: [] };
  }

  for (const [key, rule] of Object.entries(constraints)) {
    if (rule === "required" && actionData[key] === undefined) {
      errors.push(`${key} is required.`);
    }
    if (typeof rule === "object" && rule !== null) {
      const r = rule as any;
      if (r.type === "max" && typeof actionData[key] === "number" && actionData[key] > r.value) {
        errors.push(`${key} exceeds maximum of ${r.value}`);
      }
      if (r.type === "state_max") {
        const stateVal = session.state[r.stateKey] || 0;
        if (typeof actionData[key] === "number" && actionData[key] > stateVal) {
          errors.push(`${key} exceeds state limit of ${stateVal} from ${r.stateKey}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
