---
name: game-gen-step
description: Run the game-gen pipeline one phase at a time for AI efficiency. Start with a theme, then continue phase-by-phase across messages or chat sessions. All state persists via MCP design sessions.
---

# Phase-by-Phase Game Generation (/game-gen-step)

Run the same multi-agent game generation pipeline as `/game-gen`, but **one phase per invocation** to reduce token usage and context pressure. All state is persisted to MCP between phases — you can resume across messages or entirely separate chat sessions.

> For autonomous full-pipeline execution, use `/game-gen` instead.

**Usage**:
```
/game-gen-step "<Theme>" [--profile] [--mechanics "mech_id1,mech_id2,..."]  # New game: runs init + mechanics
/game-gen-step --continue [<sessionId>]      # Next phase of existing session
/game-gen-step --phase <name> [<sessionId>]  # Run a specific phase (re-run or skip)
/game-gen-step --status [<sessionId>]        # Show progress dashboard
/game-gen-step --list                        # List all active design sessions
```

---

## Phase Map

| Phase ID | Step # | Agent / Action | Depends On |
|----------|--------|----------------|------------|
| `init` | 0 | Orchestrator: `create_design_session`, `save_draft` | — |
| `mechanics` | 1 (+ 1.5) | `mechanics-architect` subagent + optional consistency check | `init` |
| `theme` | 2 | `theme-weaver` subagent | `mechanics` |
| `components` | 3 (+ 3.5) | `component-designer` subagent + consistency gate | `theme` |
| `rules` | 4 (+ 4.5) | `details-architect` + `setup-validator` subagents | `components` |
| `playtest` | 5 | `simulation-runner` subagent | `rules` |
| `critique` | 6 | `/game-critique` skill (balance-critic + fun-factor-judge + fix loop) | `playtest` |
| `finalize` | 7 | Orchestrator: `promote_draft`, `compile_markdown_rulebook`, `rebuild_reference_index` | `critique` |

---

## Start Flow: `/game-gen-step "<Theme>"`

When invoked with a theme string, run `init` + `mechanics` together (init alone produces no useful output).

### Step 0: Initialize

1. Derive a game name from the theme (e.g., "Deep sea creature evolution" → "Deep Sea Creature Evolution").
2. Call `create_design_session` with the game name, theme, the full user prompt as `initialPrompt`, and optionally `prePickedMechanics` (see step 5 below). Note the returned `sessionId` and `gameSlug`.
3. Call `save_draft` to initialize a draft rulebook using the `gameSlug`.
4. **Profile Bias (opt-in)**: Only if `--profile` was passed:
   - Call `get_designer_profile`
   - Extract liked mechanisms (affinity ≥ 0.3) and disliked mechanisms (affinity ≤ -0.3)
   - Construct a **Profile Context** block to pass to the MechanicsArchitect
   - If `--profile` was NOT passed, skip this entirely
5. **Mechanics Pre-Pick (opt-in)**: Only if `--mechanics` was passed:
   - Parse the comma-separated list into individual mechanism IDs
   - Normalise any hyphens to underscores (e.g. `area-control` → `area_control`)
   - Read `.claude/skills/BoardGameDesign/resources/mechanisms.json` and extract all valid IDs
   - Validate each provided ID exists in the taxonomy. If any ID is unknown, report the invalid ID(s), list the valid IDs, and stop — do not continue the pipeline
   - Validate the list has at most 6 entries; if more than 6, report the error and stop
   - Pass the validated list to `create_design_session` as `prePickedMechanics`
   - Construct a **Pre-Picked Mechanics** block to pass to the MechanicsArchitect:
     ```
     ### Pre-Picked Mechanics
     The following mechanism IDs have been pre-selected by the user and are non-negotiable anchors:
     - {id1}
     - {id2}
     ...
     ```
   - If both `--profile` and `--mechanics` are provided: pre-picks take priority as anchors; include the **Profile Context** block so the MechanicsArchitect can use profile affinities when filling any remaining slots

### Step 1: MechanicsArchitect

Spawn the `mechanics-architect` subagent with `sessionId`, `gameSlug`, `theme`, and optionally the **Profile Context** block and/or the **Pre-Picked Mechanics** block.

The agent self-persists via `add_design_step`, `save_reference`, and `update_rule`.

