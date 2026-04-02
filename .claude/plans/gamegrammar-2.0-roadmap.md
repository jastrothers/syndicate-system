# GameGrammar 2.0 Roadmap — Tier 2 & 3

Tier 1 (foundation fixes) has been implemented. This file captures the remaining enhancements for future implementation.

---

## TIER 2: Capability Upgrades (1-2 weeks each)

### 2.1 Rule Clarity Adversary (New Subagent)

**Research concept**: "Rule Clarity Score" — identify ambiguous rules by how differently they can be interpreted.

**Changes**:

**A) New subagent**: `.claude/agents/rules-lawyer.md`
- Persona: adversarial rules reader who tries to misinterpret every rule
- Phase 1: Load rulebook via `get_full_rulebook_markdown`
- Phase 2: For each rule section, attempt to find:
  - Ambiguous phrasing (could be read two ways)
  - Missing edge cases (deck empty, 0 resources, simultaneous triggers)
  - Undefined terms (words used but never defined in glossary or special rules)
  - Contradictions between sections
  - Timing ambiguities ("before" vs "after" vs "when")
- Phase 3: Structured output — 1-10 clarity score per section, aggregate clarity score, issue catalog
- Phase 4: Call `add_design_step` with persona "RulesLawyer"

**B) Integrate into critique**: `.claude/skills/game-critique/SKILL.md`
- Add rules-lawyer as a third parallel agent in Step 2-3 (alongside balance-critic and fun-factor-judge)
- Update exit criteria: add "clarity score >= 7/10" to the pass conditions
- In iteration loop: clarity issues route to DetailsArchitect for rewrites

**Complexity**: M | **Files**: 2 new, 1 edited

---

### 2.2 Simulation Smoke Test (New Pipeline Step)

**Research concept**: "MCTS/RL Simulation" adapted to our constraints — no Python, no external engine, but we have a full playtest infrastructure.

**Changes**:

**A) New subagent**: `.claude/agents/simulation-runner.md`
- Given a completed rulebook + setup manifest, it:
  1. `create_session` for the game
  2. Sets up initial state from DetailsArchitect's Setup Manifest
  3. Simulates 3-5 abbreviated games (first 5-8 turns) with strategies:
     - **Random**: uniformly random legal actions
     - **Greedy**: highest immediate-scoring action
     - **Strategic**: LLM plays to win
  4. Records via `record_action` and `log_playtest_note`
  5. Produces Simulation Report with heuristic balance scores:
     - Seat Advantage, Strategy Diversity, Dead Actions, Game Length Variance

**B) New pipeline step**: `.claude/skills/game-gen/SKILL.md` — "Step 4.5: Simulation Smoke Test"
- Runs simulation-runner between DetailsArchitect and Critique
- Passes Simulation Report data to balance-critic and fun-factor-judge

**Complexity**: L | **Depends on**: DetailsArchitect already producing setup manifests

---

### 2.3 Structural Consistency Checker (Script Rewrite)

**Research concept**: "Consistency Contracts" — move from regex heuristics to structural JSON validation.

**Changes**:
- `.claude/skills/BoardGameDesign/scripts/consistency_checker.ts` — Rewrite to:
  1. Load `draft.json` or `latest.json` directly as parsed JSON
  2. Read `rulebook.components[]` array for the manifest
  3. Use `extractJsonStrings()` on `rulebook.sections` to get all rule text
  4. Verify each `component.name` appears in rule text
  5. Verify every component-like noun in rule text has a matching `components[]` entry
  6. Check that each mechanism has at least one supporting component
  7. Output structured JSON report

**Complexity**: M | **Files**: 1

---

### 2.4 Design Branching (Fork/Unfork)

**Research concept**: "Design Stack (Pushdown Automaton)" — fork experimental changes for A/B testing.

**Changes**:

**A) New MCP tools**: `game-rules-system-mcp/src/handlers/design/branching.ts`
- `fork_design(gameName, branchName, description)` — snapshot + create branch draft
- `compare_branches(gameName, branchA, branchB)` — structured diff
- `merge_branch(gameName, branchName, confirm: true)` — promote branch to latest

**B) Register tools**: `game-rules-system-mcp/src/index.ts`
**C) Type extension**: `types/index.ts` — add `parentVersion?: string` to `Rulebook.metadata`
**D) Skill integration**: `.claude/skills/designer/SKILL.md` — document fork/unfork workflow

**Complexity**: M | **Depends on**: existing versioning infrastructure

---

## TIER 3: Major Initiatives (Multi-week, phased)

### 3.1 TTS Save Exporter

**Phase 1**: `.claude/skills/BoardGameDesign/resources/tts-component-map.json` — Component type to TTS object mapping
**Phase 2**: `game-rules-system-mcp/src/services/TTSExportService.ts` — Export service
**Phase 3**: `game-rules-system-mcp/src/handlers/game/export.ts` — `export_tts_save` MCP tool
**Phase 4**: Pipeline integration — optional Step 7 in game-gen

**Complexity**: L | **Depends on**: 2.3 (structured components)

---

### 3.2 Living Grammar (Playtest-Driven Refinement Loop)

**Phase 1**: `game-rules-system-mcp/src/services/PlaytestAnalysisService.ts` — aggregate stats from session ledgers
- New MCP tool: `analyze_playtest_data(gameName)` → structured stats JSON

**Phase 2**: `.claude/agents/refinement-analyst.md` — subagent that reads playtest stats, identifies anomalies, proposes evidence-backed rule changes

**Phase 3**: Closed loop in `/designer` — after playtests, invoke refinement-analyst, apply changes via `update_rule` + `record_decision`

**Complexity**: L | **Depends on**: 2.2 (simulation generates playtest data)

---

## Excluded Features

| Feature | Reason |
|---|---|
| Boardwalk Logic Gen | Requires Python + academic GGP framework |
| Full MCTS/RL Agents | Requires compiled game engine |
| Sketch-to-Ontology | Requires VLM image processing |
| Hybrid Toolkit | Product-level scope (NFC/QR) |
| Legacy Grammar | Lower priority; can be added independently later |
