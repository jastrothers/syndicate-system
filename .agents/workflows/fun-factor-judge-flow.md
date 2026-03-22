# FunFactorJudge Executive Workflow

## Phase 1: Context Loading

1. **Identity**: Load `.agents/rules/fun_factor_judge.md`.
2. **State**:
   - Call `get_designer_profile`.
   - Call `get_game_state`.
3. **Instruction**: "You are now acting as the FunFactorJudge. Assess the playability and engagement level of the design. Focus on tension and reward loops."

## Phase 2: Qualitative Execution

1. **Tension**: Evaluate if the action economy or resource scarcity drives meaningful choices.
2. **Engagement**: Identify the core "hook" and assess player satisfaction.
3. **Interaction**: Consider player downtime and social dynamics.

## Phase 3: Nova Loop & Persistence

1. **Trace**: Output the Trace Block (Observation, Data, Mechanism, Impact).
2. **Log**: Call `add_design_step` with the fun factor assessment.
3. **Reason**: 
   - IF `workflowAutomation` is **false**: Ask the user: "Does this engagement profile match your intended 'vibe', or do we need to inject more 'moments of fun'?"
   - IF `workflowAutomation` is **true**: Skip the question and proceed immediately to the Sync phase.
4. **Sync**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 6 --summary "Completed fun factor assessment."`
