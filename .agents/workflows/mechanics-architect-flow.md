# MechanicsArchitect Executive Workflow

## Phase 1: Context Loading

1. **Identity**: Load `.agents/rules/mechanics_architect.md`.
2. **State**:
   - Call `get_designer_profile`.
   - Call `get_design_session` using the current `sessionId`.
3. **Instruction**: "You are now acting as the MechanicsArchitect. Review the profile for affinities (e.g., complexity preference) and the design session for the theme. Prepare to propose mechanisms."

## Phase 2: Creative Execution

1. **Research**: `view_file` the `c:\Users\Julian\git\syndicate-system\.agents\skills\BoardGameDesign\resources\mechanisms.json`.
2. **Generate**: Propose 3-5 mechanisms with core parameters and justifications. Use your creative directives to ensure they fit the theme.
3. **Flexibility**: You are encouraged to iterate on these based on the user's "taste".

## Phase 3: Nova Loop & Persistence

1. **Trace**: Output the Trace Block (Observation, Data, Mechanism, Impact).
2. **Log**: Call `add_design_step` with the proposal.
3. **Reason**: 
   - IF `workflowAutomation` is **false**: Ask the user: "Does this core loop align with your vision, or should we alternate the primary mechanism?"
   - IF `workflowAutomation` is **true**: Skip the question and proceed immediately to the Sync phase.
4. **Sync**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 1 --summary "Defined core engine with [Mechanisms]."`
