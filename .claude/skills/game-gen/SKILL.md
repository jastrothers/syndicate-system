---
name: game-gen
description: Multi-agent pipeline to generate a complete board game design from a theme, integrated with the game-rules MCP for data persistence. Includes playtest simulation and targeted fix loops.
---

# Board Game Generation Workflow (/game-gen)

Use this workflow to generate a complete board game design from a simple theme and set of constraints, fully integrated with the MCP for data persistence.

> **Autonomous Mode**: This workflow runs straight through from theme to finished rulebook without stopping for user feedback. For interactive co-design with preference learning, use `/designer` instead.

**Usage**: `/game-gen "<Theme>" [--profile]`

The optional `--profile` flag enables Nova preference personalisation (see Step 0).

---

## Step 0: Initialize Workspace

1. **Initialize MCP**: Run `create_design_session` with the game name and theme. Note the `sessionId` and the sanitized `gameSlug`.
2. **Create Draft**: Use `save_draft` to initialize a draft rulebook using the `gameSlug`.
3. **Profile (opt-in)**: Only if `--profile` was passed:
   - Call `get_designer_profile`
   - Extract liked mechanisms (affinity ≥ 0.3) and disliked mechanisms (affinity ≤ -0.3)
   - Construct a **Profile Context** block to pass to the MechanicsArchitect in Step 1
   - If `--profile` was NOT passed, skip this entirely

---

## Step 1: MechanicsArchitect

Spawn the `mechanics-architect` subagent with `sessionId`, `gameSlug`, `theme`, and optionally the **Profile Context** block.

The agent will:
1. Load design session context
2. Cross-reference `list_references(type: "mechanism")` to check existing patterns
3. Read `.claude/skills/BoardGameDesign/resources/mechanisms.json` taxonomy
4. Propose 3-5 mechanisms with core parameters and synergies
5. Call `add_design_step` to log output
6. Call `save_reference` for each mechanism
7. Call `update_rule(path: "mechanics")` to write to draft

---

## Step 1.5: Lite Consistency Check (Optional)

Optionally run a quick structural check:
```bash
npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/{gameSlug}/rulebooks/draft.json
```

If more than 3 warnings appear, ask the MechanicsArchitect to reconsider or proceed cautiously to the next step.

---

## Step 2: ThemeWeaver

Spawn the `theme-weaver` subagent with `sessionId` and `gameSlug`.

The agent will:
1. Load design session and extract Mechanism Slate from Step 1
2. Map every mechanism to thematic concepts
3. Define setting, player identity, and narrative arc
4. Call `add_design_step` to log output
5. Call `update_rule(path: "overview")` and `update_rule(path: "metadata.thematicBrief")`

---

## Step 3: ComponentDesigner

Spawn the `component-designer` subagent with `sessionId` and `gameSlug`.

The agent will:
1. Load design session, extract Mechanism Slate and Thematic Blueprint
2. Specify all physical components with exact quantities
3. Define player-count scaling for each component
4. Call `add_design_step` to log output
5. Call `update_rule(path: "components")` to write Component Manifest to draft
6. Call `save_reference` for each major deck/component set

---

## Step 3.5: Consistency Gate

Run the consistency checker to verify component/rule alignment:

```bash
npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/{gameSlug}/rulebooks/draft.json
```

- If **≤3 warnings**: proceed to Step 4
- If **>3 warnings**: review findings, use `update_rule` to apply targeted fixes, re-run until threshold is met

---

## Step 4: DetailsArchitect

Spawn the `details-architect` subagent with `sessionId` and `gameSlug`.

The agent will:
1. Load all prior design steps
2. Define complete turn structure with unambiguous rules
3. Cross-validate components against gameplay rules
4. Create a machine-readable Setup Manifest
5. Call `add_design_step` to log output
6. Call `update_rule` for every rulebook section (overview, setup, turn-structure, actions, scoring, special-rules, edge-cases, quick-reference)
7. Call `save_reference(name: "setup_manifest", type: "setup")`

---

## Step 4.5: Setup Validation

Spawn the `setup-validator` subagent with `sessionId` and `gameSlug`.

The agent will:
1. Load Component Manifest and Setup Manifest
2. Verify every component has a clear setup home
3. Flag ambiguities and missing player-count variants
4. Verify the initial game state is constructible and playable
5. Call `add_design_step` to log output
6. Return a validation verdict (VALID or NEEDS_FIXES with fix list)

If NEEDS_FIXES: Use `update_rule` to apply setup corrections. Re-run SetupValidator if many fixes were needed.

---

## Step 5: Playtest Simulation (NEW)

Simulate 2-3 turns of actual gameplay using MCP playtest tools:

1. **Create Session**: Call `create_session(gameSlug)` to initialize a playtest session
2. **Simulate Setup**: Use the Setup Manifest to reconstruct the initial game state via `update_game_state`
3. **Simulate Turns**: For each turn (up to 3):
   - Player 1 takes an action: Call `record_action` with a thematic, strategy-forward action
   - Record playtest observations via `log_playtest_note` (e.g., "Action point economy feels tight", "Card draw is smooth")
   - Check game state after each action via `get_game_state`
4. **Record Findings**: Log observations about playability, pacing, and mechanical flow
5. **Call `add_design_step`** with a summary of playtest findings

**Purpose**: Catch obvious gameplay issues (unplayable states, unclear action resolution, missing rule definitions) before full critique.

---

## Step 6: Critique & Refinement

Run the `/game-critique` skill against the `gameSlug` with `sessionId` and `gameSlug` parameters. The skill will:

1. Run consistency checking
2. Spawn BalanceCritic and FunFactorJudge in parallel
3. Collect structured balance + fun scores
4. Identify HIGH severity issues
5. If HIGH issues exist:
   - Propose targeted fixes
   - Dispatch to the responsible agent (MechanicsArchitect for economy issues, DetailsArchitect for rule gaps, ComponentDesigner for missing pieces)
   - Re-run critique (up to 1 additional iteration, max 2 total)
6. Exit when no HIGH issues remain AND fun score ≥ 7/10

---

## Step 7: Save & Compile

1. **Finalize**: Call `promote_draft` to move draft to `latest.json`
2. **Compile**: Call `compile_markdown_rulebook` to generate human-readable Markdown
3. **Rebuild Index**: Call `rebuild_reference_index` to update reference library
4. **Game Brief**: Call `save_reference` with:
   - `name`: `{gameSlug}-brief`
   - `game`: `{gameSlug}`
   - `version`: `latest`
   - `type`: `game-brief`
   - `content`: A ~200-word summary drawn from all design steps covering theme, player count, mechanisms, components, and win condition

**Done**: The game is fully designed, critiqued, compiled, and persisted.

---

## Key Differences from v1

- **Step 1.5**: Lite consistency check after mechanics selection (catch structural issues early)
- **Step 4.5**: SetupValidator agent validates setup completeness before playtest
- **Step 5**: NEW playtest simulation step simulates actual gameplay turns
- **Step 6**: Critique now dispatches fixes to specific agents (not generic `update_rule`)
- **Agents self-persist**: Each agent calls its own MCP tools; orchestrator coordinates sequencing
