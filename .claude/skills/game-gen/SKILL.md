---
name: game-gen
description: Multi-agent pipeline to generate a complete board game design from a theme, integrated with the game-rules MCP for data persistence.
---

# Board Game Generation Workflow (/game-gen)

Use this workflow to generate a complete board game design from a simple theme and set of constraints, fully integrated with the MCP for data persistence.

> **Autonomous Mode**: This workflow runs straight through from theme to finished rulebook without stopping for user feedback. For interactive co-design with preference learning, use `/designer` instead.

## Step 0: Initialize Workspace

1. **Initialize MCP**: Run `create_design_session` in MCP with the game name and theme. Note the `sessionId` and the sanitized `gameSlug` (e.g., `BaddiesTheBoardGame`).
2. **Create Directory**: Run `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/session_manager.ts init "[gameSlug]" "[Theme]"` to initialize the design directory in `game-data/[gameSlug]/design/`.
3. **Create Draft**: Use `save_draft` to initialize a draft rulebook using the same `gameSlug`.

---

## Step 1: MechanicsArchitect

Spawn the `mechanics-architect` subagent. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. Read `.claude/skills/BoardGameDesign/resources/mechanisms.json`.
2. Propose 3-5 mechanisms with core parameters and justifications.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the proposal.
2. **Sync**: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 1 --summary "Defined core engine with [Mechanisms]."`

**MCP Integration**: Use `save_reference` for each selected mechanism to the game's reference library.

---

## Step 2: ThemeWeaver

Spawn the `theme-weaver` subagent. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. Map every mechanism to a thematic action or concept.
2. Define setting, narrative stakes, and player roles.
3. Ensure all language reflects the chosen theme.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the thematic specification.
2. **Sync**: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 2 --summary "Applied theme: [Theme Name]."`

**MCP Integration**: Update the draft rulebook's `thematicBrief` using `update_rule`.

---

## Step 3: ComponentDesigner

Spawn the `component-designer` subagent. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. List every physical component required (cards, tiles, etc.).
2. Provide precise counts and justifications.
3. Ensure specs are sufficient for a first prototype build.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the component manifest.
2. **Sync**: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 3 --summary "Generated component manifest."`

**MCP Integration**: Use `update_rule` with `isDraft: true` to add a "Component Manifest" section.

---

## Step 4: DetailsArchitect

Spawn the `details-architect` subagent. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. Define the core turn loop and phase structure.
2. Write unambiguous rules with clear win conditions.
3. Compile the final rulebook artifact.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the final rulebook content.
2. **Sync**: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 4 --summary "Finalized rulebook draft."`

**MCP Integration**: Use `update_rule` with `isDraft: true` to populate all remaining rule sections.

---

## Step 5: Critique and Refinement

Run the `/game-critique` skill against the generated `[gameSlug]`. Apply refinements using `update_rule` based on critique results.

---

## Step 6: Save and Compile

1. **Finalize Rulebook**: Run `promote_draft` in MCP to move the draft to `latest.json`.
2. **Compile**: Trigger `compile_markdown_rulebook` to generate the human-readable version.
3. **Rebuild Index**: Call `rebuild_reference_index` if new references were added.
