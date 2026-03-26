---
name: game-critique
description: Multi-agent pipeline to critique and evaluate a board game design. Runs consistency checks, adversarial balance analysis, and fun factor assessment with an iteration loop.
---

# Board Game Critique Workflow (/game-critique)

Use this workflow to identify balance issues and assess the "fun factor" of an existing design. Requires `gameSlug`, `sessionId` arguments.

**Exit criteria**: Stop iterating when **(a)** no HIGH severity balance issues remain **and (b)** fun score ≥ 7/10. Maximum **2 critique iterations** per run — if issues persist after 2 passes, surface them to the user rather than looping further.

---

## Step 0: Pre-flight Compilation

1. **Sync Data**: Trigger `compile_markdown_rulebook` for the target game. This ensures the Markdown rules used by the scripts are in sync with the JSON source of truth.

---

## Step 1: Consistency Check

1. **Run Script**: `npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts <path-to-design>`
2. **Fix**: If errors are found, ask the user to adjust rules or components before proceeding.

---

## Step 2 & 3: Adversarial Balance Review + Fun Factor Assessment (run in parallel)

Spawn **both** subagents simultaneously in a single message. Each receives `sessionId` and `gameSlug` for context loading. Collect both outputs before proceeding to Step 4.

### balance-critic subagent

#### Phase 1: Context Loading
See `balance-critic` agent spec — loads `get_design_session` + `get_full_rulebook_markdown`.

#### Phase 2: Adversarial Execution
1. Run adversarial simulations or mental stress tests.
2. Identify HIGH, MEDIUM, and LOW severity issues with proposed fixes.
3. If applicable, invoke the balance script: `npx ts-node .claude/skills/BoardGameDesign/scripts/balance_critic.ts <path-to-design>`

#### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the balance report.
2. **Present**: Surface the balance findings.

**Output**: Balance Report identifying severity-tagged issues.

---

### fun-factor-judge subagent

#### Phase 1: Context Loading
See `fun-factor-judge` agent spec — loads `get_design_session` + `get_full_rulebook_markdown`.

#### Phase 2: Qualitative Execution
1. Evaluate tension — does the action economy drive meaningful choices?
2. Identify the core "hook" and assess player satisfaction.
3. Consider player downtime and social dynamics across 2-4 players.

#### Phase 3: Persistence
1. **Log**: Call `add_design_step` with the fun factor assessment.

**Output**: Qualitative review with a 1-10 fun score and specific engagement highlights.

---

## Step 4: Iteration Loop

1. **Check exit criteria**: If no HIGH severity issues remain **and** fun score ≥ 7/10 — stop. The design passes critique.
2. **Propose Fixes**: Suggest specific mechanical changes to address the critic's concerns.
3. **Update**: Use `update_rule` to apply agreed-upon changes.
4. **Re-evaluate**: Run `/game-critique` again (up to 1 additional iteration). After 2 total passes, surface remaining issues to the user instead of iterating further.
