# Syndicate System

A strategic deckbuilding game system and implementation hub.

## 🏗️ Architecture

The project is divided into two primary domains:

### 1. The Foundry (System R&D)

- **Path**: `syndicate-deckbuilder/`
- **Purpose**: Theme-agnostic development of core mechanics.
- **Rules**: [CoreRules.md](syndicate-deckbuilder/rules/CoreRules.md)
- **Status**: Active development of Market Churn, Tension Scaling, and Wound mechanics.

### 2. The Vault (Official Games)

- **Path**: `game-rules-system-mcp/`
- **Purpose**: Executable implementation and validation.
- **Active Games**:
  - **Syndicate Heist**: An asymmetric tactical deckbuilder.
  - **PokéNursery: Blissful Beginnings**: A cozy engine-building game featuring Chansey and Blissey.
- **Validation**: Playtest simulations via the MCP engine.

## 🔄 Workflow

New mechanics are first ideated as theme-agnostic rules in **The Foundry**, then internalized into specific games in **The Vault** for validation. See the [Workflow Proposal](C:\Users\Julian\.gemini\antigravity\brain\fd1286e2-41aa-468d-9996-9c562aea474c\workflow_proposal.md) for details.

Terminal commands within this repository follow strict standards for reliability and output capture. See [TERMINAL_COMMANDS.md](TERMINAL_COMMANDS.md) for details.

## 🚀 Getting Started

1. Explore the [Core Rules](syndicate-deckbuilder/rules/CoreRules.md).
2. Run playtest simulations using the MCP `setup_game_from_manifest` and `execute_macro_action` tools with the `setup_heist` and `playtest_v1` references.
3. Check the MCP rulebooks in `game-rules-system-mcp/game-data/[game-id]/rulebooks/`.
