# Testing Architecture

This directory contains unit, integration, and end-to-end tests for the MCP server.

## Structure

```
tests/
├── unit/               # Pure function tests, no I/O
│   ├── config/
│   ├── handlers/
│   └── services/
├── integration/        # Multi-layer tests with MCP server
├── e2e/               # Full pipeline tests (game-gen, critique)
├── helpers/           # Shared test utilities
│   ├── setup.ts       # Global isolation + server spawning
│   ├── testUtils.ts   # Mock builders & assertions
│   └── testReporter.ts # Test metrics & reporting
├── harness/           # Snapshot & regression testing
│   ├── snapshots.ts   # Golden file testing
│   └── TraceReplay.ts # Nova loop trace analysis
├── fixtures/          # Test data, seeds, snapshots
│   ├── seeds/         # Database seeding helpers
│   ├── pipeline/      # Pre-built pipeline outputs
│   └── snapshots/     # Golden files for regression
└── validators/        # Contract/schema validators
```

## Running Tests

### All tests
```bash
npm test
```

### Unit tests only (fast)
```bash
npm run test:unit
```

### Integration tests
```bash
npm run test:integration
```

### E2E tests
```bash
npm run test:e2e
```

### With coverage
```bash
npm run test:coverage
```

### Watch mode (auto-rerun on save)
```bash
npm run test:watch
```

## Test Naming Conventions

Tests should follow this naming pattern:

```typescript
// ✅ GOOD
test("DeckService", async (t) => {
  await t.test("peekCards: peek top N cards returns unmodified deck", () => {
    // ...
  });

  await t.test("drawWithReshuffle: empty deck auto-reshuffles discard", () => {
    // ...
  });
});

// ❌ AVOID
test("deck stuff", async (t) => {
  await t.test("test 1", () => { });
  await t.test("should work correctly", () => { });
});
```

### Format
- **Unit tests**: `functionName: [scenario] [expected outcome]`
- **Integration tests**: `toolName: [user action] [integration boundary] [expected result]`
- **E2E tests**: `pipelineName: [input] → [phases] → [contract]`

### Tags

Use comment prefixes for test metadata:

```typescript
// [SLOW] - exceeds 100ms, runs in separate batch if needed
await t.test("[SLOW] parseRulebook: complex 50-section rulebook", () => { });

// [FLAKY] - unreliable, document the issue
await t.test("[FLAKY:INVESTIGATE] reference index rebuild timing", () => { });

// [SKIP] - temporarily disabled with reason
await t.test("[SKIP] Nova loop preference accumulation", () => { });
```

## Writing Tests

### Test Utilities

Use the helper functions in `helpers/testUtils.ts` to avoid boilerplate:

```typescript
import test from "node:test";
import assert from "node:assert";
import {
  createMockCard,
  createTestRulebook,
  assertRulebookStructure,
  assertSessionValid,
} from "../helpers/testUtils.js";

test("RulebookStore", async (t) => {
  await t.test("read_rule_section: returns valid RuleSection", () => {
    const rulebook = createTestRulebook("Test Game");
    assertRulebookStructure(rulebook);
    assert.ok(rulebook.sections.overview);
  });
});
```

### Seeding Test Data

For integration tests, seed game data using the helpers in `fixtures/seeds/`:

```typescript
import { seedGameData } from "../fixtures/seeds/seedTestDatabase.js";

test("Game Data Integration", async (t) => {
  const { rulebookPath, cleanup } = await seedGameData(
    tmpDir,
    "test-game",
    { includeSession: true }
  );
  t.after(() => cleanup());

  // Test uses seeded data
  const rulebook = await readRulebook(rulebookPath);
  assert.ok(rulebook);
});
```

### Snapshot Testing

For regression detection in complex outputs (e.g., generated games):

```typescript
import { updateSnapshotIfNeeded } from "../harness/snapshots.js";

test("Game Gen Pipeline", async (t) => {
  await t.test("game-gen: produces valid output contract", async () => {
    const output = await runGameGenPipeline(theme);
    await updateSnapshotIfNeeded(output, "game-gen-basic-theme");
  });
});
```

Update snapshots when intentional changes are made:
```bash
SNAPSHOT_UPDATE=1 npm test
```

## Performance & Reliability

### Slow Tests

Tests exceeding 100ms should be tagged and batched separately:

```typescript
// This takes ~500ms
await t.test("[SLOW] session state migration", async (t) => {
  // Bulk data operation
});
```

Check slow tests:
```bash
npm test 2>&1 | grep "SLOW"
```

### Flaky Tests

Document and prioritize fixes for unreliable tests:

```typescript
await t.test("[FLAKY] reference index concurrent writes", () => {
  // Known race condition under 5+ concurrent writers
  // TODO: Lock strategy for index sync
});
```

## Coverage & Quality

Coverage is tracked automatically with `npm run test:coverage`:

```bash
npm run test:coverage
```

Thresholds:
- Lines: ≥ 70%
- Functions: ≥ 65%
- Branches: ≥ 60%

## CI Integration

Tests run automatically on push and PR to `main`. See `.github/workflows/ci.yml` for details.

- Unit tests must pass
- New code requires test coverage
- Integration/E2E tests run on CI

## Debugging

### Run a single test file
```bash
node --import ./build/tests/helpers/setup.js --test build/tests/unit/services/DeckService.test.js
```

### Add console logging
Node's test runner suppresses output by default. Logs appear if the test fails.

### Use --test-reporter=spec for verbose output
```bash
node --test --test-reporter=spec build/tests/**/*.test.js
```

## Best Practices

1. **Isolate tests** — Don't depend on execution order. Use `t.before()` and `t.after()`.
2. **Keep tests small** — One assertion focus per test.
3. **Use descriptive names** — Someone should understand the test without reading the body.
4. **Don't test implementation** — Test contracts and observable behavior.
5. **Seed data explicitly** — Use `seedGameData()` instead of hardcoded fixtures.
6. **Clean up always** — Register `t.after()` callbacks to remove temp data.
