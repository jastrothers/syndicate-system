# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A strategic deckbuilding game system split into two domains:

- **The Foundry** (`syndicate-deckbuilder/`) — Theme-agnostic R&D for core mechanics (Market Churn, Tension Scaling, Wound mechanics).
- **The Vault** (`game-rules-system-mcp/`) — Executable MCP server with 30+ tools for rulebook management, playtest simulations, card mechanics, and design assistance. Active games: *Syndicate Heist* and *PokéNursery: Blissful Beginnings*.
- **Game Viewer** (`game-viewer/`) — Web UI to browse rulebooks, sessions, and design artifacts.
- **Game Data** (`game-data/`) — Persisted JSON rulebooks, Markdown references, session ledgers, and design docs. Structure: `game-data/[game]/rulebooks|reference|sessions|design/`.

## Terminal Commands (Windows)

This repo runs on Windows, but Claude Code's shell is **Bash** (not cmd). Use native bash syntax — do NOT use `cmd /c` wrappers, as they suppress output in this environment.

Do not create temporary `.js`, `.py`, or `.bat` files in root/source directories. Use the `temp/` directory and clean up immediately.

**CWD persists between Bash tool calls.** Use absolute Unix-style paths to avoid state issues:

```bash
# Correct: absolute path, native bash
cd /c/Users/Julian/git/syndicate-system/game-rules-system-mcp && npm run build

# Wrong: cmd /c suppresses all output
cmd /c npm run build
```

## Build & Test (game-rules-system-mcp)

```bash
cd /c/Users/Julian/git/syndicate-system/game-rules-system-mcp
npm install
npm run build        # tsc → build/
npm run dev          # watch mode (use run_in_background: true)
npm test             # Node.js built-in test runner (serial, no concurrency)
npm run build && npm test  # build then test
```

Tests live in `tests/unit/`, `tests/integration/`, and `tests/e2e/`. There is no external test framework — uses Node's built-in `assert` and test runner. No linting is configured.

To run a specific test file, compile it and invoke Node directly:
```bash
node --test build/tests/unit/services/DeckService.test.js
```

## Game Viewer

```bash
cd game-viewer
npm install
npm run dev          # Vite (port 3000) + Express API (port 3001) concurrently
npm run build        # Vite production build
npm run kill-dev     # Kill processes on ports 3000/3001
```

Frontend proxies `/api/*` to `localhost:3001`.

## Architecture

### MCP Server (`game-rules-system-mcp/src/`)

- **`index.ts`** — Entry point; registers all MCP tools and starts stdio transport.
- **`handlers/`** — Tool implementations grouped by domain: `rulebook/`, `session/`, `card/`, `reference/`, `game/`, `design/`, `nova/`.
- **`services/`** — Core business logic:
  - `RulebookStore.ts` — JSON rulebook CRUD
  - `ReferenceStore.ts` — Reference indexing (SQLite via `better-sqlite3`)
  - `SessionStore.ts` — Session state management
  - `DeckService.ts` — Pure deck mechanics (peek, search, insert, shuffle)
  - `DiceService.ts` — Deterministic dice rolling
  - `StorageService.ts` — Atomic file ops with `proper-lockfile`
  - `MarkdownFormatter.ts` — Compiles JSON rulebooks to Markdown
  - `ValidationService.ts` — Constraint checking
- **`config/paths.ts`** — All file path resolution helpers. Never hardcode `game-data/` paths in new code.
- **`types/index.ts`** — Shared TypeScript types and Zod schemas.

### Data Integrity Rules

**Rulebooks:** Modify `game-data/[game]/rulebooks/latest.json` first, then call `compile_markdown_rulebook` to sync Markdown. Use `update_rule` for granular changes rather than overwriting the whole file.

**References:** Stored as Markdown with YAML frontmatter. After any add/modify/delete in `game-data/[game]/reference/[version]/`, call `rebuild_reference_index` to update the SQLite index. To delete a reference, set `deleted: true` in frontmatter (tombstone) — do not hard-delete unless explicitly requested.

**Versioning:** Call `create_version` before major rulebook overhauls. Ensure a corresponding `reference/v[version]/` folder exists when releasing a new rulebook version.

**Sanitization:** Pass all game names and version tags through `sanitizeFileName` and `sanitizeVersionTag` from `paths.ts`.

## Development Philosophy

Approach tasks like John Carmack: explore and plan deeply before writing code, debug systematically with logs/isolation scripts, and build closed-loop systems that can be fully tested independently without requiring user feedback for each iteration. After data changes, run the relevant playtest script or validation to verify system integrity.

## Test-Driven Development

Always follow **Red → Green → Refactor**:

1. **Red** — Write a failing test that describes the exact expected behavior before writing any implementation.
2. **Green** — Write the minimum code needed to make the test pass.
3. **Refactor** — Clean up the implementation without breaking any tests.

For new MCP tools: write the unit test in `tests/unit/services/` first, confirm it fails (import not found or assertion fails), then implement the handler. For deletions: remove the test first, then remove the implementation.

## Nova Loop Pattern

The Nova loop is a 5-stage reinforcement learning pattern used across all design persona workflows to accumulate designer preference data over time:

1. **Learn** — Call `get_designer_profile` at session start to load known affinities.
2. **Trace** — Each specialist outputs a Trace Block: Observation → Data → Mechanism → Impact.
3. **Reason** — Surface three intervention levels: Values ("does this fit my vision?"), Structure ("is there a better mechanic?"), Tuning ("change the numbers?").
4. **Track** — Designer responds Accept / Reject / Defer. Call `record_decision` to log the RL signal.
5. **Compound** — Future proposals are weighted by the updated affinities in the profile.

MCP tools involved: `get_designer_profile`, `get_design_session`, `add_design_step`, `record_decision`.
