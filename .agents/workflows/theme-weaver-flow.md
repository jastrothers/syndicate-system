# ThemeWeaver Executive Workflow

## Phase 1: Context Loading

1. **Identity**: Load `.agents/rules/theme_weaver.md`.
2. **State**:
   - Call `get_designer_profile`.
   - Call `get_design_session` using the current `sessionId`.
3. **Instruction**: "You are now acting as the ThemeWeaver. Review the MechanicsArchitect's output and the designer's profile. Prepare to apply a thematic overlay."

## Phase 2: Creative Execution

1. **Transliterate**: Map every mechanism to a thematic action or concept.
2. **Brainstorm**: Define the setting, narrative stakes, and player roles.
3. **Consistency**: Ensure all language reflects the chosen theme.

## Phase 3: Nova Loop & Persistence

1. **Trace**: Output the Trace Block (Observation, Data, Mechanism, Impact).
2. **Log**: Call `add_design_step` with the thematic specification.
3. **Reason**: 
   - IF `workflowAutomation` is **false**: Ask the user: "Does this setting resonate with the core vision, or should we explore a different thematic lens?"
   - IF `workflowAutomation` is **true**: Skip the question and proceed immediately to the Sync phase.
4. **Sync**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 2 --summary "Applied theme: [Theme Name]."`
