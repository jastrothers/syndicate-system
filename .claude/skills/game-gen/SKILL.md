---
name: game-gen
description: Multi-agent pipeline to generate a complete board game design from a theme, integrated with the game-rules MCP for data persistence. v2.0 with self-sufficient agents, playtest simulation, setup validation, and targeted fix loops.
---

# Board Game Generation Workflow v2.0 (/game-gen)

Use this workflow to generate a complete board game design from a simple theme, fully integrated with the MCP for data persistence. Each agent is self-sufficient — it loads its own context, produces structured output, and persists its own results.

> **Autonomous Mode**: This workflow runs straight through from theme to finished rulebook without stopping for user feedback. For interactive co-design with preference learning, use `/designer` instead.

**Usage**: `/game-gen "<Theme>" [--profile] [--weight light|medium|heavy]`

- `--profile`: Enables Nova preference personalisation (see Step 0)
- `--weight`: Sets target complexity (default: medium). Passed to MechanicsArchitect.

---

## Step 0: Initialize Workspace

1. **Initialize MCP**: Run `create_design_session` with the game name and theme. Note the `sessionId` and the sanitized `gameSlug`.
2. **Create Draft**: Use `save_draft` to initialize a draft rulebook using the `gameSlug`.
3. **Profile (opt-in)**: Only if `--profile` was passed:
   - Call `get_designer_profile`.
   - Extract liked mechanisms (affinity >= 0.3) and disliked mechanisms (affinity <= -0.3).
   - Construct a **Profile Context** block:
     ```
     Profile Context:
       Liked: [mechanism IDs]
       Disliked: [mechanism IDs]
     ```
   - If `--profile` was NOT passed, skip this entirely.

---

## Step 1: MechanicsArchitect

Spawn the `mechanics-architect` subagent. Pass `sessionId`, `gameSlug`, `theme`, target weight, and — if `--profile` was used — the **Profile Context** block.

The agent is self-sufficient (v2.0). It will:
- Load context via `get_design_session`
- Cross-reference existing games via `list_references`
- Read the mechanisms taxonomy
- Produce a **Mechanism Slate** with: Selected Mechanisms table, Core Loop, Parameter Specs, Synergy Matrix, Player Count Scaling
- Self-persist via `add_design_step` + `save_reference` + `update_rule`

**Expected Output**: Mechanism Slate (structured format — see agent spec)

**Receive and Verify**: Confirm the output contains all required sections. Extract the mechanism list for downstream agents.

---

## Step 1.5: Mechanics Coherence Check

Quick sanity check on the mechanism selection:

1. Verify the Mechanism Slate has 3-5 mechanisms with complexity scores
2. Verify the Core Loop has clear phases
3. Verify Player Count Scaling addresses 2P/3P/4P
4. If any check fails, ask the mechanics-architect to revise (pass the specific failure back)

This is a lightweight gate — no scripts, just structural verification of the output format.

---

## Step 2: ThemeWeaver

Spawn the `theme-weaver` subagent. Pass `sessionId` and `gameSlug`.

The agent is self-sufficient (v2.0). It will:
- Load the Mechanism Slate from the design session
- Cross-reference thematic patterns from other games
- Produce a **Thematic Blueprint** with: Setting, Player Identity, Mechanism Translation Table, Terminology Glossary, Narrative Arc, Flavor Hooks, Player Count Feel
- Self-persist via `add_design_step` + `update_rule`

**Expected Output**: Thematic Blueprint (structured format — see agent spec)

**Receive and Verify**: Confirm every mechanism has a thematic mapping. Extract the Terminology Glossary for downstream agents.

---

## Step 3: ComponentDesigner

Spawn the `component-designer` subagent. Pass `sessionId` and `gameSlug`.

The agent is self-sufficient (v2.0). It will:
- Load the Mechanism Slate and Thematic Blueprint from the design session
- Cross-reference component patterns from other games
- Produce a **Component Manifest** with: Master Table, Card Breakdowns, Token Specs, Board Specs, Player Count Scaling, Prototype Notes
- Self-persist via `add_design_step` + `update_rule` + `save_reference`

**Expected Output**: Component Manifest (structured format — see agent spec)

---

## Step 3.5: Consistency Gate

Run the consistency checker against the draft rulebook:

```bash
npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/{gameSlug}/rulebooks/
```

- If **3 or fewer warnings**: proceed to Step 4.
- If **more than 3 warnings**: review the warnings, apply targeted fixes using `update_rule` on the draft, then re-run the checker.
- Maximum 2 fix attempts. If warnings persist, proceed with a note to the DetailsArchitect about known issues.

> This gate catches component/rule mismatches before the DetailsArchitect writes the final rulebook.

---

## Step 4: DetailsArchitect

Spawn the `details-architect` subagent. Pass `sessionId` and `gameSlug`.

The agent is self-sufficient (v2.0). It will:
- Load ALL prior design steps from the session
- Load the current draft rulebook
- Cross-reference setup patterns from other games
- Produce a **Complete Rulebook** with: Overview, Setup, Turn Structure, Action Catalog, Scoring & Endgame, Special Rules, Edge Cases, Quick Reference Card
- Also produce a **Setup Manifest** (machine-readable initial game state)
- Self-persist via `add_design_step` + `update_rule` (all sections) + `save_reference` (setup manifest)

