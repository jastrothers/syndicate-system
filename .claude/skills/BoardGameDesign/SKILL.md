---
name: BoardGameDesign
description: Specialized capabilities for board game creation, mechanical taxonomy, and automated balance/consistency analysis.
---

# Board Game Design Skill

This skill provides the necessary knowledge and tools to design, analyze, and iterate on board game designs using a multi-agent pipeline.

## Capabilities

1. **Mechanics Taxonomy**: Access to a curated taxonomy of game mechanisms organized by category.
2. **Consistency Checking**: Automated verification that rule descriptions match physical component definitions.
3. **Adversarial Simulation**: Scripted "red-teaming" of game mechanics to identify dominant strategies and balance issues.
4. **Session Management**: Per-step document logging.

## Resources

- `resources/mechanisms.json`: A structured database of game mechanisms with compatibility data.

## Scripts

- `scripts/consistency_checker.ts`: Evaluates the integrity of a design document.
- `scripts/balance_critic.ts`: Performs mechanical simulations to identify balance concerns.
- `scripts/session_manager.ts`: Manages generation runs and step-level logging.

## Usage Guidelines

- Both `/game-gen` (autonomous pipeline) and `/designer` (interactive co-design) use the subagents and scripts provided by this skill.
- Use the **mechanics-architect** subagent to select mechanisms from the taxonomy.
- Use the **consistency_checker** after the **component-designer** has specified the physical pieces.
- Always run the **balance-critic** and **fun-factor-judge** subagents on a complete design before concluding.
