# Progress Management: Syndicate Deckbuilder

This document serves as the high-level tracker for project health, synchronization between the core system and thematic implementations, and long-term goals.

## 📈 Project Status Overview

| Component | Status | Next Milestone |
| :--- | :--- | :--- |
| **Syndicate Core** | 🟡 Alpha | Formalize Market Churn & Extraction Math |
| **Heist Theme** | 🟡 Alpha | Draft Tiered Obstacle & Market Card Lists |
| **Card Schema** | 🔴 Planned | Finalize `card-schema.json` |
| **Rulebook** | 🟢 Drafted | Sync Core vs. Theme terminology |

## 🔄 Core-Theme Synchronization

To ensure the framework remains robust, we follow these sync rules:

1. **Feature First in Theme:** New mechanics (like Heat) are prototyped in the Heist theme first.
2. **Abstraction to Core:** Once a mechanic is stable, we abstract the math/logic into `CoreRules.md` (e.g., Heat becomes "Tension").
3. **Card Parity:** Any change to the `card-schema.json` must be reflected across all current theme card lists.

## 🛠️ Open Questions & Decision Log

- **[DECISION] Personal vs. Global Tension:** Settled on **Personal**. Players manage their own risk.
- **[OPEN] Market Stagnation:** Should we use a "conveyor belt" (oldest drops) or a "timed sweep" (every 3 rounds)?
- **[OPEN] Extraction Failure:** Is losing VP enough, or should there be "Death/Arrest" (lose the match)? Currently leaning toward VP loss only for accessibility.

## 📅 Upcoming Sprints

### Sprint 1: Foundation (Current)

- Finalize Implementation Plan.
- Define Card Schema.
- Draft initial 10 cards per currency for Heist.

### Sprint 2: The Score

- Draft 3 Tiers of Obstacles.
- Formalize "Alarm" escalation logic.
- Basic manual playtest of a "Mission."

### Sprint 3: The Getaway & Cleanup

- Draft Roadblock cards.
- Finalize Extraction difficulty math.
- Complete first pass of formal `CoreRules.md`.
