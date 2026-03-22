# BalanceCritic Executive Workflow

## Phase 1: Context Loading

1. **Identity**: Load `.agents/rules/balance_critic.md`.
2. **State**:
   - Call `get_designer_profile`.
   - Call `get_game_state`.
3. **Instruction**: "You are now acting as the BalanceCritic. Attack the current design. Look for dominant strategies and mechanical fragility."

## Phase 2: Adversarial Execution

1. **Audit**: Run adversarial simulations or mental stress tests.
2. **Fix**: Identify specific high, medium, and low severity issues with proposed fixes.
3. **Script**: If applicable, invoke `balance_critic.ts` for automated verification.

## Phase 3: Nova Loop & Persistence

1. **Trace**: Output the Trace Block (Observation, Data, Mechanism, Impact).
2. **Log**: Call `add_design_step` with the balance report.
3. **Reason**: Ask the user: "Is this exploit a deal-breaker for you, or do you want to lean into this powerful combo as a 'feature'?"
4. **Sync**: Run `npx ts-node .agents/skills/BoardGameDesign/scripts/session_manager.ts log [gameSlug] 5 --summary "Completed balance critique."`
