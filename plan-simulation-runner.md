# Plan: Simulation Runner (Roadmap 2.2)

## Context

The game-gen pipeline currently has a lightweight Step 5 — the orchestrator plays 2-3 turns of a single game with one strategy and logs observations. This is a smoke test that catches unplayable states but generates no quantitative data.

The **balance-critic** and **fun-factor-judge** (Step 6) are purely theoretical — they read the rulebook and reason about potential issues. They never observe actual gameplay. This means balance analysis is based on expert intuition, not empirical evidence.

The simulation-runner upgrades Step 5 into a dedicated subagent that runs 3 abbreviated games with distinct strategy profiles (Random, Greedy, Strategic), produces quantitative heuristic scores (Seat Advantage, Strategy Diversity, Dead Actions, Game Length Variance), and feeds empirical evidence to the downstream critics.

**Key differentiator**: The balance-critic is *static analysis* (reads rules, reasons about them). The simulation-runner is *dynamic analysis* (plays the game, observes outcomes). Together they form a static+dynamic analysis pair — the same pattern as code review + running tests.

---

## Files to Create

### 1. `.claude/agents/simulation-runner.md` — The Agent Definition

**Persona**: Empirical playtester. Methodical, data-oriented lab technician. Does not theorize about balance — plays the game and records what happens.

**Inputs**: `sessionId`, `gameSlug`, `playerCount` (default: 2)

**Phase 1 — Context Loading**:
1. `get_design_session(gameName, sessionId)` — load Steps 1-4.5
2. `get_full_rulebook_markdown(gameSlug)` — complete rules text
3. `get_reference(name: "setup_manifest", game: gameSlug)` — machine-readable setup spec
4. Extract from rulebook: action catalog, turn structure phases, scoring paths, endgame trigger

**Phase 2 — Simulation Execution** (3 games, sequential):

For each game (Random, Greedy, Strategic):
1. `create_session(gameSlug)` — one MCP session per game, tagged with strategy metadata
2. Reconstruct initial state from Setup Manifest via `update_game_state`
3. Build decks via `create_deck_from_template` / `create_deck_from_reference`
4. For each turn (5-8 turns, or until endgame trigger):
   - `get_game_state(sessionId)` — read current state
   - Enumerate legal actions by interpreting rules against state
   - Choose action per strategy profile (see below)
   - Execute via MCP tools (`draw_from_deck`, `move_entity`, `roll_dice`, `update_game_state`)
   - `record_action(sessionId, actionType, actor, data)` — log the mechanical action
   - `log_playtest_note` — batch observations per turn
5. Record final scores and endgame status

**Strategy Profiles** (different LLM decision postures, same agent):
- **Random**: Enumerate legal actions, use `roll_dice` (die sized to action count) to pick uniformly. No optimization.
- **Greedy**: Evaluate each legal action's immediate single-turn payoff. Pick highest. No multi-turn planning.
- **Strategic**: Play to win. Consider board position, opponent state, scoring efficiency. Plan 2-3 turns ahead.

**Phase 3 — Structured Output (Simulation Report)**:

Per-game summary table (strategy, turns played, winner, final scores, endgame trigger, notes).

Four heuristic scores (0-10):
| Metric | Measures | Calculation |
|--------|----------|-------------|
| Seat Advantage | P1 vs P2 outcome bias | 10 minus deductions per % deviation from 50/50 win rate |
| Strategy Diversity | Skill gradient (Strategic > Greedy > Random) | 10 if clear ordering with gaps; lower if strategies converge or Random beats Strategic |
| Dead Actions | Design space utilization | (actions used / actions available) × 10; flag never-chosen actions |
| Game Length Variance | Endgame consistency | 10 at low CoV (<15%); decreasing as CoV rises; capped at 5 if any game hit turn limit |

Verdict: `PASS` (≥7 overall, no metric <5) | `CONCERNS` (≥5 overall, no metric <3) | `FAIL` (<5 overall or any metric <3)

Targeted observation sections: "For BalanceCritic" and "For FunFactorJudge" with 2-5 bullet points each of empirical evidence relevant to their scoring dimensions.

Session IDs listed for forensic review.

**Phase 4 — Self-Persistence**:
1. `add_design_step` — stepNumber 5, persona "SimulationRunner", full report + trace block
2. `save_reference` — name "simulation_report", compact critic-facing summary

**Scope constraints** (context budget management):
- 3 games (not 5) — one per strategy
- 2 players (default) — halves per-turn work
- Sequential games — no parallelism within the agent
- Compressed state reading — `get_game_state` with filtered fields, not full dump
- Batch observations — one `log_playtest_note` per turn, not per sub-action
- Early termination — stop on unplayable state or loop detection

