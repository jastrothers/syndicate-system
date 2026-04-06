---
title: simulation_report
type: simulation
tags:
  - simulation
  - playtest
  - balance
  - step5
lastUpdated: '2026-04-06T00:52:33.205Z'
game: pokenursery-blissful-beginnings
version: latest
---
# Simulation Report — PokéNursery: Blissful Beginnings

## Heuristic Scores

| Metric | Score /10 | Calculation | Observations |
|--------|-----------|-------------|--------------|
| Seat Advantage | 2 /10 | P1 won 3/3 games (100% win rate). 50% deviation from 50/50. | Single Meadow slot at 2P gives P1 first pick of every baby. P1 same-turn evolves, leaving P2 adoption-blocked. Structurally decisive. |
| Strategy Diversity | 7 /10 | Score gaps widen: Random 12pt, Greedy 14pt, Strategic 30pt. Clear P1 skill gradient. | Strategic P1 scored 38 vs Random P1's 31. Skill rewards P1 but P2 outcomes converge due to meadow bottleneck. |
| Dead Actions | 5 /10 | 3.5/5 action types regularly used. P2 had only 1 meaningful action (Purchase) for majority of Strategic game. | Purchase Facility underused. P2 frequently had no baby to nurture = no meaningful choice. |
| Game Length Variance | 7 /10 | Turns: 10, 8, 10. CoV = 12.3%. Greedy ended 2 turns faster. | Healthy variance. Strategy-responsive pacing. Final-week mechanic adds uniform 2-turn runway. |

**Overall Score: 5.25/10**

**Verdict: FAIL** (Seat Advantage 2/10 below < 3 threshold)

## Per-Game Results

| Game | Strategy | Turns | Winner | Scores | P1 Evos | P2 Evos |
|------|----------|-------|--------|--------|---------|---------|
| 1 | Random | 10 | P1 | 31-19 | 7 | 4 |
| 2 | Greedy | 8 | P1 | 28-14 | 8 | 3 |
| 3 | Strategic | 10 | P1 | 38-8 | 8 | 1 |

## For BalanceCritic

- **Seat Advantage -> First-Player Advantage**: P1 won all 3 games with margins of 12, 14, and 30 points. Root cause: single Meadow slot at 2P. P1 adopts and same-turn evolves, P2 faces empty Meadow on their turn. In the Strategic game, P2 was adoption-blocked for 8 of 10 turns. This is structural, not statistical.

- **Strategy Diversity -> Dominant Strategies**: Gentle Touch (wild icon, 6/10 starting deck) enables same-turn evolution of any 3-4 icon baby. Average opening hand has 3 wild icons. Minimal incentive to specialize in care types. Togetic +1 Rep per evolution is the strongest ability and creates a runaway snowball (worth +6 bonus rep in Random game).

- **Dead Actions -> Trap Options**: Facilities are win-more purchases. Blossom Greenhouse nearly impossible to trigger (needs 4+ cards played, hand size is 5). Healing Ward redundant with Gentle Touch wild. 5-icon babies (Chingling, Mime Jr.) are poor investments vs two 3-icon babies.

- **Resource Flow -> Economy**: Income hits 8-token cap by Day 4-5. Excess income wasted. Premium cards (cost 3) affordable but rarely better than multiple cost-1 cards. Berry Garden is the only facility with fast ROI.

- **Game Length -> Tempo**: Endgame fires Day 6-8. Game feels decided by Day 4-5 when evolution gap is 3+. Final-week mechanic cannot close large gaps.

## For FunFactorJudge

- **Tension moments observed**: (1) Random Day 5: P2 Mime Jr. evolution via Nurture Burst closed gap to 13-12. (2) Greedy Day 4: P1 double evolution power spike. (3) Strategic Day 1: P1 patience play skipping Mime Jr. paid off with Happiny Day 2.

- **Agency indicators**: Strategic P1 scored highest (38), Strategic P2 scored lowest (8). Skill rewards P1 but P2 agency is severely constrained by Meadow bottleneck. P2 strategy reduces to "buy cards and hope."

- **Pacing observations**: Clear arc (setup -> engine -> endgame race) but tension collapses mid-game once P1 leads by 3+ evolutions. Final-week provides brief last-chance spike.

- **Dead zones**: Strategic P2 had 8 turns where only Purchase Care Card was meaningful. No baby, no tucking, no evolution possible. Would feel terrible in actual play.

- **Emergent interactions**: (1) Magmar discount + facility engine was powerful. (2) Togetic early = runaway snowball. (3) Mr. Mime copy ability underwhelming as first evolution (nothing to copy). (4) Gentle Touch wild eliminates care-type matching puzzle.
