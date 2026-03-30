export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CritiqueScores {
  balanceScore?: number;
  funScore?: number;
  highIssueCount?: number;
  balanceVerdict?: string;
  funVerdict?: string;
}

/**
 * Extracts critique scores from BalanceCritic and FunFactorJudge step outputs.
 * Handles both the formal machine-parseable verdict block format and older
 * free-text formats from real pipeline runs.
 */
export function parseCritiqueScores(balanceOutput: string, funOutput: string): CritiqueScores {
  const scores: CritiqueScores = {};

  // --- Balance ---
  // Formal block: OVERALL_SCORE: 6/10 or OVERALL_SCORE: 6
  const balanceScoreMatch = balanceOutput.match(/OVERALL[_\s]SCORE[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i);
  if (balanceScoreMatch) {
    scores.balanceScore = parseFloat(balanceScoreMatch[1]);
  }

  // Formal verdict: VERDICT: PASS | CONDITIONAL_PASS | FAIL
  const balanceVerdictMatch = balanceOutput.match(/VERDICT[:\s]+(PASS|CONDITIONAL_PASS|FAIL|BROKEN[^\n]*)/i);
  if (balanceVerdictMatch) {
    scores.balanceVerdict = balanceVerdictMatch[1].trim();
  }

  // HIGH issue count: HIGH_ISSUES: 3 or (HIGH) occurrences
  const highBlockMatch = balanceOutput.match(/HIGH[_\s]ISSUES[:\s]+(\d+)/i);
  if (highBlockMatch) {
    scores.highIssueCount = parseInt(highBlockMatch[1], 10);
  } else {
    // Fall back to counting (HIGH) or "HIGH —" occurrences in findings
    const highMatches = balanceOutput.match(/\bHIGH\b/g);
    if (highMatches && highMatches.length > 0) {
      // Heuristic: number of HIGH occurrences minus header/summary references
      scores.highIssueCount = highMatches.length;
    }
  }

  // --- Fun ---
  // Formal block: OVERALL_FUN: 7 or Score: 8.5/10
  const funScoreMatch = funOutput.match(/(?:OVERALL[_\s]FUN|Score)[:\s]+(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i);
  if (funScoreMatch) {
    scores.funScore = parseFloat(funScoreMatch[1]);
  }

  // Formal verdict: VERDICT: EXCITING | SOLID | FLAT | TEDIOUS
  const funVerdictMatch = funOutput.match(/VERDICT[:\s]+(EXCITING|SOLID|FLAT|TEDIOUS)/i);
  if (funVerdictMatch) {
    scores.funVerdict = funVerdictMatch[1].toUpperCase();
  }

  return scores;
}

/**
 * Validates a BalanceCritic step output for structural completeness.
 */
export function validateBalanceReport(output: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!output || output.trim().length === 0) {
    errors.push("BalanceCritic output is empty");
    return { valid: false, errors, warnings };
  }

  // Must contain some indication of a verdict or assessment
  if (!/VERDICT|PASS|FAIL|CONDITIONAL|BROKEN|score/i.test(output)) {
    warnings.push("BalanceCritic output does not contain a recognizable verdict or score");
  }

  // Must reference at least one dimension
  const dimensions = ["Economy", "Tempo", "Interaction", "Scalability", "First.Player"];
  const foundDimensions = dimensions.filter(d => new RegExp(d, "i").test(output));
  if (foundDimensions.length === 0) {
    warnings.push("BalanceCritic output does not reference any of the 5 expected dimensions");
  }

  // Should have at least one FINDING or issue mention
  if (!/FINDING|issue|HIGH|MEDIUM|LOW/i.test(output)) {
    warnings.push("BalanceCritic output contains no findings or issues");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates a FunFactorJudge step output for structural completeness.
 */
export function validateFunReport(output: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!output || output.trim().length === 0) {
    errors.push("FunFactorJudge output is empty");
    return { valid: false, errors, warnings };
  }

  // Must contain a score or verdict
  if (!/score|verdict|fun|EXCITING|SOLID|FLAT|TEDIOUS|\d+\/10|\d+\s*out\s*of/i.test(output)) {
    warnings.push("FunFactorJudge output does not contain a recognizable score or verdict");
  }

  // Should reference at least one dimension
  const dimensions = ["Tension", "Agency", "Discovery", "Social", "Narrative", "Replayability"];
  const foundDimensions = dimensions.filter(d => new RegExp(d, "i").test(output));
  if (foundDimensions.length < 2) {
    warnings.push(`FunFactorJudge output only references ${foundDimensions.length} of 6 expected dimensions`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates that critique exit criteria are met (no blocking HIGH issues, fun score ≥ 7).
 */
export function validateCritiqueExitCriteria(scores: CritiqueScores): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (scores.funScore !== undefined && scores.funScore < 7) {
    errors.push(`Fun score ${scores.funScore}/10 is below the exit threshold of 7/10`);
  }

  if (scores.balanceVerdict !== undefined) {
    const blocking = /FAIL|BROKEN/i.test(scores.balanceVerdict);
    if (blocking) {
      errors.push(`Balance verdict '${scores.balanceVerdict}' is blocking — HIGH issues must be resolved before finalization`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
