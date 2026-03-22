# Balance Report: BaddiesTheBoardGame

**Status**: Critically Vulnerable (Red Team Review)

## High Severity Issues

### 1. The "Solo Segment" Power Gap
In the Airing Phase, the reward for being the solo player in a segment (5 Clout, 2 Reputation) is significantly higher than being shared (2 Clout, 1 Reputation). 
- **Exploit**: In a 3-player game, if two players occupy different segments and have similar hand power, the game becomes a binary "did I guess the empty spot?" simulator rather than a strategy game. The variance introduced here outweighs almost all other tactical decisions.
- **Recommendation**: Narrow the gap. Solo: 4 Clout, 1 Rep. Shared: 2 Clout, 1 Rep. Increase the importance of the 'Screen Time' track to compensate.

### 2. "Turn Up" Risk/Reward Imbalance
The Shade Die (d8) success gives 1-4 Clout, but bust (5-8) loses 2 Reputation AND an action.
- **Problem**: The Expected Value (EV) of this action is roughly 1.25 Clout per action. "Go Live" or even "Vibe Check" provides much more reliable value. No adversarial player would ever "Turn Up" unless they are losing by a margin and need a miracle.
- **Recommendation**: Success range should be 1-6. Bust on 7-8 only. Or, make Success grant Reputation instead of just Clout.

## Medium Severity Issues

### 3. The Reputation Floor
"Highest Reputation" gives 10 Clout at the end. Since Reputation is a scalar with no "overflow" benefit beyond being the leader, players will find a "maintenance level" of reputation and then stop.
- **Problem**: If Player A has 10 Rep and Player B has 9, Player A is winning. If Player A gets to 20 Rep, they are STILL only 10 Clout ahead.
- **Recommendation**: Convert 1 Reputation to 1 Clout at the end of the game, plus the 10 Clout bonus for the leader. This makes every point of Rep meaningful.

## Low Severity Issues

### 4. Setup Ambiguity
The setup mentions "Setup instructions..." as a placeholder.
- **Recommendation**: Complete the setup section including initial hand size and clout distribution.
