/**
 * Nova Loop trace replay utilities
 *
 * Enables deterministic replay of design decisions and mechanism evaluations
 */

import { DesignStep, DesignSession } from "../../src/types/index.js";

export interface ReplayContext {
  session: DesignSession;
  currentStep: number;
  decisions: Map<number, "accept" | "reject" | "defer">;
}

export interface TraceAnalysis {
  stepNumber: number;
  persona: string;
  mechanism: string;
  impact: string;
  confidence: number; // 0-1
}

/**
 * Extract trace data from design steps for analysis
 */
export function analyzeTraces(session: DesignSession): TraceAnalysis[] {
  return session.steps
    .filter((step): step is DesignStep & { trace: NonNullable<DesignStep["trace"]> } =>
      step.trace !== undefined && step.trace !== null
    )
    .map((step) => ({
      stepNumber: step.stepNumber,
      persona: step.persona,
      mechanism: step.trace.mechanism,
      impact: step.trace.impact,
      confidence: calculateConfidence(step.trace),
    }));
}

/**
 * Calculate confidence score based on trace quality
 */
function calculateConfidence(trace: NonNullable<DesignStep["trace"]>): number {
  const observation = trace.observation?.length || 0;
  const dataPoints = Object.keys(trace.data || {}).length;
  const impactLength = trace.impact?.length || 0;

  return Math.min(1.0, (observation + dataPoints + impactLength) / 50);
}

/**
 * Replay a sequence of decisions and verify outcomes
 */
export function replayDecisions(
  session: DesignSession,
  decisions: Record<number, "accept" | "reject" | "defer">
): ReplayContext {
  const decisionMap = new Map(Object.entries(decisions).map(([k, v]) => [Number(k), v]));

  return {
    session,
    currentStep: session.steps.length,
    decisions: decisionMap,
  };
}

/**
 * Summarize decision patterns (e.g., "always accepts complexity-related changes")
 */
export function summarizeNovaTendencies(
  context: ReplayContext
): Record<string, { accepts: number; rejects: number; defers: number }> {
  const mechanics = new Map<string, { accepts: number; rejects: number; defers: number }>();

  for (const [stepNum, decision] of context.decisions.entries()) {
    const step = context.session.steps.find((s) => s.stepNumber === stepNum);
    if (!step?.trace) continue;

    const mech = step.trace.mechanism;
    if (!mechanics.has(mech)) {
      mechanics.set(mech, { accepts: 0, rejects: 0, defers: 0 });
    }

    const stat = mechanics.get(mech)!;
    if (decision === "accept") stat.accepts++;
    else if (decision === "reject") stat.rejects++;
    else stat.defers++;
  }

  return Object.fromEntries(mechanics);
}