---

## Files to Modify

### 2. `.claude/skills/game-gen/SKILL.md` (~line 137-150)

Replace the current Step 5 block ("Playtest Simulation (NEW)" — orchestrator-handled 2-3 turns) with a subagent spawn:

```
## Step 5: Playtest Simulation

Spawn the `simulation-runner` subagent with `sessionId`, `gameSlug`, and `playerCount` (default: 2).

The agent:
1. Loads the complete rulebook and setup manifest
2. Creates 3 MCP playtest sessions (one per strategy: Random, Greedy, Strategic)
3. Simulates 5-8 turns per game
4. Produces a Simulation Report with 4 heuristic scores
5. Self-persists via `add_design_step` (persona: "SimulationRunner") and `save_reference`

**After**: Call `record_decision` with `decision: "accept"`, a rationale summarizing findings, and `impactedMechanisms` for any flagged mechanisms.
```

### 3. `.claude/skills/game-gen-step/SKILL.md`

**Phase map table** (~line 32): Change `Orchestrator: MCP playtest tools` → `simulation-runner subagent`

**Phase: `playtest` definition** (~line 174-184): Replace orchestrator instructions with subagent spawn pattern (matching the game-gen Step 5 above).

### 4. `.claude/agents/balance_critic.md` (~line 14-29)

In Phase 1 (Context Loading), add step 4:
> **Load Simulation Report (if available)**: Check for a step with `persona: "SimulationRunner"` in the design session. If found, load `get_reference(name: "simulation_report", game: gameSlug)`. Use the "For BalanceCritic" observations as empirical evidence to support or challenge theoretical analysis. Cross-reference: Seat Advantage → First-Player Advantage dimension; Strategy Diversity → dominant strategy analysis; Dead Actions → trap option analysis; resource flow rates → Economy dimension.

Remove the line "Do not call `get_game_state` — there is no playtest session during generation" since simulation sessions now exist.

Add a "Simulation Evidence" section to Phase 3 output format, summarizing where empirical data confirmed or contradicted theoretical analysis.

### 5. `.claude/agents/fun-factor-judge.md` (~line 14-27)

In Phase 1 (Context Loading), add step 4 (same pattern as balance_critic):
> **Load Simulation Report (if available)**: Check for SimulationRunner step. If found, load simulation reference. Use "For FunFactorJudge" observations: tension moments, agency indicators, pacing observations, dead zones.

Remove the parallel "Do not call `get_game_state`" line.

Add "Simulation Evidence" section to output format.

### 6. `.claude/skills/game-critique/SKILL.md` (~line 27)

Between Step 1 (Consistency Check) and Steps 2-3 (Balance + Fun), add:

```
## Step 1.5: Load Simulation Data

Check for a SimulationRunner step (stepNumber 5) in the design session:
- If found: load `get_reference(name: "simulation_report", game: gameSlug)`. Pass targeted sections to each subagent as additional input context.
- If not found: proceed without simulation data (backward compatible).
```

### 7. `.claude/skills/BoardGameDesign/SKILL.md` (~line 37)

Add row to Agent Pipeline table:
```
| **simulation-runner** | 5 | Simulation Report (4-metric rubric) | Yes — `add_design_step` + `save_reference` |
```

Update balance-critic stage from `5/6` → `6` and fun-factor-judge from `5/6` → `6`.

---

## Implementation Order

1. **Create** `simulation-runner.md` — the core agent definition (largest piece)
2. **Update** `BoardGameDesign/SKILL.md` — add to pipeline table
3. **Update** `game-gen/SKILL.md` — replace Step 5
4. **Update** `game-gen-step/SKILL.md` — update phase map + playtest phase
5. **Update** `balance_critic.md` — add simulation evidence consumption
6. **Update** `fun-factor-judge.md` — add simulation evidence consumption
7. **Update** `game-critique/SKILL.md` — add simulation data pre-loading step

Steps 1-4 are the "make it work" group. Steps 5-7 are the "feed critics" group.

---

## Verification

1. **Standalone test**: Spawn simulation-runner manually via `/designer` against an existing game (e.g., PokéNursery). Verify it creates 3 sessions, runs turns, produces the report format, and persists via `add_design_step` + `save_reference`.

2. **Pipeline integration**: Run `/game-gen` with a simple theme. Verify Step 5 spawns simulation-runner instead of orchestrator playtest. Verify critique step loads and cites simulation data.

3. **Resumability**: Run `/game-gen-step --continue` through the playtest phase. Verify `--status` shows playtest as complete when a SimulationRunner step exists.

4. **Backward compatibility**: Run `/game-critique` standalone on a game with no simulation data. Verify it still works (graceful fallback).
