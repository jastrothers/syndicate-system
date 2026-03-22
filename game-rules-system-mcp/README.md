# Rulebook & Playtesting MCP Server

This tool is a Model Context Protocol (MCP) server designed for AI agents to act as **board game developers and playtesters**. It provides a structured way to iteratively build a living ruleset, execute simulated games, manage game state, and validate mechanical constraints.

## Overview

The server operates in two distinct but interconnected modes:

1. **Rulebook CMS**: A headless content management system for board game rules. It allows an AI to iteratively write, update, compare, and compile structured game rules into a final official Markdown document.
2. **Playtesting Simulation Engine**: An environment for executing isolated playtest sessions. It provides tools for state management, component handling (decks, moving entities), deterministic randomness (dice rolling), and an event ledger to record every action taken during a simulation.

All game data is persisted locally to a `game-data` folder.

## Data & Script Integrity

To ensure consistency and accuracy when updating rulebooks, references, or scripts, this project follows a strict set of rules defined in [.agents/rules/mcp-consistency.md](../.agents/rules/mcp-consistency.md).

**Key Principles:**

- **Sync Markdown**: Always run `compile_markdown_rulebook` after editing JSON rules.
- **Rebuild Index**: Always run `rebuild_reference_index` after editing reference Markdown files.
- **Audit Scripts**: Update playtest scripts in `/scripts` (including `/scripts/tools`) when mechanics or data schemas change.
- **Use Path Helpers**: Rely on `src/config/paths.ts` for all file resolutions to maintain portability.
- **Centralized I/O**: All file operations use `StorageService.ts` for consistent locking and directory management.

## Companion Tools: Game Viewer

The repository includes a **Game Viewer** companion application (located in `/game-viewer`). This Vite-based web app provides a visual interface for:

- Browsing all rulebooks and their version history.
- Inspecting active playtest sessions and their state/ledger, grouped by game and version.
- Viewing the complete reference library organized by game with the nested `[game]/[version]/` structure.
- Running structural validation checks across all stored data.

### Running the Game Viewer

```bash
cd ../game-viewer
npm install
npm run dev
```

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- TypeScript

### Installation & Execution

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Start the server (stdio transport)
npm start
```

## Available MCP Tools

### Rulebook Management Tools

These tools let an AI iteratively edit and retrieve a living document of game mechanics.

- **`list_rulebooks`**: Returns a list of all existing rulebooks in the data directory.
- **`compare_rulebooks`**: Compares two rulebooks (or two versions of the same rulebook) and returns structural differences.
- **`get_rulebook_structure`**: Returns a high-level table of contents and hierarchy for a rulebook.
- **`read_rule_section`**: Reads the complete data, constraints, and text rules for a specific node (e.g. `combat.resolution`).
- **`update_rule`**: Adds or modifies a rule section, creating intermediate sections if they don't exist.
- **`delete_rule`**: Removes a specific rule section and all its nested subsections.
- **`compile_markdown_rulebook`**: Compiles the entire JSON rulebook into a clean, readable Markdown file on disk.
- **`get_full_rulebook_markdown`**: Returns the complete compiled official rulebook in markdown text format to the AI's context.

### Rulebook Versioning Tools

- **`create_version`**: Snapshots the current working rulebook as a named version (e.g. `1.0.0`). The working copy is preserved and can continue to be edited.
- **`list_versions`**: Lists all version snapshots for a specific rulebook, with metadata for each.

### Playtest Simulation Tools

These tools allow the AI to instantiate a "tabletop" state and run a game. All mechanical actions are inherently recorded in an immutable ledger for review.

- **`create_session`**: Initializes an empty stateful playtest session tied to a specific rulebook (optionally pinned to a version).
- **`get_game_state`**: Retrieves the current JSON state of the session (tracking resources, boards, deck arrays, etc.).
- **`update_game_state`**: Applies a JSON patch to iteratively update the game state tracking.
- **`log_playtest_note`**: Appends human-readable playtest observations, balance issues, or notes to a log file.
- **`record_action`**: Manually logs a programmatic mechanical outcome to the session's ledger.
- **`get_action_history`**: Retrieves all actions taken historically within a session for replayability or review.

### Component Handling & Core Mechanics

- **`draw_from_deck`**: Moves a number of components from a "deck" array to a "hand" array in the game state.
- **`shuffle_deck`**: Randomizes the order of an array in the game state (Fisher-Yates).
- **`move_entity`**: Plucks an entity from one array in the state and moves it to another.
- **`validate_action`**: Compares a proposed action against constraint schemas embedded in the rulebook, preventing illegal moves.

### Card & Deckbuilding Mechanics

These tools support the full range of card game and deckbuilding patterns, from scrying and tutoring to market economies and deck construction validation. *Note: Advanced prescriptive mechanics like atomic buys and trade rows should be executed via standard sandboxed Javascript Macros.*

- **`peek_at_deck`**: Look at top or bottom N cards of a deck without moving them. Supports scry, reveal, and tutoring mechanics.
- **`search_zone`**: Query any state array for cards matching a property filter (`eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `contains`). Returns matching items and their indices.
- **`insert_into_deck`**: Places cards at a specific position in a deck array — `"top"`, `"bottom"`, or a numeric index. Supports scry resolution and return-to-deck effects.
- **`create_deck_from_template`**: Generates a populated deck array in game state from a list of card definitions with quantities. Used for setting up starter decks, supply piles, and markets.
- **`create_deck_from_reference`**: Generates a deck directly from a saved reference avoiding LLM context limits.
- **`count_zone`**: Returns the count of items in a state array, optionally filtered by a property criterion.
- **`reveal_cards`**: Exposes specific cards from any zone to the action ledger without moving them. Creates an auditable reveal event in the session history.

### Reference Library Tools

Reusable game modules — keywords, archetypes, standard mechanics — stored as indexed Markdown files.

The server implements a **Multi-Layered Fallback Strategy** for querying references:

1. **Exact Match**: Tries to find the reference matching the specific `game`, `version`, and `id`.
2. **Game Latest**: If the version is not found, it falls back to the `latest` version for that specific `game`.
3. **Global Default**: If still not found, it falls back to `game: general` and `version: latest`.

**Directory Structure:** `game-data/references/[game]/[version]/[id].md`

- **`save_reference`**: Saves a reusable game reference module. Supports **Tombstoning** (set `deleted: true` in metadata) to soft-delete references while maintaining history.
- **`get_reference`**: Retrieves the full content and metadata, respecting the fallback logic and tombstones.
- **`list_references`**: Queries the index by type and/or tags, returning a merged view based on the fallback hierarchy.
- **`rebuild_reference_index`**: Forces a scan of the reference directory to rebuild the SQLite index.

## Architecture

- **State**: Game state is arbitrarily defined by the AI via shallow patches (`update_game_state`).
- **Logging**: Every time mechanical tools are called, the server automatically appends an event to the session ledger.
- **Validation**: Using `validate_action`, an agent can ensure its planned moves abide by hardcoded mechanical restrictions before actually applying patches to the state.
- **Storage**: A centralized `StorageService` handles atomic file writes with advisory locking to prevent data corruption during concurrent operations.
- **Deck Logic**: A dedicated `DeckService` provides pure functions for all card mechanics (peek, search, insert, draw-with-reshuffle, shuffle).
