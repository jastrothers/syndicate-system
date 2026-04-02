---
name: test-file
description: Build the MCP server and run tests for a specific test file by name (e.g. /test-file DeckService). Accepts a partial name and matches against build/tests/**/*.test.js.
disable-model-invocation: true
---

# Run a Specific Test File

Build `game-rules-system-mcp` and run the test file(s) matching the provided name argument.

## Steps

1. **Build**: Run `cd /c/Users/Julian/git/syndicate-system/game-rules-system-mcp && npm run build` and report any compile errors.

2. **Find test files**: Use Glob to search `game-rules-system-mcp/build/tests/**/*.test.js` for files whose basename includes the argument (case-insensitive).
   - If no matches: list all available test files so the user can pick.
   - If multiple matches: run all of them.

3. **Run**: For each matched file, run:
   ```bash
   cd /c/Users/Julian/git/syndicate-system/game-rules-system-mcp && node --import ./build/tests/helpers/setup.js --test <path-to-test-file>
   ```

4. **Report**: Summarize pass/fail counts and print any failure details (test name + error message).

## Example

```
/test-file DeckService
→ builds project
→ finds build/tests/unit/services/DeckService.test.js
→ runs it
→ reports: 12 passed, 0 failed
```
