---
name: validate-pipeline
description: Run the pipeline output validation harness (npm run validate) for game-rules-system-mcp. Use after any game data changes, pipeline runs, or design session modifications to verify system integrity.
---

# Validate Pipeline Output

Run the pipeline validation harness against current game data state.

## Steps

1. **Run validation**:
   ```bash
   cd /c/Users/Julian/git/syndicate-system/game-rules-system-mcp && npm run validate
   ```

2. **Report**:
   - If all checks pass: confirm success
   - If any checks fail: surface the specific failures with their output and suggest which MCP tool or data fix would resolve each one

## When to use

Run this proactively after:
- A game-gen or game-gen-step pipeline completes
- A design session makes structural changes to a rulebook
- A `create_version` or `promote_draft` call
- Any bulk update to game-data files
