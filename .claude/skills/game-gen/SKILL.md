---
name: game-gen
description: Multi-agent pipeline to generate a complete board game design from a theme, integrated with the game-rules MCP for data persistence.
---

# Board Game Generation Workflow (/game-gen)

Use this workflow to generate a complete board game design from a simple theme and set of constraints, fully integrated with the MCP for data persistence.

> **Autonomous Mode**: This workflow runs straight through from theme to finished rulebook without stopping for user feedback. For interactive co-design with preference learning, use `/designer` instead.

**Usage**: `/game-gen "<Theme>" [--profile]`

The optional `--profile` flag enables Nova preference personalisation (see Step 0).

---

## Step 0: Initialize Workspace

1. **Initialize MCP**: Run `create_design_session` with the game name and theme. Note the `sessionId` and the sanitized `gameSlug` (e.g., `BaddiesTheBoardGame`).
2. **Create Draft**: Use `save_draft` to initialize a draft rulebook using the same `gameSlug`.
3. **Profile (opt-in)**: Only if `--profile` was passed:
   - Call `get_designer_profile`.
   - Extract liked mechanisms (affinity ≥ 0.3) and disliked mechanisms (affinity ≤ -0.3).
   - Construct a **Profile Context** block to pass to the MechanicsArchitect in Step 1:
     ```
     Profile Context:
       Liked: [mechanism IDs]
       Disliked: [mechanism IDs]
     ```
   - If `--profile` was NOT passed, skip this entirely — no profile call, no Profile Context block.

---

## Step 1: MechanicsArchitect

Spawn the `mechanics-architect` subagent. Pass the `sessionId`, `gameSlug`, theme, and — if `--profile` was used — the **Profile Context** block. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. Read `.claude/skills/BoardGameDesign/resources/mechanisms.json`.
2. Propose 3-5 mechanisms with core parameters and justifications.
3. If a **Profile Context** block was provided, weight selection toward liked mechanisms and away from disliked ones.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the proposal.

**MCP Integration**: Use `save_reference` for each selected mechanism to the game's reference library.

---

## Step 2: ThemeWeaver

Spawn the `theme-weaver` subagent. Pass `sessionId` and `gameSlug`. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. Map every mechanism to a thematic action or concept.
2. Define setting, narrative stakes, and player roles.
3. Ensure all language reflects the chosen theme.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the thematic specification.

**MCP Integration**: Update the draft rulebook's `thematicBrief` using `update_rule`.

---

## Step 3: ComponentDesigner

Spawn the `component-designer` subagent. Pass `sessionId` and `gameSlug`. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. List every physical component required (cards, tiles, etc.).
2. Provide precise counts and justifications.
3. Ensure specs are sufficient for a first prototype build.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the component manifest.

**MCP Integration**: Use `update_rule` with `isDraft: true` to add a "Component Manifest" section.

---

## Step 3.5: Consistency Gate

Before proceeding to Step 4, run the consistency checker against the draft rulebook:

```bash
npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/[gameSlug]/rulebooks/draft.json
```

- If **3 or fewer warnings**: proceed to Step 4.
- If **more than 3 warnings**: review the warnings, apply targeted fixes using `update_rule` on the draft, then re-run the checker until the threshold is met.

> This gate catches component/rule mismatches before the DetailsArchitect writes the final rulebook, avoiding downstream rewrites.

---

## Step 4: DetailsArchitect

Spawn the `details-architect` subagent. Pass `sessionId` and `gameSlug`. It will:

### Phase 1: Context Loading
1. Call `get_design_session` using the current `sessionId`.

### Phase 2: Creative Execution
1. Define the core turn loop and phase structure.
2. Write unambiguous rules with clear win conditions.
3. Compile the final rulebook artifact.

### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the final rulebook content.

**MCP Integration**: Use `update_rule` with `isDraft: true` to populate all remaining rule sections.

---

## Step 5: Critique and Refinement

Run the `/game-critique` skill against the generated `[gameSlug]`. Pass `sessionId` and `gameSlug` so the critique agents load the correct design context. Apply refinements using `update_rule` based on critique results.

---

## Step 6: Save and Compile

1. **Finalize Rulebook**: Run `promote_draft` in MCP to move the draft to `latest.json`.
2. **Compile**: Trigger `compile_markdown_rulebook` to generate the human-readable version.
3. **Rebuild Index**: Call `rebuild_reference_index` if new references were added.
4. **Game Brief**: Call `save_reference` with the following spec to create a permanent summary artifact:
   - `name`: `[gameSlug]-brief`
   - `game`: `[gameSlug]`
   - `version`: `latest`
   - `type`: `game-brief`
   - `content`: A ~200-word summary covering: theme sentence, player count, key mechanisms (3-5 bullet points), notable component highlights, and win condition. Draw from the completed design session steps.