**After the agent completes**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the key mechanism choices, and `impactedMechanisms` listing the selected mechanism IDs.

### Step 1.5: Lite Consistency Check (Optional)

```bash
npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/{gameSlug}/rulebooks/draft.json
```

If more than 3 warnings appear, note them for the user.

### Report to User

After completion, display:

```
Session: {sessionId}
Game:    {gameSlug}
Theme:   {theme}

[x] init       — Session created
[x] mechanics  — {1-line summary from MechanicsArchitect step}
[ ] theme      <- NEXT
[ ] components
[ ] rules
[ ] playtest
[ ] critique
[ ] finalize

To continue: /game-gen-step --continue
```

---

## Continue Flow: `/game-gen-step --continue [<sessionId>]`

### 1. Resolve Session

If `sessionId` is provided:
- Glob `game-data/*/design/{sessionId}.json` to find the matching file and derive `gameSlug` from the parent directory path.
- Call `get_design_session(gameName, sessionId, includeFull: false)` to load step summaries. **Note:** The session includes `initialPrompt` and `prePickedMechanics` if they were provided during initialization. Use `initialPrompt` for context on the original intent. If `prePickedMechanics` is present, reconstruct the **Pre-Picked Mechanics** block and pass it to the MechanicsArchitect if the `mechanics` phase still needs to run — do NOT re-prompt the user for mechanics on resume.

If `sessionId` is NOT provided:
- Run: `ls -t game-data/*/design/*.json | head -10`
- For each recent file, read it to check `"status": "active"`.
- If exactly one active session exists, use it.
- If multiple active sessions exist, present a numbered list and ask the user to choose.
- If no active sessions exist, tell the user to start a new game with `/game-gen-step "<Theme>"`.

### 2. Detect Completed Phases

Map each step in the session's `steps[]` array to the phase map:

| Condition | Phase Completed |
|-----------|----------------|
| Step with `stepNumber: 1` and `persona: "MechanicsArchitect"` | `mechanics` |
| Step with `stepNumber: 2` and `persona: "ThemeWeaver"` | `theme` |
| Step with `stepNumber: 3` and `persona: "ComponentDesigner"` | `components` |
| Step with `stepNumber: 4` and `persona: "DetailsArchitect"` | `rules` (partial) |
| Step with `stepNumber: 4.5` and `persona: "SetupValidator"` | `rules` (full) |
| Step with `stepNumber: 5` (any persona) | `playtest` |
| Steps with `persona: "BalanceCritic"` AND `persona: "FunFactorJudge"` | `critique` |

`init` is always complete if the session exists. `finalize` is complete if `game-data/{gameSlug}/rulebooks/latest.json` was updated after the session's `createdAt`.

### 3. Determine Next Phase

Walk the phase dependency chain. The next phase is the first one whose dependencies are met but which is not yet completed. If a phase is only partially complete (e.g., `rules` has DetailsArchitect but not SetupValidator), finish it.

### 4. Show Dashboard and Run

Display the progress dashboard (same format as Start Flow), then run the next phase using the instructions below.

---

## Phase Definitions

Each phase uses the same agent definitions and MCP tools as `/game-gen`. The agents are self-contained — they load their own context from MCP and persist their own output.

### Phase: `theme` (Step 2)

Spawn the `theme-weaver` subagent with `sessionId` and `gameSlug`.

The agent self-persists via `add_design_step`, `update_rule(path: "overview")`, and `update_rule(path: "metadata.thematicBrief")`.

**After**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the thematic direction, and `impactedMechanisms` listing the mechanism IDs that were themed.

### Phase: `components` (Steps 3 + 3.5)

Spawn the `component-designer` subagent with `sessionId` and `gameSlug`.

The agent self-persists via `add_design_step`, `update_rule(path: "components")`, and `save_reference` for each deck.

**After the agent completes**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the component strategy, and `impactedMechanisms`.

**Then run the consistency gate**:
```bash
npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/{gameSlug}/rulebooks/draft.json
```
- If **≤3 warnings**: report and proceed.
- If **>3 warnings**: review findings, use `update_rule` to apply targeted fixes, re-run until threshold is met.

### Phase: `rules` (Steps 4 + 4.5)

