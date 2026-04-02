---
name: game-critique
description: Multi-agent pipeline to critique and evaluate a board game design. Runs consistency checks, adversarial balance analysis, and fun factor assessment with structured rubrics and targeted iteration loops.
---

# Board Game Critique Workflow (/game-critique)

Use this workflow to identify balance issues and assess the "fun factor" of an existing design. Requires `gameSlug` and `sessionId` arguments.

**Exit Criteria**: Stop iterating when **(a)** balance score ≥ 6/10 AND no HIGH severity issues remain **and (b)** fun score ≥ 7/10. Maximum **2 critique iterations** per run.

---

## Step 0: Pre-flight Compilation

1. **Sync Data**: Call `compile_markdown_rulebook` for the target game to ensure the Markdown rules are in sync with the JSON source of truth.

---

## Step 1: Consistency Check

1. **Run Script**: `npx ts-node .claude/skills/BoardGameDesign/scripts/consistency_checker.ts game-data/{gameSlug}/rulebooks/`
2. **Review**: If errors are found, ask the user to adjust rules or components before proceeding with critique agents.

---

## Step 1.5: Simulation Run (optional)

Check the design session for a step with `persona: "SimulationRunner"`. 

- **If found**: The critique agents will automatically load the report in their Phase 1 context loading. No action needed here.
- **If not found**: Optionally spawn the `simulation-runner` subagent before proceeding. The simulation report provides empirical heuristic scores (Seat Advantage, Strategy Diversity, Dead Actions, Game Length Variance) that ground the critics' theoretical analysis. Skip if the user wants a fast critique without simulation.

---

## Step 2 & 3: Balance + Fun Assessment (run in parallel)

Spawn **both** subagents simultaneously. Each receives `sessionId` and `gameSlug` for context loading.

### BalanceCritic Subagent

#### Phase 1: Context Loading
- Load design session + full rulebook
- Run balance_critic.ts script if available
- Extract economic parameters and mechanism specs

#### Phase 2: Adversarial Execution
- Stress-test 5 dimensions: Economy, Tempo, Interaction, Scalability, First-Player Advantage
- Hunt for exploits, infinite loops, dominant strategies
- Identify HIGH/MEDIUM/LOW severity issues

#### Phase 3: Persistence
- Call `add_design_step` with the balance report
- Return machine-parseable verdict block

**Output**: Structured Balance Report with:
- 5-dimension score table (1-10 per dimension)
- Issue catalog (severity, category, fix recommendation)
- Overall balance score
- Verdict: PASS | CONDITIONAL_PASS | FAIL

---

### FunFactorJudge Subagent

#### Phase 1: Context Loading
- Load design session + full rulebook
- Extract thematic blueprint, turn structure, endgame conditions

#### Phase 2: Qualitative Execution
- Evaluate 6 dimensions: Tension, Agency, Discovery, Social, Narrative, Replayability
- Simulate play mentally; identify highlight moments
- Assess engagement curve and downtime

#### Phase 3: Persistence
- Call `add_design_step` with the fun factor report
- Return machine-parseable verdict block

**Output**: Structured Fun Factor Report with:
- 6-dimension score table (1-10 per dimension)
- Overall fun score
- Highlight moments (3-5 specific scenarios)
- Downtime analysis
- Verdict: EXCITING | SOLID | FLAT | TEDIOUS

---

## Step 4: Iteration Loop

After collecting both reports:

1. **Check Exit Criteria**:
   - Balance score ≥ 6/10 AND no HIGH severity issues?
   - Fun score ≥ 7/10?
   - If both yes → **PASS**. Stop here.

2. **If Criteria Not Met**:
   - Extract HIGH severity issues from BalanceCritic report
   - Categorize each issue by responsible agent:
     - **Economy issues** → MechanicsArchitect (adjust parameters, resource generation/drain)
     - **Rule/pacing issues** → DetailsArchitect (rewrite turn structure, clarify mechanics)
     - **Component issues** → ComponentDesigner (add missing pieces, rebalance quantities)
   - Propose specific fixes for each HIGH issue
   - Ask user to approve fixes or skip iteration

3. **If Fixes Approved**:
   - Spawn the responsible agent(s) to apply targeted fixes
   - Each agent calls `update_rule` and/or `update_reference` as needed
   - Re-run `/game-critique` (up to 1 additional iteration, max 2 total)

4. **After 2 Iterations**:
   - If HIGH issues remain, surface them to the user rather than looping further
   - User can choose to proceed with known issues or continue iterating manually

---

## Key Differences from v1

- **Structured Rubrics**: Both critics use explicit scoring dimensions (5 for balance, 6 for fun)
- **Machine-Parseable Verdicts**: Both critics return structured verdict blocks for automation
- **Targeted Fix Dispatch**: HIGH issues are assigned to the specific agent responsible, not generic `update_rule`
- **Clear Exit Criteria**: Quantified thresholds (balance ≥ 6, fun ≥ 7) instead of vague "no HIGH issues"
- **Iteration Cap**: Max 2 passes prevents infinite loops
