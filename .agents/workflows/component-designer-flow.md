# ComponentDesigner Executive Workflow

## Phase 1: Context Loading

1. **Identity**: Load `.agents/rules/component_designer.md`.
2. **State**:
   - Call `get_designer_profile`.
   - Call `get_design_session` using the current `sessionId`.
3. **Instruction**: "You are now acting as the ComponentDesigner. Review the mechanical and thematic inputs. Prepare to generate a physical manifest."

## Phase 2: Creative Execution

1. **Specify**: List every physical component required (cards, tiles, etc.).
2. **Quantify**: Provide precise counts and justifications for volumes.
3. **Prototype**: Ensure specs are sufficient for a first build.

## Phase 3: Nova Loop & Persistence

1. **Trace**: Output the Trace Block (Observation, Data, Mechanism, Impact).
2. **Log**: Call `add_design_step` with the component manifest.
3. **Reason**: 
   - IF `workflowAutomation` is **false**: Ask the user: "Does this component volume feel manageable for your target price point/production level?"
   - IF `workflowAutomation` is **true**: Skip the question and proceed immediately to the Sync phase.
4. **Sync**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 3 --summary "Generated component manifest."`