**Expected Output**: Complete Rulebook + Setup Manifest (structured format — see agent spec)

---

## Step 4.5: Setup Validation

Spawn the `setup-validator` subagent. Pass `sessionId` and `gameSlug`.

The agent will:
- Cross-check every component against setup instructions
- Scan for ambiguities and missing information
- Trace the initial game state construction step by step
- Verify first-turn readiness
- Produce a **Setup Validation Report** with: Completeness Check, Ambiguity Scan, Initial State Trace, Player Count Coverage, First Turn Readiness, Verdict

**Gate Logic**:
- If verdict is **VALID**: proceed to Step 5.
- If verdict is **NEEDS_FIXES**:
  - Apply CRITICAL fixes using `update_rule` (target the Setup section specifically)
  - Re-run validation. Maximum 2 fix attempts.
  - If fixes don't resolve all CRITICAL issues, proceed with a note to the critique step.

---

## Step 5: Playtest Simulation

Simulate 2-3 turns of actual gameplay using MCP playtest tools. This catches rules that "look right on paper" but don't work in practice.

### 5.1: Initialize Playtest Session
1. Call `create_session` with the `gameSlug` to start a playtest session.
2. Call `update_game_state` to set up the initial state based on the Setup Manifest.

### 5.2: Simulate Opening Turns
For each of 2-3 simulated turns:
1. Determine available actions using the Action Catalog from the rulebook.
2. Choose a reasonable action (not optimal — just legal and representative).
3. Call `record_action` to log the action and its outcome.
4. Call `update_game_state` to apply the action's effects.
5. If the action involves cards: use `draw_from_deck`, `peek_at_deck`, or `search_zone` as appropriate.
6. If the action involves dice: use `roll_dice`.
7. Call `validate_action` to confirm the action is legal per the written rules.

### 5.3: Log Findings
After simulation:
1. Call `log_playtest_note` for any issues discovered:
   - Rules that don't work as written
   - Actions that are impossible on turn 1
   - Missing state transitions
   - Ambiguous resolution order
2. Apply urgent fixes using `update_rule` if any rules are literally unplayable.
3. Call `evaluate_game_state` to check the state is coherent.

> The simulation doesn't need to play to completion — just verify the first few turns work mechanically.

---

## Step 6: Critique & Refinement

Run the `/game-critique` skill against the generated design. Pass `sessionId` and `gameSlug`.

The critique skill (v2.0) will:
1. Run consistency checks
2. Spawn BalanceCritic and FunFactorJudge in parallel
3. Both produce structured rubric scores with machine-parseable verdicts
4. Apply targeted fixes based on which dimension/agent is responsible

**Exit Criteria** (from game-critique):
- No HIGH severity balance issues AND
- Fun score >= 7/10 AND
- Balance score >= 6/10
- Maximum 2 critique iterations

**Targeted Fix Dispatch** (if iteration needed):
- Economy issues → re-consult MechanicsArchitect parameters
- Rule gaps → re-run DetailsArchitect on specific sections
- Component mismatches → re-run ComponentDesigner
- Theme breaks → re-consult ThemeWeaver
- Generic balance → apply `update_rule` directly

---

## Step 7: Save & Compile

1. **Finalize Rulebook**: Run `promote_draft` to move the draft to `latest.json`.
2. **Compile**: Trigger `compile_markdown_rulebook` to generate the human-readable Markdown version.
3. **Rebuild Index**: Call `rebuild_reference_index` to ensure all new references are indexed.
4. **Game Brief**: Call `save_reference` to create a permanent summary artifact:
   - `name`: `{gameSlug}-brief`
   - `game`: `{gameSlug}`
   - `version`: `latest`
   - `type`: `game-brief`
   - `content`: A ~200-word summary covering:
     - Theme sentence
     - Player count and playtime
     - Key mechanisms (3-5 bullet points with themed names)
     - Notable component highlights
     - Win condition
     - Balance verdict and fun score from critique
5. **Version Snapshot**: Call `create_version` with tag `v1.0` to create an immutable snapshot of the generated design.

---

## Pipeline Summary

```
Step 0:   Initialize Workspace
Step 1:   MechanicsArchitect    → Mechanism Slate
Step 1.5: Mechanics Coherence Check (lightweight gate)
Step 2:   ThemeWeaver            → Thematic Blueprint
Step 3:   ComponentDesigner      → Component Manifest
Step 3.5: Consistency Gate       (script-based validation)
Step 4:   DetailsArchitect       → Complete Rulebook + Setup Manifest
Step 4.5: SetupValidator         → Setup Validation Report (gate)
Step 5:   Playtest Simulation    → 2-3 turns simulated via MCP tools
Step 6:   Critique & Refinement  → Balance Report + Fun Factor Report (with fix loops)
Step 7:   Save & Compile         → Final artifacts persisted
```

**Total Agents Spawned**: 7 (mechanics-architect, theme-weaver, component-designer, details-architect, setup-validator, balance-critic, fun-factor-judge)

**Agent Execution Model**: Each agent follows a 4-phase pattern:
1. Context Loading (MCP calls to load prior work)
2. Research (cross-reference existing games)
3. Creative Execution (structured output)
4. Self-Persistence (log step + save references + update draft)
