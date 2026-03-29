---
name: game-critique
description: Multi-agent pipeline to critique and evaluate a board game design. Runs consistency checks, structured balance analysis (5 dimensions), and fun factor assessment (6 dimensions) with machine-parseable verdicts and targeted fix loops.
---

# Board Game Critique Workflow v2.0 (/game-critique)

Use this workflow to identify balance issues and assess the fun factor of an existing design. Both critics produce structured, machine-parseable verdicts with dimensional scoring rubrics.

**Usage**: `/game-critique <gameSlug> <sessionId>`

**Exit criteria**: Stop iterating when ALL of the following are met:
- **(a)** No HIGH severity balance issues remain
- **(b)** Fun score >= 7/10
- **(c)** Balance score >= 6/10

Maximum **2 critique iterations** per run — if issues persist after 2 passes, surface the remaining issues to the user rather than looping further.

---

## Step 0: Pre-flight

1. **Sync Data**: Trigger `compile_markdown_rulebook` for the target game. This ensures the Markdown rules used by the agents are in sync with the JSON source of truth.
2. **Load Session**: Call `get_design_session` to verify the session exists and note how many steps have been logged so far (to assign correct step numbers to critique agents).

---

## Step 1: Consistency Check

1. **Run Script**:
   ```bash
   npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/{gameSlug}/rulebooks/
   ```
2. **Evaluate Results**:
   - If **0 warnings**: proceed to Step 2.
   - If **1-3 warnings**: note them and pass to the critics as context (they may catch the same issues).
   - If **4+ warnings**: apply targeted fixes using `update_rule`, re-run checker. Maximum 2 fix attempts before proceeding.

---

## Step 2 & 3: Balance Review + Fun Assessment (run in parallel)

Spawn **both** subagents simultaneously in a single message. Each receives `sessionId` and `gameSlug`. Collect both outputs before proceeding to Step 4.

### balance-critic subagent (Step 2)

The agent is self-sufficient (v2.0). It will:

#### Phase 1: Context Loading
- Call `get_design_session(sessionId)` to load all design steps
- Call `get_full_rulebook_markdown(gameSlug)` to load the compiled rulebook
- Run `balance_critic.ts` script for automated heuristic analysis

#### Phase 2: Adversarial Execution
- Score 5 dimensions: **Economy**, **Tempo**, **Interaction**, **Scalability**, **First-Player Advantage**
- Each dimension scored 1-10 with key findings
- Catalog all issues with severity tags (HIGH/MEDIUM/LOW)
- Identify and document exploit scenarios
- Produce machine-parseable verdict block

#### Phase 3: Persistence
- Call `add_design_step` with the full Balance Report

**Expected Output Format**:
```
VERDICT: {PASS | CONDITIONAL_PASS | FAIL}
OVERALL_SCORE: {X}/10
HIGH_ISSUES: {count}
MEDIUM_ISSUES: {count}
LOW_ISSUES: {count}
BLOCKING: {YES/NO}
```

Plus the full dimensional analysis, issue catalog, and fix priority list with responsible agent assignments.

---

### fun-factor-judge subagent (Step 3)

The agent is self-sufficient (v2.0). It will:

#### Phase 1: Context Loading
- Call `get_design_session(sessionId)` to load all design steps
- Call `get_full_rulebook_markdown(gameSlug)` to load the compiled rulebook

#### Phase 2: Qualitative Execution
- Score 6 dimensions: **Tension**, **Agency**, **Discovery**, **Social**, **Narrative**, **Replayability**
- Each dimension scored 1-10 with key findings
- Identify 4-5 Highlight Moments
- Map the Engagement Curve (early/mid/late)
- Assess Player Experience at each count
- Analyze Downtime
- Produce machine-parseable verdict block

#### Phase 3: Persistence
- Call `add_design_step` with the full Fun Factor Report

**Expected Output Format**:
```
VERDICT: {EXCITING | SOLID | FLAT | TEDIOUS}
OVERALL_FUN: {X}/10
BEST_PLAYER_COUNT: {N}P
WEAKEST_DIMENSION: {name}
STRONGEST_DIMENSION: {name}
ENGAGEMENT_CURVE: {shape}
```

