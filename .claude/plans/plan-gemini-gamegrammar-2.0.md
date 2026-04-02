# GameGrammar 2.0 Enhancement Plan

## 1. Goals (high-level)

- Build a stateful co-designer platform for board games.
- Add deterministic validation + synthesis pipeline.
- Close implementation gap with automated prototype generation.
- Provide active balance/autodetect tools.
- Be modular (Perception, Memory, Reasoning, Execution, Verification).

## 2. Phase 1: Core logic + baseline infrastructure (months 1–4)

### 2.1 Setup

- Repo: `game-rules-system-mcp`.
- Add scaffolding:
  - `src/engine/GrammarEngine.ts`
  - `src/engine/RuleSynthesizer.ts`
  - `src/engine/SimulationAdapter.ts`
  - `src/pipeline/NovaOrchestrator.ts`

### 2.2 Ontology/Catalog

- Define JSON schema:
  - `mechanics`, `components`, `topology`, `balance`, `state`
- Develop `Zod` / `Ajv` schemas in `src/types/`.
- Add converter to existing rulebook format.

### 2.3 Rulebook CRUD extension

- Add new tool:
  - `mcp_game-rules-sy_infer_rulebook` (generate from partial spec)
  - `mcp_game-rules-sy_grow_grammar` (add rule templates)
- Extend `RulebookStore` with `grow` operations.

### 2.4 Stateless play/execution adapter

- Implement baseline `BoardwalkAdapter`:
  - `setup(state)`, `validMoves(state)`, `applyMove(state)`, `endCondition(state)`.
- Add test with simplified “Love Letter clone.”

### 2.5 Nova style decision logging

- Add in `NovaService`:
  - structural actions + reasoning trace.
  - persist in `game-data/[game]/design/*.json`.
- Add `mcp_game-rules-sy_get_designer_profile`.

### 2.6 Immediate validation tests

- Add unit test file:
  - `tests/unit/engine/GrammarEngine.test.ts`
- Validate:
  - round-trip JSON ↔ Markdown
  - rulebook with missing component fails
  - loop detection via constraint rule

## 3. Phase 2: Balanced simulation + data-driven adaptation (months 5–9)

### 3.1 Simulation framework

- Integrate `MCTSService` in `src/services/`.
- Add `RandomAgent`, `HeuristicAgent`, `MCTSAgent`.
- Add scoring:
  - seat advantage, strategy diversity, game length variance, dead actions, stalemate rate.

### 3.2 “Living Grammar” adjustment loop

- Add `BalanceCriticService`.
- Objective:
  - detect degenerate strategy, rules skeleton exploited, action heatmap.
- Implement modification proposal:
  - e.g., cost adjustment, curve shift, resource caps.

### 3.3 Continuous validation harness

- Create `scripts/simulate-batch.ts`.
- run 300 seeds, store:
  - `game-data/[game]/playtests/{date}/report.json`.
- Add auto-flag if win-rate disparity > 15%.

### 3.4 UI/Audit

- Add CLI command:
  - `npm run report-balance -- [game]`.
- Output metrics + top 3 problem rules.

### 3.5 Tests

- `tests/integration/balance-loop.test.ts`
- Assert:
  - `MCTS > Random` for “good game”
  - new grammar version scores improve on repeats.

## 4. Phase 3: Multimodal perception + sketch-to-ontology (months 10–15)

### 4.1 Perception endpoints

- Add `mcp_game-rules-sy_parse_layout`.
- Accept sketches:
  - structured node-edge triples.
  - output: canonical board topology JSON.

### 4.2 Vision bridging

- Implement stub to integrate VLM later:
  - `src/services/SketchService`.
- Support `guessTileAdjacency`, `inferResourceType`.

### 4.3 design side

- Store latent maps in `game-data/[game]/design/`
- Add simplified map UI in `game-viewer` if convenient.

### 4.4 Robustness

- require fallback:
  - user corrected board after parse (manual).
- link parse errors with suggestions.

### 4.5 Tests

- `tests/unit/services/SketchService.test.ts`.
- Validate on synthetic input:
  - tile adjacency, 3-component relation, invalid geometry.

## 5. Phase 4: Physical-to-digital (months 16–24)

### 5.1 TTS export tool

- add store-specific:
  - `mcp_game-rules-sy_export_tts`.
- generate:
  - `ObjectStates`, `CustomDeck`, `Global.LuaScript`.
- add config in `src/config/`.

### 5.2 Persistence and "world state"

- Extend data model to add:
  - `component.permanent`, `rule.evolutive`.
- implement path for permanent modifications:
  - add checkpoint and fork handling.

### 5.3 Hybrid support

- add `DigitalAgent` node in `mechanics`.
- allow:
  - hidden information management.
  - online score upkeep, NFC token ID.

### 5.4 E2E

- `tests/e2e/tts-export.test.ts`
- verify generated JSON loads in TTS tools (snapshot).

### 5.5 Documentation

- Write markdown:
  - `docs/grammar-v2-roadmap.md` (published in repo).
- include:
  - "how to migrate existing games".
  - "reference: rule templates".

## 6. Continuous milestones + quality checks

- Daily: run `npm test`.
- Weekly: run `npm run build && node --test build/tests/*`.
- After every data write: run `npm run build && npm test`.
- Add static as much as possible.
- Add security check (no untrusted eval).
- Add format style:
  - `prettier` for markdown+ts.

## 7. Quick wins (immediate MVP)

1. Add `mcp_game-rules-sy_evaluate_game_state` to compute simple stats quickly.
2. Add rulebook linting:
   - missing `setup` / `turn` / `end`.
3. Add `mcp_game-rules-sy_create_deck_from_template` if missing.
4. Add `mcp_game-rules-sy_log_playtest_note` in batch script.
5. Add "novice friendly" doc in root about the pipeline.

## 8. Risk management

- keep strict schema and version code.
- avoid direct DB overrides.
- handle fork conflict with copy-on-write.
- "physical sketch" in Phase 3 can stay offline while integration matures.

## 9. Deliverables (final)

- `src/engine/*` + `src/services/*` enhancement.
- new MCP tools + tests.
- `game-data/*` persistent logs.
- metrics dashboard (CLI + log JSON).
- real or stub TTS exporter.
- full markdown docs in repo.
