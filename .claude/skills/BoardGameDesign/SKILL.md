---
name: BoardGameDesign
description: Specialized capabilities for board game creation, mechanical taxonomy, and automated balance/consistency analysis. Provides shared resources for the multi-agent game generation pipeline.
---

# Board Game Design Skill

This skill provides the necessary knowledge, tools, and validation infrastructure to design, analyze, and iterate on board game designs using the multi-agent pipeline.

## Capabilities

1. **Mechanics Taxonomy**: Access to a curated taxonomy of game mechanisms organized by category, with complexity scores, synergy data, and compatibility notes.
2. **Consistency Checking**: Automated verification that rule descriptions match physical component definitions.
3. **Adversarial Simulation**: Scripted heuristic analysis of game mechanics to identify dominant strategies and balance issues.
4. **Session Management**: Per-step document logging for design pipeline tracking.

## Resources

- `resources/mechanisms.json`: A structured database of game mechanisms with fields: `id`, `name`, `description`, `complexity` (1-5), `synergies` (array of compatible IDs), `compatibility_notes`. Organized by category (Turn Order, Action Selection, Economic Systems, Spatial Systems, Interaction Types, etc.).

## Scripts

- `scripts/consistency_checker.ts`: Parses component manifests and verifies their usage in rules text. Reports orphaned components (defined but unused) and mystery components (used but undefined). Exit code 0 = pass, 1 = errors found.
- `scripts/balance_critic.ts`: Heuristic-based balance analysis. Checks action point economy, reward variance, trap actions, and static vs. dynamic pricing. Reports findings with HIGH/MEDIUM/LOW severity tags.
- `scripts/session_manager.ts`: Manages design session directories and step-level logging. Commands: `init <gameSlug> <theme>`, `log <gameSlug> <step> [--summary] <content>`.

## Agent Pipeline

The following agents use this skill's resources:

| Agent | Stage | Output Contract | Self-Persists? |
|-------|-------|----------------|----------------|
| **mechanics-architect** | 1 | Mechanism Slate | Yes — `add_design_step` + `save_reference` + `update_rule` |
| **theme-weaver** | 2 | Thematic Blueprint | Yes — `add_design_step` + `update_rule` |
| **component-designer** | 3 | Component Manifest | Yes — `add_design_step` + `update_rule` + `save_reference` |
| **details-architect** | 4 | Complete Rulebook + Setup Manifest | Yes — `add_design_step` + `update_rule` + `save_reference` |
| **setup-validator** | 4.5 | Setup Validation Report | Yes — `add_design_step` |
| **simulation-runner** | 5 | Simulation Report (4-metric rubric) | Yes — `add_design_step` + `save_reference` |
| **balance-critic** | 6 | Balance Report (5-dimension rubric) | Yes — `add_design_step` |
| **fun-factor-judge** | 6 | Fun Factor Report (6-dimension rubric) | Yes — `add_design_step` |

All agents follow a 4-phase execution model:
1. **Context Loading**: Call `get_design_session` + load relevant prior work
2. **Research**: Call `list_references` to check existing game patterns
3. **Creative Execution**: Produce structured output following the agent's output contract
4. **Self-Persistence**: Call `add_design_step` + domain-specific MCP calls

## Usage Guidelines

- Both `/game-gen` (autonomous pipeline) and `/designer` (interactive co-design) use the subagents and scripts provided by this skill.
- Use the **mechanics-architect** subagent to select mechanisms from the taxonomy.
- Use the **consistency_checker** after the **component-designer** has specified the physical pieces (Step 3.5 in the pipeline).
- Use the **setup-validator** after the **details-architect** has written the rulebook (Step 4.5 in the pipeline).
- Always run the **balance-critic** and **fun-factor-judge** subagents on a complete design before concluding.
- Both critics produce machine-parseable verdict blocks that the pipeline uses for automated exit criteria.

## Scoring Rubrics

### Balance Critic — 5 Dimensions
| Dimension | What It Measures |
|-----------|-----------------|
| Economy | Resource generation vs drain, inflation, dead resources |
| Tempo | Snowballing, stalling, catch-up mechanics, game length |
| Interaction | Counterplay, kingmaking, player elimination |
| Scalability | Balance across 2P/3P/4P, economy sizing |
| First-Player Advantage | Starting player edge, compensation mechanisms |

### Fun Factor Judge — 6 Dimensions
| Dimension | What It Measures |
|-----------|-----------------|
| Tension | Meaningful pressure, risk/reward, escalation |
| Agency | Player control, strategic depth, decision quality |
| Discovery | Emergent combos, variety, hidden information |
| Social | Table talk, negotiation, shared moments |
| Narrative | Theme-mechanic fusion, story progression |
| Replayability | Variable setup, multiple strategies, content depth |
