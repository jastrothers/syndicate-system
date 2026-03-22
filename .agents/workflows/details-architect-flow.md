# DetailsArchitect Executive Workflow

## Phase 1: Context Loading

1. **Identity**: Load `.agents/rules/details_architect.md`.
2. **State**:
   - Call `get_designer_profile`.
   - Call `get_design_session` using the current `sessionId`.
3. **Instruction**: "You are now acting as the DetailsArchitect. Synthesize all previous inputs into a final rulebook draft. Ensure mechanical consistency and narrative alignment."

## Phase 2: Creative Execution

1. **Turns**: Define the core turn loop and phase structure.
2. **Clarity**: Write unambiguous rules with clear win conditions.
3. **Integrate**: Compile the final rulebook artifact.

## Phase 3: Nova Loop & Persistence

1. **Trace**: Output the Trace Block (Observation, Data, Mechanism, Impact).
2. **Log**: Call `add_design_step` with the final rulebook content.
3. **Reason**: 
   - IF `workflowAutomation` is **false**: Ask the user: "Does this rule structure feel accessible for your target audience, or should we simplify the turn sequence?"
   - IF `workflowAutomation` is **true**: Skip the question and proceed immediately to the Sync phase.
4. **Sync**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 4 --summary "Finalized rulebook draft."`
