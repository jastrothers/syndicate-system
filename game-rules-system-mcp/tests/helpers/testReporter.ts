/**
 * Test reporter enhancements for identifying slow, flaky, and skipped tests
 */

interface TestMetrics {
  passed: number;
  failed: number;
  skipped: number;
  slow: Array<{ name: string; duration: number }>;
  flaky: Array<{ name: string; attempts: number }>;
}

/**
 * Parse Node.js TAP output and extract test metrics
 */
export function parseTestOutput(output: string): TestMetrics {
  const metrics: TestMetrics = {
    passed: 0,
    failed: 0,
    skipped: 0,
    slow: [],
    flaky: [],
  };

  // Count test results
  const passMatch = output.match(/^ok /gm);
  const failMatch = output.match(/^not ok /gm);
  const skipMatch = output.match(/# SKIP/g);

  if (passMatch) metrics.passed = passMatch.length;
  if (failMatch) metrics.failed = failMatch.length;
  if (skipMatch) metrics.skipped = skipMatch.length;

  // Extract durations (in TAP, duration is in yaml block)
  const durationRegex = /duration_ms: (\d+)/g;
  let match;
  while ((match = durationRegex.exec(output)) !== null) {
    const duration = parseInt(match[1], 10);
    if (duration > 100) {
      metrics.slow.push({
        name: "test (slow)",
        duration,
      });
    }
  }

  return metrics;
}

/**
 * Generate a test quality report
 */
export function generateTestReport(metrics: TestMetrics): string {
  const total = metrics.passed + metrics.failed + metrics.skipped;
  const passRate = total > 0 ? ((metrics.passed / total) * 100).toFixed(1) : 0;

  let report = `
╔══════════════════════════════════════════════════════════════╗
║                    TEST EXECUTION REPORT                     ║
╚══════════════════════════════════════════════════════════════╝

Test Results:
  ✓ Passed:  ${metrics.passed}
  ✗ Failed:  ${metrics.failed}
  ⊘ Skipped: ${metrics.skipped}
  ─────────────
  Total:    ${total}
  Pass Rate: ${passRate}%
`;

  if (metrics.slow.length > 0) {
    report += `
Slow Tests (> 100ms):
${metrics.slow.slice(0, 5).map((t) => `  • ${t.name}: ${t.duration}ms`).join("\n")}
`;
  }

  if (metrics.flaky.length > 0) {
    report += `
Flaky Tests (multiple attempts):
${metrics.flaky.slice(0, 5).map((t) => `  • ${t.name}: ${t.attempts} attempts`).join("\n")}
`;
  }

  return report;
}

/**
 * Check if metrics meet quality thresholds
 */
export function meetsQualityThreshold(
  metrics: TestMetrics,
  minPassRate: number = 95
): boolean {
  const total = metrics.passed + metrics.failed + metrics.skipped;
  if (total === 0) return false;

  const passRate = (metrics.passed / total) * 100;
  return passRate >= minPassRate && metrics.failed === 0;
}
