---
name: game-gen
description: Multi-agent pipeline to generate a complete board game design from a theme, integrated with the game-rules MCP for data persistence. Includes playtest simulation and targeted fix loops.
---

# Board Game Generation Workflow (/game-gen)

Use this workflow to generate a complete board game design from a simple theme and set of constraints, fully integrated with the MCP for data persistence.

> **Autonomous Mode**: This workflow runs straight through from theme to finished rulebook without stopping for user feedback. For interactive co-design with preference learning, use `/designer` instead. For phase-by-phase execution (one agent per turn, resumable across chats), use `/game-gen-step` instead.

**Usage**: `/game-gen "<Theme>" [--profile] [--mechanics "mech_id1,mech_id2,..."]`

The optional `--profile` flag enables Nova preference personalisation (see Step 0).

The optional `--mechanics` flag lets you pre-select up to 6 mechanisms from the taxonomy (see `.claude/skills/BoardGameDesign/resources/mechanisms.json`). Mechanism IDs use underscores (e.g. `hand_management`, `deck_building`, `area_control`). Hyphens are also accepted and will be normalised to underscores. The MechanicsArchitect will treat these as non-negotiable anchors and build the remaining slate around them.

---

## Step 0: Initialize Workspace

1. **Initialize MCP**: Run `create_design_session` with the game name, theme, the full user prompt as `initialPrompt`, and optionally `prePickedMechanics` (see step 4 below). Note the `sessionId` and the sanitized `gameSlug`.
2. **Create Draft**: Use `save_draft` to initialize a draft rulebook using the `gameSlug`.
3. **Profile Bias (opt-in)**: Only if `--profile` was passed:
   - Call `get_designer_profile`
   - Extract liked mechanisms (affinity ≥ 0.3) and disliked mechanisms (affinity ≤ -0.3)
   - Construct a **Profile Context** block to pass to the MechanicsArchitect in Step 1
   - If `--profile` was NOT passed, skip this entirely — do NOT load or use the profile for biasing decisions
4. **Mechanics Pre-Pick (opt-in)**: Only if `--mechanics` was passed:
   - Parse the comma-separated list into individual mechanism IDs
   - Normalise any hyphens to underscores (e.g. `area-control` → `area_control`)
   - Read `.claude/skills/BoardGameDesign/resources/mechanisms.json` and extract all valid IDs
   - Validate each provided ID exists in the taxonomy. If any ID is unknown, report the invalid ID(s), list the valid IDs, and stop — do not continue the pipeline
   - Validate the list has at most 6 entries; if more than 6, report the error and stop
   - Pass the validated list to `create_design_session` as `prePickedMechanics`
   - Construct a **Pre-Picked Mechanics** block to pass to the MechanicsArchitect in Step 1:
     ```
     ### Pre-Picked Mechanics
     The following mechanism IDs have been pre-selected by the user and are non-negotiable anchors:
     - {id1}
     - {id2}
     ...
     ```
   - If both `--profile` and `--mechanics` are provided: pre-picks take priority as anchors; include the **Profile Context** block so the MechanicsArchitect can use profile affinities when filling any remaining slots

> **Preference Learning (always on)**: Regardless of `--profile`, this pipeline records every design decision via `record_decision` after each step (Steps 1-4, 6). This accumulates designer preference data for future use without influencing the current run.

---

## Step 1: MechanicsArchitect

Spawn the `mechanics-architect` subagent with `sessionId`, `gameSlug`, `theme`, and optionally the **Profile Context** block and/or the **Pre-Picked Mechanics** block.

The agent will:
1. Load design session context
2. Cross-reference `list_references(type: "mechanism")` to check existing patterns
3. Read `.claude/skills/BoardGameDesign/resources/mechanisms.json` taxonomy
4. Propose 3-5 mechanisms with core parameters and synergies
5. Call `add_design_step` to log output (with `trace` block — see Forensic Traces below)
6. Call `save_reference` for each mechanism
7. Call `update_rule(path: "mechanics")` to write to draft

**After the agent completes**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the key mechanism choices, and `impactedMechanisms` listing the selected mechanism IDs. This feeds the preference learning system without biasing the current run.

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
4. Call `add_design_step` to log output (with `trace` block)
5. Call `update_rule(path: "overview")` and `update_rule(path: "metadata.thematicBrief")`

**After the agent completes**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the thematic direction, and `impactedMechanisms` listing the mechanism IDs that were themed.

---

## Step 3: ComponentDesigner

Spawn the `component-designer` subagent with `sessionId` and `gameSlug`.

