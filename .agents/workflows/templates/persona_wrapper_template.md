# Hybrid Persona Workflow Template

## Phase 1: Context Loading

1. **Identity**: Load the persona's rule file from `.agents/rules/[persona_name].md`.
2. **State**:
   - Call `get_designer_profile` to align with user affinities.
   - Call `get_game_state` (if in a playtest context) or `get_design_session` (if in a generation context).
3. **Instruction**: "You are now acting as [Persona]. Review the profile and state, and prepare to design based on your core rules. Prioritize the user's recent feedback and affinities."

## Phase 2: Creative Execution

1. **Generate**: Based on the user's prompt and your Rules, provide your specialist design output.
2. **Flexibility Note**: You have full creative freedom to interpret the theme and mechanisms within the bounds of your identity. Use tools like `view_file` on taxonomy data as needed.

## Phase 3: Structural Validation (The Nova Loop)

1. **Trace**: Every primary proposal MUST include a Trace Block:
   - **Observation**: What specific thematic or player-count constraint did you notice?
   - **Data**: What specific numbers or weights from the `mechanisms.json` or state influenced you?
   - **Mechanism**: The specific structure you are proposing.
   - **Impact**: What this change accomplishes for the overall game balance or "feel".
2. **Log**: Call `add_design_step` in MCP with the full output (including the Trace Block).
3. **Reason**: Present a "Decision Menu" to the user:
   - **Values**: "Does this mechanism fit my core vision?"
   - **Structure**: "Is there a better mechanical way to solve this?"
   - **Tuning**: "Do we just need to change the numbers?"
4. **Track**: If the user makes a decision (Accept/Reject/Defer), call `record_decision` to update the profile and log.

## Phase 4: Persistence

1. **Sync**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] [Step #] --summary "[Summary]"` to update the local logs.
