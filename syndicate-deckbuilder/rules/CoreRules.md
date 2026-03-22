# Syndicate Deckbuilder: Core Rulebook (Draft)

Welcome to the **Syndicate Deckbuilder** system. This is a theme-agnostic framework for building strategic deckbuilding games focused on recruiting a specialized crew, planning an operation, executing central challenges, and extracting with rewards.

## 1. Game Overview

Players compete to accumulate the most **Victory Points (VP)** by acquiring **Rewards**. The game is played over exactly four phases.

### Core Philosophy

- **Asymmetry:** Players start with different capabilities.
- **Tension:** Actions have consequences that scale the difficulty of the final phase.
- **Resource Management:** Dual currencies and hand management are central to success.
- **No Player Elimination:** Players may fail, but they remain in the game, facing hard decisions over reward loss instead of being removed.

---

## 2. Key Concepts

### Tension

**Heat** (Global Tension) represents the risk and attention players draw during the operation.

- **Cumulative:** Heat is a total value accumulated across the entire game. Once gained, it stays with the crew unless a specific "Quiet" action or card effect reduces it.
- Higher Heat increases the difficulty of the **Extraction Phase**.
- Some powerful cards or "loud" actions increase Heat as a cost for immediate power.

### Normalization

To ensure mechanical transparency and balance:
- **Starting Deck Size:** 10 Cards.
- **Base Hand Size:** 5 Cards.

### Dual Currencies

Cards in the market are acquired using two distinct currency types (e.g., Physical vs. Digital, or Tangible vs. Intangible).

- All cards have a default minimum value (typically 1) for both types to ensure they are never "dead."
- Acquirng a card with its matching currency type is more efficient/cheaper.

### Specialist Packs

During the **Recruiting Phase**, players draft Specialist Packs. These provide the starting deck and define the player's initial strengths and weaknesses.

---

## 3. The Four Phases

### Phase I: Recruiting (Setup)

Players draft or choose **Specialist Packs** to form their starting decks. This establishes the asymmetrical starting positions.

- **Specializations:** Specialists may excel at specific skills, currency generation, deck manipulation, or extraction mitigation.

### Phase II: Planning (Market Deckbuilding)

Players take sequential turns drafting cards from an open market to enhance their decks.

- **Strategic Decision:** "Do I bolster my strengths or cover my weaknesses?"
- **Market Churn Mechanic:** To prevent market stagnation, players may pay to cycle the market.
  - **Cycling Cost:** A player may spend 2 of any combination of currencies to sweep up to 3 cards from the open market and replace them.
  - **Degradation:** At the end of each round (or when a new card enters the market), the oldest card in the market is moved to a "Sale" area (acquired for 1 less) or simply "Trashed," ensuring constant board variation.

### Phase III: Execution (Central Challenges)

Players encounter **Central Challenges** and use their decks to overcome them.

- **Challenge Anatomy:** Each challenge is structured with defined Requirements and Results.
  - **Requirements:** The cost to initiate or complete the challenge, such as specific amounts of Tangible or Intangible currencies, or specialized skills.
  - **Result:** The outcome. Success typically provides immediate Rewards or Victory Points. Failure may inflict Penalties (e.g., adding "Wound" cards to the deck, losing resources, or gaining extra Tension). Some options offer a "risky" path balancing high reward with guaranteed Tension.
- **Rewards:** Rewards may be tied to completed challenge cards or distinct cards separate from challenges gained during this phase.
- **Wounds:** When a player receives a Wound card (e.g., "Minor Scrape", "Gunshot Wound"), it is placed **on top of their player deck**. This ensures the penalty impacts the very next turn, representing the immediate friction of the injury.

### Phase IV: Extraction (The Getaway)

The final phase where players must overcome one or more **Extraction Challenges** to keep their rewards.

- **Extraction Math:** The baseline Extraction Difficulty starts at 3. Heat and the amount of Loot carried add to this difficulty.
  - *Formula:* `Extraction Difficulty = Base (3) + Heat + (Number of Rewards carried)`.
- **Success Margins:**
  - *Full Success:* Meet or exceed Extraction Difficulty. All drafted rewards and VP are secured.
  - *Partial Success:* Overcome at least half the Extraction Difficulty (rounded up). Player must discard or "drop" their lowest value Reward to escape.
  - *Failure:* Fail to meet half the Extraction Difficulty. Player must discard or "drop" his highest value Reward to escape.

---

## 4. Victory Conditions

The game ends after the **Extraction Phase**. The player with the highest total **Victory Points (VP)** from their extracted rewards is the winner.
