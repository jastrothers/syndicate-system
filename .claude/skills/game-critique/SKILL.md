---
name: game-critique
description: Multi-agent pipeline to critique and evaluate a board game design. Runs consistency checks, adversarial balance analysis, and fun factor assessment with an iteration loop.
---

# Board Game Critique Workflow (/game-critique)

Use this workflow to identify balance issues and assess the "fun factor" of an existing design. Requires a `gameSlug` argument.

## Step 0: Pre-flight Compilation

1. **Sync Data**: Trigger `compile_markdown_rulebook` for the target game. This ensures the Markdown rules used by the scripts are in sync with the JSON source of truth.

---

## Step 1: Consistency Check

1. **Run Script**: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts <path-to-design>`
2. **Fix**: If errors are found, ask the user to adjust rules or components before proceeding.

---

## Step 2: Adversarial Balance Review

Spawn the `balance-critic` subagent. It will:

### Phase 1: Context Loading
1. Call `get_designer_profile`.
2. Call `get_game_state`.

### Phase 2: Adversarial Execution
1. Run adversarial simulations or mental stress tests.
2. Identify HIGH, MEDIUM, and LOW severity issues with proposed fixes.
3. If applicable, invoke the balance script: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/balance_critic.ts <path-to-design>`

### Phase 3: Nova Loop & Persistence
1. **Trace**: Output Trace Block (Observation, Data, Mechanism, Impact).
2. **Log**: Call `add_design_step` with the balance report.
3. **Reason**: Ask the user: "Is this exploit a deal-breaker, or do you want to lean into this combo as a feature?"
4. **Sync**: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 5 --summary "Completed balance critique."`

**Output**: Balance Report identifying high-severity issues.

---

## Step 3: Fun Factor Assessment

Spawn the `fun-factor-judge` subagent. It will:

### Phase 1: Context Loading
1. Call `get_designer_profile`.
2. Call `get_game_state`.

### Phase 2: Qualitative Execution
1. Evaluate tension — does the action economy drive meaningful choices?
2. Identify the core "hook" and assess player satisfaction.
3. Consider player downtime and social dynamics across 2-4 players.

### Phase 3: Nova Loop & Persistence
1. **Trace**: Output Trace Block.
2. **Log**: Call `add_design_step` with the fun factor assessment.
3. **Reason**: If `workflowAutomation` is false, ask: "Does this engagement profile match your intended vibe?" Otherwise proceed.
4. **Sync**: `cmd /c npx ts-node .claude/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 6 --summary "Completed fun factor assessment."`

**Output**: Qualitative review with a 1-10 fun score and specific engagement highlights.

---

## Step 4: Iteration Loop

1. **Propose Fixes**: Suggest specific mechanical changes to address the critic's concerns.
2. **Update**: Use `update_rule` to apply agreed-upon changes.
3. **Re-evaluate**: Run `/game-critique` again to verify the fixes resolved the issues.
