---
description: Multi-agent pipeline to critique and evaluate a board game design.
---

# Board Game Critique Workflow (/game-critique)

Use this workflow to identify balance issues and assess the "fun factor" of an existing design.

## Step 0: Pre-flight Compilation

1. **Sync Data**: Trigger the `compile_markdown_rulebook` tool for the target game. This ensures the Markdown rules used by the scripts are in sync with the JSON source of truth.

## Step 1: Consistency Check

1. **Run Script**: Execute `ts-node .agents/skills/BoardGameDesign/scripts/consistency_checker.ts <path-to-design>`.
2. **Fix**: If errors are found, ask the user to adjust rules or components.

## Step 2: Adversarial Balance Review

1. **Activate Persona**: Execute the `/balance-critic-flow` workflow.
2. **Run Script**: Execute `npx ts-node .agents/skills/BoardGameDesign/scripts/balance_critic.ts <path-to-design>`.
3. **Output**: Generate a Balance Report identifying high-severity issues.

## Step 3: Fun Factor Assessment

1. **Activate Persona**: Execute the `/fun-factor-judge-flow` workflow.
2. **Input**: Provide the Rulebook and the Balance Report.
3. **Output**: A qualitative review with a 1-10 fun score and specific engagement highlights.

## Step 4: Iteration Loop

1. **Propose Fixes**: Suggest specific mechanical changes to address the critic's concerns.
2. **Update**: Use `update_rule` to apply the agreed-upon changes.
3. **Re-evaluate**: Run `/game-critique` again to verify the fixes.
