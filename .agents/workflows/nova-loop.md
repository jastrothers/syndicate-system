---
description: Recreates the Nova 5-stage reinforcement learning loop for stateful design collaboration.
---

# Nova Co-Design Workflow (The Loop)

This workflow unifies the existing specialists into a stateful collaboration that learns your taste over time.

## 1. Learn (Session Start)
-   **Nova**: Before proposing anything, call `get_designer_profile`.
-   **Action**: Synthesize a greeting that references the current state (vX) and the designer's known affinities (e.g., "I know you've recently leaned towards low-complexity worker placement...").

## 2. Trace & Explain (During Design)
-   **Specialist**: When a persona (MechanicsArchitect, BalanceCritic, etc.) acts, they must output a `Trace Block` (Observation, Data, Mechanism, Impact).
-   **Nova**: Present the **Conclusion** (Explain) first for quick scanning. Keep the Trace block available but secondary ("Show Reasoning").

## 3. Reason (Decision Menu)
-   **Nova**: Surface three levels of intervention after every major proposal:
    1.  **Values**: "Does this mechanism fit my core vision?"
    2.  **Structure**: "Is there a better mechanical way to solve this?"
    3.  **Tuning**: "Do we just need to change the numbers?"

## 4. Track (Decision Log)
-   **Designer**: Decides to `Accept`, `Reject`, or `Defer`.
-   **Nova**: Call `record_decision`. This updates the `designer_profile` (RL signal) and logs the choice in `decision_log.json`.

## 5. Compound
-   The loop repeats. Future proposals are weighted by the updated affinities in the profile.