Plus the full dimensional analysis, highlight moments, and enhancement suggestions.

---

## Step 4: Evaluation & Fix Loop

### 4.1: Parse Verdicts

Extract the machine-parseable verdict blocks from both agents:

- **Balance Verdict**: PASS/CONDITIONAL_PASS/FAIL, overall score, HIGH issue count
- **Fun Verdict**: EXCITING/SOLID/FLAT/TEDIOUS, overall fun score, weakest dimension

### 4.2: Check Exit Criteria

| Criterion | Source | Threshold | Met? |
|-----------|--------|-----------|------|
| No HIGH balance issues | Balance Report | HIGH_ISSUES = 0 | {Y/N} |
| Balance score | Balance Report | OVERALL_SCORE >= 6 | {Y/N} |
| Fun score | Fun Factor Report | OVERALL_FUN >= 7 | {Y/N} |

- If **ALL criteria met**: Design passes critique. Proceed to output.
- If **any criterion fails**: Proceed to 4.3 (fix loop).

### 4.3: Targeted Fix Dispatch

For each unresolved HIGH issue or failing criterion, identify the responsible agent and apply fixes:

| Issue Category | Responsible Agent | Fix Method |
|---------------|-------------------|------------|
| Economy imbalance (resource gen/drain) | MechanicsArchitect | Adjust parameters via `update_rule` on mechanics section |
| Tempo issues (snowballing, stalling) | MechanicsArchitect + DetailsArchitect | Adjust action economy and end-game triggers |
| Interaction gaps (solitaire play) | MechanicsArchitect | Consider adding interaction mechanism |
| Scalability failures | ComponentDesigner + DetailsArchitect | Adjust player-count scaling rules and components |
| First-player advantage | DetailsArchitect | Add compensation mechanism in setup/turn order |
| Low tension | MechanicsArchitect | Add risk/reward or tighter action economy |
| Low agency | DetailsArchitect | Add strategic options or reduce randomness |
| Low discovery | ComponentDesigner | Add variety (more cards, modular setup) |
| Low social | MechanicsArchitect | Add interaction mechanisms (trading, drafting) |
| Low narrative | ThemeWeaver | Strengthen thematic integration |
| Low replayability | ComponentDesigner | Add variable setup, asymmetric starting positions |
| Rule ambiguity | DetailsArchitect | Clarify specific rule sections |
| Component mismatch | ComponentDesigner | Adjust component quantities or specs |

**Fix Process**:
1. For each HIGH issue, apply the specific fix from the Balance Report's "Fix Priority" list using `update_rule`.
2. For each fun dimension below 5, apply the relevant "Enhancement Suggestion" from the Fun Factor Report.
3. After fixes, re-compile the rulebook with `compile_markdown_rulebook`.

### 4.4: Re-evaluate (if needed)

If fixes were applied:
1. Re-run both critics (spawn balance-critic and fun-factor-judge in parallel again).
2. Parse new verdicts.
3. Check exit criteria again.
4. If still failing after 2 total iterations, **surface remaining issues to the user** with a clear summary:
   - What passed
   - What still fails
   - What was tried
   - Recommended manual fixes

---

## Output Summary

After critique completes (pass or max iterations reached), produce a consolidated report:

```
## Critique Summary for {Game Title}

### Balance: {PASS/CONDITIONAL_PASS/FAIL} — {X}/10
| Dimension | Score |
|-----------|-------|
| Economy | {X}/10 |
| Tempo | {X}/10 |
| Interaction | {X}/10 |
| Scalability | {X}/10 |
| First-Player | {X}/10 |

### Fun Factor: {EXCITING/SOLID/FLAT/TEDIOUS} — {X}/10
| Dimension | Score |
|-----------|-------|
| Tension | {X}/10 |
| Agency | {X}/10 |
| Discovery | {X}/10 |
| Social | {X}/10 |
| Narrative | {X}/10 |
| Replayability | {X}/10 |

### Iterations: {1 or 2}
### Outstanding Issues: {count remaining HIGH issues, or "None"}
### Fixes Applied: {count of fixes applied during iteration}
```