**Step 4**: Spawn the `details-architect` subagent with `sessionId` and `gameSlug`.

The agent self-persists via `add_design_step`, `update_rule` for every rulebook section, and `save_reference(name: "setup_manifest", type: "setup")`.

**After**: Call `record_decision` with `decision: "accept"`, a rationale summarizing the rulebook structure and key design choices, and `impactedMechanisms`.

**Step 4.5**: Spawn the `setup-validator` subagent with `sessionId` and `gameSlug`.

The agent self-persists via `add_design_step` and returns a validation verdict.

If **NEEDS_FIXES**: Use `update_rule` to apply setup corrections. Re-run SetupValidator if many fixes were needed.

### Phase: `playtest` (Step 5)

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

### Phase: `critique` (Step 6)

Run the `/game-critique` skill with `sessionId` and `gameSlug` parameters. The skill will:

1. Run consistency checking.
2. Spawn BalanceCritic and FunFactorJudge in parallel.
3. Collect structured balance + fun scores.
4. If HIGH issues exist: dispatch targeted fixes and re-run (max 2 total iterations).
5. Exit when no HIGH issues remain AND fun score ≥ 7/10.

**After**: For each applied fix, call `record_decision` with `decision: "accept"`. For unresolved issues, call `record_decision` with `decision: "defer"`.

### Phase: `finalize` (Step 7)

1. Call `promote_draft` to move draft to `latest.json`.
2. Call `compile_markdown_rulebook` to generate Markdown.
3. Call `rebuild_reference_index` to update the reference library.
4. Call `save_reference` with:
   - `name`: `{gameSlug}-brief`
   - `game`: `{gameSlug}`
   - `version`: `latest`
   - `type`: `game-brief`
   - `content`: A ~200-word summary drawn from all design steps.

Report final status:
```
All phases complete! Game "{gameName}" is fully designed, critiqued, and compiled.

Rulebook: game-data/{gameSlug}/rulebooks/latest.md
Brief:    game-data/{gameSlug}/reference/latest/{gameSlug}-brief.md
```

---

## Status Command: `/game-gen-step --status [<sessionId>]`

Load the session (using the same resolution logic as `--continue`) and display the progress dashboard **without running any phase**. This is a read-only operation.

---

## List Command: `/game-gen-step --list`

Scan for all design sessions across all games:
```bash
ls -t game-data/*/design/*.json | head -20
```

For each file, read the session metadata (`sessionId`, `gameName`, `theme`, `status`, `lastUpdatedAt`, step count). Display as a table:

```
Active Design Sessions:
  1. abc-123  "Medieval Merchant Guilds"   5/8 phases  (updated 2h ago)
  2. xyz-789  "Deep Sea Evolution"         2/8 phases  (updated 3d ago)

Completed:
  3. def-456  "Cosmic Harvest"             8/8 phases  (completed 1w ago)
```

---

## Re-running a Phase: `/game-gen-step --phase <name> [<sessionId>]`

Allows re-running a specific phase, even if already completed. Useful after manual edits to the rulebook or references.

1. Resolve session (same logic as `--continue`).
2. Check that the phase's dependencies are met. If not, warn and abort.
3. If the phase was already completed, warn: "Phase `{name}` was already completed. Re-running will add a new design step. Downstream phases may reference stale data."
4. Run the phase.

---

## Error Handling

- **No active sessions**: "No active design sessions found. Start a new game with `/game-gen-step \"<Theme>\"`"
- **Missing dependencies**: "Cannot run `{phase}` — prerequisite phase `{dep}` has not been completed yet. Run `/game-gen-step --continue` to execute phases in order."
- **Phase fails**: Report the error to the user and suggest retrying with `/game-gen-step --phase {name}`.
- **All phases complete**: "All phases are done! The game is fully designed. Use `/game-gen-step --status` to review, or `/game-gen-step --phase {name}` to re-run a specific phase."

---

## Forensic Traces

Same as `/game-gen`: every subagent step (1-4) includes a `trace` block in its `add_design_step` call. See `/game-gen` for the trace format specification.

## Preference Learning

Same as `/game-gen`: `record_decision` is called after every agent phase (Steps 1-4, 6), accumulating designer preference data without biasing the current run. The `--profile` flag on initial invocation enables profile-based biasing for mechanism selection only.
