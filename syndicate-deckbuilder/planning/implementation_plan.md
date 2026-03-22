# Roadmap: Syndicate System & Heist Theme

## Detailed Roadmap & Milestones

This plan outlines a phased approach to evolving the Syndicate System and the Heist Theme.

---

### Phase 1: Core System Formalization

**Goal:** Establish the mathematical and structural foundation of the game.

1. **Market Churn Mechanic:** 
   - Define "Market Stagnation" threshold.
   - Implement "Cycling" cost (e.g., pay 2 Resources to sweep 3 cards).
   - Define "Degradation" (oldest card moves to a "Sale" or "Trash" pile).
2. **Challenge & Extraction Scaling:**
   - Create a lookup table or formula for Tension vs. Extraction difficulty (e.g., `Extraction Difficulty = Base (2) + Tension / 5`).
   - Define "Success Margins" (Full Success, Partial Success, Failure).
3. **Card Data Schema:**
   - Finalize `card-schema.json` to support all phases (Market, Obstacle, Reward, Roadblock).

### Phase 2: Heist Theme Elaboration (Content Design)

**Goal:** Draft the specific content that brings the heist to life.

1. **The Underworld (Market Deck):**
   - List 20+ "Gear" cards (Physical) with variants (Loud/Quiet).
   - List 20+ "Intel" cards (Intangible) including "Bribes," "Blueprints," and "Hacker Scripts."
2. **Security Tiers (Obstacle Decks):**
   - **Tier 1 (The Perimeter):** Low-entry cost, low Heat. (e.g., Motion Sensors, Night Watchman).
   - **Tier 2 (The Facility):** Moderate cost, moderate Heat. (e.g., Laser Grids, Armed Patrols).
   - **Tier 3 (The Vault):** High cost, high Heat. (e.g., Biometric Scanners, Reinforced Vault Door).
3. **The Getaway (Roadblock Deck):**
   - Design cards like "Police Interceptor," "Spike Strips," "Helicopter Pursuit."

### Phase 3: Integration & Playtest Readiness

**Goal:** Bring the system into a state where it can be simulated or played.

1. **Rulebook Consolidation:** 
   - Merge finalized mechanics into `CoreRules.md`.
   - Ensure `heist-theme.md` examples sync perfectly with core rules.
2. **Asset Drafting:**
   - Generate early placeholder art or descriptions for key components using `generate_image`.
3. **Simulation Scripting:**
   - Create a basic JS-based simulation to "gold-test" the economy balance (Tension vs. VP).

---

## Proposed Changes

### [Syndicate System (Core)](file:///c:/Users/Julian/git/syndicate-system/syndicate-deckbuilder/rules/CoreRules.md)

The core system needs more formalization to ensure it remains theme-agnostic while providing enough structure for any theme to be applied.

- **Market Churn:** Implement a "Market Sweep" or "Degradation" mechanic.
- **Challenge Anatomy:** Define "Requirements" (Currencies) and "Result" (Reward/Penalty) structure for cards.
- **Extraction Math:** Formalize how Tension (Heat) affects the number or difficulty of Extraction (Roadblock) cards.

### [Heist Theme](file:///c:/Users/Julian/git/syndicate-system/syndicate-deckbuilder/themes/heist/heist-theme.md)

Translate the core mechanics into specific heist components.

- **Market Cards (The Underworld):** Create a list of 20+ cards.
- **Obstacle Decks:** Define card lists for "Lobby" (Tier 1), "Security" (Tier 2), and "The Vault" (Tier 3).
- **Roadblock Cards:** Define cards for the getaway phase.
- **Alarm Mechanics:** Create a "Heat Threshold" table that triggers harder obstacles.
