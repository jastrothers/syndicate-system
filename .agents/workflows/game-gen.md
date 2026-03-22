---
description: Multi-agent pipeline to generate a complete board game design from a theme, integrated with MCP.
---

# Board Game Generation Workflow (/game-gen)

Use this workflow to generate a complete board game design from a simple theme and set of constraints, fully integrated with the MCP for data persistence.

> [!TIP]
> **Auto-Pilot Mode**: To run this entire workflow without per-step approvals, set `"workflowAutomation": true` in your `game-data/designer_profile.json`.

## Step 0: Initialize Workspace

1. **Initialize MCP**: Run `create_design_session` in MCP with the game name and theme. Note the `sessionId` and the sanitized `gameSlug` (e.g., `BaddiesTheBoardGame`).
2. **Create Directory**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts init "[gameSlug]" "[Theme]"` to initialize the design directory in `game-data/[gameSlug]/design/`.
3. **Create Draft**: Use `save_draft` to initialize a draft rulebook using the same `gameSlug`.

## Step 1: Initialize MechanicsArchitect

1. **Activate Persona**: Execute the `/mechanics-architect-flow` workflow.
2. **MCP Integration**: Use `save_reference` for each selected mechanism to the game's reference library.

## Step 2: Inform ThemeWeaver

1. **Activate Persona**: Execute the `/theme-weaver-flow` workflow.
2. **MCP Integration**: Update the draft rulebook's `thematicBrief` using `update_rule`.

## Step 3: Consult ComponentDesigner

1. **Activate Persona**: Execute the `/component-designer-flow` workflow.
2. **MCP Integration**: Use `update_rule` with `isDraft: true` to add a "Component Manifest" section and populate the `components` field in the draft rulebook.

## Step 4: Finalize with DetailsArchitect

1. **Activate Persona**: Execute the `/details-architect-flow` workflow.
2. **MCP Integration**: Use `update_rule` with `isDraft: true` to populate all remaining rule sections.

## Step 5: Critique and Refinement

1. **Run Critique**: Execute the `/game-critique` workflow against the generated `[gameSlug]`.
2. **Apply Refinements**: Based on the critique results, use `update_rule` to refine the design.

## Step 6: Save and Compile

1. **Finalize Rulebook**: Run `promote_draft` in MCP to move the draft to `latest.json`.
2. **Compile**: Trigger the `compile_markdown_rulebook` tool to generate the human-readable version.

3. **Rebuild Index**: Call `rebuild_reference_index` if new references were added.