The agent will:
1. Load design session, extract Mechanism Slate and Thematic Blueprint
2. Specify all physical components with exact quantities
3. Define player-count scaling for each component
4. Call `add_design_step` to log output (with `trace` block)
5. Call `update_rule(path: "components")` to write Component Manifest to draft
6. Call `save_reference` for each major deck/component set

**After the agent completes**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the component strategy, and `impactedMechanisms` listing mechanisms that each component supports.

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
5. Call `add_design_step` to log output (with `trace` block)
6. Call `update_rule` for every rulebook section (overview, setup, turn-structure, actions, scoring, special-rules, edge-cases, quick-reference)
7. Call `save_reference(name: "setup_manifest", type: "setup")`

**After the agent completes**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the rulebook structure and key design choices, and `impactedMechanisms` listing all mechanisms that now have written rules.

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

## Step 5: Playtest Simulation

Spawn the `simulation-runner` subagent with `sessionId`, `gameSlug`, and `playerCount` (default: 2).

The agent:
1. Loads the complete rulebook and setup manifest
2. Creates 3 MCP playtest sessions (one per strategy: Random, Greedy, Strategic)
3. Simulates 5-8 turns per game
4. Produces a Simulation Report with 4 heuristic scores (Seat Advantage, Strategy Diversity, Dead Actions, Game Length Variance)
5. Self-persists via `add_design_step` (stepNumber: 5, persona: "SimulationRunner") and `save_reference` (name: "simulation_report")

**After**: Call `record_decision` based on the simulation verdict:
- **PASS** → `decision: "accept"`, rationale summarizing the simulation findings, `impactedMechanisms` for any flagged mechanisms
- **CONCERNS** → `decision: "defer"`, rationale noting which metrics were borderline
- **FAIL** → `decision: "reject"`, rationale listing metrics below threshold; surface findings to the user and ask whether to proceed to Step 6 or iterate

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
   - **Section Completeness Check**: After applying fixes, verify ALL rulebook sections reflect the changes. Sections commonly missed:
     - `mechanics` — update if parameters, costs, resource flows, or token caps changed
     - `overview` — update if theme, player count, or win condition changed
     - `quick-reference` — must always reflect the latest parameters
   Use batch mode `update_rule` with `updates` array to update all affected sections in one call.
   - Re-run critique (up to 1 additional iteration, max 2 total)
6. Exit when no HIGH issues remain AND fun score ≥ 7/10

**After critique completes**: For each fix that was applied, call `record_decision` with `decision: "accept"`, a rationale describing the fix, and the `impactedMechanisms`. For any unresolved issues surfaced to the user, call `record_decision` with `decision: "defer"`.

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

## Forensic Traces

Every subagent step (1-4) includes a `trace` block in its `add_design_step` call. This is the Nova Loop evidence format:

```json
{
  "observation": "What was produced or decided",
  "data": { "key_metrics": "or parameters" },
  "mechanism": "The design principle or mechanism driving the decision",
  "impact": "How this affects the overall game experience"
}
```

Example (MechanicsArchitect):
```json
{
  "observation": "Selected action-point system with 3 AP per turn as the core loop driver",
  "data": { "mechanisms": ["action_points", "set_collection", "area_control"], "complexity": 3 },
  "mechanism": "Action points create tension through constrained choice; set collection provides a secondary goal that rewards long-term planning",
  "impact": "Players face meaningful decisions each turn without analysis paralysis; 3 AP keeps turns under 2 minutes"
}
```

These traces are persisted in the design session and can be reviewed via `get_design_session(includeFull: true)`. The `/designer` skill's Nova Loop uses them for `synthesize_nova_advice`.

---

## Key Differences from v1

- **Forensic Traces**: Every subagent step includes a `trace` block linking decisions to evidence (GameGrammar 2.0 "Forensic Persistence")
- **Always-On Preference Learning**: `record_decision` is called after every step, accumulating designer preferences for future runs — without biasing the current run (bias requires explicit `--profile`)
- **Step 1.5**: Lite consistency check after mechanics selection (catch structural issues early)
- **Step 4.5**: SetupValidator agent validates setup completeness before playtest
- **Step 5**: Playtest simulation via `simulation-runner` subagent — 3 games × 3 strategies, 4 heuristic scores, empirical evidence for critics
- **Step 6**: Critique now dispatches fixes to specific agents (not generic `update_rule`)
- **Agents self-persist**: Each agent calls its own MCP tools; orchestrator coordinates sequencing
